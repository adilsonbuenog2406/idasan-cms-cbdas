"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, ExternalLink, RotateCcw, Rocket, UploadCloud } from "lucide-react";
import type { DeploymentRecord, DeploymentStatus } from "@/server/publishing/types";

type PublishPanelProps = {
  initialDeployments: DeploymentRecord[];
};

const stageLabels: Array<{ status: DeploymentStatus; label: string }> = [
  { status: "queued", label: "Salvando alterações" },
  { status: "building", label: "Gerando arquivos" },
  { status: "validating", label: "Validando release" },
  { status: "connecting", label: "Conectando ao servidor" },
  { status: "uploading", label: "Enviando arquivos" },
  { status: "verifying", label: "Validando upload" },
  { status: "backing_up", label: "Criando backup" },
  { status: "activating", label: "Ativando nova versão" },
  { status: "health_check", label: "Verificando site publicado" },
];

const activeStatuses = new Set<DeploymentStatus>([
  "queued",
  "building",
  "validating",
  "connecting",
  "uploading",
  "verifying",
  "backing_up",
  "activating",
  "health_check",
  "rolling_back",
]);

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  const units = ["KB", "MB", "GB"];
  let nextSize = size / 1024;
  let unitIndex = 0;

  while (nextSize >= 1024 && unitIndex < units.length - 1) {
    nextSize /= 1024;
    unitIndex += 1;
  }

  return `${nextSize.toFixed(nextSize >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function formatDuration(record: DeploymentRecord, now: number | null) {
  const endTime = record.completedAt ? new Date(record.completedAt).getTime() : now;
  const startTime = new Date(record.startedAt).getTime();

  if (!Number.isFinite(startTime) || !endTime) {
    return "-";
  }

  return `${Math.max(0, Math.round((endTime - startTime) / 1000))}s`;
}

function getStatusText(status: DeploymentStatus) {
  const labels: Record<DeploymentStatus, string> = {
    activating: "Ativando",
    backing_up: "Criando backup",
    building: "Gerando arquivos",
    connecting: "Conectando",
    failed: "Falhou",
    health_check: "Verificando",
    published: "Publicado",
    queued: "Na fila",
    rolled_back: "Rollback executado",
    rolling_back: "Restaurando versão anterior",
    uploading: "Enviando",
    validating: "Validando",
    verifying: "Validando upload",
  };

  return labels[status];
}

function getDeploymentProgressPercent(record: DeploymentRecord) {
  if (record.status === "published" || record.status === "rolled_back") {
    return 100;
  }

  if (record.status === "rolling_back") {
    return 92;
  }

  const currentStageIndex = stageLabels.findIndex((stage) => stage.status === record.status);

  if (currentStageIndex < 0) {
    return record.status === "failed" ? 100 : 4;
  }

  if (record.status === "uploading" && record.totalBytes > 0) {
    const uploadRatio = Math.min(1, record.bytesUploaded / record.totalBytes);
    return Math.round(((currentStageIndex + uploadRatio) / stageLabels.length) * 100);
  }

  const stageWeight = record.status === "failed" ? 1 : 0.35;

  return Math.max(
    4,
    Math.min(100, Math.round(((currentStageIndex + stageWeight) / stageLabels.length) * 100)),
  );
}

function getStageLabel(stage: (typeof stageLabels)[number], deployment: DeploymentRecord) {
  if (
    stage.status === "backing_up" &&
    deployment.warnings.some((warning) => warning.includes("Backup recente"))
  ) {
    return "Backup recente reutilizado";
  }

  return stage.label;
}

export default function PublishPanel({ initialDeployments }: PublishPanelProps) {
  const [deployments, setDeployments] = useState(initialDeployments);
  const [activeDeploymentId, setActiveDeploymentId] = useState(
    initialDeployments.find((deployment) => activeStatuses.has(deployment.status))?.id ?? "",
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const activeDeployment = useMemo(
    () => deployments.find((deployment) => deployment.id === activeDeploymentId) ?? null,
    [activeDeploymentId, deployments],
  );
  const isPublishing = Boolean(activeDeployment && activeStatuses.has(activeDeployment.status));
  const progressPercent = activeDeployment ? getDeploymentProgressPercent(activeDeployment) : 0;

  async function refreshHistory() {
    const response = await fetch("/api/cms/publish/history", { cache: "no-store" });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { deployments?: DeploymentRecord[] };
    const nextDeployments = payload.deployments ?? [];
    setDeployments(nextDeployments);

    const runningDeployment = nextDeployments.find((deployment) =>
      activeStatuses.has(deployment.status),
    );

    if (runningDeployment) {
      setActiveDeploymentId(runningDeployment.id);
    }
  }

  async function refreshRootSession() {
    await fetch("/cms/session/refresh", {
      method: "POST",
    }).catch(() => {});
  }

  async function applyDeploymentSnapshot(deployment: DeploymentRecord) {
    setDeployments((currentDeployments) => {
      const withoutCurrent = currentDeployments.filter(
        (currentDeployment) => currentDeployment.id !== deployment.id,
      );

      return [deployment, ...withoutCurrent].sort((first, second) =>
        second.startedAt.localeCompare(first.startedAt),
      );
    });
  }

  async function startPublish() {
    setError("");
    setIsStarting(true);

    try {
      await refreshRootSession();
      const response = await fetch("/api/cms/publish", { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        deployment?: DeploymentRecord;
        deploymentId?: string;
        error?: string;
      };

      if (!response.ok || !payload.deploymentId) {
        setError(payload.error ?? "Nao foi possivel iniciar a publicacao.");
        return;
      }

      setActiveDeploymentId(payload.deploymentId);
      setIsConfirming(false);

      if (payload.deployment) {
        await applyDeploymentSnapshot(payload.deployment);
      } else {
        await refreshHistory();
      }
    } finally {
      setIsStarting(false);
    }
  }

  async function rollback(deploymentId: string) {
    setError("");
    const response = await fetch(`/api/cms/publish/${deploymentId}/rollback`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Rollback falhou.");
      return;
    }

    setActiveDeploymentId(deploymentId);
    await refreshHistory();
  }

  useEffect(() => {
    void refreshRootSession();
  }, []);

  useEffect(() => {
    const updateNow = () => {
      setNow(Date.now());
    };
    const timeout = window.setTimeout(updateNow, 0);
    const interval = window.setInterval(updateNow, 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!activeDeploymentId) {
      return undefined;
    }

    let cancelled = false;
    let startedSeq = 0;
    let appliedSeq = 0;
    let intervalId = 0;

    const pollDeployment = async () => {
      const pollSeq = ++startedSeq;

      try {
        const response = await fetch(`/api/cms/publish/${activeDeploymentId}`, {
          cache: "no-store",
        });

        if (!response.ok || cancelled || pollSeq < appliedSeq) {
          return;
        }

        const payload = (await response.json()) as { deployment?: DeploymentRecord };

        if (!payload.deployment || cancelled || pollSeq < appliedSeq) {
          return;
        }

        appliedSeq = pollSeq;
        await applyDeploymentSnapshot(payload.deployment);

        if (!activeStatuses.has(payload.deployment.status) && intervalId) {
          window.clearInterval(intervalId);
          intervalId = 0;
        }
      } catch {
        // Keep polling until the effect is cleared.
      }
    };

    void pollDeployment();
    intervalId = window.setInterval(() => {
      void pollDeployment();
    }, 1000);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [activeDeploymentId]);

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-[#10224f]/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#081736]">Deploy Hostinger</h2>
            <p className="mt-1 text-sm leading-6 text-[#526078]">
              Publica a última versão salva no editor. Só os arquivos alterados sobem via
              SFTP (com backup e rollback). Arquivos iguais à versão publicada são
              reutilizados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            disabled={isPublishing || isStarting}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#f9d600] px-5 py-3 text-sm font-semibold text-[#081736] transition hover:bg-[#e9ca00] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            {isStarting ? "Iniciando..." : "Publicar no site"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        {activeDeployment ? (
          <div className="mt-6 rounded-lg border border-[#10224f]/10 bg-[#fbfcfe] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                  Deployment atual
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-[#081736]">
                  {activeDeployment.id}
                </p>
              </div>
              <span className="w-fit rounded-full bg-[#081736] px-3 py-1 text-xs font-semibold text-white">
                {getStatusText(activeDeployment.status)}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Progresso
                </p>
                <p className="text-sm font-semibold tabular-nums text-[#081736]">
                  {progressPercent}%
                </p>
              </div>
              <div
                className="mt-2 h-3 overflow-hidden rounded-full bg-[#e7ebf2]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                aria-label="Progresso do deploy Hostinger"
              >
                <div
                  className="h-full rounded-full bg-[#f9d600] transition-[width] duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-medium text-[#526078]">
                {getStatusText(activeDeployment.status)}
                {activeDeployment.status === "uploading" && activeDeployment.totalBytes > 0
                  ? ` · ${formatBytes(activeDeployment.bytesUploaded)} enviados`
                  : ""}
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Arquivos a enviar
                </p>
                <p className="mt-1 text-sm font-semibold text-[#081736]">
                  {activeDeployment.filesUploaded}/{activeDeployment.totalFiles}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Enviado
                </p>
                <p className="mt-1 text-sm font-semibold text-[#081736]">
                  {formatBytes(activeDeployment.bytesUploaded)} /{" "}
                  {formatBytes(activeDeployment.totalBytes)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  Duração
                </p>
                <p className="mt-1 text-sm font-semibold text-[#081736]">
                  {formatDuration(activeDeployment, now)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {stageLabels.map((stage) => {
                const stageIndex = stageLabels.findIndex(
                  (item) => item.status === activeDeployment.status,
                );
                const currentIndex = stageLabels.findIndex((item) => item.status === stage.status);
                const isDone =
                  activeDeployment.status === "published" ||
                  currentIndex < stageIndex;
                const isCurrent = activeDeployment.status === stage.status;

                return (
                  <div
                    key={stage.status}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                      isCurrent || isDone
                        ? "border-[#f9d600]/60 bg-[#fff8bf] text-[#081736]"
                        : "border-[#10224f]/10 bg-white text-[#526078]"
                    }`}
                    >
                    <span className="h-2 w-2 rounded-full bg-current" />
                    {getStageLabel(stage, activeDeployment)}
                  </div>
                );
              })}
            </div>

            {activeDeployment.warnings.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {activeDeployment.warnings.map((warning) => (
                  <p
                    key={warning}
                    className="rounded-md bg-[#eef4ff] px-3 py-2 text-sm font-medium text-[#10224f]"
                  >
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}

            {activeDeployment.status === "published" ? (
              <div className="mt-5 rounded-md bg-[#e8f6ef] p-4 text-sm font-medium text-[#146c43]">
                Landing page publicada com sucesso.
                <br />A nova versão já está disponível no site do IDASAN.
              </div>
            ) : null}

            {activeDeployment.status === "rolled_back" ? (
              <div className="mt-5 rounded-md bg-amber-50 p-4 text-sm font-medium text-amber-800">
                A nova versão apresentou falha após a publicação.
                <br />A versão anterior foi restaurada automaticamente.
              </div>
            ) : null}

            {activeDeployment.status === "failed" ? (
              <div className="mt-5 rounded-md bg-red-50 p-4 text-sm font-medium text-red-700">
                {activeDeployment.errorMessage ?? "Publicação falhou."}
              </div>
            ) : null}

            {activeDeployment.publicUrl && activeDeployment.status === "published" ? (
              <a
                href={activeDeployment.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#a48b00] transition hover:text-[#081736]"
              >
                Abrir site publicado
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <aside className="rounded-lg border border-[#10224f]/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#081736]">Histórico</h2>
        <div className="mt-4 grid gap-3">
          {deployments.length === 0 ? (
            <p className="text-sm text-[#526078]">Nenhuma publicação registrada.</p>
          ) : null}
          {deployments.slice(0, 8).map((deployment) => (
            <div
              key={deployment.id}
              className="rounded-lg border border-[#10224f]/10 bg-[#fbfcfe] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#081736]">
                    {getStatusText(deployment.status)}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-[#526078]">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {new Date(deployment.startedAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDeploymentId(deployment.id)}
                  className="text-xs font-semibold text-[#a48b00] hover:text-[#081736]"
                >
                  Ver
                </button>
              </div>
              <p className="mt-2 text-xs text-[#526078]">
                {deployment.totalFiles} arquivos · {formatDuration(deployment, now)}
              </p>
              {deployment.backupPath && deployment.status === "published" ? (
                <button
                  type="button"
                  onClick={() => rollback(deployment.id)}
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#10224f] hover:text-[#a48b00]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Rollback
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </aside>

      {isConfirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#081736]/60 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-[#10224f] shadow-xl">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#fff2a8] text-[#081736]">
                <Rocket className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-semibold text-[#081736]">Publicar nova versão?</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#526078]">
              A versão atual da landing page será enviada para o servidor do IDASAN.
              A publicação anterior será mantida como backup para recuperação; se já houver
              backup válido dos últimos 7 dias, ele será reutilizado para acelerar o deploy.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="rounded-full border border-[#10224f]/12 px-4 py-2 text-sm font-semibold text-[#10224f] transition hover:bg-[#f6f8fb]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={startPublish}
                disabled={isStarting}
                className="inline-flex items-center gap-2 rounded-full bg-[#f9d600] px-4 py-2 text-sm font-semibold text-[#081736] transition hover:bg-[#e9ca00] disabled:opacity-60"
              >
                {isStarting ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#081736]/25 border-t-[#081736]" />
                ) : null}
                {isStarting ? "Iniciando..." : "Publicar agora"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
