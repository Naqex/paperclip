import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  CircleSlash,
  FlaskConical,
  Loader2,
  Minus,
  Play,
  Power,
  RotateCcw,
  ServerCog,
  X,
} from "lucide-react";
import type { SmokeRun, SmokeRunStep } from "@paperclipai/shared";
import { smokeLabApi } from "@/api/smokeLab";
import { queryKeys } from "@/lib/queryKeys";
import { useToast } from "@/context/ToastContext";
import { useSmokeLabEnabled } from "@/hooks/useSmokeLabEnabled";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import {
  LIFECYCLE_STAGES,
  SMOKE_PATH_LABELS,
  SMOKE_PATHS,
  buildSmokeMatrix,
  cellKey,
  failingPaths,
  runHealth,
  type CellStatus,
} from "./smoke-lab-matrix";

// Public, non-secret fixture credentials for the fake OAuth provider. Kept in
// sync with SMOKE_LAB_DEMO_EMAIL / SMOKE_LAB_DEMO_PASSWORD in
// server/src/services/smoke-lab.ts — deterministic demo values, never real.
const DEMO_EMAIL = "smoke@paperclip.test";
const DEMO_PASSWORD = "smoke-password";

function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value as string | Date);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function serviceTone(status: string): "success" | "warn" | "error" | "muted" {
  if (status === "running") return "success";
  if (status === "error") return "error";
  return "muted";
}

function CellGlyph({ status }: { status: CellStatus }) {
  useInterfaceLanguage();
  if (status === "pass") return <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label={interfaceText("m_d74ff0ee8da3b9")} />;
  if (status === "fail") return <X className="mx-auto h-4 w-4 text-destructive" aria-label={interfaceText("m_51280dabfbc880")} />;
  if (status === "skipped") return <Minus className="mx-auto h-4 w-4 text-amber-500" aria-label={interfaceText("m_389595a44dc9dc")} />;
  return <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-muted-foreground/30" aria-label={interfaceText("m_b4a984371bc54d")} />;
}

const HEALTH_STYLES: Record<string, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-destructive",
  unknown: "bg-muted-foreground/40",
};

export function SmokeLabTab({ companyId }: { companyId: string }) {
  useInterfaceLanguage();
  const { enabled, loaded } = useSmokeLabEnabled();
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const servicesQuery = useQuery({
    queryKey: queryKeys.smokeLab.services(companyId),
    queryFn: () => smokeLabApi.listServices(companyId),
    enabled: enabled && loaded,
    refetchInterval: enabled ? 10_000 : false,
  });

  const runsQuery = useQuery({
    queryKey: queryKeys.smokeLab.runs(companyId),
    queryFn: () => smokeLabApi.listRuns(companyId),
    enabled: enabled && loaded,
    refetchInterval: enabled ? 10_000 : false,
  });

  const runs = runsQuery.data?.runs ?? [];
  const activeRunId = selectedRunId ?? runs[0]?.id ?? null;

  const runDetailQuery = useQuery({
    queryKey: queryKeys.smokeLab.run(companyId, activeRunId ?? "__none__"),
    queryFn: () => smokeLabApi.getRun(companyId, activeRunId!),
    enabled: enabled && loaded && !!activeRunId,
    refetchInterval: enabled && !!activeRunId ? 10_000 : false,
  });

  const steps = useMemo<SmokeRunStep[]>(() => runDetailQuery.data?.steps ?? [], [runDetailQuery.data]);
  const matrix = useMemo(() => buildSmokeMatrix(steps), [steps]);
  const activeRun = runDetailQuery.data?.run;

  function refresh() {
    qc.invalidateQueries({ queryKey: queryKeys.smokeLab.services(companyId) });
    qc.invalidateQueries({ queryKey: queryKeys.smokeLab.runs(companyId) });
    if (activeRunId) qc.invalidateQueries({ queryKey: queryKeys.smokeLab.run(companyId, activeRunId) });
  }

  const startMutation = useMutation({
    mutationFn: () => smokeLabApi.startServices(companyId),
    onSuccess: () => {
      pushToast({ title: interfaceText("m_725d1544f5f08a"), tone: "success" });
      refresh();
    },
    onError: (e: Error) => pushToast({ title: interfaceText("m_b3bd9d2b5b20f6"), body: e.message, tone: "error" }),
  });

  const stopMutation = useMutation({
    mutationFn: () => smokeLabApi.stopServices(companyId),
    onSuccess: () => {
      pushToast({ title: interfaceText("m_22c4412453a038"), tone: "info" });
      refresh();
    },
    onError: (e: Error) => pushToast({ title: interfaceText("m_42fc061cb203fe"), body: e.message, tone: "error" }),
  });

  const installMutation = useMutation({
    mutationFn: () => smokeLabApi.installFixtures(companyId),
    onSuccess: (r) => {
      pushToast({
        title: r.created ? interfaceText("m_fd0954789d12c8") : interfaceText("m_0e40030d9c6103"),
        tone: "success",
      });
      refresh();
    },
    onError: (e: Error) => pushToast({ title: interfaceText("m_d2d1735e478c0b"), body: e.message, tone: "error" }),
  });

  const resetMutation = useMutation({
    mutationFn: () => smokeLabApi.reset(companyId),
    onSuccess: () => {
      pushToast({ title: interfaceText("m_2c78b1f9c49ae7"), tone: "info" });
      setSelectedRunId(null);
      refresh();
    },
    onError: (e: Error) => pushToast({ title: interfaceText("m_7a78fddef06eeb"), body: e.message, tone: "error" }),
  });

  const runSmokeMutation = useMutation({
    mutationFn: () => smokeLabApi.createRun(companyId, { trigger: "manual", summary: {} }),
    onSuccess: (r) => {
      pushToast({
        title: interfaceText("m_6fd2df1a97f6fa"),
        body: interfaceText("m_9c9e23fcedbe8a"),
        tone: "success",
      });
      setSelectedRunId(r.run.id);
      refresh();
    },
    onError: (e: Error) => pushToast({ title: interfaceText("m_8e76bd0a4e59dd"), body: e.message, tone: "error" }),
  });

  const anyMutating =
    startMutation.isPending ||
    stopMutation.isPending ||
    installMutation.isPending ||
    resetMutation.isPending ||
    runSmokeMutation.isPending;

  // Flag off — hidden. The server is authoritative; this is the friendly UX gate.
  if (loaded && !enabled) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-foreground">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">{interfaceText("m_a63d7e06c43f95")}</h2>
        </div>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{interfaceText("m_34ed44e82db397")}<code className="rounded bg-muted px-1 py-0.5 text-xs">{interfaceText("m_876badbfdc245f")}</code>{" "}{interfaceText("m_268ccf7359a6e9")}</p>
      </div>
    );
  }

  if (!loaded) {
    return <div className="p-6 text-sm text-muted-foreground">{interfaceText("m_e0263a20ce4b35")}</div>;
  }

  const services = servicesQuery.data?.services ?? [];
  const health = runHealth(activeRun, steps);
  const failing = failingPaths(steps);

  return (
    <div className="flex flex-col gap-6" data-testid="smoke-lab-tab">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <FlaskConical className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">{interfaceText("m_876badbfdc245f")}</h1>
          <Badge variant="outline">{interfaceText("m_3dc9f569422dcf")}</Badge>
          <a
            href="https://github.com/paperclipai/paperclip/blob/master/doc/connections/SMOKE-LAB-TUTORIAL.md"
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <BookOpen className="h-4 w-4" />{interfaceText("m_de270757ad1012")}</a>
        </div>
        <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{interfaceText("m_5e7eecdb4a3779")}{" "}
          <a
            href="https://github.com/paperclipai/paperclip/blob/master/doc/connections/SMOKE-LAB-TUTORIAL.md"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >{interfaceText("m_728428eb66fc28")}</a>
          .
        </p>
      </header>

      {/* Services */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ServerCog className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{interfaceText("m_e2b94ef58a85cf")}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => startMutation.mutate()}
              disabled={anyMutating}
            >
              <Power className="h-4 w-4" />{interfaceText("m_2e7f6a62f5015c")}</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => stopMutation.mutate()}
              disabled={anyMutating}
            >{interfaceText("m_cae7d57bc067a5")}</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => installMutation.mutate()}
              disabled={anyMutating}
            >{interfaceText("m_5aa55b8765b554")}</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => resetMutation.mutate()}
              disabled={anyMutating}
            >
              <RotateCcw className="h-4 w-4" />{interfaceText("m_c571483c83b640")}</Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <div key={service.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{service.label}</p>
                  <p className="text-xs text-muted-foreground">{service.detail ?? service.id}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      service.status === "running"
                        ? "bg-emerald-500"
                        : service.status === "error"
                          ? "bg-destructive"
                          : "bg-muted-foreground/40",
                    )}
                  />
                  <span
                    className={cn(
                      serviceTone(service.status) === "success" && "text-emerald-600 dark:text-emerald-400",
                      serviceTone(service.status) === "error" && "text-destructive",
                      serviceTone(service.status) === "muted" && "text-muted-foreground",
                    )}
                  >
                    {service.status}
                  </span>
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-xs">
                <div className="flex items-baseline gap-2">
                  <dt className="w-16 shrink-0 text-muted-foreground">URL</dt>
                  <dd className="min-w-0 break-all font-mono text-foreground">
                    {service.url ?? <span className="text-muted-foreground">{interfaceText("m_415ed734030395")}</span>}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground">{interfaceText("m_ffd5cd699c1035")}</p>
          )}
        </div>

        {/* Demo credentials for the fake OAuth login */}
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold text-foreground">{interfaceText("m_724bbba6981f39")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{interfaceText("m_78c334ce66a400")}</p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-foreground">
            <span>email: {DEMO_EMAIL}</span>
            <span>{interfaceText("m_e1f368f10fc56d")}{DEMO_PASSWORD}</span>
          </div>
        </div>
      </section>

      {/* Results matrix */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{interfaceText("m_d569a4241b363c")}</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />{interfaceText("m_f2752b292e1333")}</span>
            <span className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5 text-destructive" />{interfaceText("m_e21a9f364df2de")}</span>
            <span className="inline-flex items-center gap-1"><Minus className="h-3.5 w-3.5 text-amber-500" />{interfaceText("m_24c76fca204914")}</span>
            <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />{interfaceText("m_39355f078b64be")}</span>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">{interfaceText("m_62fa5a5b0d3c31")}</th>
                {LIFECYCLE_STAGES.map((stage) => (
                  <th key={stage.key} className="px-2 py-2 text-center font-medium text-muted-foreground">
                    {stage.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SMOKE_PATHS.map((path) => (
                <tr key={path} className="border-b border-border last:border-0">
                  <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left">
                    <span className="font-mono font-semibold text-foreground">{path}</span>
                    <span className="ml-2 text-foreground">{SMOKE_PATH_LABELS[path].title}</span>
                    <span className="block text-(length:--text-micro) font-normal text-muted-foreground">
                      {SMOKE_PATH_LABELS[path].detail}
                    </span>
                  </th>
                  {LIFECYCLE_STAGES.map((stage) => {
                    const cell = matrix.get(cellKey(path, stage.key));
                    return (
                      <td key={stage.key} className="px-2 py-2 text-center">
                        <CellGlyph status={cell?.status ?? "not-run"} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {steps.length === 0 && (
          <p className="text-xs text-muted-foreground">{interfaceText("m_94bd95c0b77942")}</p>
        )}
      </section>

      {/* Run history + drill-down */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{interfaceText("m_848f54e89660ce")}</h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", HEALTH_STYLES[health])} />
              {health === "unknown" ? interfaceText("m_2a48c47f0155af") : health}
              {failing.length > 0 && interfaceText("m_31b3346a45e323", { value0: (failing.join(", ")) })}
            </span>
          </div>
          <Button size="sm" onClick={() => runSmokeMutation.mutate()} disabled={anyMutating}>
            {runSmokeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}{interfaceText("m_d0b1943089dc3e")}</Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-(--gtc-64)">
          <div className="rounded-lg border border-border">
            {runs.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">{interfaceText("m_c13e0702dbf008")}</p>
            )}
            <ul className="divide-y divide-border">
              {runs.map((run: SmokeRun) => {
                const isActive = run.id === activeRunId;
                return (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRunId(run.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-accent/50",
                        isActive && "bg-accent",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-medium text-foreground">{formatTime(run.startedAt)}</span>
                        <span className="block text-(length:--text-micro) text-muted-foreground">{run.trigger}</span>
                      </span>
                      <StatusBadge status={run.status} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="min-w-0 rounded-lg border border-border">
            {!activeRun && (
              <p className="p-4 text-sm text-muted-foreground">{interfaceText("m_dedf4f449a4983")}</p>
            )}
            {activeRun && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">{interfaceText("m_fdc85156a1e21f")}{formatTime(activeRun.startedAt)}{interfaceText("m_d2ec714ce86b52")}{formatTime(activeRun.finishedAt)}
                  </span>
                  <StatusBadge status={activeRun.status} />
                </div>
                {steps.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">{interfaceText("m_3bb9e2770612dd")}</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {steps.map((step) => (
                      <li key={step.id} className="flex items-start gap-3 px-4 py-2.5">
                        <span className="mt-0.5">
                          {step.status === "pass" ? (
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : step.status === "fail" ? (
                            <X className="h-4 w-4 text-destructive" />
                          ) : (
                            <CircleSlash className="h-4 w-4 text-amber-500" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground">
                            <span className="font-mono">{step.path}</span> · {step.scenarioStep}
                          </p>
                          {step.detail && (
                            <p className="mt-0.5 break-words text-(length:--text-micro) text-muted-foreground">{step.detail}</p>
                          )}
                          {step.screenshotArtifactRef && typeof step.screenshotArtifactRef.url === "string" && (
                            <a
                              href={step.screenshotArtifactRef.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-(length:--text-micro) font-medium text-primary hover:underline"
                            >{interfaceText("m_acf862e2739fdd")}</a>
                          )}
                        </div>
                        {typeof step.durationMs === "number" && (
                          <span className="shrink-0 text-(length:--text-micro) tabular-nums text-muted-foreground">
                            {step.durationMs}ms
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
