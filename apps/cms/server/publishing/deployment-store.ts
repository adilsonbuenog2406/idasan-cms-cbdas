import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  deploymentLockPath,
  deploymentRecordsDir,
  deploymentsDir,
} from "./paths";
import type {
  DeploymentErrorCode,
  DeploymentProgress,
  DeploymentRecord,
  DeploymentStatus,
} from "./types";

type LockFile = {
  deploymentId: string;
  expiresAt: string;
};

const lockTtlMs = 45 * 60 * 1000;

async function ensureDeploymentDirs() {
  await mkdir(deploymentRecordsDir, { recursive: true });
}

async function writeJsonAtomic(filePath: string, value: unknown) {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const tempPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

export function createInitialDeploymentRecord({
  deploymentId,
  remotePath,
  userId,
}: {
  deploymentId: string;
  remotePath: string;
  userId: string;
}): DeploymentRecord {
  return {
    id: deploymentId,
    userId,
    status: "queued",
    deploymentMode: "atomic",
    startedAt: new Date().toISOString(),
    completedAt: null,
    totalFiles: 0,
    totalBytes: 0,
    filesUploaded: 0,
    bytesUploaded: 0,
    manifestHash: "",
    remotePath,
    backupPath: null,
    errorCode: null,
    errorMessage: null,
    currentStage: "queued",
    publicUrl: null,
    warnings: [],
  };
}

export async function saveDeploymentRecord(record: DeploymentRecord) {
  await ensureDeploymentDirs();
  const filePath = path.join(deploymentRecordsDir, `${record.id}.json`);
  // #region agent log
  fetch('http://127.0.0.1:7615/ingest/e1503208-6096-42e6-82f7-77583d7d4b9e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f9fdc'},body:JSON.stringify({sessionId:'5f9fdc',runId:'post-fix',hypothesisId:'A',location:'deployment-store.ts:saveDeploymentRecord',message:'atomic write deployment record',data:{deploymentId:record.id,status:record.status,filesUploaded:record.filesUploaded},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  await writeJsonAtomic(filePath, record);
}

export async function getDeploymentRecord(deploymentId: string) {
  try {
    const payload = await readFile(
      path.join(deploymentRecordsDir, `${deploymentId}.json`),
      "utf8",
    );

    try {
      return JSON.parse(payload) as DeploymentRecord;
    } catch (parseError) {
      // #region agent log
      fetch('http://127.0.0.1:7615/ingest/e1503208-6096-42e6-82f7-77583d7d4b9e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f9fdc'},body:JSON.stringify({sessionId:'5f9fdc',runId:'post-fix',hypothesisId:'A',location:'deployment-store.ts:getDeploymentRecord',message:'JSON.parse failed in getDeploymentRecord',data:{deploymentId,payloadLength:payload.length,payloadPreview:payload.slice(0,80),error:parseError instanceof Error ? parseError.message : String(parseError)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return null;
    }
  } catch (readError) {
    // #region agent log
    fetch('http://127.0.0.1:7615/ingest/e1503208-6096-42e6-82f7-77583d7d4b9e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f9fdc'},body:JSON.stringify({sessionId:'5f9fdc',runId:'post-fix',hypothesisId:'A',location:'deployment-store.ts:getDeploymentRecord:read',message:'readFile failed in getDeploymentRecord',data:{deploymentId,error:readError instanceof Error ? readError.message : String(readError)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return null;
  }
}

export async function listDeploymentRecords() {
  await ensureDeploymentDirs();
  const entries = await readdir(deploymentRecordsDir, { withFileTypes: true });
  const namedPayloads = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() && entry.name.endsWith(".json") && !entry.name.endsWith(".tmp"),
      )
      .map(async (entry) => ({
        name: entry.name,
        payload: await readFile(path.join(deploymentRecordsDir, entry.name), "utf8"),
      })),
  );

  const records: DeploymentRecord[] = [];

  for (const { name, payload } of namedPayloads) {
    try {
      records.push(JSON.parse(payload) as DeploymentRecord);
    } catch (parseError) {
      // #region agent log
      fetch('http://127.0.0.1:7615/ingest/e1503208-6096-42e6-82f7-77583d7d4b9e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f9fdc'},body:JSON.stringify({sessionId:'5f9fdc',runId:'post-fix',hypothesisId:'B',location:'deployment-store.ts:listDeploymentRecords',message:'JSON.parse failed in listDeploymentRecords',data:{name,payloadLength:payload.length,payloadPreview:payload.slice(0,80),error:parseError instanceof Error ? parseError.message : String(parseError)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // Skip corrupt/empty records (can appear briefly with non-atomic writers; atomic writes prevent this).
    }
  }

  return records.sort((first, second) => second.startedAt.localeCompare(first.startedAt));
}

export async function updateDeploymentRecord(
  deploymentId: string,
  status: DeploymentStatus,
  progress: DeploymentProgress = {},
) {
  const currentRecord = await getDeploymentRecord(deploymentId);

  if (!currentRecord) {
    return null;
  }

  const nextRecord: DeploymentRecord = {
    ...currentRecord,
    status,
    currentStage: status,
    completedAt:
      status === "failed" ||
      status === "published" ||
      status === "rolled_back"
        ? new Date().toISOString()
        : currentRecord.completedAt,
    totalFiles: progress.totalFiles ?? currentRecord.totalFiles,
    totalBytes: progress.totalBytes ?? currentRecord.totalBytes,
    filesUploaded: progress.filesUploaded ?? currentRecord.filesUploaded,
    bytesUploaded: progress.bytesUploaded ?? currentRecord.bytesUploaded,
    manifestHash: progress.manifestHash ?? currentRecord.manifestHash,
    backupPath:
      progress.backupPath === undefined ? currentRecord.backupPath : progress.backupPath,
    deploymentMode: progress.deploymentMode ?? currentRecord.deploymentMode,
    publicUrl:
      progress.publicUrl === undefined ? currentRecord.publicUrl : progress.publicUrl,
    warnings: progress.warning
      ? [...currentRecord.warnings, progress.warning]
      : currentRecord.warnings,
  };

  await saveDeploymentRecord(nextRecord);

  return nextRecord;
}

export async function failDeploymentRecord(
  deploymentId: string,
  errorCode: DeploymentErrorCode,
  errorMessage: string,
) {
  const currentRecord = await getDeploymentRecord(deploymentId);

  if (!currentRecord) {
    return null;
  }

  const nextRecord: DeploymentRecord = {
    ...currentRecord,
    status: "failed",
    currentStage: "failed",
    completedAt: new Date().toISOString(),
    errorCode,
    errorMessage,
  };

  await saveDeploymentRecord(nextRecord);

  return nextRecord;
}

export async function finishDeploymentRecord({
  deploymentId,
  errorCode = null,
  errorMessage = null,
  status,
}: {
  deploymentId: string;
  errorCode?: DeploymentErrorCode | null;
  errorMessage?: string | null;
  status: "published" | "rolled_back" | "failed";
}) {
  const currentRecord = await getDeploymentRecord(deploymentId);

  if (!currentRecord) {
    return null;
  }

  const nextRecord: DeploymentRecord = {
    ...currentRecord,
    status,
    currentStage: status,
    completedAt: new Date().toISOString(),
    errorCode,
    errorMessage,
  };

  await saveDeploymentRecord(nextRecord);

  return nextRecord;
}

async function readCurrentLock() {
  try {
    const payload = await readFile(deploymentLockPath, "utf8");
    try {
      return JSON.parse(payload) as LockFile;
    } catch (parseError) {
      // #region agent log
      fetch('http://127.0.0.1:7615/ingest/e1503208-6096-42e6-82f7-77583d7d4b9e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f9fdc'},body:JSON.stringify({sessionId:'5f9fdc',runId:'pre-fix',hypothesisId:'C',location:'deployment-store.ts:readCurrentLock',message:'lock JSON.parse failed',data:{payloadLength:payload.length,error:parseError instanceof Error ? parseError.message : String(parseError)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return null;
    }
  } catch {
    return null;
  }
}

export async function acquireDeploymentLock(deploymentId: string) {
  await mkdir(deploymentsDir, { recursive: true });
  const currentLock = await readCurrentLock();

  if (currentLock && new Date(currentLock.expiresAt).getTime() > Date.now()) {
    return {
      acquired: false as const,
      deploymentId: currentLock.deploymentId,
    };
  }

  if (currentLock) {
    await unlink(deploymentLockPath).catch(() => {});
  }

  const lock: LockFile = {
    deploymentId,
    expiresAt: new Date(Date.now() + lockTtlMs).toISOString(),
  };

  try {
    await writeFile(deploymentLockPath, `${JSON.stringify(lock, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });

    return {
      acquired: true as const,
      deploymentId,
    };
  } catch {
    const nextLock = await readCurrentLock();

    return {
      acquired: false as const,
      deploymentId: nextLock?.deploymentId ?? "unknown",
    };
  }
}

export async function releaseDeploymentLock(deploymentId: string) {
  const currentLock = await readCurrentLock();

  if (currentLock?.deploymentId === deploymentId) {
    await unlink(deploymentLockPath).catch(() => {});
  }
}
