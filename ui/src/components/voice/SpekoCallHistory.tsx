import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { VoiceCallHistoryEntry, VoiceCallReport, VoiceUnapprovedCallHistoryEntry } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import { voiceSessionsApi } from "@/api/voiceSessions";
import { voicePhoneApi } from "@/api/voicePhone";
import { voiceHistoryApi } from "@/api/voiceHistory";

function charge(amount: string | null) {
  if (amount === null) return "Not yet reported";
  const value = BigInt(amount);
  const whole = value / 1_000_000n, fraction = (value % 1_000_000n).toString().padStart(6, "0");
  return `$${whole}.${fraction} USD`;
}
export function SpekoCallReport({ report }: { report: VoiceCallReport }) {
  useInterfaceLanguage();
  return <div className="space-y-3">
    <dl className="flex flex-wrap gap-4 text-sm"><div><dt className="text-muted-foreground">{interfaceText("m_815b4d5e108d29")}</dt><dd>{charge(report.costMicroUsd)}</dd></div>{report.durationSeconds !== null && <div><dt className="text-muted-foreground">{interfaceText("m_4fc52a3c4c558b")}</dt><dd>{report.durationSeconds}{interfaceText("m_3489b52478843c")}</dd></div>}</dl>
    <p className="text-xs text-muted-foreground">{interfaceText("m_471b78048bd2c5")}</p>
    {report.transcript.length ? <ol aria-label={interfaceText("m_12c822250a81be")} className="space-y-3">{report.transcript.map(turn => <li key={turn.id} className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{turn.speaker === "caller" ? interfaceText("m_08b041935798fb") : "Agent"}{turn.interrupted ? interfaceText("m_17e13bd6edc9a9") : ""}</p><p className="whitespace-pre-wrap break-words text-sm">{turn.text}</p></li>)}</ol>
      : <p className="text-sm text-muted-foreground">{report.status === "unavailable" ? interfaceText("m_2f95e04ec404e5") : report.status === "pending" ? interfaceText("m_ab7e3e9fb665e2") : interfaceText("m_2c08af7f5a5c80")}</p>}
  </div>;
}
const modeNames = { browser: "Browser voice", inbound_phone: "Incoming call", outbound_phone: "Outgoing call" } as const;
const stateNames = { reserved: "Preparing", creating: "Connecting", creation_unknown: "Checking connection", connecting: "Connecting", active: "In progress", awaiting_approval: "Awaiting approval", ending: "Ending", ended: "Completed", failed: "Failed", expired: "Expired" } as const;
export function SpekoCallActivityItem({ entry: { session, report }, onEnd, ending, presentation = "history" }: { entry: VoiceCallHistoryEntry; onEnd?(sessionId: string): void; ending?: boolean; presentation?: "history" | "activity" }) {
  useInterfaceLanguage();
  const summary = useRef<HTMLElement | null>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (restoreFocus.current && ["ended", "failed", "expired"].includes(session.state)) { summary.current?.focus(); restoreFocus.current = false; }
  }, [session.state]);
  return <details data-activity-kind="call" className={presentation === "activity" ? "px-2 py-3 transition-colors hover:bg-accent/50" : "rounded-md border border-border p-3"}>
    <summary ref={summary} className="cursor-pointer break-words text-sm font-medium">{modeNames[session.mode]} · {stateNames[session.state]}<span className="ml-2 text-xs font-normal text-muted-foreground">{new Date(session.createdAt).toLocaleString()}</span></summary>
    <div className="mt-3 space-y-3"><Link className="text-sm text-primary underline" to={`/issues/${encodeURIComponent(session.issueId)}`}>{interfaceText("m_810df18f8d67e9")}</Link>
      {session.errorCode && <p className="text-sm text-muted-foreground">{session.errorCode === "cleanup_pending" ? interfaceText("m_0365c84c7029e9") : interfaceText("m_e8d6523f35bf41")}</p>}
      {!session.endedAt && !["ended", "failed", "expired"].includes(session.state) && session.callerAuthority !== "guest_intake" && onEnd && <Button size="sm" variant="outline" disabled={ending} onClick={() => { restoreFocus.current = true; onEnd(session.id); }}>{ending ? interfaceText("m_3677a36e467e82") : interfaceText("m_2fe13d93a1f4b2")}</Button>}
      <SpekoCallReport report={report} />
    </div>
  </details>;
}
export function SpekoUnapprovedCallActivityItem({ call, presentation = "history" }: { call: VoiceUnapprovedCallHistoryEntry; presentation?: "history" | "activity" }) {
  useInterfaceLanguage();
  return <div data-activity-kind="unapproved_call" className={presentation === "activity" ? "px-2 py-3 text-sm" : "rounded-md border border-border p-3 text-sm"}><p>{call.state === "denied" ? interfaceText("m_8a6282899335c4") : call.state === "expired" ? interfaceText("m_70d86a3f48cd9a") : interfaceText("m_f203aff4b52650")} · {new Date(call.createdAt).toLocaleString()}</p><p className="text-xs text-muted-foreground">{interfaceText("m_a9e349c68212c7")}</p></div>;
}
export interface SpekoCallHistoryViewProps { entries?: VoiceCallHistoryEntry[]; unapprovedCalls?: VoiceUnapprovedCallHistoryEntry[]; loading?: boolean; error?: string; incomingError?: string; endError?: string; onRetry(): void; onEnd?(sessionId: string): void; endingSessionId?: string }
export function SpekoCallHistoryView({ entries = [], unapprovedCalls = [], loading, error, incomingError, endError, onRetry, onEnd, endingSessionId }: SpekoCallHistoryViewProps) {
  useInterfaceLanguage();
  return <section className="max-w-xl space-y-3" aria-label={interfaceText("m_0164981f8e965e")}>
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{interfaceText("m_0164981f8e965e")}</h2><Button size="sm" variant="ghost" onClick={onRetry} disabled={loading}>{interfaceText("m_0e91610117029a")}</Button></div>
    {loading && <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_e9461c4cee0c48")}</p>}
    {error && <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{error}</p><Button size="sm" variant="outline" onClick={onRetry}>{interfaceText("m_d8b8392e2c5429")}</Button></div>}
    {incomingError && <p role="alert" className="text-sm text-destructive">{interfaceText("m_5a08c1f0291aaf")}{incomingError}</p>}
    {endError && <p role="alert" className="text-sm text-destructive">{interfaceText("m_7e0bec6b8982da")}{endError}</p>}
    {!loading && !error && !incomingError && !entries.length && !unapprovedCalls.length && <p className="text-sm text-muted-foreground">{interfaceText("m_fe78d49e3ddb9a")}</p>}
    {!error && entries.map(entry => <SpekoCallActivityItem key={entry.session.id} entry={entry} onEnd={onEnd} ending={endingSessionId === entry.session.id} />)}
    {!incomingError && unapprovedCalls.length > 0 && <div className="space-y-2"><h3 className="text-sm font-medium">{interfaceText("m_fa4c7b2771d7b6")}</h3><ul className="space-y-2">{unapprovedCalls.map(call => <li key={call.id}><SpekoUnapprovedCallActivityItem call={call} /></li>)}</ul></div>}
  </section>;
}
export function useSpekoCallHistory(companyId: string, endpointId: string, enabled = true) {
  const query = useQuery({ queryKey: ["speko-history", companyId, endpointId], queryFn: () => voiceHistoryApi.list(companyId, endpointId), enabled, retry: false, refetchInterval: enabled ? 30_000 : false });
  const incoming = useQuery({queryKey: ["speko-unapproved-history", companyId, endpointId], queryFn: () => voicePhoneApi.history(companyId, endpointId), retry: false, enabled: enabled && query.isSuccess, refetchInterval: enabled ? 30_000 : false});
  const ending = useMutation({mutationFn: (sessionId: string) => voiceSessionsApi.end(companyId, sessionId), onSuccess: () => query.refetch()});
  return { entries: query.data ?? [], unapprovedCalls: incoming.data ?? [], loading: query.isLoading || incoming.isLoading, error: query.error?.message, incomingError: incoming.error?.message, endError: ending.error?.message, endingSessionId: ending.isPending ? ending.variables : undefined,
    onEnd: (sessionId: string) => ending.mutate(sessionId), onRetry: () => { ending.reset(); void query.refetch(); void incoming.refetch(); } };
}
export function SpekoCallHistory({ companyId, endpointId }: { companyId: string; endpointId: string }) {
  return <SpekoCallHistoryView {...useSpekoCallHistory(companyId, endpointId)} />;
}
