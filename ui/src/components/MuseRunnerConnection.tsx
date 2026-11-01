import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { museDetectorCleanupAttestationSchema } from "@paperclipai/shared";
import type { MuseConnection, MusePairing, MuseAttestStopInput, MuseDetectorCleanupAttestationInput } from "@paperclipai/shared";
import { agentsApi } from "@/api/agents";
import { useMuseConnection, useMuseConnectionState } from "@/hooks/useMuseConnection";
import { queryKeys } from "@/lib/queryKeys";
import { formatDateTime } from "@/lib/utils";
import { AgentSetupPrompt } from "./AgentSetupPrompt";
import { MuseConnectionChecks } from "./new-agent/ExternalAgentInviteContent";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export interface MuseConnectionDetailsProps {
  connection: MuseConnection;
  pairing?: MusePairing | null;
  busy?: boolean;
  error?: string;
  offline?: boolean;
  onTest: () => void;
  onRepair: () => void;
  onPause: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  onAttest: (input: MuseAttestStopInput) => void;
  onAttestDetectorCleanup?: (input: MuseDetectorCleanupAttestationInput) => void;
}

/** The settings view uses the same connection evidence as the invitation. */
export function MuseConnectionDetails({ connection, pairing, busy, error, offline = false, onTest, onRepair, onPause, onDisconnect, onRefresh, onAttest, onAttestDetectorCleanup }: MuseConnectionDetailsProps) {
  useInterfaceLanguage();
  const b = connection.binding;
  const [attestation, setAttestation] = useState<MuseAttestStopInput | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [detectorSnapshot, setDetectorSnapshot] = useState<Omit<MuseDetectorCleanupAttestationInput, "observation" | "detectorRemoved"> | null>(null);
  const [detectorHookId, setDetectorHookId] = useState("");
  const [observationDigest, setObservationDigest] = useState("");
  const [detectorObservedAt, setDetectorObservedAt] = useState("");
  const detectorObservedAtValid = museDetectorCleanupAttestationSchema.shape.observation.shape.observedAt.safeParse(detectorObservedAt).success;
  const [detectorConfirmed, setDetectorConfirmed] = useState(false);
  const detectorIdentity = JSON.stringify([b?.id, b?.generation, b?.revision, b?.qualification?.id, b?.cleanup.hookScript, b?.cleanup.attestationEligible, offline]);
  useEffect(() => { setDetectorSnapshot(null); setObservationDigest(""); setDetectorObservedAt(""); setDetectorHookId(""); setDetectorConfirmed(false); }, [detectorIdentity]);
  const boundaryIdentity = JSON.stringify(b?.stop.boundary);
  const stopBindingRevision = b?.stop.bindingRevision;
  useEffect(() => { setAttestation(null); setConfirmed(false); }, [boundaryIdentity, stopBindingRevision]);
  const live = !!b && b.status !== "revoked";
  const state = useMuseConnectionState(connection, { offline });
  const testing = state.testing;
  const configure = !offline && connection.enabled && connection.canConfigureConnection && !!connection.publicOrigin;
  const timestamp = (value: string | null) => value ? formatDateTime(value, { includeSeconds: true }) : "Not observed";
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">{interfaceText("m_9d1157e9dc2abf")}</p>
    {!connection.enabled && <p className="text-sm text-muted-foreground">{interfaceText("m_1444d66c915a22")}</p>}
    {!connection.publicOrigin && <p className="text-sm text-muted-foreground">{interfaceText("m_203b01ac64f2d1")}</p>}
    {b && <>
      <MuseConnectionChecks state={state} />
      <dl className="space-y-2 text-xs">
        {[
          ["Last persisted public receiver contact", timestamp(b.lastReceiverContactAt)],
          ["Authenticated worker activity", timestamp(b.lastWorkerActivityAt)],
          ["Last verified reply", timestamp(b.lastVerifiedReplyAt)],
          ["Credential status", b.credentialState],
          ["Refresh credential expires", timestamp(b.refreshExpiresAt)],
          ["Client version", b.clientVersion ?? "Not reported"],
          ["Live assignments", String(b.liveAssignments)],
          ["Uncertain native operations", String(b.uncertainOperations)],
          ["Pending answers", String(b.pendingInputs)],
          ["Usage and cost", "Unavailable"],
        ].map(([label, value]) => <div key={label} className="flex flex-wrap items-baseline justify-between gap-2"><dt className="text-muted-foreground">{label}</dt><dd className="font-mono">{value}</dd></div>)}
      </dl>
      <p className="text-xs text-muted-foreground">{interfaceText("m_818cb8dd8c3c4d")}{Math.ceil(b.contactPersistenceLagMs / 1000)}{interfaceText("m_8891afb3f83c30")}</p>
      {b.status === "revoked" && <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_409b79b3ab5f63")}</p>}
      {(b.cleanup.pending || b.status === "revoked") && <div className="space-y-2 text-sm text-muted-foreground">
        {"detectorRemovalRequested" in b.cleanup && b.cleanup.detectorRemovalRequested === true && !b.cleanup.detectorRemoved && <p>{interfaceText("m_3c3e78aeda006c")}</p>}
        <p>{interfaceText("m_ab4d4feda19990")}{b.cleanup.detectorEvidence?.source === "operator_runtime_attestation" ? interfaceText("m_58e5d31b786738") : b.cleanup.detectorRemoved ? interfaceText("m_3ef25c849197ef") : interfaceText("m_2399158583673b")}{interfaceText("m_acc29951dda604")}{b.cleanup.workerQuiescenceReported ? interfaceText("m_8e752bb9817c06") : interfaceText("m_2399158583673b")}.</p>
        {b.cleanup.authenticatedAfterRevocation === false && <p>{interfaceText("m_97089b2ed2a898")}</p>}
        {b.cleanup.expiresAt && <p className="text-xs">{interfaceText("m_0873f86260abcb")}{formatDateTime(b.cleanup.expiresAt)}.</p>}
        {b.cleanup.detectorEvidence && <p>{interfaceText("m_0a8e2942da9ceb")}{timestamp(b.cleanup.detectorEvidence.recordedAt)}: {b.cleanup.detectorEvidence.source === "operator_runtime_attestation" ? interfaceText("m_fab20cadd96e80") : interfaceText("m_4c2efeae458a51")}{interfaceText("m_5b3d0fcb543169")}</p>}
        {b.cleanup.attestationEligible && onAttestDetectorCleanup && !detectorSnapshot && <Button type="button" variant="outline" disabled={busy || offline} onClick={() => {
          if (!b.cleanup.hookScript) return;
          setDetectorSnapshot({ bindingId: b.id, generation: b.generation, expectedRevision: b.revision, qualificationId: b.qualification?.id ?? null, hookScript: b.cleanup.hookScript });
        }}>{interfaceText("m_6c8fa9b23e3866")}</Button>}
        <p>{interfaceText("m_8efa1d1a0b44bb")}</p>
      </div>}
      {b.stop.status !== "none" && <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">{b.stop.status === "operator_attested" ? interfaceText("m_527bb2606fa0f5")
          : b.stop.status === "worker_reported" ? interfaceText("m_a5b30dade0f8a5")
          : interfaceText("m_f5f0c7af848470")}</p>
        {b.stop.nativeEffectsUnknown && <p role="status" className="text-muted-foreground">{interfaceText("m_177a41d81ce269")}</p>}
        {b.stop.boundary && stopBindingRevision == null && b.stop.status !== "operator_attested" && <p role="status" className="text-muted-foreground">{interfaceText("m_9fe4f84e0099a0")}</p>}
        {b.stop.boundary && b.stop.status !== "operator_attested" && !attestation && <Button type="button" variant="outline" disabled={busy || stopBindingRevision == null} onClick={() => {
          if (!b.stop.boundary || stopBindingRevision == null) return;
          setAttestation({ boundary: { ...b.stop.boundary }, expectedRevision: stopBindingRevision, workerStopped: true }); setConfirmed(false);
        }}>{interfaceText("m_f313921c786e57")}</Button>}
      </div>}
    </>}
    {detectorSnapshot && <section aria-label={interfaceText("m_207538d416d36e")} className="space-y-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium">{interfaceText("m_5d2438f277182c")}</p>
      <p className="break-all font-mono text-xs">{detectorSnapshot.hookScript}</p>
      <p className="text-sm text-muted-foreground">{interfaceText("m_dd24f6f1ddd893")}<code>{"hooks.list({ include_disabled: true })"}</code>{interfaceText("m_0a17f41ba1def1")}</p>
      <label className="block space-y-2 text-sm">{interfaceText("m_465d1324376869")}<Input aria-label={interfaceText("m_a26aaf252365c8")} value={detectorHookId} onChange={event => { setDetectorHookId(event.target.value); setDetectorConfirmed(false); }} autoComplete="off" /></label>
      <label className="block space-y-2 text-sm">{interfaceText("m_226bc7b7d20fb7")}<Input aria-label={interfaceText("m_45f3cbec4b72f3")} value={observationDigest} onChange={event => { setObservationDigest(event.target.value); setDetectorConfirmed(false); }} autoComplete="off" /></label>
      <p className="text-xs text-muted-foreground">{interfaceText("m_4b444426589dbe")}</p>
      <label className="block space-y-2 text-sm">{interfaceText("m_12c92d03e88ec1")}<Input aria-label={interfaceText("m_378ee8b40b0458")} value={detectorObservedAt} onChange={event => { setDetectorObservedAt(event.target.value); setDetectorConfirmed(false); }} placeholder="YYYY-MM-DDTHH:mm:ss.sssZ" autoComplete="off" /></label>
      <p className="text-xs text-muted-foreground">{interfaceText("m_e1551b4c0c540d")}</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={detectorConfirmed} onChange={event => setDetectorConfirmed(event.target.checked)} className="mt-1 accent-primary" /><span>{interfaceText("m_196f0a0f61463a")}</span></label>
      <div className="flex items-center justify-between gap-3"><Button type="button" variant="ghost" onClick={() => setDetectorSnapshot(null)}>{interfaceText("m_19766ed6ccb2f4")}</Button><Button type="button" disabled={!detectorConfirmed || !detectorObservedAtValid || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(detectorHookId) || !/^[a-f0-9]{64}$/.test(observationDigest) || busy || offline} onClick={() => onAttestDetectorCleanup?.({ ...detectorSnapshot, detectorRemoved: true, observation: { method: "hooks.list", includeDisabled: true, hookId: detectorHookId, outcome: "exact_hook_absent", observedAt: detectorObservedAt, sha256: observationDigest } })}>{interfaceText("m_c3aca3cfc73d8d")}</Button></div>
    </section>}
    {attestation && <section aria-label={interfaceText("m_bb08a4fc424840")} className="space-y-3 rounded-md border border-border p-3">
      <p className="text-sm font-medium">{interfaceText("m_90d155a5bac813")}</p>
      <dl className="space-y-2 text-xs">
        {Object.entries(attestation.boundary).map(([key, value]) => <div key={key} className="flex flex-wrap items-baseline justify-between gap-2"><dt className="text-muted-foreground">{key}</dt><dd className="break-all font-mono">{value === null ? interfaceText("m_dc937b59892604") : String(value)}</dd></div>)}
      </dl>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-1 accent-primary" /><span>{interfaceText("m_2c0f8e97264dff")}</span></label>
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => setAttestation(null)}>{interfaceText("m_19766ed6ccb2f4")}</Button>
        <Button type="button" disabled={!confirmed || busy} onClick={() => onAttest(attestation)}>{interfaceText("m_42a28c5d16429d")}</Button>
      </div>
    </section>}
    {pairing && !b?.paired && <div className="space-y-2">
      <AgentSetupPrompt key={pairing.bindingId + pairing.revision} prompt={pairing.setupInstruction} label={interfaceText("m_9a5d81ccb428b2")} title={interfaceText("m_3e78038c450021")} agent={{ name: "Muse", icon: <Bot className="size-5" /> }} description={interfaceText("m_e70cbf53a1cd26")} />
      <p className="text-xs text-muted-foreground">{interfaceText("m_4a40ff1309480e")}{formatDateTime(pairing.expiresAt)}{interfaceText("m_2a2f3d6b51c41c")}</p>
    </div>}
    <div className="flex flex-wrap items-center gap-2">
      {live && <Button type="button" variant="outline" disabled={!configure || b.credentialState !== "active" || !b.paired || busy || testing} onClick={onTest}>{testing ? interfaceText("m_0a33c14daee7c1") : interfaceText("m_c97eb158dc61db")}</Button>}
      <Button type="button" variant="outline" disabled={!configure || busy} onClick={onRepair}>{b?.credentialState === "expired" ? interfaceText("m_766016a6b56731") : live ? interfaceText("m_483aefecfb7116") : interfaceText("m_2e6b5b5f697872")}</Button>
      {connection.agentStatus !== "paused" && connection.agentStatus !== "terminated" && <Button type="button" variant="outline" disabled={busy} onClick={onPause}>{interfaceText("m_51ca75d39c8784")}</Button>}
      {live && <Button type="button" variant="outline" disabled={busy} onClick={onDisconnect}>{interfaceText("m_acfc5be785a9bb")}</Button>}
      <Button type="button" variant="ghost" disabled={busy} onClick={onRefresh}>{interfaceText("m_0e91610117029a")}</Button>
      <Button type="button" asChild variant="ghost"><a href="https://muse.ai" target="_blank" rel="noopener noreferrer">{interfaceText("m_bf2479752678e5")}</a></Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}

export function MuseRunnerConnection({ companyId, agentId }: { companyId?: string; agentId?: string }) {
  useInterfaceLanguage();
  const cache = useQueryClient();
  const muse = useMuseConnection(companyId, agentId);
  const pause = useMutation({ mutationFn: () => agentsApi.pause(agentId!, companyId), onSuccess: () => {
    void muse.refresh(); void cache.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId!) });
    if (companyId) void cache.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
  } });
  if (!agentId) return <p className="text-sm text-muted-foreground">{interfaceText("m_aa919f71815d3c")}</p>;
  const error = muse.state.error ?? muse.pair.error ?? muse.verify.error ?? muse.revoke.error ?? muse.attest.error ?? muse.attestDetector.error ?? pause.error;
  if (muse.identity.failed) return <div className="space-y-3"><p role="alert" className="text-sm text-destructive">{interfaceText("m_6269219328768b")}</p><Button type="button" variant="outline" onClick={() => { void cache.invalidateQueries({ queryKey: queryKeys.auth.session }); }}>{interfaceText("m_0e91610117029a")}</Button></div>;
  if (!muse.state.data) return <div className="space-y-3"><p role="status" className="text-sm text-muted-foreground">{muse.state.error ? interfaceText("m_b4d24c4b73debd") : interfaceText("m_6330655b06f88e")}</p>{error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}<Button type="button" variant="outline" onClick={() => { void muse.state.refetch(); }}>{interfaceText("m_0e91610117029a")}</Button></div>;
  return <MuseConnectionDetails key={muse.identity.userId} connection={muse.state.data} pairing={muse.pairing} offline={muse.state.isError}
    busy={muse.pair.isPending || muse.verify.isPending || muse.revoke.isPending || muse.attest.isPending || muse.attestDetector.isPending || pause.isPending}
    error={error?.message} onTest={() => { if (muse.binding) muse.verify.mutate(muse.binding); }} onRepair={muse.repair}
    onPause={() => pause.mutate()} onDisconnect={() => { if (muse.binding) muse.revoke.mutate(muse.binding); }}
    onRefresh={() => { void muse.state.refetch(); }} onAttest={input => muse.attest.mutate(input)} onAttestDetectorCleanup={input => muse.attestDetector.mutate(input)} />;
}
