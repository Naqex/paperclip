import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Button } from "./ui/button";
import { buildDotSetupPrompt } from "../lib/dot-setup-prompt";
import { AgentSetupPrompt } from "./AgentSetupPrompt";

interface Connection {
  enabled: boolean;
  resourceUrl: string | null;
  binding: { id: string; status: string; connected: boolean; subscriptionVerified: boolean; hasPendingChallenge: boolean;
    assignment?: { status: string; attentionRequired: boolean } | null } | null;
}

/** Pairing codes stay in component memory and expire; never save them in config. */
export function DotRunnerConnection({ companyId, agentId, bindingId, onBinding }: {
  companyId?: string; agentId?: string; bindingId?: string; onBinding: (id: string) => void;
}) {
  useInterfaceLanguage();
  const client = useQueryClient();
  const [pairing, setPairing] = useState<{ pairingCode: string; expiresAt: string } | null>(null);
  const path = `/companies/${companyId}/agents/${agentId}/dot-binding`;
  const key = ["dot-binding", companyId, agentId];
  const state = useQuery({ queryKey: key, enabled: !!companyId && !!agentId,
    queryFn: () => api.get<Connection>(path),
    refetchInterval: query => query.state.data?.binding?.status === "pairing" ||
      (query.state.data?.binding?.connected && !query.state.data.binding.subscriptionVerified) ||
      query.state.data?.binding?.hasPendingChallenge || query.state.data?.binding?.assignment ? 5000 : false });
  const pair = useMutation({ mutationFn: () => api.post<{ bindingId: string; pairingCode: string; expiresAt: string }>(path, {}),
    onSuccess: result => { setPairing(result); onBinding(result.bindingId); void client.invalidateQueries({ queryKey: key }); } });
  const test = useMutation({ mutationFn: () => api.post(path + "/event-test", {}),
    onSuccess: () => { void client.invalidateQueries({ queryKey: key }); } });
  const revoke = useMutation({ mutationFn: () => api.delete(path),
    onSuccess: async () => {
      await client.cancelQueries({ queryKey: key });
      client.setQueryData<Connection>(key, previous => previous ? { ...previous, binding: null } : previous);
      setPairing(null); onBinding("");
      await client.invalidateQueries({ queryKey: key });
    } });
  useEffect(() => {
    if (!pairing) return;
    const timer = window.setTimeout(() => setPairing(null), Math.max(0, Date.parse(pairing.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [pairing]);
  const existingBindingId = state.data?.binding?.id;
  useEffect(() => {
    if (existingBindingId && existingBindingId !== bindingId && !revoke.isPending) onBinding(existingBindingId);
  }, [existingBindingId, bindingId, onBinding, revoke.isPending]);
  if (!agentId) return <p className="text-sm text-muted-foreground">{interfaceText("m_bafe2125317f88")}</p>;
  const error = state.error ?? pair.error ?? test.error ?? revoke.error;
  const b = state.data?.binding;
  const setupPrompt = pairing && state.data?.resourceUrl && companyId && agentId
    ? buildDotSetupPrompt({ companyId, agentId, resourceUrl: state.data.resourceUrl, ...pairing })
    : "";
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">{interfaceText("m_da22767764e131")}</p>
    {state.data && !state.data.enabled && <p className="text-sm text-muted-foreground">{interfaceText("m_e8b3e51776e1d4")}</p>}
    {state.data?.resourceUrl && <p className="text-sm break-all">{interfaceText("m_a41c3b8e788650")}<code>{state.data.resourceUrl}</code></p>}
    {b && <p className="text-sm">{interfaceText("m_9adb218a2d18f6")}{b.status}{interfaceText("m_a94436ca591ffe")}{b.subscriptionVerified ? interfaceText("m_1c34f88707b55e") : interfaceText("m_d0a3630555bbec")}.</p>}
    {b?.assignment && <p className="text-sm">{interfaceText("m_0d21edf7203b3b")}{b.assignment.status === "offered" ? interfaceText("m_d28b2c8c519c2a") : interfaceText("m_29c45e313c6957")}.</p>}
    {b?.assignment?.attentionRequired && <p className="text-sm text-destructive" role="alert">{interfaceText("m_6058675bec9306")}</p>}
    {pairing && setupPrompt && b?.status === "pairing" && <div className="space-y-2">
      <AgentSetupPrompt
        prompt={setupPrompt}
        label={interfaceText("m_855bc2518bac9e")}
        agent={{ name: "Dot", src: "/brands/adapters/openai-dot.svg" }}
        title={interfaceText("m_767ddfb33ac2cd")}
        description={interfaceText("m_f8f26cb5c4924b")}
        side="bottom"
      />
      <p className="text-xs text-muted-foreground">{interfaceText("m_2cc6bb2876b049")}{new Date(pairing.expiresAt).toLocaleTimeString()}.</p>
    </div>}
    {!pairing && b?.status === "pairing" && <p className="text-sm text-muted-foreground">{interfaceText("m_8dac50c22243ec")}</p>}
    <div className="flex flex-wrap items-center gap-2">
      {!b && <Button type="button" variant="outline" disabled={!state.data?.enabled || !state.data?.resourceUrl || pair.isPending} onClick={() => pair.mutate()}>{interfaceText("m_af8427964b26fd")}</Button>}
      {b?.subscriptionVerified && <Button type="button" variant="outline" disabled={test.isPending || b.hasPendingChallenge} onClick={() => test.mutate()}>{interfaceText("m_499fea42565e92")}</Button>}
      <Button type="button" variant="outline" onClick={() => { void state.refetch(); }}>{interfaceText("m_73791f628e8319")}</Button>
      {b && <Button type="button" variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate()}>{interfaceText("m_473c85193bdf21")}</Button>}
    </div>
    {b?.hasPendingChallenge && <p className="text-sm text-muted-foreground">{interfaceText("m_783cf6da77b775")}</p>}
    {error && <p className="text-sm text-destructive" role="alert">{error instanceof Error ? error.message : interfaceText("m_596c52f1eb65c1")}</p>}
  </div>;
}
