import { notFound } from "next/navigation";
import HomePage from "../_screens/home-page";
import EditorPage from "../_screens/editor-page";
import AssetsPage from "../_screens/assets-page";
import PublicacaoPage from "../_screens/publicacao-page";

export const dynamic = "force-dynamic";

type CmsSlugPageProps = {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CmsSlugPage({ params, searchParams }: CmsSlugPageProps) {
  const slug = (await params).slug ?? [];
  const key = slug.join("/");

  // #region agent log
  fetch("http://127.0.0.1:7615/ingest/e1503208-6096-42e6-82f7-77583d7d4b9e", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9f65a1" },
    body: JSON.stringify({
      sessionId: "9f65a1",
      runId: "post-fix",
      hypothesisId: "F",
      location: "apps/cms/app/cms/[[...slug]]/page.tsx",
      message: "CMS catch-all page hit",
      data: { key, slug },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (key === "") {
    return HomePage({ searchParams: searchParams as Promise<{ error?: string }> });
  }

  if (key === "editor") {
    return EditorPage();
  }

  if (key === "assets") {
    return AssetsPage({
      searchParams: searchParams as Promise<{ path?: string; q?: string; preview?: string }>,
    });
  }

  if (key === "publicacao") {
    return PublicacaoPage();
  }

  notFound();
}
