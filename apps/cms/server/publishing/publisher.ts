import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import {
  acquireDeploymentLock,
  createInitialDeploymentRecord,
  failDeploymentRecord,
  finishDeploymentRecord,
  getDeploymentRecord,
  listDeploymentRecords,
  releaseDeploymentLock,
  saveDeploymentRecord,
  updateDeploymentRecord,
} from "./deployment-store";
import { buildRelease } from "./build-release";
import { getSftpPublishConfig } from "./config";
import { connectSftp } from "./sftp-client";
import {
  cleanupOldBackups,
  publishReleaseViaSftp,
  rollbackRemoteDeployment,
  saveLastPublishedManifest,
} from "./sftp-publisher";
import { runHealthCheck } from "./health-check";
import { getDeploymentTmpDir } from "./paths";
import { logDeploymentEvent } from "./logger";
import { DeploymentError, type DeploymentErrorCode } from "./types";

function getErrorCode(error: unknown): DeploymentErrorCode {
  if (error instanceof DeploymentError) {
    return error.code;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("permission denied")) {
    return "SFTP_PERMISSION_DENIED";
  }

  return "REMOTE_UPLOAD_FAILED";
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof DeploymentError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message.replaceAll(/(password|private key|passphrase)=\S+/gi, "$1=[redacted]");
  }

  return "Falha desconhecida durante a publicação.";
}

export function shouldExecuteDeploymentInline() {
  if (process.env.CMS_PUBLISH_EXECUTION_MODE === "inline") {
    return true;
  }

  if (process.env.CMS_PUBLISH_EXECUTION_MODE === "background") {
    return false;
  }

  return Boolean(process.env.VERCEL);
}

export async function createDeployment(userId: string) {
  const config = getSftpPublishConfig();
  const deploymentId = randomUUID();
  const lock = await acquireDeploymentLock(deploymentId);

  if (!lock.acquired) {
    throw new DeploymentError(
      "DEPLOYMENT_ALREADY_RUNNING",
      `Já existe uma publicação em execução: ${lock.deploymentId}`,
    );
  }

  const record = createInitialDeploymentRecord({
    deploymentId,
    remotePath: config.remotePath,
    userId,
  });

  await saveDeploymentRecord(record);

  if (shouldExecuteDeploymentInline()) {
    await executeDeployment(deploymentId).catch(() => {});
    return (await getDeploymentRecord(deploymentId)) ?? record;
  }

  void executeDeployment(deploymentId).catch(async (error) => {
    await failDeploymentRecord(deploymentId, getErrorCode(error), getSafeErrorMessage(error));
    await releaseDeploymentLock(deploymentId);
  });

  return record;
}

export async function executeDeployment(deploymentId: string) {
  const startedAt = Date.now();
  let client: Awaited<ReturnType<typeof connectSftp>> | null = null;
  let backupPath: string | null = null;

  try {
    const config = getSftpPublishConfig();
    const record = await getDeploymentRecord(deploymentId);
    const userId = record?.userId ?? "cms-admin";

    await updateDeploymentRecord(deploymentId, "building");
    logDeploymentEvent({ deploymentId, userId, stage: "building", status: "building" });
    const release = await buildRelease(deploymentId);

    await updateDeploymentRecord(deploymentId, "validating", {
      totalFiles: release.manifest.totalFiles,
      totalBytes: release.manifest.totalBytes,
      manifestHash: release.manifestHash,
    });

    await updateDeploymentRecord(deploymentId, "connecting");
    logDeploymentEvent({ deploymentId, userId, stage: "connecting", status: "connecting" });
    client = await connectSftp(config);

    const callbacks = {
      onBackupPath: async (nextBackupPath: string | null) => {
        backupPath = nextBackupPath;
        await updateDeploymentRecord(deploymentId, "backing_up", {
          backupPath: nextBackupPath,
        });
      },
      onMode: async (deploymentMode: "atomic" | "non_atomic", warning?: string) => {
        await updateDeploymentRecord(deploymentId, "verifying", {
          deploymentMode,
          warning,
        });
      },
      onStage: async (stage: string) => {
        await updateDeploymentRecord(deploymentId, stage as never);
        logDeploymentEvent({
          deploymentId,
          userId,
          stage,
          status: stage as never,
        });
      },
      onUploadPlan: async (plan: {
        mode: "incremental" | "full";
        filesToUpload: Array<{ size: number }>;
        uploadBytes: number;
        unchangedCount: number;
        removedCount: number;
        reason: string;
      }) => {
        await updateDeploymentRecord(deploymentId, "uploading", {
          totalFiles: plan.filesToUpload.length,
          totalBytes: plan.uploadBytes,
          filesUploaded: 0,
          bytesUploaded: 0,
          warning:
            plan.mode === "incremental"
              ? `incremental:${plan.filesToUpload.length}:${plan.unchangedCount}:${plan.removedCount}`
              : `full:${plan.reason}`,
        });
        logDeploymentEvent({
          deploymentId,
          userId,
          stage: "uploading",
          status: "uploading",
          filesUploaded: 0,
          bytesUploaded: plan.uploadBytes,
        });
      },
      onUploadProgress: async (filesUploaded: number, bytesUploaded: number) => {
        await updateDeploymentRecord(deploymentId, "uploading", {
          bytesUploaded,
          filesUploaded,
        });
      },
      onWarning: async (warning: string) => {
        const currentRecord = await getDeploymentRecord(deploymentId);
        await updateDeploymentRecord(deploymentId, currentRecord?.status ?? "validating", {
          warning,
        });
      },
    };

    const { layout } = await publishReleaseViaSftp({
      callbacks,
      client,
      config,
      deploymentId,
      manifest: release.manifest,
      releaseDir: release.releaseDir,
    });

    await updateDeploymentRecord(deploymentId, "health_check", {
      backupPath,
      publicUrl: config.publicLandingPageUrl,
    });

    try {
      await runHealthCheck(config.publicLandingPageUrl, deploymentId);
    } catch (error) {
      await updateDeploymentRecord(deploymentId, "rolling_back");
      logDeploymentEvent({
        deploymentId,
        userId,
        stage: "rolling_back",
        status: "rolling_back",
        errorCode: "HEALTH_CHECK_FAILED",
      });
      await rollbackRemoteDeployment({
        backupPath,
        client,
        config,
        failedPath: layout.failedPath,
      });
      await finishDeploymentRecord({
        deploymentId,
        errorCode: "HEALTH_CHECK_FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Health check falhou e rollback foi executado.",
        status: "rolled_back",
      });
      return;
    }

    await saveLastPublishedManifest(release.manifest);
    await finishDeploymentRecord({ deploymentId, status: "published" });
    await cleanupOldBackups(client, config);
    await rm(getDeploymentTmpDir(deploymentId), { recursive: true, force: true });
    logDeploymentEvent({
      deploymentId,
      userId,
      stage: "published",
      status: "published",
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const errorCode = getErrorCode(error);
    await failDeploymentRecord(deploymentId, errorCode, getSafeErrorMessage(error));
    throw error;
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }

    await releaseDeploymentLock(deploymentId);
  }
}

export async function getDeployment(deploymentId: string) {
  return getDeploymentRecord(deploymentId);
}

export async function getDeploymentHistory() {
  return listDeploymentRecords();
}

export async function rollbackDeployment(deploymentId: string, userId: string) {
  const record = await getDeploymentRecord(deploymentId);

  if (!record?.backupPath) {
    throw new DeploymentError("ROLLBACK_FAILED", "Deployment sem backup para rollback.");
  }

  const config = getSftpPublishConfig();
  const rollbackId = `${deploymentId}-manual-rollback`;
  const lock = await acquireDeploymentLock(rollbackId);

  if (!lock.acquired) {
    throw new DeploymentError(
      "DEPLOYMENT_ALREADY_RUNNING",
      `Já existe uma publicação em execução: ${lock.deploymentId}`,
    );
  }

  let client: Awaited<ReturnType<typeof connectSftp>> | null = null;

  try {
    await updateDeploymentRecord(deploymentId, "rolling_back");
    client = await connectSftp(config);
    await rollbackRemoteDeployment({
      backupPath: record.backupPath,
      client,
      config,
      failedPath: `${config.remotePath}-manual-rollback-${Date.now()}`,
    });
    await finishDeploymentRecord({
      deploymentId,
      errorCode: "ROLLBACK_FAILED",
      errorMessage: `Rollback manual acionado por ${userId}.`,
      status: "rolled_back",
    });
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }

    await releaseDeploymentLock(rollbackId);
  }
}
