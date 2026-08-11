import { randomUUID } from "node:crypto";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { createDeploymentManifest } from "../server/publishing/create-manifest";
import { getSftpPublishConfig } from "../server/publishing/config";
import { connectSftp } from "../server/publishing/sftp-client";
import {
  publishReleaseViaSftp,
  saveLastPublishedManifest,
} from "../server/publishing/sftp-publisher";

const siteDistDir = path.resolve(process.cwd(), "../site/dist");
const releaseDir = path.resolve(process.cwd(), "../../.tmp-vite-publish");
const deploymentId = `vite-${randomUUID().slice(0, 8)}`;

async function main() {
  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(releaseDir, { recursive: true });
  await cp(siteDistDir, releaseDir, {
    recursive: true,
    filter: (source) => !source.endsWith("index.single.html"),
  });

  const { manifest } = await createDeploymentManifest(releaseDir, deploymentId);
  const config = getSftpPublishConfig();
  const client = await connectSftp(config);

  try {
    const { uploadPlan } = await publishReleaseViaSftp({
      client,
      config,
      deploymentId,
      manifest,
      releaseDir,
      callbacks: {
        onStage: async (stage) => {
          console.log(`[sftp] stage: ${stage}`);
        },
        onUploadProgress: async (filesUploaded, bytesUploaded) => {
          console.log(
            `[sftp] progress: ${filesUploaded} files, ${Math.round(bytesUploaded / 1024)} KB`,
          );
        },
        onUploadPlan: async (plan) => {
          console.log(
            `[sftp] plan: mode=${plan.mode} upload=${plan.filesToUpload.length} unchanged=${plan.unchangedCount} removed=${plan.removedCount}`,
          );
        },
        onMode: async (mode, warning) => {
          console.log(`[sftp] mode: ${mode}${warning ? ` (${warning})` : ""}`);
        },
        onBackupPath: async (backupPath) => {
          console.log(`[sftp] backup: ${backupPath ?? "none"}`);
        },
        onWarning: async (warning) => {
          console.log(`[sftp] ${warning}`);
        },
      },
    });

    await saveLastPublishedManifest(manifest);
    console.log(
      JSON.stringify({
        ok: true,
        deploymentId,
        mode: uploadPlan.mode,
        uploaded: uploadPlan.filesToUpload.length,
        unchanged: uploadPlan.unchangedCount,
        publicUrl: config.publicLandingPageUrl,
      }),
    );
  } finally {
    await client.end().catch(() => {});
    await rm(releaseDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
