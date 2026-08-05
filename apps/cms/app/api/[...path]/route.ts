import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isCmsAuthenticated } from "@/app/cms/_lib/auth";
import {
  readPublishedLandingHtml,
  readUploadedAsset,
  saveLanding,
  uploadEditorImage,
} from "@/server/cms-storage";
import {
  createDeployment,
  getDeployment,
  getDeploymentHistory,
  rollbackDeployment,
} from "@/server/publishing/publisher";
import { DeploymentError } from "@/server/publishing/types";

const sessionCookieName = "cms_session";
const rootEnvPath = path.resolve(process.cwd(), "../..", ".env");
const maxUploadBytes = 12 * 1024 * 1024;

type ApiRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

async function getExpectedCredentials() {
  try {
    const rootEnv = parseEnv(await readFile(rootEnvPath, "utf8"));

    return {
      login: process.env.LOGIN ?? rootEnv.LOGIN ?? "",
      password: process.env.PASSWORD ?? rootEnv.PASSWORD ?? "",
    };
  } catch {
    return {
      login: process.env.LOGIN ?? "",
      password: process.env.PASSWORD ?? "",
    };
  }
}

function normalizeEditorBodyHtml(html: string) {
  const trimmed = html.trim();
  const wrappedBody = trimmed.match(/^<body\b[^>]*>([\s\S]*)<\/body>$/i);

  return wrappedBody ? wrappedBody[1] : html;
}

function renderDocument(html: string, css: string, siteCssHref?: string) {
  const siteStylesheet = siteCssHref
    ? `    <link rel="stylesheet" crossorigin href="${siteCssHref}" />\n`
    : "";
  const bodyHtml = normalizeEditorBodyHtml(html);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
${siteStylesheet}    <link rel="icon" type="image/webp" sizes="192x192" href="/logodark.webp" />
    <title>IDASAN | III CBDAS</title>
    <style>${css}</style>
  </head>
  <body>
${bodyHtml}
  </body>
</html>`;
}

async function requireSessionCookie() {
  const cookieStore = await cookies();

  if (cookieStore.get(sessionCookieName)?.value !== "ok") {
    return null;
  }

  return cookieStore;
}

async function handlePublishGet(segments: string[]) {
  if (!(await isCmsAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (segments.length === 1 && segments[0] === "history") {
    return Response.json({ deployments: await getDeploymentHistory() });
  }

  if (segments.length === 1) {
    const record = await getDeployment(segments[0]);

    if (!record) {
      return Response.json({ error: "Deployment not found" }, { status: 404 });
    }

    return Response.json({ deployment: record });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

async function handlePublishPost(segments: string[]) {
  if (!(await isCmsAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (segments.length === 0) {
    try {
      const record = await createDeployment("cms-admin");

      return Response.json({
        deployment: record,
        deploymentId: record.id,
        status: record.status,
      });
    } catch (error) {
      if (error instanceof DeploymentError && error.code === "DEPLOYMENT_ALREADY_RUNNING") {
        return Response.json(
          {
            error: error.message,
            errorCode: error.code,
          },
          { status: 409 },
        );
      }

      return Response.json(
        {
          error: error instanceof Error ? error.message : "Nao foi possivel iniciar a publicacao.",
          errorCode: error instanceof DeploymentError ? error.code : "RELEASE_BUILD_FAILED",
        },
        { status: 400 },
      );
    }
  }

  if (segments.length === 2 && segments[1] === "rollback") {
    try {
      await rollbackDeployment(segments[0], "cms-admin");

      return Response.json({ ok: true });
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Rollback falhou.",
          errorCode: error instanceof DeploymentError ? error.code : "ROLLBACK_FAILED",
        },
        {
          status:
            error instanceof DeploymentError && error.code === "DEPLOYMENT_ALREADY_RUNNING"
              ? 409
              : 400,
        },
      );
    }
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

async function handleEditorSave(request: Request) {
  const cookieStore = await requireSessionCookie();

  if (!cookieStore) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  cookieStore.set(sessionCookieName, "ok", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  let payload: {
    html?: unknown;
    css?: unknown;
    mode?: unknown;
    siteCssHref?: unknown;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Payload JSON invalido." }, { status: 400 });
  }

  if (typeof payload.html !== "string" || typeof payload.css !== "string") {
    return Response.json({ error: "Invalid editor payload" }, { status: 400 });
  }

  const siteCssHref =
    payload.mode === "original-site" && typeof payload.siteCssHref === "string"
      ? payload.siteCssHref
      : undefined;

  try {
    const saved = await saveLanding({
      html: payload.html,
      css: payload.css,
      mode: payload.mode,
      siteCssHref,
      renderedHtml: renderDocument(payload.html, payload.css, siteCssHref),
    });

    return Response.json({
      ok: true,
      revisionId: saved.revisionId,
      updatedAt: saved.updatedAt,
    });
  } catch (error) {
    console.error("CMS_SAVE_FAILED", error);

    return Response.json(
      {
        error:
          "Nao foi possivel salvar a versao do site. Verifique a configuracao do storage do CMS.",
      },
      { status: 500 },
    );
  }
}

async function handleEditorUpload(request: Request) {
  if (!(await requireSessionCookie())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Envie um arquivo de imagem valido." }, { status: 400 });
  }

  const hasImageMime = file.type.startsWith("image/");
  const hasImageExtension = /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.name);

  if (!hasImageMime && !hasImageExtension) {
    return Response.json({ error: "Envie um arquivo de imagem valido." }, { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return Response.json({ error: "A imagem deve ter no maximo 12 MB." }, { status: 413 });
  }

  try {
    const src = await uploadEditorImage(file);

    return Response.json({ src });
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : "Nao foi possivel enviar a imagem.";

    return Response.json(
      {
        error: message,
      },
      { status: message.includes("Formato de imagem") ? 400 : 500 },
    );
  }
}

async function handlePreviewGet() {
  if (!(await isCmsAuthenticated())) {
    return new Response(null, {
      status: 302,
      headers: {
        location: "/cms",
      },
    });
  }

  try {
    const html = await readPublishedLandingHtml();

    return new Response(html, {
      headers: {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
      },
    });
  } catch {
    return new Response(
      "<!doctype html><html lang=\"pt-BR\"><body style=\"font-family:Montserrat,sans-serif;padding:2rem;color:#10245f\"><p>Nenhuma versão salva encontrada. Clique em Salvar no editor antes de abrir o preview.</p></body></html>",
      {
        headers: {
          "cache-control": "no-store",
          "content-type": "text/html; charset=utf-8",
        },
        status: 404,
      },
    );
  }
}

async function handlePublicSiteGet() {
  try {
    const html = await readPublishedLandingHtml();

    return new Response(html, {
      headers: {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
      },
    });
  } catch {
    try {
      const siteDistIndex = await readFile(
        path.resolve(process.cwd(), "public/site-dist/index.html"),
        "utf8",
      );

      return new Response(siteDistIndex, {
        headers: {
          "cache-control": "no-store",
          "content-type": "text/html; charset=utf-8",
        },
      });
    } catch {
      return new Response(
        "<!doctype html><html lang=\"pt-BR\"><body style=\"font-family:Montserrat,sans-serif;padding:2rem;color:#10245f\"><p>Site ainda nao disponivel. Salve uma versao no editor ou execute pnpm build:cms.</p></body></html>",
        {
          headers: {
            "cache-control": "no-store",
            "content-type": "text/html; charset=utf-8",
          },
          status: 404,
        },
      );
    }
  }
}

async function handleUploadGet(segments: string[]) {
  const requestedPath = segments.join("/");

  try {
    const asset = await readUploadedAsset(requestedPath);

    return new Response(asset.body, {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": asset.contentType,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

export async function GET(_request: Request, context: ApiRouteContext) {
  const segments = (await context.params).path;
  const key = segments.join("/");

  if (key === "cms/login") {
    redirect("/cms");
  }

  if (key === "cms/preview") {
    return handlePreviewGet();
  }

  if (key === "cms/site") {
    return handlePublicSiteGet();
  }

  if (segments[0] === "cms" && segments[1] === "publish") {
    return handlePublishGet(segments.slice(2));
  }

  if (segments[0] === "uploads") {
    return handleUploadGet(segments.slice(1));
  }

  return new Response("Not found", { status: 404 });
}

export async function POST(request: Request, context: ApiRouteContext) {
  const segments = (await context.params).path;
  const key = segments.join("/");

  if (key === "cms/login") {
    const formData = await request.formData();
    const login = String(formData.get("login") ?? "");
    const password = String(formData.get("password") ?? "");
    const expectedCredentials = await getExpectedCredentials();

    if (login !== expectedCredentials.login || password !== expectedCredentials.password) {
      redirect("/cms?error=1");
    }

    const cookieStore = await cookies();

    cookieStore.set(sessionCookieName, "ok", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    redirect("/cms");
  }

  if (key === "cms/logout") {
    const cookieStore = await cookies();

    cookieStore.delete(sessionCookieName);
    cookieStore.set(sessionCookieName, "", {
      expires: new Date(0),
      path: "/cms",
    });
    cookieStore.set(sessionCookieName, "", {
      expires: new Date(0),
      path: "/",
    });

    redirect("/cms");
  }

  if (key === "cms/session/refresh") {
    const cookieStore = await cookies();

    if (cookieStore.get(sessionCookieName)?.value !== "ok") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    cookieStore.set(sessionCookieName, "ok", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return Response.json({ ok: true });
  }

  if (key === "cms/editor/save") {
    return handleEditorSave(request);
  }

  if (key === "cms/editor/upload-image") {
    return handleEditorUpload(request);
  }

  if (segments[0] === "cms" && segments[1] === "publish") {
    return handlePublishPost(segments.slice(2));
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
