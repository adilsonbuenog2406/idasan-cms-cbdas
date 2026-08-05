import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dataDir, publishedLandingPath, savedProjectPath, uploadsDir } from "./publishing/paths";

function getStorageBucket() {
  return getEnvValue("CMS_SUPABASE_BUCKET") ?? getEnvValue("SUPABASE_STORAGE_BUCKET") ?? "cms";
}
const storageRoot = "cbdas";
const editorDocumentKey = "landing";
const savedProjectObjectPath = `${storageRoot}/landing.grapes.json`;
const publishedLandingObjectPath = `${storageRoot}/landing.html`;
const uploadsObjectPrefix = `${storageRoot}/uploads`;

type SaveLandingInput = {
  html: string;
  css: string;
  mode?: unknown;
  siteCssHref?: string;
  renderedHtml: string;
};

type StoredAsset = {
  body: Buffer;
  contentType: string;
};

type CmsEditorCurrentRow = {
  html: string;
  css: string;
  mode: string | null;
  site_css_href: string | null;
  rendered_html?: string;
  updated_at: string | null;
};

type ReadCurrentLandingOptions = {
  timeoutMs?: number;
  includeRenderedHtml?: boolean;
};

let cachedSupabase: SupabaseClient | null | undefined;
let didEnsureBucket = false;
let cachedFileEnv: Record<string, string> | null = null;
let cachedSavedProjectJson: { value: string; expiresAt: number } | null = null;
const savedProjectCacheTtlMs = 5_000;
const remoteReadTimeoutMs = 5_000;

function rememberSavedProjectJson(value: string) {
  cachedSavedProjectJson = {
    value,
    expiresAt: Date.now() + savedProjectCacheTtlMs,
  };
  return value;
}

function clearSavedProjectJsonCache() {
  cachedSavedProjectJson = null;
}

function parseEnv(content: string) {
  const values: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    let value = trimmedLine.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function getFileEnv() {
  if (cachedFileEnv) {
    return cachedFileEnv;
  }

  cachedFileEnv = {};

  for (const envPath of [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../..", ".env"),
  ]) {
    try {
      cachedFileEnv = {
        ...cachedFileEnv,
        ...parseEnv(readFileSync(envPath, "utf8")),
      };
    } catch {
      // Optional env files.
    }
  }

  return cachedFileEnv;
}

function getEnvValue(name: string) {
  return process.env[name] ?? getFileEnv()[name];
}

function getSupabaseAdmin() {
  if (cachedSupabase !== undefined) {
    return cachedSupabase;
  }

  const url = getEnvValue("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    cachedSupabase = null;
    return cachedSupabase;
  }

  cachedSupabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedSupabase;
}

async function ensureStorageBucket(supabase: SupabaseClient) {
  if (didEnsureBucket) {
    return;
  }

  const { error: getBucketError } = await supabase.storage.getBucket(getStorageBucket());

  if (!getBucketError) {
    didEnsureBucket = true;
    return;
  }

  const { error: createBucketError } = await supabase.storage.createBucket(getStorageBucket(), {
    public: false,
  });

  if (createBucketError && !/already exists/i.test(createBucketError.message)) {
    throw createBucketError;
  }

  didEnsureBucket = true;
}

async function uploadTextObject(supabase: SupabaseClient, objectPath: string, body: string, contentType: string) {
  await ensureStorageBucket(supabase);

  const { error } = await supabase.storage.from(getStorageBucket()).upload(objectPath, body, {
    cacheControl: "0",
    contentType,
    upsert: true,
  });

  if (error) {
    throw error;
  }
}

async function downloadObject(supabase: SupabaseClient, objectPath: string, timeoutMs?: number) {
  const downloadPromise = (async () => {
    const { data, error } = await supabase.storage.from(getStorageBucket()).download(objectPath);

    if (error) {
      throw error;
    }

    return Buffer.from(await data.arrayBuffer());
  })();

  if (!timeoutMs || timeoutMs <= 0) {
    return downloadPromise;
  }

  const timeoutError = new Error(`Storage download timeout after ${timeoutMs}ms`);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      downloadPromise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function getSupabaseErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

function getSupabaseErrorMessage(error: unknown) {
  return typeof error === "object" && error && "message" in error ? String(error.message) : "";
}

function isMissingCmsDatabaseSchema(error: unknown) {
  const code = getSupabaseErrorCode(error);
  const message = getSupabaseErrorMessage(error);

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    /cms_editor_(current|revisions)|schema cache|does not exist/i.test(message)
  );
}

function getLandingMode(mode: unknown) {
  return typeof mode === "string" && mode.trim() ? mode : "original-site";
}

function toProjectJson(row: Pick<CmsEditorCurrentRow, "html" | "css" | "mode" | "site_css_href" | "updated_at">) {
  return JSON.stringify(
    {
      html: row.html,
      css: row.css,
      mode: row.mode ?? "original-site",
      siteCssHref: row.site_css_href ?? undefined,
      updatedAt: row.updated_at ?? undefined,
    },
    null,
    2,
  );
}

function toProjectJsonFromInput(input: SaveLandingInput, updatedAt: string) {
  return JSON.stringify(
    {
      html: input.html,
      css: input.css,
      mode: getLandingMode(input.mode),
      siteCssHref: input.siteCssHref,
      updatedAt,
    },
    null,
    2,
  );
}

async function saveLandingToDatabase(supabase: SupabaseClient, input: SaveLandingInput) {
  const mode = getLandingMode(input.mode);
  const savedBy = "cms-admin";

  const { data: revision, error: revisionError } = await supabase
    .from("cms_editor_revisions")
    .insert({
      document_key: editorDocumentKey,
      html: input.html,
      css: input.css,
      mode,
      site_css_href: input.siteCssHref ?? null,
      rendered_html: input.renderedHtml,
      saved_by: savedBy,
    })
    .select("id, created_at")
    .single();

  if (revisionError) {
    if (isMissingCmsDatabaseSchema(revisionError)) {
      return false;
    }

    throw revisionError;
  }

  const updatedAt = typeof revision.created_at === "string" ? revision.created_at : new Date().toISOString();
  const { error: currentError } = await supabase.from("cms_editor_current").upsert(
    {
      document_key: editorDocumentKey,
      html: input.html,
      css: input.css,
      mode,
      site_css_href: input.siteCssHref ?? null,
      rendered_html: input.renderedHtml,
      last_revision_id: revision.id,
      updated_at: updatedAt,
    },
    {
      onConflict: "document_key",
    },
  );

  if (currentError) {
    if (isMissingCmsDatabaseSchema(currentError)) {
      return false;
    }

    throw currentError;
  }

  return true;
}

async function readCurrentLandingFromDatabase(
  supabase: SupabaseClient,
  options: ReadCurrentLandingOptions = {},
) {
  const includeRenderedHtml = options.includeRenderedHtml !== false;
  const columns = includeRenderedHtml
    ? "html, css, mode, site_css_href, rendered_html, updated_at"
    : "html, css, mode, site_css_href, updated_at";

  let query = supabase
    .from("cms_editor_current")
    .select(columns)
    .eq("document_key", editorDocumentKey);

  if (options.timeoutMs && options.timeoutMs > 0) {
    query = query.abortSignal(AbortSignal.timeout(options.timeoutMs));
  }

  const { data, error } = await query.maybeSingle<CmsEditorCurrentRow>();

  if (error) {
    if (isMissingCmsDatabaseSchema(error)) {
      return null;
    }

    throw error;
  }

  return data;
}

async function saveLandingToObjectStorage(supabase: SupabaseClient, input: SaveLandingInput, projectJson: string) {
  await Promise.all([
    uploadTextObject(supabase, savedProjectObjectPath, projectJson, "application/json; charset=utf-8"),
    uploadTextObject(supabase, publishedLandingObjectPath, input.renderedHtml, "text/html; charset=utf-8"),
  ]);
}

async function seedCurrentLandingFromLocalFiles(supabase: SupabaseClient) {
  const projectJson = await readFile(savedProjectPath, "utf8");
  const project = JSON.parse(projectJson) as {
    html?: unknown;
    css?: unknown;
    mode?: unknown;
    siteCssHref?: unknown;
  };

  if (typeof project.html !== "string" || typeof project.css !== "string") {
    return null;
  }

  let renderedHtml: string;

  try {
    renderedHtml = await readFile(publishedLandingPath, "utf8");
  } catch {
    renderedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CBDAS</title></head><body>${project.html}<style>${project.css}</style></body></html>`;
  }

  const input: SaveLandingInput = {
    html: project.html,
    css: project.css,
    mode: project.mode,
    siteCssHref: typeof project.siteCssHref === "string" ? project.siteCssHref : undefined,
    renderedHtml,
  };

  const savedToDatabase = await saveLandingToDatabase(supabase, input);

  if (!savedToDatabase) {
    await saveLandingToObjectStorage(supabase, input, projectJson);
  }

  return projectJson;
}

export function hasPersistentCmsStorage() {
  return Boolean(getSupabaseAdmin());
}

function requiresPersistentCmsStorage() {
  return process.env.CMS_REQUIRE_PERSISTENT_STORAGE === "true" || Boolean(process.env.VERCEL);
}

export async function saveLanding(input: SaveLandingInput) {
  const supabase = getSupabaseAdmin();
  clearSavedProjectJsonCache();
  const projectJson = toProjectJsonFromInput(input, new Date().toISOString());

  if (supabase) {
    const savedToDatabase = await saveLandingToDatabase(supabase, input);

    if (!savedToDatabase) {
      await saveLandingToObjectStorage(supabase, input, projectJson);
    }

    try {
      await mkdir(dataDir, { recursive: true });
      await Promise.all([
        writeFile(savedProjectPath, projectJson, "utf8"),
        writeFile(publishedLandingPath, input.renderedHtml, "utf8"),
      ]);
    } catch {
      // Local mirror is best-effort for faster subsequent editor loads.
    }

    rememberSavedProjectJson(projectJson);
    return;
  }

  if (requiresPersistentCmsStorage()) {
    throw new Error(
      "CMS persistent storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  await mkdir(dataDir, { recursive: true });
  await Promise.all([
    writeFile(savedProjectPath, projectJson, "utf8"),
    writeFile(publishedLandingPath, input.renderedHtml, "utf8"),
  ]);
  rememberSavedProjectJson(projectJson);
}

export async function readSavedProjectJson() {
  if (cachedSavedProjectJson && cachedSavedProjectJson.expiresAt > Date.now()) {
    return cachedSavedProjectJson.value;
  }

  const supabase = getSupabaseAdmin();
  let remoteFailedHard = false;

  if (supabase) {
    try {
      const currentLanding = await readCurrentLandingFromDatabase(supabase, {
        timeoutMs: remoteReadTimeoutMs,
        includeRenderedHtml: false,
      });

      if (currentLanding) {
        const projectJson = toProjectJson(currentLanding);

        try {
          await mkdir(dataDir, { recursive: true });
          await writeFile(savedProjectPath, projectJson, "utf8");
        } catch {
          // Local mirror is best-effort only.
        }

        return rememberSavedProjectJson(projectJson);
      }

      try {
        const seededProjectJson = await seedCurrentLandingFromLocalFiles(supabase);
        if (seededProjectJson) {
          return rememberSavedProjectJson(seededProjectJson);
        }
      } catch {
        // Fall through to object storage / local file.
      }
    } catch {
      remoteFailedHard = true;
    }

    if (!remoteFailedHard) {
      try {
        const objectBody = (
          await downloadObject(supabase, savedProjectObjectPath, remoteReadTimeoutMs)
        ).toString("utf8");
        return rememberSavedProjectJson(objectBody);
      } catch {
        // Fall through to local file.
      }
    }
  }

  const localBody = await readFile(savedProjectPath, "utf8");
  return rememberSavedProjectJson(localBody);
}

export async function readPublishedLandingHtml() {
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      const currentLanding = await readCurrentLandingFromDatabase(supabase, {
        timeoutMs: remoteReadTimeoutMs,
        includeRenderedHtml: true,
      });

      if (currentLanding?.rendered_html) {
        return currentLanding.rendered_html;
      }
    } catch {
      // Fall through to object storage / local file.
    }

    try {
      return (await downloadObject(supabase, publishedLandingObjectPath, remoteReadTimeoutMs)).toString(
        "utf8",
      );
    } catch {
      // Fall through to local file.
    }
  }

  return readFile(publishedLandingPath, "utf8");
}

export async function uploadEditorImage(file: File) {
  const extension = getSafeExtension(file);

  if (!extension) {
    throw new Error("Formato de imagem nao suportado.");
  }

  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabaseAdmin();

  if (supabase) {
    await ensureStorageBucket(supabase);
    const { error } = await supabase.storage
      .from(getStorageBucket())
      .upload(`${uploadsObjectPrefix}/${fileName}`, buffer, {
        cacheControl: "31536000",
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return `/uploads/${fileName}`;
  }

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, fileName), buffer);

  return `/uploads/${fileName}`;
}

export async function readUploadedAsset(relativePath: string): Promise<StoredAsset> {
  const normalizedPath = normalizeUploadPath(relativePath);
  const supabase = getSupabaseAdmin();

  if (supabase) {
    const body = await downloadObject(supabase, `${uploadsObjectPrefix}/${normalizedPath}`);

    return {
      body,
      contentType: getContentType(normalizedPath),
    };
  }

  return {
    body: await readFile(path.join(uploadsDir, normalizedPath)),
    contentType: getContentType(normalizedPath),
  };
}

export async function copyStoredUploadsToDirectory(destinationDir: string) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return;
  }

  const files = await listUploadObjectPaths(supabase);

  await Promise.all(
    files.map(async (objectPath) => {
      const relativePath = objectPath.slice(`${uploadsObjectPrefix}/`.length);
      const targetPath = path.join(destinationDir, relativePath);

      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, await downloadObject(supabase, objectPath));
    }),
  );
}

async function listUploadObjectPaths(supabase: SupabaseClient, prefix = uploadsObjectPrefix): Promise<string[]> {
  const { data, error } = await supabase.storage.from(getStorageBucket()).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    throw error;
  }

  const objectPaths: string[] = [];

  for (const entry of data ?? []) {
    const entryPath = `${prefix}/${entry.name}`;

    if (entry.id) {
      objectPaths.push(entryPath);
      continue;
    }

    objectPaths.push(...(await listUploadObjectPaths(supabase, entryPath)));
  }

  return objectPaths;
}

async function getLocalUploadPaths(dir: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const paths: string[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      paths.push(...(await getLocalUploadPaths(absolutePath, relativePath)));
      continue;
    }

    paths.push(relativePath);
  }

  return paths;
}

export async function copyLocalUploadsToDirectory(destinationDir: string) {
  const files = await getLocalUploadPaths(uploadsDir);

  await Promise.all(
    files.map(async (relativePath) => {
      const targetPath = path.join(destinationDir, relativePath);

      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, await readFile(path.join(uploadsDir, relativePath)));
    }),
  );
}

function normalizeUploadPath(value: string) {
  const normalizedPath = path.posix.normalize(value.replaceAll("\\", "/")).replace(/^\/+/, "");

  if (!normalizedPath || normalizedPath.startsWith("../") || normalizedPath.includes("/../")) {
    throw new Error("Caminho de upload invalido.");
  }

  return normalizedPath;
}

function getSafeExtension(file: File) {
  const mimeExtension = extensionByMimeType[file.type];

  if (mimeExtension) {
    return mimeExtension;
  }

  const nameExtension = path.extname(file.name).toLowerCase();

  return Object.values(extensionByMimeType).includes(nameExtension) ? nameExtension : "";
}

const extensionByMimeType: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
};

function getContentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".gif") return "image/gif";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".webp") return "image/webp";

  return "application/octet-stream";
}
