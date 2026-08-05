import { readdir, readFile, appendFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cmsAppDir = path.join(repoRoot, "apps/cms/app");
const logPath = path.join(repoRoot, ".cursor/debug-9f65a1.log");
const ingestUrl = "http://127.0.0.1:7615/ingest/e1503208-6096-42e6-82f7-77583d7d4b9e";

async function walk(dir, predicate, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, predicate, acc);
    } else if (predicate(entry.name, full)) {
      acc.push(full);
    }
  }
  return acc;
}

async function log(hypothesisId, message, data) {
  const payload = {
    sessionId: "9f65a1",
    runId: process.env.DEBUG_RUN_ID || "post-fix",
    hypothesisId,
    location: "scripts/count-vercel-functions.mjs",
    message,
    data,
    timestamp: Date.now(),
  };

  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(payload)}\n`, "utf8");

  try {
    await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "9f65a1",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // ingest optional
  }
}

async function main() {
  const routeFiles = (await walk(cmsAppDir, (name) => name === "route.ts")).sort();
  const pageFiles = (await walk(cmsAppDir, (name) => name === "page.tsx")).sort();

  const dynamicPages = [];
  for (const page of pageFiles) {
    const source = await readFile(page, "utf8");
    if (source.includes('dynamic = "force-dynamic"') || source.includes("cookies(") || source.includes("headers(")) {
      dynamicPages.push(path.relative(repoRoot, page));
    }
  }

  const routes = routeFiles.map((file) => path.relative(repoRoot, file));
  const estimatedFunctions = routes.length + dynamicPages.length;
  const hobbyLimit = 12;

  // #region agent log
  await log("A", "Counted Next.js route handlers", {
    routeHandlerCount: routes.length,
    routes,
  });
  await log("B", "Counted force-dynamic / SSR pages", {
    dynamicPageCount: dynamicPages.length,
    dynamicPages,
    totalPages: pageFiles.length,
  });
  await log("C", "Hobby plan function estimate", {
    estimatedFunctions,
    hobbyLimit,
    exceedsHobby: estimatedFunctions > hobbyLimit,
    surplus: Math.max(0, estimatedFunctions - hobbyLimit),
  });
  // #endregion

  const vercelOutput = path.join(repoRoot, "apps/cms/.vercel/output/functions");
  let builtFunctionCount = null;
  try {
    await stat(vercelOutput);
    const built = await readdir(vercelOutput);
    builtFunctionCount = built.length;
    await log("D", "Found local .vercel/output/functions", {
      builtFunctionCount,
      built,
    });
  } catch {
    await log("D", "No local .vercel/output/functions yet", {
      builtFunctionCount: null,
    });
  }

  console.log(
    JSON.stringify(
      {
        routeHandlerCount: routes.length,
        dynamicPageCount: dynamicPages.length,
        estimatedFunctions,
        hobbyLimit,
        exceedsHobby: estimatedFunctions > hobbyLimit,
        builtFunctionCount,
      },
      null,
      2,
    ),
  );
}

main().catch(async (error) => {
  await log("E", "Counter script failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  console.error(error);
  process.exit(1);
});
