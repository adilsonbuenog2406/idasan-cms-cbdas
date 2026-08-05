import { readFile } from "node:fs/promises";
import path from "node:path";

const siteAssetsDir = path.resolve(process.cwd(), "public/site-dist/assets");
const localAssetsDir = path.resolve(process.cwd(), "app/assets/[...path]");
const publicAssetsDir = path.resolve(process.cwd(), "public/assets");

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

type AssetRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(_request: Request, context: AssetRouteContext) {
  const params = await context.params;
  const requestedPath = params.path.join("/");
  const filePath = path.resolve(siteAssetsDir, requestedPath);

  if (!filePath.startsWith(`${siteAssetsDir}${path.sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();

    return new Response(file, {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": contentTypes[extension] ?? "application/octet-stream",
      },
    });
  } catch {
    for (const fallbackAssetsDir of [localAssetsDir, publicAssetsDir]) {
      const localFilePath = path.resolve(fallbackAssetsDir, requestedPath);

      if (!localFilePath.startsWith(`${fallbackAssetsDir}${path.sep}`)) {
        continue;
      }

      try {
        const file = await readFile(localFilePath);
        const extension = path.extname(localFilePath).toLowerCase();
        const contentType = contentTypes[extension];

        if (!contentType) {
          continue;
        }

        return new Response(file, {
          headers: {
            "cache-control": "public, max-age=31536000, immutable",
            "content-type": contentType,
          },
        });
      } catch {
        continue;
      }
    }

    return new Response("Not found", { status: 404 });
  }
}
