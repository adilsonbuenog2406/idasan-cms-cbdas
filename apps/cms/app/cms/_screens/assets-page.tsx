/* eslint-disable react-hooks/error-boundaries */
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  File,
  FileCode,
  FolderOpen,
  ImageIcon,
  Search,
} from "lucide-react";
import CopyUrlButton from "../_components/copy-url-button";
import { isCmsAuthenticated } from "../_lib/auth";
import {
  formatBuildDate,
  formatBytes,
  getBreadcrumbs,
  getSiteDistDirectories,
  getSiteDistFileByPath,
  getSiteDistFilesInDirectory,
  loadSiteDistManifest,
  normalizeCmsRelativePath,
  readSiteDistTextFile,
  type SiteDistFile,
} from "../_lib/site-dist";

type AssetsPageProps = {
  searchParams: Promise<{
    path?: string;
    q?: string;
    preview?: string;
  }>;
};

export const dynamic = "force-dynamic";

function makeAssetsHref(params: { path?: string; q?: string; preview?: string }) {
  const searchParams = new URLSearchParams();

  if (params.path) {
    searchParams.set("path", params.path);
  }

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.preview) {
    searchParams.set("preview", params.preview);
  }

  const query = searchParams.toString();

  return query ? `/cms/assets?${query}` : "/cms/assets";
}

function FileMeta({ file }: { file: SiteDistFile }) {
  return (
    <p className="mt-2 text-xs font-medium text-[#6b7280]">
      {file.extension || "arquivo"} · {formatBytes(file.size)}
    </p>
  );
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const params = await searchParams;
  const currentDirectory = normalizeCmsRelativePath(params.path);
  const query = params.q ?? "";
  const previewPath = normalizeCmsRelativePath(params.preview);

  let pageContent;

  try {
    const manifest = await loadSiteDistManifest();
    const directories = getSiteDistDirectories(manifest.files, currentDirectory).filter(
      (directory) =>
        query.trim()
          ? directory.name.toLowerCase().includes(query.trim().toLowerCase())
          : true,
    );
    const files = getSiteDistFilesInDirectory(manifest.files, currentDirectory, query);
    const selectedFile = previewPath
      ? getSiteDistFileByPath(manifest.files, previewPath)
      : files[0] ?? null;
    const textPreview = selectedFile?.isText
      ? await readSiteDistTextFile(selectedFile)
      : null;
    const breadcrumbs = getBreadcrumbs(currentDirectory);
    const hasContent = directories.length > 0 || files.length > 0;

    pageContent = (
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="min-w-0">
          <div className="rounded-lg border border-[#10224f]/10 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <nav className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium text-[#526078]">
                <Link href="/cms/assets" className="transition hover:text-[#081736]">
                  site-dist
                </Link>
                {breadcrumbs.map((item) => (
                  <span key={item.path} className="flex min-w-0 items-center gap-2">
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <Link
                      href={makeAssetsHref({ path: item.path, q: query })}
                      className="truncate transition hover:text-[#081736]"
                    >
                      {item.label}
                    </Link>
                  </span>
                ))}
              </nav>

              <form action="/cms/assets" className="relative w-full lg:max-w-xs">
                {currentDirectory ? (
                  <input type="hidden" name="path" value={currentDirectory} />
                ) : null}
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Buscar por nome"
                  className="h-11 w-full rounded-full border border-[#10224f]/12 bg-[#f6f8fb] pl-10 pr-4 text-sm text-[#081736] outline-none transition focus:border-[#10224f]/40 focus:ring-2 focus:ring-[#f9d600]/45"
                />
              </form>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-[#10224f]/10 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#081736]">Biblioteca</h2>
                <p className="text-sm text-[#526078]">
                  {manifest.files.length} arquivos sincronizados ·{" "}
                  {formatBuildDate(manifest.generatedAt)}
                </p>
              </div>
              {currentDirectory ? (
                <Link
                  href={makeAssetsHref({
                    path: currentDirectory.split("/").slice(0, -1).join("/"),
                    q: query,
                  })}
                  className="text-sm font-semibold text-[#a48b00] transition hover:text-[#081736]"
                >
                  Subir pasta
                </Link>
              ) : null}
            </div>

            {!hasContent ? (
              <div className="mt-6 rounded-lg border border-dashed border-[#10224f]/16 p-8 text-center">
                <p className="text-sm font-semibold text-[#081736]">Nenhum arquivo encontrado.</p>
                <p className="mt-2 text-sm text-[#526078]">
                  Ajuste a busca ou volte para a raiz da biblioteca.
                </p>
              </div>
            ) : null}

            {directories.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                  Pastas
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {directories.map((directory) => (
                    <Link
                      key={directory.path}
                      href={makeAssetsHref({ path: directory.path, q: query })}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#10224f]/10 bg-[#fbfcfe] p-4 transition hover:border-[#10224f]/24 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d600]/70"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-md bg-[#081736] text-[#f9d600]">
                        <FolderOpen className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 truncate text-sm font-semibold text-[#081736]">
                        {directory.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {files.some((file) => file.isImage) ? (
              <div className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                  Imagens
                </h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {files
                    .filter((file) => file.isImage)
                    .map((file) => (
                      <Link
                        key={file.relativePath}
                        href={makeAssetsHref({
                          path: currentDirectory,
                          q: query,
                          preview: file.relativePath,
                        })}
                        className="group cursor-pointer overflow-hidden rounded-lg border border-[#10224f]/10 bg-[#fbfcfe] transition hover:border-[#10224f]/24 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d600]/70"
                      >
                        <div className="relative h-40 bg-[#eef2f7]">
                          <Image
                            src={file.publicUrl}
                            alt={file.name}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-contain p-3"
                            unoptimized
                          />
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-semibold text-[#081736]">
                            {file.name}
                          </p>
                          <FileMeta file={file} />
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            ) : null}

            {files.some((file) => !file.isImage) ? (
              <div className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                  Arquivos
                </h3>
                <div className="mt-3 divide-y divide-[#10224f]/10 rounded-lg border border-[#10224f]/10">
                  {files
                    .filter((file) => !file.isImage)
                    .map((file) => (
                      <div
                        key={file.relativePath}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <Link
                          href={makeAssetsHref({
                            path: currentDirectory,
                            q: query,
                            preview: file.relativePath,
                          })}
                          className="flex min-w-0 items-center gap-3 text-left"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#f6f8fb] text-[#10224f]">
                            {file.isText ? (
                              <FileCode className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <File className="h-5 w-5" aria-hidden="true" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[#081736]">
                              {file.name}
                            </span>
                            <FileMeta file={file} />
                          </span>
                        </Link>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <CopyUrlButton url={file.publicUrl} />
                          <a
                            href={file.publicUrl}
                            download
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#081736] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#10224f]"
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Baixar
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="min-w-0 rounded-lg border border-[#10224f]/10 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            {selectedFile?.isImage ? (
              <ImageIcon className="h-5 w-5 text-[#a48b00]" aria-hidden="true" />
            ) : (
              <FileCode className="h-5 w-5 text-[#a48b00]" aria-hidden="true" />
            )}
            <h2 className="text-lg font-semibold text-[#081736]">Preview</h2>
          </div>

          {selectedFile ? (
            <div className="mt-4">
              <p className="break-words text-sm font-semibold text-[#081736]">
                {selectedFile.relativePath}
              </p>
              <FileMeta file={selectedFile} />

              <div className="mt-4 flex flex-wrap gap-2">
                <CopyUrlButton url={selectedFile.publicUrl} />
                <a
                  href={selectedFile.publicUrl}
                  download
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#081736] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#10224f]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Baixar
                </a>
              </div>

              {selectedFile.isImage ? (
                <div className="relative mt-5 h-80 overflow-hidden rounded-lg border border-[#10224f]/10 bg-[#eef2f7]">
                  <Image
                    src={selectedFile.publicUrl}
                    alt={selectedFile.name}
                    fill
                    sizes="380px"
                    className="object-contain p-4"
                    unoptimized
                  />
                </div>
              ) : selectedFile.isText ? (
                <pre className="mt-5 max-h-[620px] overflow-auto rounded-lg bg-[#081736] p-4 text-xs leading-6 text-white">
                  {textPreview ?? "Arquivo de texto grande demais para preview no painel."}
                </pre>
              ) : (
                <div className="mt-5 rounded-lg border border-dashed border-[#10224f]/16 p-6 text-sm text-[#526078]">
                  Este tipo de arquivo está disponível para download, sem preview no painel.
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#526078]">
              Selecione uma imagem ou arquivo para visualizar detalhes.
            </p>
          )}
        </aside>
      </div>
    );
  } catch (error) {
    pageContent = (
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="text-lg font-semibold">Biblioteca não sincronizada</h2>
        <p className="mt-2 text-sm">
          {error instanceof Error
            ? error.message
            : "Execute o build do site e sincronize os arquivos antes de acessar a biblioteca."}
        </p>
      </section>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-6 py-8 text-[#10224f]">
      <div className="mx-auto w-full max-w-7xl">
        <Link
          href="/cms"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#526078] transition hover:text-[#081736]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar ao CMS
        </Link>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#081736]">Assets</h1>
            <p className="mt-2 text-sm text-[#526078]">
              Imagens do congresso, logos, fotos de palestrantes e arquivos YOOtheme.
            </p>
          </div>
        </div>
        <div className="mt-6">{pageContent}</div>
      </div>
    </main>
  );
}
