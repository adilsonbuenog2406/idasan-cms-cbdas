import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { Eye, FolderOpen, Pencil, SquareArrowOutUpRight } from "lucide-react";
import { isCmsAuthenticated } from "../_lib/auth";

const quickActions = [
  {
    title: "Landing CBDAS",
    description: "Conteúdo principal, seções, CTAs e bloco de palestrantes.",
    href: "/cms/editor",
    action: "Abrir editor visual",
    icon: Pencil,
  },
  {
    title: "Publicação",
    description: "Build, exportação HTML e pacote para implantação.",
    href: "/cms/publicacao",
    action: "Visualizar e Exportar",
    icon: Eye,
  },
  {
    title: "Assets",
    description: "Imagens do congresso, logos, fotos de palestrantes e arquivos YOOtheme.",
    href: "/cms/assets",
    action: "Abrir biblioteca",
    status: "Sincronizado com apps/site",
    icon: FolderOpen,
  },
];

type CmsPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export const dynamic = "force-dynamic";

async function getRequestOrigin() {
  const headersList = await headers();
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";

  return `${protocol}://${host}`;
}

function LoginScreen({ hasError }: { hasError: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-6 text-[#10224f]">
      <section className="w-full max-w-sm rounded-lg border border-[#10224f]/10 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
          IDASAN
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#081736]">
          Entrar no CMS
        </h1>
        <form action="/cms/login" method="post" className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-[#34415c]">
            Login
            <input
              name="login"
              type="text"
              autoComplete="username"
              className="h-11 rounded-md border border-[#10224f]/15 px-3 text-base text-[#081736] outline-none transition focus:border-[#10224f] focus:ring-2 focus:ring-[#f9d600]/45"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[#34415c]">
            Senha
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="h-11 rounded-md border border-[#10224f]/15 px-3 text-base text-[#081736] outline-none transition focus:border-[#10224f] focus:ring-2 focus:ring-[#f9d600]/45"
            />
          </label>
          {hasError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              Login ou senha invalidos.
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-2 h-11 rounded-md bg-[#f9d600] px-4 text-sm font-semibold text-[#081736] transition hover:bg-[#e9ca00]"
          >
            Acessar
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ origin }: { origin: string }) {
  const projectLinks = [
    { label: "Site", value: `${origin}/` },
    { label: "CMS", value: `${origin}/cms` },
    { label: "Preview sincronizado", value: `${origin}/` },
    { label: "Exportacao", value: `${origin}/exports/cbdas-site.zip` },
  ];

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#10224f]">
      <header className="border-b border-[#10224f]/10 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <Image
              src="/site-dist/logodark.webp"
              alt="IDASAN"
              width={96}
              height={40}
              className="h-9 w-auto shrink-0 object-contain"
              priority
              unoptimized
            />
            <h1 className="text-2xl font-semibold tracking-tight text-[#081736]">
              CBDAS CMS
            </h1>
          </div>
          <form action="/cms/logout" method="post">
            <button
              type="submit"
              className="rounded-full border border-[#10224f]/12 bg-[#f9d600] px-4 py-2 text-sm font-semibold text-[#081736] transition hover:bg-[#e9ca00]"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-[#10224f]/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[#526078]">Workspace</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#081736]">
                Gestao do site III CBDAS
              </h2>
            </div>
            <span className="w-fit rounded-full bg-[#e8f6ef] px-3 py-1 text-sm font-medium text-[#146c43]">
              Online
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group flex min-h-64 cursor-pointer flex-col rounded-lg border border-[#10224f]/10 bg-[#fbfcfe] p-4 outline-none transition hover:border-[#10224f]/25 hover:bg-white hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#f9d600]/70"
                aria-label={`${action.action}: ${action.title}`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-[#081736] text-[#f9d600]">
                    <action.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="text-base font-semibold text-[#081736]">{action.title}</p>
                </div>
                <p className="mt-4 min-h-24 text-sm leading-6 text-[#526078]">
                  {action.description}
                </p>
                {action.status ? (
                  <p className="mt-auto text-xs font-semibold uppercase tracking-[0.16em] text-[#146c43]">
                    {action.status}
                  </p>
                ) : null}
                <p className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#a48b00]">
                  {action.action}
                  <Pencil
                    className={`h-4 w-4 ${action.title === "Landing CBDAS" ? "" : "hidden"}`}
                    aria-hidden="true"
                  />
                  <SquareArrowOutUpRight
                    className={`h-4 w-4 ${action.title === "Landing CBDAS" ? "hidden" : ""}`}
                    aria-hidden="true"
                  />
                </p>
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border border-[#10224f]/10 bg-[#081736] p-6 text-white shadow-sm">
          <p className="text-sm font-medium text-white/62">Status</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Servidor CMS ativo</h2>
          <dl className="mt-6 divide-y divide-white/10">
            {projectLinks.map((item) => (
              <div key={item.label} className="grid gap-1 py-4 first:pt-0">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-white/46">
                  {item.label}
                </dt>
                <dd className="break-all text-sm font-medium text-white">{item.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>
    </main>
  );
}

export default async function CmsPage({ searchParams }: CmsPageProps) {
  const [authenticated, params, origin] = await Promise.all([
    isCmsAuthenticated(),
    searchParams,
    getRequestOrigin(),
  ]);

  if (!authenticated) {
    return <LoginScreen hasError={params.error === "1"} />;
  }

  return <Dashboard origin={origin} />;
}
