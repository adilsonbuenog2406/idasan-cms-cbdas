import type { DeploymentManifest, DeploymentManifestFile } from "./types";

export type ManifestDiff = {
  added: DeploymentManifestFile[];
  changed: DeploymentManifestFile[];
  unchanged: DeploymentManifestFile[];
  removed: string[];
};

export type UploadPlan = {
  mode: "incremental" | "full";
  reason: string;
  filesToUpload: DeploymentManifestFile[];
  unchangedCount: number;
  removedCount: number;
  releaseFileCount: number;
  uploadBytes: number;
};

function isManifestFile(value: unknown): value is DeploymentManifestFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const file = value as Partial<DeploymentManifestFile>;

  return (
    typeof file.relativePath === "string" &&
    file.relativePath.length > 0 &&
    typeof file.size === "number" &&
    Number.isFinite(file.size) &&
    typeof file.sha256 === "string" &&
    typeof file.mimeType === "string"
  );
}

export function parseDeploymentManifest(payload: string): DeploymentManifest | null {
  try {
    const parsed = JSON.parse(payload) as Partial<DeploymentManifest>;

    if (
      typeof parsed.deploymentId !== "string" ||
      typeof parsed.generatedAt !== "string" ||
      !Array.isArray(parsed.files) ||
      !parsed.files.every(isManifestFile)
    ) {
      return null;
    }

    return {
      deploymentId: parsed.deploymentId,
      generatedAt: parsed.generatedAt,
      totalFiles:
        typeof parsed.totalFiles === "number" ? parsed.totalFiles : parsed.files.length,
      totalBytes:
        typeof parsed.totalBytes === "number"
          ? parsed.totalBytes
          : parsed.files.reduce((total, file) => total + file.size, 0),
      files: parsed.files,
    };
  } catch {
    return null;
  }
}

export function diffDeploymentManifests(
  next: DeploymentManifest,
  previous: DeploymentManifest | null,
): ManifestDiff {
  if (!previous) {
    return {
      added: [...next.files],
      changed: [],
      unchanged: [],
      removed: [],
    };
  }

  const previousByPath = new Map(
    previous.files.map((file) => [file.relativePath, file] as const),
  );
  const nextPaths = new Set(next.files.map((file) => file.relativePath));

  const added: DeploymentManifestFile[] = [];
  const changed: DeploymentManifestFile[] = [];
  const unchanged: DeploymentManifestFile[] = [];

  for (const file of next.files) {
    const previousFile = previousByPath.get(file.relativePath);

    if (!previousFile) {
      added.push(file);
      continue;
    }

    if (previousFile.sha256 === file.sha256 && previousFile.size === file.size) {
      unchanged.push(file);
      continue;
    }

    changed.push(file);
  }

  const removed = previous.files
    .map((file) => file.relativePath)
    .filter((relativePath) => !nextPaths.has(relativePath));

  return { added, changed, unchanged, removed };
}

export function createUploadPlan(
  next: DeploymentManifest,
  previous: DeploymentManifest | null,
  options: { forceFull?: boolean } = {},
): UploadPlan {
  if (options.forceFull) {
    return {
      mode: "full",
      reason: "full_forced",
      filesToUpload: [...next.files],
      unchangedCount: 0,
      removedCount: previous
        ? previous.files.filter(
            (file) => !next.files.some((nextFile) => nextFile.relativePath === file.relativePath),
          ).length
        : 0,
      releaseFileCount: next.files.length,
      uploadBytes: next.files.reduce((total, file) => total + file.size, 0),
    };
  }

  if (!previous) {
    return {
      mode: "full",
      reason: "no_baseline_manifest",
      filesToUpload: [...next.files],
      unchangedCount: 0,
      removedCount: 0,
      releaseFileCount: next.files.length,
      uploadBytes: next.files.reduce((total, file) => total + file.size, 0),
    };
  }

  const diff = diffDeploymentManifests(next, previous);
  const filesToUpload = [...diff.added, ...diff.changed];

  if (filesToUpload.length === 0 && diff.removed.length === 0) {
    // Still publish a fresh index/manifest stamp if everything matched — but
    // index.html always changes with deployment id, so this is rare.
    return {
      mode: "incremental",
      reason: "no_content_changes",
      filesToUpload: [],
      unchangedCount: diff.unchanged.length,
      removedCount: 0,
      releaseFileCount: next.files.length,
      uploadBytes: 0,
    };
  }

  return {
    mode: "incremental",
    reason: "sha256_diff",
    filesToUpload,
    unchangedCount: diff.unchanged.length,
    removedCount: diff.removed.length,
    releaseFileCount: next.files.length,
    uploadBytes: filesToUpload.reduce((total, file) => total + file.size, 0),
  };
}

/** Keep assets before index.html; deployment-manifest.json always last. */
export function sortUploadFiles<T extends { relativePath: string }>(files: T[]): T[] {
  return [...files].sort((first, second) => {
    const rank = (relativePath: string) => {
      if (relativePath === "deployment-manifest.json") {
        return 2;
      }

      if (relativePath === "index.html") {
        return 1;
      }

      return 0;
    };

    const rankDiff = rank(first.relativePath) - rank(second.relativePath);

    if (rankDiff !== 0) {
      return rankDiff;
    }

    return first.relativePath.localeCompare(second.relativePath);
  });
}
