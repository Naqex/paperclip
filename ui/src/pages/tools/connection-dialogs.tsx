import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Stethoscope, Trash2, Vault } from "lucide-react";
import type {
  CompanySecret,
  McpConnectionCredentialRef,
  ToolConnection,
} from "@paperclipai/shared";
import { queryKeys } from "@/lib/queryKeys";
import { toolsApi, type CreateToolConnectionInput } from "@/api/tools";
import { secretsApi } from "@/api/secrets";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/context/ToastContext";
import { redactUrlSecrets } from "@/lib/redact-url-secrets";
import {
  LoadingState,
  ErrorState,
  HealthBadge,
  RiskBadge,
  CapabilityBadges,
  QuarantineBadge,
} from "./shared";

export const TRANSPORT_LABEL: Record<string, string> = {
  mcp_remote: "remote http",
  local_stdio: "local stdio",
};

/** Mono URL (remote) or command-template (stdio) subtitle for a connection row. */
export function connectionEndpoint(conn: ToolConnection): string | null {
  const config = { ...(conn.transportConfig ?? {}), ...(conn.config ?? {}) } as Record<string, unknown>;
  const url = config.url ?? config.endpoint ?? config.endpointUrl;
  if (typeof url === "string" && url.trim()) return redactUrlSecrets(url);
  const template = config.templateId ?? config.template ?? config.command;
  if (typeof template === "string" && template.trim()) return template.trim();
  if (Array.isArray(config.command)) return config.command.join(" ");
  return null;
}

/**
 * Display-only vault reference for a credential. The persisted shape is the
 * structured {@link McpConnectionCredentialRef} (secretId + version) — this is
 * just the human-readable `vault://provider/key@version` rendering of it so the
 * operator can confirm *which* vault entry resolves at gateway time. Free-text
 * secrets are never accepted; only references to the secret vault.
 */
function vaultRef(secret: CompanySecret | undefined, version: number | "latest" = "latest"): string {
  if (!secret) return "vault://…";
  const v = version === "latest" || version === undefined ? "latest" : `v${version}`;
  return `vault://${secret.provider}/${secret.key}@${v}`;
}

export function CatalogDialog({ connection, onClose }: { connection: ToolConnection; onClose: () => void }) {
  useInterfaceLanguage();
  const catalog = useQuery({
    queryKey: queryKeys.tools.catalog(connection.id),
    queryFn: () => toolsApi.listCatalog(connection.id),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{interfaceText("m_03fe9b5253d825")}{connection.name}</DialogTitle>
        </DialogHeader>
        {catalog.isLoading ? (
          <LoadingState />
        ) : catalog.error ? (
          <ErrorState error={catalog.error} onRetry={() => catalog.refetch()} />
        ) : (catalog.data?.catalog ?? []).length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{interfaceText("m_1d6cbd4b41cd92")}</p>
        ) : (
          <ul className="max-h-(--sz-60vh) divide-y divide-border overflow-y-auto">
            {(catalog.data?.catalog ?? []).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="font-mono text-sm text-foreground">{entry.toolName}</span>
                <RiskBadge risk={entry.riskLevel} />
                <CapabilityBadges
                  isReadOnly={entry.isReadOnly}
                  isWrite={entry.isWrite}
                  isDestructive={entry.isDestructive}
                />
                {entry.status === "quarantined" ? <QuarantineBadge /> : null}
                {entry.description ? (
                  <p className="w-full truncate text-xs text-muted-foreground">{entry.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

type CredentialDraft = { secretId: string; headerName: string };

/** Probe outcome captured before activation: health + discovered tool count + round-trip latency. */
type ProbeResult = {
  connection: ToolConnection;
  toolCount: number | null;
  quarantinedCount: number;
  latencyMs: number | null;
};

/**
 * New-connection dialog. Enforces secret *references* (no free-text token field)
 * and runs a live gateway probe (health-check + catalog discovery) against the
 * draft before the operator activates it — per the Phase 0B spec surface map.
 */
export function AddConnectionDialog({
  companyId,
  defaultApplicationId,
  onClose,
}: {
  companyId: string;
  defaultApplicationId?: string | null;
  onClose: () => void;
}) {
  useInterfaceLanguage();
  const qc = useQueryClient();
  const { pushToast } = useToast();

  const apps = useQuery({
    queryKey: queryKeys.tools.applications(companyId),
    queryFn: () => toolsApi.listApplications(companyId),
  });
  const secrets = useQuery({
    queryKey: queryKeys.secrets.list(companyId),
    queryFn: () => secretsApi.list(companyId),
  });
  const templates = useQuery({
    queryKey: queryKeys.tools.stdioTemplates(companyId),
    queryFn: () => toolsApi.listStdioTemplates(companyId),
  });

  const [step, setStep] = useState<1 | 2>(defaultApplicationId ? 2 : 1);
  const [applicationMode, setApplicationMode] = useState<"existing" | "new">(
    "existing",
  );
  const [applicationId, setApplicationId] = useState(defaultApplicationId ?? "");
  const [applicationName, setApplicationName] = useState("");
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<"mcp_remote" | "local_stdio">("mcp_remote");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [creds, setCreds] = useState<CredentialDraft[]>([]);
  const [pendingSecretId, setPendingSecretId] = useState("");
  const [pendingHeader, setPendingHeader] = useState("Authorization");
  const [draft, setDraft] = useState<ToolConnection | null>(null);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);

  const secretById = (id: string) => secrets.data?.find((s) => s.id === id);
  const secretName = (id: string) => secretById(id)?.name ?? id.slice(0, 8);

  const credentialRefs: McpConnectionCredentialRef[] = useMemo(
    () =>
      creds.map((c) => ({
        name: c.headerName,
        secretId: c.secretId,
        version: "latest",
        placement: "header",
        key: c.headerName,
      })),
    [creds],
  );

  // Probe runs a real gateway health-check and then a catalog discovery so the
  // pre-activation panel can show status + tool count. Latency is the measured
  // round-trip of the health-check (a single sample — aggregate p95 across
  // traffic is surfaced on the Runtime tab once the connection is live).
  const runProbe = async (id: string): Promise<ProbeResult> => {
    const startedAt = performance.now();
    const health = await toolsApi.checkConnectionHealth(id);
    const latencyMs = Math.round(performance.now() - startedAt);
    try {
      const refreshed = await toolsApi.refreshCatalog(id);
      return {
        connection: refreshed.connection,
        toolCount: refreshed.discoveredCount,
        quarantinedCount: refreshed.quarantinedCount,
        latencyMs,
      };
    } catch {
      // Health may be fine while discovery is not yet possible (e.g. auth pending) —
      // keep the health result and report tools as unknown rather than failing the probe.
      return { connection: health.connection, toolCount: null, quarantinedCount: 0, latencyMs };
    }
  };

  const create = useMutation({
    mutationFn: () => {
      const config: Record<string, unknown> =
        transport === "mcp_remote" ? { url: endpointUrl.trim() } : { templateId };
      const input: CreateToolConnectionInput = {
        ...(applicationMode === "existing" ? { applicationId } : { applicationName: applicationName.trim() }),
        name: name.trim(),
        transport,
        status: "draft",
        enabled: false,
        config,
        credentialRefs,
      };
      return toolsApi.createConnection(companyId, input);
    },
    onSuccess: (conn) => {
      setDraft(conn);
      probe.mutate(conn.id);
    },
    onError: (err) =>
      pushToast({
        title: interfaceText("m_34e01dc15d2e6d"),
        body: err instanceof ApiError ? err.message : String(err),
        tone: "error",
      }),
  });

  const probe = useMutation({
    mutationFn: (id: string) => runProbe(id),
    onSuccess: (res) => {
      setDraft(res.connection);
      setProbeResult(res);
    },
    onError: (err) =>
      pushToast({
        title: interfaceText("m_450e4a86d32cc9"),
        body: err instanceof ApiError ? err.message : String(err),
        tone: "error",
      }),
  });

  const activate = useMutation({
    mutationFn: (id: string) => toolsApi.updateConnection(id, { status: "active", enabled: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tools.connections(companyId) });
      qc.invalidateQueries({ queryKey: queryKeys.tools.applications(companyId) });
      pushToast({ title: interfaceText("m_7513bee5995772"), tone: "success" });
      onClose();
    },
    onError: (err) =>
      pushToast({
        title: interfaceText("m_7b08548e07c9f3"),
        body: err instanceof ApiError ? err.message : String(err),
        tone: "error",
      }),
  });

  const addCred = () => {
    if (!pendingSecretId || !pendingHeader.trim()) return;
    setCreds((c) => [...c, { secretId: pendingSecretId, headerName: pendingHeader.trim() }]);
    setPendingSecretId("");
  };

  const transportConfigValid =
    transport === "mcp_remote" ? endpointUrl.trim().length > 0 : templateId.length > 0;
  const appChoiceValid = applicationMode === "existing" ? !!applicationId : applicationName.trim().length > 0;
  const canCreate = appChoiceValid && name.trim().length > 0 && transportConfigValid && !create.isPending;
  const locked = !!draft;
  const inferredType = transport === "mcp_remote" ? "MCP HTTP" : "MCP stdio";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{interfaceText("m_78a2823b0c41db")}</DialogTitle>
          <DialogDescription>{interfaceText("m_ee54f7f95505ee")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={step === 1 ? "font-medium text-foreground" : ""}>{interfaceText("m_5400c38240f460")}</span>
            <span>/</span>
            <span className={step === 2 ? "font-medium text-foreground" : ""}>{interfaceText("m_cd9681f07aeff8")}</span>
          </div>

          {step === 1 && !locked ? (
            <>
              <div className="space-y-1.5">
                <Label>{interfaceText("m_e7ad522ea327e5")}</Label>
                <Select value={applicationMode} onValueChange={(v) => setApplicationMode(v as "existing" | "new")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">{interfaceText("m_9d8a298c991038")}</SelectItem>
                    <SelectItem value="new">{interfaceText("m_db7ee51718bd6f")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {applicationMode === "existing" ? (
                <div className="space-y-1.5">
                  <Label>{interfaceText("m_f34fddb355f3f8")}</Label>
                  <Select value={applicationId} onValueChange={setApplicationId}>
                    <SelectTrigger>
                      <SelectValue placeholder={interfaceText("m_0633c481c5e2c9")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(apps.data?.applications ?? []).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="app-name">{interfaceText("m_ec8e246abec8a6")}</Label>
                  <Input
                    id="app-name"
                    value={applicationName}
                    onChange={(e) => setApplicationName(e.target.value)}
                    placeholder={interfaceText("m_5623b90e786811")}
                  />
                  <p className="text-xs text-muted-foreground">{interfaceText("m_6434b70a11e116")}</p>
                </div>
              )}
            </>
          ) : null}

          {step === 2 || locked ? (
            <>
              {applicationMode === "new" ? (
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{applicationName.trim()}</span>{interfaceText("m_b09b69abf8caa1")}{" "}
                  {inferredType}.
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="conn-name">{interfaceText("m_686d4d5d8ecd1a")}</Label>
                <Input
                  id="conn-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={interfaceText("m_2190465589ef6d")}
                  disabled={locked}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{interfaceText("m_aaead4abf5d0fd")}</Label>
                <Select
                  value={transport}
                  onValueChange={(v) => setTransport(v as "mcp_remote" | "local_stdio")}
                  disabled={locked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcp_remote">{interfaceText("m_737db5bb5f804c")}</SelectItem>
                    <SelectItem value="local_stdio">{interfaceText("m_a40e9e7b43006e")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {transport === "mcp_remote" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="conn-url">{interfaceText("m_2578179d177903")}</Label>
                  <Input
                    id="conn-url"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder="https://mcp.example.com"
                    disabled={locked}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>{interfaceText("m_289540022decef")}</Label>
                  <Select value={templateId} onValueChange={setTemplateId} disabled={locked}>
                    <SelectTrigger>
                      <SelectValue placeholder={interfaceText("m_0923c8808869ee")} />
                    </SelectTrigger>
                    <SelectContent>
                      {(templates.data?.templates ?? []).map((t) => (
                        <SelectItem key={t.templateId} value={t.templateId}>
                          {t.name ?? t.templateId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{interfaceText("m_fdddaf69c79eb4")}</p>
                </div>
              )}

              {/* Vault-reference credential picker — no free-text token field. */}
              <div className="space-y-1.5">
                <Label>{interfaceText("m_24072f3e211e8c")}</Label>
                {creds.length > 0 ? (
                  <ul className="space-y-1">
                    {creds.map((c, i) => (
                      <li
                        key={`${c.secretId}-${i}`}
                        className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-sm"
                      >
                        <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-mono text-xs">{c.headerName}</span>
                        <span className="truncate font-mono text-xs text-primary" title={vaultRef(secretById(c.secretId))}>
                          → {vaultRef(secretById(c.secretId))}
                        </span>
                        {!locked ? (
                          <button
                            type="button"
                            className="ml-auto text-muted-foreground hover:text-destructive"
                            onClick={() => setCreds((cs) => cs.filter((_, idx) => idx !== i))}
                            aria-label={interfaceText("m_442318181bef15", { value0: (secretName(c.secretId)) })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {!locked ? (
                  <>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Select value={pendingSecretId} onValueChange={setPendingSecretId}>
                          <SelectTrigger>
                            <SelectValue placeholder={interfaceText("m_4dbed3fda22dd4")} />
                          </SelectTrigger>
                          <SelectContent>
                            {(secrets.data ?? []).map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        value={pendingHeader}
                        onChange={(e) => setPendingHeader(e.target.value)}
                        placeholder={interfaceText("m_ba5caa4285a84d")}
                        className="w-32"
                        aria-label={interfaceText("m_c1dcc8fb31f6ee")}
                      />
                      <Button type="button" size="sm" variant="outline" onClick={addCred} disabled={!pendingSecretId}>{interfaceText("m_9fd728c66c9a25")}</Button>
                    </div>
                    {pendingSecretId ? (
                      <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                        <Vault className="h-3 w-3" />
                        {vaultRef(secretById(pendingSecretId))}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">{interfaceText("m_b0ea47b7cf49e3")}<span className="font-mono"> vault://</span>{interfaceText("m_76d8a7293637fe")}</p>
                  </>
                ) : null}
              </div>
            </>
          ) : null}

          {/* Inline probe panel — runs before activation, follows the Loading/Error rhythm. */}
          {locked ? (
            probe.isPending ? (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <LoadingState label={interfaceText("m_83e7324911e55c")} />
              </div>
            ) : probe.isError ? (
              <ErrorState error={probe.error} onRetry={() => draft && probe.mutate(draft.id)} />
            ) : probeResult ? (
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">{interfaceText("m_68fe6fecdaa531")}</span>
                  <HealthBadge status={probeResult.connection.healthStatus} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {probeResult.toolCount ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{interfaceText("m_575eb830e4ab60")}</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {probeResult.latencyMs != null ? `${probeResult.latencyMs}ms` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{interfaceText("m_8906bb37ed7116")}</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {probeResult.quarantinedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">{interfaceText("m_c3ecfc91e8f0cc")}</p>
                  </div>
                </div>
                {probeResult.connection.healthMessage ? (
                  <p className="mt-2 text-xs text-muted-foreground">{probeResult.connection.healthMessage}</p>
                ) : null}
                {probeResult.connection.lastError ? (
                  <p className="mt-1 text-xs text-destructive">{probeResult.connection.lastError}</p>
                ) : null}
                <p className="mt-2 text-(length:--text-micro) text-muted-foreground">{interfaceText("m_f6b173bf877f9a")}</p>
              </div>
            ) : null
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{interfaceText("m_19766ed6ccb2f4")}</Button>
          {step === 1 && !locked ? (
            <Button disabled={!appChoiceValid} onClick={() => setStep(2)}>{interfaceText("m_31fbef162594de")}</Button>
          ) : !locked ? (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>{interfaceText("m_76900f1bfd16c8")}</Button>
              <Button disabled={!canCreate} onClick={() => create.mutate()}>
                {create.isPending ? interfaceText("m_015a9221fa83a9") : interfaceText("m_b9ce8f601b388b")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={probe.isPending} onClick={() => draft && probe.mutate(draft.id)}>
                <Stethoscope className="mr-1 h-3.5 w-3.5" />
                {probe.isPending ? interfaceText("m_dc65606730ce16") : interfaceText("m_50f72e66b72f6a")}
              </Button>
              <Button disabled={activate.isPending || probe.isPending} onClick={() => draft && activate.mutate(draft.id)}>
                {activate.isPending ? interfaceText("m_230f6d1b67f9fd") : interfaceText("m_24433c70eba5b1")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
