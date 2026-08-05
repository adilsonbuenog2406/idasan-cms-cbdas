import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import pathPosix from "node:path/posix";
import type Client from "ssh2-sftp-client";
import { landingSlug, type SftpPublishConfig } from "./config";
import {
  createUploadPlan,
  parseDeploymentManifest,
  sortUploadFiles,
  type UploadPlan,
} from "./diff-manifest";
import { deploymentsDir, lastPublishedManifestPath } from "./paths";
import type { DeploymentManifest, DeploymentManifestFile } from "./types";
import { DeploymentError } from "./types";

type PublishCallbacks = {
  onStage: (stage: string) => Promise<void>;
  onUploadProgress: (filesUploaded: number, bytesUploaded: number) => Promise<void>;
  onUploadPlan?: (plan: UploadPlan) => Promise<void>;
  onMode: (mode: "atomic" | "non_atomic", warning?: string) => Promise<void>;
  onBackupPath: (backupPath: string | null) => Promise<void>;
  onWarning: (warning: string) => Promise<void>;
};

type UploadFile = DeploymentManifestFile & {
  localPath: string;
};

type RemotePathResolverClient = Pick<Client, "exists">;

const cmsInternalDirs = new Set([".cms-backups", ".cms-deploys", ".cms-failed"]);
export const backupReuseWindowMs = 7 * 24 * 60 * 60 * 1000;

export type RemoteBackupEntry = {
  name: string;
  type: string;
  modifyTime?: number;
};

function remoteJoin(...parts: string[]) {
  return pathPosix.normalize(pathPosix.join(...parts));
}

export function assertRemotePathInsidePublishRoot(rootPath: string, remotePath: string) {
  const normalizedRoot = pathPosix.normalize(rootPath);
  const normalizedPath = pathPosix.normalize(remotePath);

  if (
    normalizedPath !== normalizedRoot &&
    !normalizedPath.startsWith(`${normalizedRoot}/`)
  ) {
    throw new DeploymentError(
      "SFTP_PERMISSION_DENIED",
      "Publicação bloqueada: o CMS só pode modificar arquivos dentro da pasta da landing page.",
    );
  }

  return normalizedPath;
}

function isCmsInternalRelativePath(relativePath: string) {
  const [firstSegment] = relativePath.split("/");

  return cmsInternalDirs.has(firstSegment);
}

function getPublicUrlHostname(publicLandingPageUrl: string) {
  try {
    return new URL(publicLandingPageUrl).hostname;
  } catch {
    return "";
  }
}

export async function resolvePublishRemotePath(
  client: RemotePathResolverClient,
  config: SftpPublishConfig,
) {
  const remotePath = pathPosix.normalize(config.remotePath);

  if (!remotePath.startsWith("/public_html/")) {
    return remotePath;
  }

  if (await client.exists("/public_html")) {
    return remotePath;
  }

  const hostname = getPublicUrlHostname(config.publicLandingPageUrl);

  if (!hostname) {
    return remotePath;
  }

  const publicHtmlSuffix = remotePath.slice("/public_html".length);
  const hostingerPublicHtml = remoteJoin("domains", hostname, "public_html");

  if (await client.exists(hostingerPublicHtml)) {
    return remoteJoin(hostingerPublicHtml, publicHtmlSuffix);
  }

  return remotePath;
}

function getRemoteLayout(remotePath: string, deploymentId: string) {
  const stagingRoot = remoteJoin(remotePath, ".cms-deploys");
  const stagingPath = remoteJoin(stagingRoot, deploymentId);
  const backupsRoot = remoteJoin(remotePath, ".cms-backups");
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const backupPath = remoteJoin(backupsRoot, `${landingSlug}-${timestamp}`);
  const failedPath = remoteJoin(remotePath, ".cms-failed", `${deploymentId}-${timestamp}`);

  return {
    stagingRoot,
    stagingPath,
    backupsRoot,
    backupPath,
    failedPath,
  };
}

function normalizeTimestampMs(timestamp: number | undefined) {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return null;
  }

  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
}

export function getBackupCreatedAtMs(entry: RemoteBackupEntry) {
  const prefix = `${landingSlug}-`;

  if (entry.name.startsWith(prefix)) {
    const timestamp = entry.name.slice(prefix.length);
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/.exec(
      timestamp,
    );

    if (match) {
      const [, date, hours, minutes, seconds, milliseconds] = match;
      const parsedTime = Date.parse(`${date}T${hours}:${minutes}:${seconds}.${milliseconds}Z`);

      if (Number.isFinite(parsedTime)) {
        return parsedTime;
      }
    }
  }

  return normalizeTimestampMs(entry.modifyTime);
}

export function selectReusableBackupPath({
  backupsRoot,
  entries,
  maxAgeMs = backupReuseWindowMs,
  nowMs = Date.now(),
}: {
  backupsRoot: string;
  entries: RemoteBackupEntry[];
  maxAgeMs?: number;
  nowMs?: number;
}) {
  const reusableBackup = entries
    .filter((entry) => entry.type === "d" && entry.name.startsWith(`${landingSlug}-`))
    .map((entry) => ({
      entry,
      createdAtMs: getBackupCreatedAtMs(entry),
    }))
    .filter(
      (backup): backup is { entry: RemoteBackupEntry; createdAtMs: number } =>
        backup.createdAtMs !== null &&
        backup.createdAtMs <= nowMs &&
        nowMs - backup.createdAtMs <= maxAgeMs,
    )
    .sort((first, second) => second.createdAtMs - first.createdAtMs)[0];

  return reusableBackup ? remoteJoin(backupsRoot, reusableBackup.entry.name) : null;
}

async function findReusableBackupPath({
  backupsRoot,
  client,
  publishRoot,
}: {
  backupsRoot: string;
  client: Client;
  publishRoot: string;
}) {
  assertRemotePathInsidePublishRoot(publishRoot, backupsRoot);

  if (!(await remoteExists(client, backupsRoot))) {
    return null;
  }

  const entries = (await client.list(backupsRoot)) as RemoteBackupEntry[];

  return selectReusableBackupPath({
    backupsRoot,
    entries,
  });
}

async function ensureRemoteDirectory(
  client: Client,
  publishRoot: string,
  remotePath: string,
) {
  await client.mkdir(assertRemotePathInsidePublishRoot(publishRoot, remotePath), true);
}

async function remoteExists(client: Client, remotePath: string) {
  return Boolean(await client.exists(remotePath));
}

async function removeRemotePath(client: Client, publishRoot: string, remotePath: string) {
  const safeRemotePath = assertRemotePathInsidePublishRoot(publishRoot, remotePath);
  const exists = await client.exists(safeRemotePath);

  if (!exists) {
    return;
  }

  if (exists === "d") {
    const entries = await client.list(safeRemotePath);

    for (const entry of entries) {
      await removeRemotePath(client, publishRoot, remoteJoin(safeRemotePath, entry.name));
    }

    await client.rmdir(safeRemotePath);
    return;
  }

  await client.delete(safeRemotePath);
}

async function listRemoteFiles(
  client: Client,
  remotePath: string,
  rootPath = remotePath,
  options: { skipCmsInternal?: boolean } = {},
) {
  const exists = await client.exists(remotePath);

  if (!exists) {
    return [];
  }

  if (exists !== "d") {
    return [pathPosix.relative(rootPath, remotePath)];
  }

  const entries = await client.list(remotePath);
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = remoteJoin(remotePath, entry.name);
    const relativePath = pathPosix.relative(rootPath, entryPath);

    if (options.skipCmsInternal && isCmsInternalRelativePath(relativePath)) {
      continue;
    }

    if (entry.type === "d") {
      files.push(...(await listRemoteFiles(client, entryPath, rootPath, options)));
    } else if (entry.type === "-") {
      files.push(relativePath);
    }
  }

  return files;
}

async function copyRemoteDirectory(
  client: Client,
  publishRoot: string,
  sourcePath: string,
  targetPath: string,
  options: { skipCmsInternal?: boolean } = {},
) {
  assertRemotePathInsidePublishRoot(publishRoot, sourcePath);
  await ensureRemoteDirectory(client, publishRoot, targetPath);
  const files = await listRemoteFiles(client, sourcePath, sourcePath, options);

  for (const relativePath of files) {
    const sourceFilePath = remoteJoin(sourcePath, relativePath);
    const targetFilePath = remoteJoin(targetPath, relativePath);
    assertRemotePathInsidePublishRoot(publishRoot, sourceFilePath);
    assertRemotePathInsidePublishRoot(publishRoot, targetFilePath);
    await ensureRemoteDirectory(client, publishRoot, pathPosix.dirname(targetFilePath));
    const file = await client.get(sourceFilePath);
    await client.put(file, assertRemotePathInsidePublishRoot(publishRoot, targetFilePath));
  }
}

function toUploadFiles(
  releaseDir: string,
  files: DeploymentManifestFile[],
): UploadFile[] {
  return sortUploadFiles(
    files.map((file) => ({
      ...file,
      localPath: path.join(releaseDir, file.relativePath),
    })),
  );
}

async function uploadFiles({
  client,
  files,
  remoteRoot,
  publishRoot,
  callbacks,
}: {
  client: Client;
  files: UploadFile[];
  remoteRoot: string;
  publishRoot: string;
  callbacks: PublishCallbacks;
}) {
  let uploadedFiles = 0;
  let uploadedBytes = 0;

  const directories = Array.from(
    new Set(files.map((file) => pathPosix.dirname(remoteJoin(remoteRoot, file.relativePath)))),
  ).sort((first, second) => first.localeCompare(second));

  for (const directory of directories) {
    await ensureRemoteDirectory(client, publishRoot, directory);
  }

  for (const file of files) {
    const remotePath = remoteJoin(remoteRoot, file.relativePath);
    const safeRemotePath = assertRemotePathInsidePublishRoot(publishRoot, remotePath);
    await client.fastPut(file.localPath, safeRemotePath);
    const remoteStats = await client.stat(safeRemotePath);

    if (Number(remoteStats.size) !== file.size) {
      throw new DeploymentError(
        "REMOTE_VERIFICATION_FAILED",
        `Tamanho remoto divergente para ${file.relativePath}.`,
      );
    }

    uploadedFiles += 1;
    uploadedBytes += file.size;
    await callbacks.onUploadProgress(uploadedFiles, uploadedBytes);
  }
}

async function removeObsoletePublishedFiles({
  client,
  keepRelativePaths,
  remoteRoot,
  publishRoot,
}: {
  client: Client;
  keepRelativePaths: Set<string>;
  remoteRoot: string;
  publishRoot: string;
}) {
  const existingFiles = await listRemoteFiles(client, remoteRoot, remoteRoot, {
    skipCmsInternal: true,
  });

  for (const existingFile of existingFiles) {
    if (!keepRelativePaths.has(existingFile)) {
      await client
        .delete(
          assertRemotePathInsidePublishRoot(
            publishRoot,
            remoteJoin(remoteRoot, existingFile),
          ),
        )
        .catch(() => {});
    }
  }
}

async function readLocalPublishedManifest() {
  try {
    return parseDeploymentManifest(await readFile(lastPublishedManifestPath, "utf8"));
  } catch {
    return null;
  }
}

export async function saveLastPublishedManifest(manifest: DeploymentManifest) {
  await mkdir(deploymentsDir, { recursive: true });
  await writeFile(
    lastPublishedManifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

async function readRemotePublishedManifest(client: Client, remotePath: string) {
  const remoteManifestPath = remoteJoin(remotePath, "deployment-manifest.json");

  if (!(await remoteExists(client, remoteManifestPath))) {
    return null;
  }

  try {
    const payload = await client.get(remoteManifestPath);
    const body = Buffer.isBuffer(payload)
      ? payload.toString("utf8")
      : typeof payload === "string"
        ? payload
        : Buffer.from(payload as ArrayBuffer).toString("utf8");

    return parseDeploymentManifest(body);
  } catch {
    return null;
  }
}

async function resolveBaselineManifest(client: Client, remotePath: string) {
  const remoteManifest = await readRemotePublishedManifest(client, remotePath);

  if (remoteManifest) {
    return { baseline: remoteManifest, source: "remote" as const };
  }

  const localManifest = await readLocalPublishedManifest();

  if (localManifest) {
    return { baseline: localManifest, source: "local" as const };
  }

  return { baseline: null, source: "none" as const };
}

async function activatePublishedFiles({
  callbacks,
  client,
  config,
  filesToUpload,
  keepRelativePaths,
  layout,
}: {
  callbacks: PublishCallbacks;
  client: Client;
  config: SftpPublishConfig;
  filesToUpload: UploadFile[];
  keepRelativePaths: Set<string>;
  layout: ReturnType<typeof getRemoteLayout>;
}) {
  await callbacks.onMode("non_atomic", "non_atomic_deployment");
  await callbacks.onStage("backing_up");

  if (await remoteExists(client, config.remotePath)) {
    const reusableBackupPath = await findReusableBackupPath({
      backupsRoot: layout.backupsRoot,
      client,
      publishRoot: config.remotePath,
    });

    if (reusableBackupPath) {
      await callbacks.onBackupPath(reusableBackupPath);
      await callbacks.onWarning("Backup recente dos últimos 7 dias reutilizado.");
    } else {
      await removeRemotePath(client, config.remotePath, layout.backupPath).catch(() => {});
      await copyRemoteDirectory(client, config.remotePath, config.remotePath, layout.backupPath, {
        skipCmsInternal: true,
      });
      await callbacks.onBackupPath(layout.backupPath);
    }
  }

  await callbacks.onStage("activating");
  await ensureRemoteDirectory(client, config.remotePath, config.remotePath);

  if (filesToUpload.length > 0) {
    await uploadFiles({
      client,
      files: filesToUpload,
      remoteRoot: config.remotePath,
      publishRoot: config.remotePath,
      callbacks,
    });
  } else {
    await callbacks.onUploadProgress(0, 0);
  }

  await removeObsoletePublishedFiles({
    client,
    keepRelativePaths,
    remoteRoot: config.remotePath,
    publishRoot: config.remotePath,
  });
}

export async function rollbackRemoteDeployment({
  backupPath,
  client,
  config,
  failedPath,
}: {
  backupPath: string | null;
  client: Client;
  config: SftpPublishConfig;
  failedPath: string;
}) {
  if (!backupPath) {
    throw new DeploymentError("ROLLBACK_FAILED", "Não há backup para rollback.");
  }

  config.remotePath = await resolvePublishRemotePath(client, config);

  assertRemotePathInsidePublishRoot(config.remotePath, backupPath);
  assertRemotePathInsidePublishRoot(config.remotePath, failedPath);

  await removeRemotePath(client, config.remotePath, failedPath).catch(() => {});
  await copyRemoteDirectory(client, config.remotePath, config.remotePath, failedPath, {
    skipCmsInternal: true,
  }).catch(() => {});
  await copyRemoteDirectory(client, config.remotePath, backupPath, config.remotePath);

  const backupFiles = await listRemoteFiles(client, backupPath);
  await removeObsoletePublishedFiles({
    client,
    keepRelativePaths: new Set(backupFiles),
    remoteRoot: config.remotePath,
    publishRoot: config.remotePath,
  });
}

export async function cleanupOldBackups(client: Client, config: SftpPublishConfig) {
  config.remotePath = await resolvePublishRemotePath(client, config);
  const backupRoot = remoteJoin(config.remotePath, ".cms-backups");

  if (!(await remoteExists(client, backupRoot))) {
    return;
  }

  const backups = (await client.list(backupRoot))
    .filter((entry) => entry.type === "d" && entry.name.startsWith(`${landingSlug}-`))
    .sort((first, second) => second.name.localeCompare(first.name));

  for (const backup of backups.slice(config.keepBackups)) {
    await removeRemotePath(client, config.remotePath, remoteJoin(backupRoot, backup.name)).catch(
      (error) => {
        console.warn(
          JSON.stringify({
            type: "cms_deployment_backup_cleanup_warning",
            backup: backup.name,
            message: error instanceof Error ? error.message : "Falha ao remover backup antigo.",
          }),
        );
      },
    );
  }
}

export async function publishReleaseViaSftp({
  callbacks,
  client,
  config,
  deploymentId,
  manifest,
  releaseDir,
}: {
  callbacks: PublishCallbacks;
  client: Client;
  config: SftpPublishConfig;
  deploymentId: string;
  manifest: DeploymentManifest;
  releaseDir: string;
}) {
  config.remotePath = await resolvePublishRemotePath(client, config);
  const layout = getRemoteLayout(config.remotePath, deploymentId);
  const manifestFilePath = path.join(releaseDir, "deployment-manifest.json");
  const forceFull = process.env.CMS_FORCE_FULL_PUBLISH === "true";

  for (const scopedPath of [
    layout.stagingRoot,
    layout.stagingPath,
    layout.backupsRoot,
    layout.backupPath,
    layout.failedPath,
  ]) {
    assertRemotePathInsidePublishRoot(config.remotePath, scopedPath);
  }

  await callbacks.onStage("verifying");
  const { baseline, source } = await resolveBaselineManifest(client, config.remotePath);
  const plan = createUploadPlan(manifest, baseline, { forceFull });

  const manifestStats = await stat(manifestFilePath);
  const changedRelativePaths = new Set(plan.filesToUpload.map((file) => file.relativePath));
  const filesToUpload = toUploadFiles(releaseDir, [
    ...plan.filesToUpload.filter((file) => file.relativePath !== "deployment-manifest.json"),
    {
      relativePath: "deployment-manifest.json",
      size: manifestStats.size,
      sha256: "",
      mimeType: "application/json; charset=utf-8",
    },
  ]);

  // Always refresh the remote manifest last so a partial upload cannot claim success.
  const uploadPlan: UploadPlan = {
    ...plan,
    filesToUpload: filesToUpload.map(({ localPath: _localPath, ...file }) => file),
    uploadBytes: filesToUpload.reduce((total, file) => total + file.size, 0),
    unchangedCount:
      plan.mode === "incremental"
        ? plan.unchangedCount
        : Math.max(0, plan.releaseFileCount - changedRelativePaths.size),
  };

  await callbacks.onUploadPlan?.(uploadPlan);

  if (plan.mode === "incremental") {
    await callbacks.onWarning(
      `Upload incremental: ${plan.filesToUpload.length} alterados, ${plan.unchangedCount} reutilizados, ${plan.removedCount} removidos (baseline: ${source}).`,
    );
  } else {
    await callbacks.onWarning(
      `Upload completo: ${plan.filesToUpload.length} arquivos (motivo: ${plan.reason}, baseline: ${source}).`,
    );
  }

  await callbacks.onStage("uploading");
  await ensureRemoteDirectory(client, config.remotePath, layout.backupsRoot);

  const keepRelativePaths = new Set([
    ...manifest.files.map((file) => file.relativePath),
    "deployment-manifest.json",
  ]);

  await activatePublishedFiles({
    callbacks,
    client,
    config,
    filesToUpload,
    keepRelativePaths,
    layout,
  });

  return { layout, uploadPlan };
}
