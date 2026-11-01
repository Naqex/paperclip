import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DotPairing } from "@paperclipai/shared";
import { grokBotApi } from "@/api/grokBot";
import { buildGrokAccessPrompt, buildGrokRoutinePrompt } from "@/lib/grok-bot-setup-prompt";
import { AgentSetupPrompt } from "./AgentSetupPrompt";
import { CopyText } from "./CopyText";
import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { queryKeys } from "@/lib/queryKeys";

/** Configuration writes update the authoritative binding, never an unsaved agent form. */
export function GrokBotConnection({ companyId, agentId }: { companyId?: string; agentId?: string }) {
  useInterfaceLanguage();
  const pairingCodeId = useId();
  const cache = useQueryClient();
  const key = ["grok-binding", companyId, agentId];
  const state = useQuery({ queryKey: key, enabled: !!companyId && !!agentId,
    queryFn: ({ signal }) => grokBotApi.connection(companyId!, agentId!, signal), retry: false, refetchInterval: 5000 });
  const [pairing, setPairing] = useState<DotPairing | null>(null);
  const [replace, setReplace] = useState(false);
  const [botName, setBotName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookKey, setWebhookKey] = useState("");
  const [inspected, setInspected] = useState(false);
  const verifyRequest = useRef<string | null>(null);
  const binding = state.data?.binding, routine = binding?.routine, exchange = routine?.lastExchange;
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: key });
    if (companyId && agentId) await cache.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId) });
  };
  const pair = useMutation({ mutationFn: async () => { setPairing(await grokBotApi.pair(companyId!, agentId!, binding?.status === "pairing" ? binding.id : undefined)); }, onSuccess: refresh, gcTime: 0 });
  const configure = useMutation({ mutationFn: async () => {
    await grokBotApi.configure(companyId!, agentId!, { bindingId: binding!.id, expectedRevision: routine?.revision ?? 0, botName, webhookUrl, webhookKey });
    setWebhookUrl(""); setWebhookKey(""); setReplace(false); verifyRequest.current = null;
  }, onSuccess: refresh, gcTime: 0 });
  const verify = useMutation({ mutationFn: async () => {
    if (["rejected", "cancelled"].includes(exchange?.status ?? "")) verifyRequest.current = null;
    verifyRequest.current ??= crypto.randomUUID();
    await grokBotApi.verify(companyId!, agentId!, binding!.id, verifyRequest.current);
  }, onSuccess: refresh, gcTime: 0 });
  const retryDelivery = useMutation({ mutationFn: (correlationId: string) => grokBotApi.retry(companyId!, agentId!, correlationId), onSuccess: refresh });
  const disconnect = useMutation({ mutationFn: () => grokBotApi.disconnect(companyId!, agentId!), onSuccess: async () => { setPairing(null); await refresh(); } });
  const recover = useMutation({ mutationFn: () => grokBotApi.recover(companyId!, agentId!), onSuccess: async () => { setInspected(false); verifyRequest.current = null; await refresh(); } });
  const stop = useMutation({ mutationFn: (runId: string) => grokBotApi.stop(companyId!, agentId!, runId), onSuccess: refresh });
  useEffect(() => { if (routine?.botName) setBotName(routine.botName); }, [routine?.botName]);
  useEffect(() => {
    if (!pairing) return;
    const timer = window.setTimeout(() => setPairing(null), Math.max(0, Date.parse(pairing.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [pairing]);
  if (!agentId) return <p className="text-sm text-muted-foreground">{interfaceText("m_4a220c8a8d4e7c")}</p>;
  const busy = pair.isPending || configure.isPending || verify.isPending || disconnect.isPending || recover.isPending || stop.isPending || retryDelivery.isPending;
  const error = state.error ?? pair.error ?? configure.error ?? verify.error ?? disconnect.error ?? recover.error ?? stop.error ?? retryDelivery.error;
  const recovering = state.data?.recoveryNeeded || routine?.recoveryNeeded;
  const pending = exchange && ["prepared", "sending", "accepted"].includes(exchange.status) && Date.parse(exchange.expiresAt) > Date.now();
  return <section aria-label={interfaceText("m_b67d634771dfc2")} className="space-y-4 text-sm">
    <p className="text-muted-foreground">{interfaceText("m_af50c467a2f5ea")}</p>
    {state.isPending && <p role="status">{interfaceText("m_ca5b56e4cc0be2")}</p>}
    {error && <p role="alert" className="text-destructive">{error.message}</p>}
    {state.data && !state.data.enabled && <p className="text-muted-foreground">{interfaceText("m_d3cbba47ee3f6a")}</p>}
    {binding?.connected ? <>
      <p>{interfaceText("m_9284ae18707ab8")}{routine?.verified && !recovering ? interfaceText("m_cdac146d87a1f4") : interfaceText("m_22a639ac3511ed")}</p>
      <dl className="space-y-2 text-muted-foreground"><div><dt>Bot</dt><dd>{routine?.botName ?? interfaceText("m_dd1841d2950242")}</dd></div><div><dt>{interfaceText("m_65e78371422b74")}</dt><dd>{routine?.verifiedAt ? new Date(routine.verifiedAt).toLocaleString() : interfaceText("m_5b2f7a61e558e7")}</dd></div><div><dt>{interfaceText("m_c5963a8e4b1b0a")}</dt><dd>{routine?.lastContactAt ? new Date(routine.lastContactAt).toLocaleString() : interfaceText("m_ad1d6c39244854")}</dd></div></dl>
      {exchange && <p>{interfaceText("m_d70807ec73d83a")}{["accepted", "acknowledged"].includes(exchange.status) ? interfaceText("m_85a39ab345d672") : interfaceText("m_3229d16ca643cb")}{interfaceText("m_51df80fe78ff8b")}{exchange.acknowledgedAt ? interfaceText("m_85a39ab345d672") : interfaceText("m_1ea442a134b2a1")}.</p>}
      {exchange?.status === "rejected" && <div className="space-y-2"><p>{interfaceText("m_9acceef938e69a")}</p><Button variant="outline" disabled={busy || recovering} onClick={() => retryDelivery.mutate(exchange.id)}>{interfaceText("m_9118b95a8442d2")}</Button></div>}
      {!routine?.configured || replace ? <div className="space-y-3">
        <label className="block space-y-2"><span>{interfaceText("m_7ce17746c341dc")}</span><Input value={botName} onChange={e => setBotName(e.target.value)} maxLength={100} /></label>
        <AgentSetupPrompt prompt={buildGrokRoutinePrompt(binding.id, botName || "your Bot")} label={interfaceText("m_83cc147b04f703")} title={interfaceText("m_82c9fc98a82d13")} description={interfaceText("m_76f2be719fb03c")} />
        <label className="block space-y-2"><span>{interfaceText("m_84805a7574a820")}</span><Input type="password" autoComplete="off" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} /></label>
        <label className="block space-y-2"><span>{interfaceText("m_f120a132ca1a72")}</span><Input type="password" autoComplete="off" value={webhookKey} onChange={e => setWebhookKey(e.target.value)} /></label>
        <Button disabled={busy || recovering || !botName.trim() || !webhookUrl || !webhookKey} onClick={() => configure.mutate()}>{interfaceText("m_2eb6ea92d534eb")}</Button>
      </div> : <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !!pending || recovering || !!binding.assignment} onClick={() => verify.mutate()}>{interfaceText("m_7b840072a1e440")}</Button>
        <Button variant="outline" disabled={busy || recovering || !!binding.assignment} onClick={() => setReplace(true)}>{interfaceText("m_beb7434a0ddea1")}</Button>
      </div>}
    </> : <>
      <Button disabled={busy || !state.data?.enabled || !state.data.canConfigureConnection} onClick={() => pair.mutate()}>{interfaceText("m_5fcdc66a678f7f")}</Button>
      {pairing && state.data?.resourceUrl && <>
        <AgentSetupPrompt prompt={buildGrokAccessPrompt(state.data.resourceUrl, botName || "your Bot")} label={interfaceText("m_00ef6dec23cf3d")} title={interfaceText("m_0aeb0d84ceadaf")} description={interfaceText("m_85aa5472d52ee0")} />
        <div className="space-y-2">
          <label htmlFor={pairingCodeId}>{interfaceText("m_a83bf13de16cd6")}</label>
          <div className="flex items-center gap-2">
            <Input id={pairingCodeId} type="password" autoComplete="off" readOnly value={pairing.pairingCode} onFocus={e => e.target.select()} />
            <CopyText text={pairing.pairingCode} ariaLabel="Copy pairing code" className={buttonVariants({ variant: "outline", size: "sm" })}>{interfaceText("m_49a0053f3b0d50")}</CopyText>
          </div>
          <p className="text-xs text-muted-foreground">{interfaceText("m_e3bf85c9bf98d0")}</p>
        </div>
      </>}
    </>}
    {binding?.assignment && <div className="space-y-2"><p>{binding.assignment.status === "offered" ? interfaceText("m_4f75534ca776f9") : interfaceText("m_57eb3197086216")}</p><Button variant="outline" disabled={busy} onClick={() => stop.mutate(binding.assignment!.runId)}>{interfaceText("m_0f716c77db9b3f")}</Button><p className="text-xs text-muted-foreground">{interfaceText("m_862184017d2112")}</p></div>}
    {recovering && <div className="space-y-3 rounded-md border border-border p-3">
      <p className="font-medium">{interfaceText("m_1ffe056fff955d")}</p><p className="text-muted-foreground">{interfaceText("m_1f928a98ea5533")}</p>
      <label className="flex items-start gap-2"><input type="checkbox" checked={inspected} onChange={e => setInspected(e.target.checked)} /><span>{interfaceText("m_61b0130430f63a")}</span></label>
      <Button variant="outline" disabled={busy || !inspected || !!binding?.assignment} onClick={() => recover.mutate()}>{interfaceText("m_8694e04080e098")}</Button>
      <p className="text-xs text-muted-foreground">{interfaceText("m_b9ce877aa8e1ba")}</p>
    </div>}
    {binding?.connected && <Button variant="outline" disabled={busy} onClick={() => disconnect.mutate()}>{interfaceText("m_19621478644777")}</Button>}
  </section>;
}
