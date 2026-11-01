import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PROMPT_INJECTION_DEFAULT_MODEL, updatePromptInjectionPreventionSchema,
  type PromptInjectionPreventionSettings, type UpdatePromptInjectionPrevention,
  type PromptInjectionTestResult, type AiManagedConnectionSummary } from "@paperclipai/shared";
import { promptInjectionPreventionApi } from "@/api/prompt-injection-prevention";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleField } from "@/components/agent-config-primitives";
import { ConnectionChoiceList } from "@/features/connections/ConnectionChoiceList";
import { ConnectionSetupFlow } from "@/features/connections/ConnectionSetupFlow";
import { AppLogo } from "@/pages/apps/AppLogo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Link } from "@/lib/router";

const editable = (s: PromptInjectionPreventionSettings): UpdatePromptInjectionPrevention => ({
  enabled: s.enabled, connectionId: s.connectionId, grantId: s.grantId, model: s.model,
});
export function PromptInjectionPreventionSettingsView({ settings, choices, models = [], newlyConnectedId, saving, testing, error, result,
  onSave, onTest, onAdd, onConnectionChange, onDraftChange,
}: {
  settings: PromptInjectionPreventionSettings; choices: AiManagedConnectionSummary[];
  models?: Array<{ id: string; label?: string }>; newlyConnectedId?: string | null;
  saving?: boolean; testing?: boolean; error?: string | null; result?: PromptInjectionTestResult | null;
  onSave: (settings: UpdatePromptInjectionPrevention) => void; onTest: () => void; onAdd?: () => void;
  onConnectionChange?: (id: string | null) => void; onDraftChange?: () => void;
}) {
  useInterfaceLanguage();
  const [draft, setDraft] = useState(() => editable(settings));
  const modelId = useId();
  const revision = JSON.stringify(editable(settings)), draftRevision = JSON.stringify(draft);
  useEffect(() => { setDraft(editable(settings)); onConnectionChange?.(settings.connectionId); }, [revision, settings.companyId]);
  useEffect(() => { onDraftChange?.(); }, [draftRevision, settings.companyId, onDraftChange]);
  const appliedConnection = useRef<string | null>(null);
  useEffect(() => {
    if (!newlyConnectedId) { appliedConnection.current = null; return; }
    if (appliedConnection.current === newlyConnectedId) return;
    const c = choices.find(c => c.id === newlyConnectedId);
    if (!c) return;
    appliedConnection.current = newlyConnectedId;
    setDraft(d => ({ ...d, connectionId: c.id, grantId: c.grantId, model: d.model || PROMPT_INJECTION_DEFAULT_MODEL, enabled: true }));
    onConnectionChange?.(c.id);
  }, [newlyConnectedId, choices, onConnectionChange]);
  const selected = choices.find(c => c.grantId === draft.grantId);
  const dirty = revision !== draftRevision;
  return <section aria-label={interfaceText("m_ec943d63cadb3e")} className="max-w-2xl space-y-4">
    <h2 className="text-lg font-semibold">{interfaceText("m_ec943d63cadb3e")}</h2>
    <p className="text-sm text-muted-foreground">{interfaceText("m_3fc8407334bfac")}</p>
    <ConnectionChoiceList selectedId={draft.grantId ?? undefined} disabled={saving || testing}
      choices={choices.map(c => ({ id: c.grantId, name: c.name, description: c.status === "connected" ? "Connected" : "Needs attention",
        icon: <AppLogo name="OpenRouter" brandKey="openrouter" size={24} /> }))}
      onSelect={grantId => {
        const c = choices.find(c => c.grantId === grantId)!;
        setDraft(d => ({ ...d, connectionId: c.id, grantId, model: d.model || PROMPT_INJECTION_DEFAULT_MODEL, enabled: true }));
        onConnectionChange?.(c.id);
      }} />
    {!choices.length && <p className="text-sm text-muted-foreground">{interfaceText("m_7304e115a73a42")}</p>}
    <div className="flex items-center gap-3">
      {onAdd && <Button variant="outline" size="sm" disabled={saving || testing} onClick={onAdd}>{interfaceText("m_66aca6f3c9e1ba")}</Button>}
      <Link to="/apps" className="text-sm underline underline-offset-4">{interfaceText("m_cadfaac7241e36")}</Link>
    </div>
    {draft.connectionId && <fieldset disabled={saving || testing} className="space-y-4">
      {(!selected || selected.status !== "connected") && <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_f99ddf9a565f67")}</p>}
      <div className="space-y-2">
        <label htmlFor={`${modelId}-input`} className="text-sm font-medium">{interfaceText("m_5e2c614c23f022")}</label>
        <Input id={`${modelId}-input`} list={modelId} value={draft.model} placeholder={PROMPT_INJECTION_DEFAULT_MODEL}
          onChange={e => setDraft(d => ({ ...d, model: e.target.value }))} />
        <datalist id={modelId}>{models.map(m => <option key={m.id} value={m.id}>{m.label ?? m.id}</option>)}</datalist>
      </div>
      <ToggleField label={interfaceText("m_0302a1e03fc902")} checked={draft.enabled} onChange={enabled => setDraft(d => ({ ...d, enabled }))} />
      <Button variant="ghost" size="sm" onClick={() => {
        setDraft(d => ({ ...d, connectionId: null, grantId: null, enabled: false })); onConnectionChange?.(null);
      }}>{interfaceText("m_cea4d2e010b8fd")}</Button>
    </fieldset>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!dirty && result && <div role={result.passed ? "status" : "alert"} className={result.passed ? "space-y-2 text-sm" : "space-y-2 text-sm text-destructive"}>
      <p>{result.passed ? interfaceText("m_876f9707442111") : interfaceText("m_afd9879306a950")}</p>
      {result.samples.map(s => <p key={s.name} className="text-xs">{s.name}: {s.passed ? interfaceText("m_436fe71bb9561f") : s.reason ? interfaceText("m_0293d963b0602f", { value0: (s.reason) }) : interfaceText("m_543a1c9dbf40f8")} · {(s.durationMs / 1000).toFixed(2)}{interfaceText("m_3489b52478843c")}</p>)}
    </div>}
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-1">
        <Button variant="outline" size="sm" onClick={onTest} disabled={dirty || !settings.enabled || saving || testing}>{testing ? interfaceText("m_407b7a04662f2a") : interfaceText("m_e400861434cbf8")}</Button>
        <p className="text-xs text-muted-foreground">{dirty ? interfaceText("m_10a5f254580803") : interfaceText("m_1dcfadd0482eb4")}</p>
      </div>
      {dirty && <Button disabled={saving || testing || !updatePromptInjectionPreventionSchema.safeParse(draft).success || (draft.enabled && selected?.status !== "connected")}
        onClick={() => onSave(draft)}>{saving ? interfaceText("m_23e39291d61358") : interfaceText("m_1a5bd4fd5c84f9")}</Button>}
    </div>
  </section>;
}
export function PromptInjectionPreventionSettingsSection({ companyId }: { companyId: string }) {
  useInterfaceLanguage();
  const client = useQueryClient(), key = ["prompt-injection-prevention", companyId];
  const query = useQuery({ queryKey: key, queryFn: () => promptInjectionPreventionApi.settings(companyId) });
  const [adding, setAdding] = useState(false), [newlyConnectedId, setNewlyConnectedId] = useState<string | null>(null), [connectionId, setConnectionId] = useState<string | null>(null);
  const models = useQuery({ queryKey: ["prompt-injection-models", companyId, connectionId],
    queryFn: () => promptInjectionPreventionApi.models(companyId, connectionId!), enabled: Boolean(connectionId) });
  const revision = JSON.stringify(query.data?.settings ?? { companyId });
  const test = useMutation({ mutationFn: (_revision: string) => promptInjectionPreventionApi.test(companyId),
    onSettled: () => { void client.invalidateQueries({ predicate: q => String(q.queryKey[0]).includes("cost") }); } });
  const resetTest = test.reset;
  useEffect(() => { resetTest(); }, [revision, companyId, resetTest]);
  useEffect(() => { setAdding(false); setNewlyConnectedId(null); setConnectionId(null); }, [companyId]);
  const save = useMutation({ mutationFn: (data: UpdatePromptInjectionPrevention) => promptInjectionPreventionApi.update(companyId, data),
    onSuccess: settings => { test.reset(); client.setQueryData(key, { ...query.data, settings }); } });
  if (query.isPending) return <p className="text-sm text-muted-foreground">{interfaceText("m_2cf69885486369")}</p>;
  if (query.error) return <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{interfaceText("m_4e41c167b4e75c")}</p><Button variant="outline" onClick={() => void query.refetch()}>{interfaceText("m_d8b8392e2c5429")}</Button></div>;
  if (!query.data?.canManage || !query.data.settings) return null;
  return <>
    <PromptInjectionPreventionSettingsView key={companyId} settings={query.data.settings} choices={query.data.choices} models={models.data}
      newlyConnectedId={newlyConnectedId} saving={save.isPending} testing={test.isPending}
      error={save.error?.message ?? test.error?.message ?? (models.error ? "Could not load model suggestions. You can still enter and save a model ID." : null)}
      result={test.variables === revision ? test.data : null} onConnectionChange={setConnectionId} onDraftChange={resetTest}
      onSave={value => save.mutate(value)} onTest={() => test.mutate(revision)} onAdd={() => setAdding(true)} />
    <Dialog open={adding} onOpenChange={setAdding}>
      <DialogContent className="sm:max-w-2xl max-h-(--sz-85vh) overflow-y-auto">
        <DialogHeader><DialogTitle>{interfaceText("m_2e306132349894")}</DialogTitle><DialogDescription>{interfaceText("m_bca0453e5a3be1")}</DialogDescription></DialogHeader>
        <ConnectionSetupFlow host="dialog" serviceSlug="openrouter" forceNewConnection aiConnection={{ provider: "openrouter", method: "api_key", mode: "shared" }} requiredAiOwnership="shared"
          onCancel={() => setAdding(false)} onComplete={async result => {
            const refreshed = await query.refetch();
            if ("connectionId" in result && result.connectionId && refreshed.data?.choices.some(c => c.id === result.connectionId)) setNewlyConnectedId(result.connectionId);
            setAdding(false);
          }} />
      </DialogContent>
    </Dialog>
  </>;
}
