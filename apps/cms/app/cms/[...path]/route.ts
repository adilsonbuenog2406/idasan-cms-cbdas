import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const sessionCookieName = "cms_session";
const rootEnvPath = path.resolve(process.cwd(), "../..", ".env");

type AuthRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

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

async function handleLoginGet() {
  redirect("/cms");
}

async function handleLoginPost(request: Request) {
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

async function handleLogoutPost() {
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

async function handleSessionRefreshPost() {
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

export async function GET(_request: Request, context: AuthRouteContext) {
  const key = (await context.params).path.join("/");

  if (key === "login") {
    return handleLoginGet();
  }

  return new Response("Not found", { status: 404 });
}

export async function POST(request: Request, context: AuthRouteContext) {
  const key = (await context.params).path.join("/");

  if (key === "login") {
    return handleLoginPost(request);
  }

  if (key === "logout") {
    return handleLogoutPost();
  }

  if (key === "session/refresh") {
    return handleSessionRefreshPost();
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
