import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useQuery } from "@tanstack/react-query";
import type { DecisionHistoryEntry } from "@paperclipai/shared";
import { decisionModelsApi } from "@/api/decision-models";
import { Link } from "@/lib/router";
import { formatDateTime, formatTokens, formatDetailedCents } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function DecisionHistoryTable({ entries, fastResponse = false, fastResponsesEnabled = true }: { entries: (DecisionHistoryEntry & { publicationStatus?: string; connectionName?: string | null })[]; fastResponse?: boolean; fastResponsesEnabled?: boolean }) {
  useInterfaceLanguage();
  if (!entries.length) return <p className="text-sm text-muted-foreground">{fastResponse ? interfaceText("m_ec54a70a382848") : interfaceText("m_4fba71f5360ee1")} <Link to={fastResponse && !fastResponsesEnabled ? "/company/settings/instance/experimental" : "/company/settings/connections"} className="underline underline-offset-4">{fastResponse ? fastResponsesEnabled ? interfaceText("m_0213c40197ec74") : interfaceText("m_9be2d155f914fa") : interfaceText("m_b30518f2159918")}</Link>{interfaceText("m_e065496ed62828")}</p>;
  return <div className="space-y-3">
    <p className="text-xs text-muted-foreground">{interfaceText("m_34cf722ed8c033")}</p>
    <div className="overflow-x-auto"><table className="w-full text-sm" aria-label={fastResponse ? interfaceText("m_ddef68c517c7a2") : interfaceText("m_f78eb626b6ed66")}>
      <thead><tr className="border-b border-border text-muted-foreground">{["When / feature", "Responsible", "Task", ...(fastResponse ? ["Connection"] : []), "Model", "Status", "Duration", "Tokens in / out", "Cost"].map(label => <th key={label} className="px-3 py-2 text-left font-medium">{label}</th>)}</tr></thead>
      <tbody>{entries.map(row => <tr key={row.id} className="border-b border-border last:border-0">
        <td className="px-3 py-3"><div className="whitespace-nowrap">{formatDateTime(row.startedAt)}</div><div className="text-xs text-muted-foreground">{row.feature === "settings.test" ? interfaceText("m_d3ed4758020542") : row.feature}</div></td>
        <td className="px-3 py-3">{row.actorType === "system" ? interfaceText("m_6485381e70ebb3") : row.userName ?? (row.responsibleUserId === "local-board" ? interfaceText("m_4816cbfd74aa82") : interfaceText("m_6f48f04fa43f92"))}</td>
        <td className="px-3 py-3">{row.issueId ? <Link className="underline underline-offset-4" to={`/issues/${row.issueIdentifier ?? row.issueId}`}>{row.issueIdentifier ?? interfaceText("m_01444a2b442a7b")}</Link> : "—"}</td>
        {fastResponse && <td className="px-3 py-3">{row.connectionName ?? (row.connectionId ? interfaceText("m_1210095436f4d1") : "—")}</td>}
        <td className="px-3 py-3 font-mono text-xs">{row.model}</td>
        <td className="px-3 py-3"><div>{row.status === "succeeded" ? interfaceText("m_6d9a6f97a5fdaf") : row.status === "running" ? interfaceText("m_f4ccae29e1bb0c") : row.status === "unknown" ? interfaceText("m_36afca802c4d6f") : row.status === "skipped" ? interfaceText("m_12698ce1ea5cd4") : row.status === "pending" ? interfaceText("m_331551b0de4157") : interfaceText("m_031a8f0f659df8")}</div>{row.publicationStatus && <div className="text-xs text-muted-foreground">{row.publicationStatus}</div>}{row.errorCode && <div className="text-xs text-muted-foreground">{row.errorCode.replaceAll("_", " ")}</div>}</td>
        <td className="px-3 py-3 font-mono">{row.durationMs === null ? "—" : interfaceText("m_852fe3718c6cfd", { value0: ((row.durationMs / 1000).toFixed(1)) })}</td>
        <td className="whitespace-nowrap px-3 py-3 font-mono">{row.inputTokens === null ? "—" : formatTokens(row.inputTokens)} / {row.outputTokens === null ? "—" : formatTokens(row.outputTokens)}</td>
        <td className="px-3 py-3 font-mono"><div>{row.costCents === null ? interfaceText("m_b764cdc0eab713") : formatDetailedCents(row.costCents)}</div>{row.costStatus !== "unpriced" && row.costStatus && <span className="text-xs text-muted-foreground">{row.costStatus === "estimated" ? interfaceText("m_b774599a9cd1f9") : interfaceText("m_34540bb7b0899b")}</span>}</td>
      </tr>)}</tbody>
    </table></div>
  </div>;
}
export function DecisionHistory({ companyId, from, to }: { companyId: string; from?: string | null; to?: string | null }) {
  useInterfaceLanguage();
  const query = useQuery({ queryKey: ["decision-history", companyId, from, to], queryFn: () => decisionModelsApi.history(companyId, from, to), refetchInterval: q => q.state.data?.some(row => row.status === "running") ? 5000 : false });
  if (query.isPending) return <p className="text-sm text-muted-foreground">{interfaceText("m_ec462bfbaf4bbf")}</p>;
  if (query.error) return <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{interfaceText("m_4daac4ccaa4c50")}</p><Button variant="outline" onClick={() => void query.refetch()}>{interfaceText("m_d8b8392e2c5429")}</Button></div>;
  return <DecisionHistoryTable entries={query.data ?? []} />;
}
