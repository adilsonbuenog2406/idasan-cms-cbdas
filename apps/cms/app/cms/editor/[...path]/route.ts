import { cookies } from "next/headers";
import { saveLanding, uploadEditorImage } from "@/server/cms-storage";

const sessionCookieName = "cms_session";
const maxUploadBytes = 12 * 1024 * 1024;

type EditorRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function renderDocument(html: string, css: string, siteCssHref?: string) {
  const siteStylesheet = siteCssHref
    ? `    <link rel="stylesheet" crossorigin href="${siteCssHref}" />\n`
    : "";

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
${html}
  </body>
</html>`;
}

async function requireSession() {
  const cookieStore = await cookies();

  if (cookieStore.get(sessionCookieName)?.value !== "ok") {
    return null;
  }

  return cookieStore;
}

async function handleSave(request: Request) {
  const cookieStore = await requireSession();

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
    await saveLanding({
      html: payload.html,
      css: payload.css,
      mode: payload.mode,
      siteCssHref,
      renderedHtml: renderDocument(payload.html, payload.css, siteCssHref),
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

  return Response.json({ ok: true });
}

async function handleUploadImage(request: Request) {
  if (!(await requireSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
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

export async function POST(request: Request, context: EditorRouteContext) {
  const key = (await context.params).path.join("/");

  if (key === "save") {
    return handleSave(request);
  }

  if (key === "upload-image") {
    return handleUploadImage(request);
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
