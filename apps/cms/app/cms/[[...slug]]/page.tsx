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
