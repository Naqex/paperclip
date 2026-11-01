import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_AGENT_OBSERVABILITY_CAPTURE, updateAgentObservabilitySchema, isSameOtlpOrigin,
  type AgentObservabilityCapture, type AgentObservabilitySettings, type AgentObservabilitySettingsResponse,
  type AgentObservabilityTestReceipt, type UpdateAgentObservabilityRequest,
} from "@paperclipai/shared";
import { agentObservabilityApi } from "@/api/agent-observability";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleField } from "@/components/agent-config-primitives";

type HeaderDraft = { id: number; originalName: string | null; name: string; value: string };
const captureLabels: Array<{ key: keyof AgentObservabilityCapture; label: string }> = [
  { key: "userPrompts", get label() { return interfaceText("m_218ee0bc346e3a"); } },
  { key: "assistantResponses", get label() { return interfaceText("m_441bc642393f42"); } },
  { key: "toolContent", get label() { return interfaceText("m_bc91e29f279f67"); } },
  { key: "toolDetails", get label() { return interfaceText("m_e33d57941a67f6"); } },
];
export interface AgentObservabilitySettingsViewProps {
  companyId: string;
  settings: AgentObservabilitySettings | null;
  canManage?: boolean;
  saving?: boolean;
  testing?: boolean;
  removing?: boolean;
  error?: string | null;
  conflict?: boolean;
  result?: AgentObservabilityTestReceipt | null;
  /** Changes only after an explicit successful mutation, never a background refetch. */
  resetKey?: number;
  onSave: (input: UpdateAgentObservabilityRequest) => void;
  onTest: () => void;
  onRemove: () => void;
  onReload?: () => void;
}

export function AgentObservabilitySettingsView(props: AgentObservabilitySettingsViewProps) {
  useInterfaceLanguage();
  const { companyId, settings, canManage = true, saving, testing, removing, error, conflict, onSave, onTest, onRemove, onReload } = props;
  const [provider, setProvider] = useState<"braintrust" | "otlp">("braintrust");
  const [projectId, setProjectId] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [capture, setCapture] = useState<AgentObservabilityCapture>({ ...DEFAULT_AGENT_OBSERVABILITY_CAPTURE });
  const [apiKey, setApiKey] = useState("");
  const [replaceKey, setReplaceKey] = useState(false);
  const [headers, setHeaders] = useState<HeaderDraft[]>([]);
  const [validation, setValidation] = useState<string | null>(null);
  const [applied, setApplied] = useState<AgentObservabilitySettings | null>(settings);
  const nextHeader = useRef(0);
  const revision = settings?.revision ?? null;
  function reset() {
    setApplied(settings);
    setProvider(settings?.destination.provider ?? "braintrust");
    setProjectId(settings?.destination.provider === "braintrust" ? settings.destination.projectId : "");
    setEndpoint(settings?.destination.provider === "otlp" ? settings.destination.endpointBaseUrl : "");
    setEnabled(settings?.enabled ?? false);
    setCapture({ ...(settings?.capture ?? DEFAULT_AGENT_OBSERVABILITY_CAPTURE) });
    setApiKey(""); setReplaceKey(false); setValidation(null);
    setHeaders((settings?.destination.provider === "otlp" ? settings.headerNames : []).map(name => ({ id: nextHeader.current++, originalName: name, name, value: "" })));
  }
  const original = applied;
  const headersChanged = provider === "otlp" && (headers.some(row => row.value || row.originalName !== row.name.toLowerCase())
    || JSON.stringify(headers.map(row => row.name.toLowerCase()).sort()) !== JSON.stringify(original?.destination.provider === "otlp" ? [...original.headerNames].sort() : []));
  const dirty = !original || provider !== original.destination.provider || enabled !== original.enabled || replaceKey || Boolean(apiKey) || headersChanged
    || JSON.stringify(capture) !== JSON.stringify(original.capture)
    || (provider === "braintrust" ? projectId !== (original.destination.provider === "braintrust" ? original.destination.projectId : "")
      : endpoint !== (original.destination.provider === "otlp" ? original.destination.endpointBaseUrl : ""));
  // Explicit mutation success/company changes erase secrets. Background reads
  // may update a clean form, but cannot overwrite an unsaved draft.
  useEffect(() => { reset(); }, [companyId, props.resetKey]);
  useEffect(() => { if (!dirty && !conflict) reset(); }, [revision]);
  const hasConflict = Boolean(conflict || revision !== (original?.revision ?? null));
  const requireFreshHeaders = provider === "otlp" && original?.destination.provider === "otlp"
    && original.headerNames.length > 0 && !isSameOtlpOrigin(original.destination, { provider: "otlp", endpointBaseUrl: endpoint });
  const busy = saving || testing || removing;
  const providerChanged = !original || original.destination.provider !== provider;
  function save(overrideEnabled?: boolean) {
    if (requireFreshHeaders && headers.some(row => !row.value)) {
      setValidation("Re-enter every header value for the new endpoint, or remove the header."); return;
    }
    const common = { expectedRevision: original?.revision ?? null, enabled: overrideEnabled ?? enabled, capture };
    const input = provider === "braintrust"
      ? { ...common, destination: { provider, projectId }, credentials: providerChanged || replaceKey || apiKey || (!original?.credentialsConfigured && common.enabled) ? { mode: "replace", apiKey } : { mode: "keep" } }
      : { ...common, destination: { provider, endpointBaseUrl: endpoint }, credentials: providerChanged || headersChanged || requireFreshHeaders
        ? { mode: "replace", headers: headers.map(row => ({ name: row.name, ...(row.value ? { value: row.value } : {}) })) } : { mode: "keep" } };
    const parsed = updateAgentObservabilitySchema.safeParse(input);
    if (!parsed.success) { setValidation(parsed.error.issues[0]?.message ?? "Review the configuration."); return; }
    setValidation(null); onSave(parsed.data);
  }
  const receipt = props.result?.revision === revision ? props.result : settings?.lastTest;
  return <section aria-labelledby="agent-observability-heading" className="max-w-2xl space-y-4">
    <div className="space-y-1">
      <h2 id="agent-observability-heading" className="text-lg font-medium">{interfaceText("m_88e9eaa25e4ce3")}</h2>
      <p className="text-sm text-muted-foreground">{interfaceText("m_dab6469f43a1a5")}</p>
    </div>
    {!canManage ? <p className="text-sm text-muted-foreground">{interfaceText("m_a80f6a57c3ec11")}</p> : <>
      <fieldset disabled={busy} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-observability-provider">{interfaceText("m_293d404a500f5f")}</Label>
          <select id="agent-observability-provider" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={provider}
            onChange={event => { setProvider(event.target.value as "braintrust" | "otlp"); setApiKey(""); setReplaceKey(false); setValidation(null); }}>
            <option value="braintrust">Braintrust</option><option value="otlp">{interfaceText("m_e3f3526e831094")}</option>
          </select>
        </div>
        {provider === "braintrust" ? <>
          <div className="space-y-2"><Label htmlFor="agent-observability-project">{interfaceText("m_e511470b21a90c")}</Label>
            <Input id="agent-observability-project" value={projectId} onChange={event => setProjectId(event.target.value)} placeholder={interfaceText("m_69277b6e22a43e")} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-observability-key">{interfaceText("m_16f0ee47f993d6")}</Label>
            {!providerChanged && original?.credentialsConfigured && !replaceKey ? <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">{interfaceText("m_73449404d84574")}</span><Button type="button" variant="outline" size="sm" onClick={() => setReplaceKey(true)}>{interfaceText("m_f97925f1e14bff")}</Button>
            </div> : <Input id="agent-observability-key" type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} autoComplete="new-password" />}
          </div>
        </> : <>
          <div className="space-y-2"><Label htmlFor="agent-observability-endpoint">{interfaceText("m_f1d4c59f5fd1dc")}</Label>
            <Input id="agent-observability-endpoint" value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://collector.example.com" autoComplete="off" />
            <p className="text-xs text-muted-foreground">{interfaceText("m_1ecb367271e39c")}</p>
          </div>
          <div className="space-y-2"><div className="flex items-center justify-between gap-3"><Label>{interfaceText("m_194e9fe656a1bc")}</Label>
            <Button type="button" variant="outline" size="sm" disabled={headers.length >= 16} onClick={() => setHeaders(rows => [...rows, { id: nextHeader.current++, originalName: null, name: "", value: "" }])}>{interfaceText("m_1192c90dd4972a")}</Button></div>
            {headers.length === 0 && <p className="text-sm text-muted-foreground">{interfaceText("m_f9ffc360b46090")}</p>}
            {headers.map(row => <div key={row.id} className="flex flex-wrap items-center gap-2">
              <Input className="min-w-0 flex-1" aria-label={interfaceText("m_c1dcc8fb31f6ee")} value={row.name} onChange={event => setHeaders(rows => rows.map(item => item.id === row.id ? { ...item, name: event.target.value } : item))} autoComplete="off" />
              <Input className="min-w-0 flex-1" aria-label={interfaceText("m_6937517a774c9b", { value0: (row.name || "header") })} type="password" value={row.value} placeholder={row.originalName && !requireFreshHeaders ? interfaceText("m_884e111c195029") : interfaceText("m_f9a9058c0c22e5")}
                onChange={event => setHeaders(rows => rows.map(item => item.id === row.id ? { ...item, value: event.target.value } : item))} autoComplete="new-password" />
              <Button type="button" size="sm" variant="ghost" aria-label={interfaceText("m_e224cf245aada5", { value0: (row.name || "header") })} onClick={() => setHeaders(rows => rows.filter(item => item.id !== row.id))}>{interfaceText("m_c3812fc4acb861")}</Button>
            </div>)}
          </div>
        </>}
        <p className="text-xs text-muted-foreground">{interfaceText("m_9c8b751417d141")}</p>
        <ToggleField label={interfaceText("m_64c2a9cf272391")} checked={enabled} onChange={setEnabled} hint={interfaceText("m_6363e56800a408")} />
        <details><summary className="cursor-pointer text-sm font-medium">{interfaceText("m_3d5b30d0812373")}</summary>
          <div className="space-y-3 pt-3">{captureLabels.map(row => <ToggleField key={row.key} label={row.label} checked={capture[row.key]} onChange={value => setCapture(current => ({ ...current, [row.key]: value }))} />)}
            <p className="text-xs text-muted-foreground">{interfaceText("m_3e399d01ff5a5a")}</p>
          </div>
        </details>
      </fieldset>
      {(validation || error || hasConflict) && <p role="alert" className="text-sm text-destructive">{validation || error || interfaceText("m_f11812727aa9fa")}</p>}
      {hasConflict && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => { reset(); onReload?.(); }}>{interfaceText("m_415db71a129627")}</Button>}
      {!dirty && receipt && <div role="status" className="space-y-1 text-sm">
        <p className="font-medium">{receipt.status === "accepted" ? interfaceText("m_52d6b87c89bc10") : receipt.status === "partial" ? interfaceText("m_feee591c0fe63a") : interfaceText("m_151fc55b5bce69")}</p>
        <p className="text-xs text-muted-foreground">{new Date(receipt.finishedAt).toLocaleString()}{interfaceText("m_104d628dfc740c")}</p>
        {(["logs", "traces"] as const).map(signal => receipt.signals[signal].message && <p key={signal}>{signal === "logs" ? interfaceText("m_ea2100dc89ae9f") : interfaceText("m_998741a58ed2b4")}: {receipt.signals[signal].message}</p>)}
      </div>}
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" disabled={busy || !dirty} onClick={reset}>{interfaceText("m_19766ed6ccb2f4")}</Button>
        <Button type="button" disabled={busy || !dirty || hasConflict} onClick={() => save()}>{saving ? interfaceText("m_23e39291d61358") : interfaceText("m_dd0ae7a5cbcf23")}</Button>
      </div>
      {dirty && settings && <p className="text-xs text-muted-foreground">{interfaceText("m_10a5f254580803")}</p>}
      {settings && <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={busy || dirty || hasConflict} onClick={onTest}>{testing ? interfaceText("m_407b7a04662f2a") : interfaceText("m_46f4577c611eda")}</Button>
        {settings.enabled && <Button type="button" size="sm" variant="ghost" disabled={busy || dirty || hasConflict} onClick={() => save(false)}>{interfaceText("m_c82de6679205f4")}</Button>}
        <Button type="button" size="sm" variant="ghost" disabled={busy || dirty || hasConflict} onClick={onRemove}>{removing ? interfaceText("m_d4b09919ec929f") : interfaceText("m_b2556f83e5d49e")}</Button>
      </div>}
    </>}
  </section>;
}

export function AgentObservabilitySettingsSection({ companyId }: { companyId: string }) {
  return <AgentObservabilitySettingsContainer key={companyId} companyId={companyId} />;
}
function AgentObservabilitySettingsContainer({ companyId }: { companyId: string }) {
  useInterfaceLanguage();
  const client = useQueryClient();
  const queryKey = ["agent-observability", companyId];
  const query = useQuery({ queryKey, queryFn: () => agentObservabilityApi.settings(companyId) });
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const accept = (data: AgentObservabilitySettingsResponse) => { client.setQueryData(queryKey, data); setError(null); setConflict(false); setResetKey(value => value + 1); };
  const reject = (cause: unknown) => {
    const stale = cause instanceof ApiError && cause.status === 409;
    setConflict(stale);
    setError(stale ? "Another administrator changed these settings. Reload the saved settings to continue." : cause instanceof Error ? cause.message : "The observability settings could not be updated.");
  };
  const save = useMutation({ gcTime: 0, mutationFn: (input: UpdateAgentObservabilityRequest) => agentObservabilityApi.update(companyId, input), onSuccess: accept, onError: reject, onSettled: () => queueMicrotask(() => save.reset()) });
  const remove = useMutation({ mutationFn: (revision: string) => agentObservabilityApi.remove(companyId, revision), onSuccess: accept, onError: reject });
  const test = useMutation({ mutationFn: (revision: string) => agentObservabilityApi.test(companyId, revision), onSuccess: receipt => {
    setError(null); client.setQueryData<AgentObservabilitySettingsResponse>(queryKey, current => current?.settings?.revision === receipt.revision
      ? { ...current, settings: { ...current.settings, lastTest: receipt } } : current);
  }, onError: reject });
  useEffect(() => { setError(null); setConflict(false); save.reset(); test.reset(); remove.reset(); }, [companyId]);
  if (query.isPending) return <p className="text-sm text-muted-foreground">{interfaceText("m_ecf5efdd800918")}</p>;
  if (!query.data) return <div role="alert" className="space-y-2 text-sm"><p>{interfaceText("m_cf9d16b1442af9")}</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}>{interfaceText("m_942087cc2d41e0")}</Button></div>;
  return <AgentObservabilitySettingsView key={companyId} companyId={companyId} settings={query.data.settings} canManage={query.data.canManage}
    saving={save.isPending} removing={remove.isPending} testing={test.isPending} error={error ?? (query.isError ? "Saved settings could not be refreshed. Your draft is unchanged." : null)} conflict={conflict} resetKey={resetKey}
    onSave={input => save.mutate(input)} onTest={() => { if (query.data.settings) test.mutate(query.data.settings.revision); }}
    onRemove={() => { if (query.data.settings) remove.mutate(query.data.settings.revision); }}
    onReload={() => { setConflict(false); setError(null); void query.refetch(); }} />;
}
