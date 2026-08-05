import { readFile } from "node:fs/promises";
import path from "node:path";

const siteDistDir = path.resolve(process.cwd(), "public/site-dist");

async function renderSiteHtml() {
  return (await readFile(path.join(siteDistDir, "index.html"), "utf8"))
    .replaceAll('src="./assets/', 'src="/assets/')
    .replaceAll('href="./assets/', 'href="/assets/')
    .replaceAll('src="./tailwind-browser.js"', 'src="/tailwind-browser.js"')
    .replaceAll('href="./logodark.webp"', 'href="/logodark.webp"');
}

export async function GET() {
  try {
    const html = await renderSiteHtml();

    return new Response(html, {
      headers: {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Failed to render site HTML", error);

    return new Response("Site build not found. Run pnpm --filter site build.", {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
}
