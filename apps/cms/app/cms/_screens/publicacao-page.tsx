import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import { isCmsAuthenticated } from "../_lib/auth";
import {
  formatBuildDate,
  formatBytes,
  getExportZipInfo,
  loadSiteDistManifest,
  type SiteDistFile,
  type SiteDistManifest,
} from "../_lib/site-dist";
import PublishPanel from "../publicacao/publish-panel";
import { getDeploymentHistory } from "@/server/publishing/publisher";

export const dynamic = "force-dynamic";

type ExportZipInfo = Awaited<ReturnType<typeof getExportZipInfo>>;

function PublicacaoError({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
      <h2 className="text-lg font-semibold">Build sincronizado não encontrado</h2>
      <p className="mt-2 text-sm">{message}</p>
    </section>
  );
}

function PublicacaoContent({
  exportZip,
  htmlFiles,
  manifest,
}: {
  exportZip: ExportZipInfo;
  htmlFiles: SiteDistFile[];
  manifest: SiteDistManifest;
}) {
  const savedPreviewUrl = "/cms/preview";

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[#10224f]/10 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
            Última sincronização
          </p>
          <p className="mt-2 text-lg font-semibold text-[#081736]">
            {formatBuildDate(manifest.generatedAt)}
          </p>
        </div>
        <div className="rounded-lg border border-[#10224f]/10 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
            Arquivos
          </p>
          <p className="mt-2 text-lg font-semibold text-[#081736]">
            {manifest.files.length} itens
          </p>
        </div>
        <div className="rounded-lg border border-[#10224f]/10 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
            Pacote ZIP
          </p>
          <p className="mt-2 text-lg font-semibold text-[#081736]">
            {formatBytes(exportZip.size)}
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg border border-[#10224f]/10 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#10224f]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#081736]">Preview da versão salva</h2>
              <p className="text-sm text-[#526078]">
                Última versão persistida no editor visual (a mesma enviada via SFTP)
              </p>
            </div>
            <a
              href={savedPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f9d600] px-4 py-2 text-sm font-semibold text-[#081736] transition hover:bg-[#e9ca00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10224f]/30"
            >
              Abrir em nova aba
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <iframe
            title="Preview da versão salva no editor"
            src={savedPreviewUrl}
            className="h-[620px] w-full bg-white"
          />
        </div>

        <aside className="grid content-start gap-4">
          <a
            href={exportZip.publicUrl}
            download
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#081736] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#10224f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9d600]/70"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Baixar pacote completo
          </a>

          <div className="rounded-lg border border-[#10224f]/10 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-[#081736]">
              Páginas HTML disponíveis
            </h2>
            {htmlFiles.length > 0 ? (
              <ul className="mt-4 grid gap-3">
                {htmlFiles.map((file) => (
                  <li key={file.relativePath}>
                    <a
                      href={file.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-md border border-[#10224f]/10 px-3 py-2 text-sm font-medium text-[#10224f] transition hover:border-[#10224f]/24 hover:bg-[#f6f8fb]"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{file.relativePath}</span>
                      </span>
                      <span className="shrink-0 text-xs text-[#6b7280]">
                        {formatBytes(file.size)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[#526078]">Nenhum HTML encontrado.</p>
            )}
          </div>
        </aside>
      </section>
    </>
  );
}

export default async function PublicacaoPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  let contentData:
    | {
        exportZip: ExportZipInfo;
        htmlFiles: SiteDistFile[];
        manifest: SiteDistManifest;
      }
    | undefined;
  let errorMessage = "";
  const initialDeployments = await getDeploymentHistory().catch(() => []);

  try {
    const [manifest, exportZip] = await Promise.all([
      loadSiteDistManifest(),
      getExportZipInfo(),
    ]);
    contentData = {
      exportZip,
      htmlFiles: manifest.files.filter((file) => file.extension === ".html"),
      manifest,
    };
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Execute o build do site e sincronize o dist antes de publicar.";
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] px-6 py-8 text-[#10224f]">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/cms"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#526078] transition hover:text-[#081736]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Voltar ao CMS
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#081736]">
              Publicação
            </h1>
            <p className="mt-2 text-sm text-[#526078]">
              Build, exportação HTML e pacote para implantação.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <PublishPanel initialDeployments={initialDeployments} />
        </div>
        <div className="mt-6">
          {contentData ? (
            <PublicacaoContent {...contentData} />
          ) : (
            <PublicacaoError message={errorMessage} />
          )}
        </div>
      </div>
    </main>
  );
}
