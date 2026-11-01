import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "../lib/router";
import type { CostDataQualityItem, CostDataQualityReason } from "@paperclipai/shared";
import { costsApi } from "../api/costs";
import { formatDateTime } from "../lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AgentAvatar } from "./AgentAvatar";
import { useToastActions } from "../context/ToastContext";

const explanations: Record<CostDataQualityReason, { label: string; description: string }> = {
  unknown_billing: {
    get label() { return interfaceText("m_a545221d406481"); },
    description: "This run did not identify API or subscription billing. Any recorded charges are included in the inference ledger. For future runs, select an AI connection in the agent’s configuration so Paperclip can identify its billing.",
  },
  missing_model: {
    get label() { return interfaceText("m_794a63740481b1"); },
    description: "Token usage was recorded without a model, so Paperclip cannot estimate its cost. Select an explicit model in the agent’s configuration for future runs. Changing settings will not reprice this past run.",
  },
  missing_price: {
    get label() { return interfaceText("m_b1e2387a957beb"); },
    description: "The provider did not supply a reliable price for this usage. There is no action required for this past entry. New API runs with complete usage and a supported model are estimated automatically.",
  },
  waiting_for_receipt: {
    get label() { return interfaceText("m_52dce6c3a32757"); },
    description: "This run has stopped. Paperclip is waiting for its final usage data and will record it automatically. You do not need to rerun the agent.",
  },
  receipt_unavailable: {
    get label() { return interfaceText("m_0acba8cbd24cb9"); },
    description: "This run stopped without final usage data. Its cost remains unresolved for budget checks. Paperclip will record a late receipt if one arrives; rerunning the agent will not recover this usage.",
  },
  retryable: {
    get label() { return interfaceText("m_faf7eee20c49c4"); },
    description: "Saved usage data is ready to be recorded. Paperclip retries automatically, or you can retry now. This records costs only; it does not rerun the agent.",
  },
};

export function CostDataQualityNotice({ companyId, from, to, reportKey, unpricedCount, pendingCount, unknownBillingCount }: {
  companyId: string; from?: string; to?: string; reportKey: readonly unknown[];
  unpricedCount: number; pendingCount: number; unknownBillingCount: number;
}) {
  useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  const unavailableCount = unpricedCount + pendingCount;
  const hasCostGaps = unavailableCount > 0 || unknownBillingCount > 0;
  const detailsId = useId();
  const client = useQueryClient();
  const { pushToast } = useToastActions();
  const key = [...reportKey, "data-quality"];
  const { data, error, isPending, refetch } = useQuery({
    queryKey: key,
    queryFn: () => costsApi.dataQuality(companyId, from, to),
    enabled: open && hasCostGaps,
    refetchInterval: open && hasCostGaps ? 30_000 : false,
  });
  const retry = useMutation({
    mutationFn: (runId: string) => costsApi.retryAccounting(companyId, runId),
    onSuccess: result => {
      pushToast({
        title: result.accounted ? interfaceText("m_5968d6d63a1987") : interfaceText("m_dae054421f5702"),
        body: interfaceText("m_1cf192c04e0748"),
        tone: result.accounted ? "success" : "info",
      });
      client.invalidateQueries({ queryKey: ["costs", companyId] });
      client.invalidateQueries({ queryKey: key });
      client.invalidateQueries({ queryKey: ["cost-subscriptions", companyId] });
    },
  });
  const label = unavailableCount > 0
    ? interfaceText("m_6a7e56a15666b0", { value0: (unavailableCount), value1: (unavailableCount === 1 ? "cost" : "costs") })
    : interfaceText("m_d2d8b365f06e2d", { value0: (unknownBillingCount), value1: (unknownBillingCount === 1 ? "type" : "types") });

  const groups = new Map<string | null, {
    agent: { id?: string; name: string; appearance?: CostDataQualityItem["agentAppearance"] };
    items: { item: CostDataQualityItem; source: "event" | "run" }[];
  }>();
  for (const [source, items] of [["event", data?.events ?? []], ["run", data?.runs ?? []]] as const) {
    for (const item of items) {
      let group = groups.get(item.agentId);
      if (!group) {
        group = { agent: { id: item.agentId ?? undefined, name: item.agentName ?? (item.agentId ? "Unknown agent" : "Paperclip services"), appearance: item.agentAppearance }, items: [] };
        groups.set(item.agentId, group);
      }
      group.items.push({ item, source });
    }
  }
  const sortedGroups = [...groups.values()].sort((a, b) =>
    a.agent.name.localeCompare(b.agent.name, "en", { sensitivity: "base", numeric: true })
    || (a.agent.id ?? "").localeCompare(b.agent.id ?? ""));
  for (const group of sortedGroups) group.items.sort((a, b) =>
    Date.parse(b.item.occurredAt) - Date.parse(a.item.occurredAt)
    || `${a.source}:${a.item.id}`.localeCompare(`${b.source}:${b.item.id}`));

  function itemRow(item: CostDataQualityItem, source: "event" | "run") {
    const explanation = explanations[item.reason];
    return <li key={`${source}:${item.id}`} className="space-y-2 border-b border-border py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-normal text-muted-foreground">{explanation.label}</Badge>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
          {item.runId && item.agentId && <Link className="text-primary underline underline-offset-4 hover:text-primary/80" to={`/agents/${item.agentId}/runs/${item.runId}`}>{interfaceText("m_aaf7fccc7d1315")}</Link>}
          {item.reason === "retryable" && item.runId && data?.canRetry && <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs font-normal underline hover:text-primary/80" disabled={retry.isPending}
            onClick={() => { retry.reset(); retry.mutate(item.runId!); }}>{interfaceText("m_ba3ca96329bc23")}</Button>}
        </div>
      </div>
      <p>{explanation.description}</p>
      {retry.variables === item.runId && retry.isPending && <p role="status">{interfaceText("m_f6dcf9eb8aecd8")}</p>}
      {retry.variables === item.runId && retry.error && <p role="status">{interfaceText("m_a3e7c2053f97e2")}</p>}
    </li>;
  }

  return <div className="space-y-2 text-sm text-muted-foreground">
    <Button type="button" variant="ghost" size="sm" className="h-auto justify-start gap-1 px-0 py-1 font-normal has-[>svg]:px-0" aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen(value => !value)}>
      {open ? <ChevronDown className="size-3" aria-hidden="true" /> : <ChevronRight className="size-3" aria-hidden="true" />}
      {label}
    </Button>
    {open && <div id={detailsId} className="space-y-2">
      {hasCostGaps && isPending && <p role="status">{interfaceText("m_3dd744c710c76a")}</p>}
      {hasCostGaps && error && !data && <div className="flex flex-wrap items-center gap-2"><p role="status">{interfaceText("m_aadf8e2370b1f4")}</p><Button variant="outline" size="sm" onClick={() => refetch()}>{interfaceText("m_a0f859bc4db2c2")}</Button></div>}
      {hasCostGaps && data && <>
        {error && <p role="status">{interfaceText("m_115d4a4efacac4")}</p>}
        {data.events.length === 0 && data.runs.length === 0 && <p role="status">{interfaceText("m_4349449b01d5b7")}</p>}
        <ul aria-label={interfaceText("m_3be96e075f41b0")} className="space-y-4">
          {sortedGroups.map(group => <li key={group.agent.id ?? "services"}>
            <h3 className="flex items-center gap-2 font-medium text-foreground">
              <AgentAvatar agent={group.agent} size={20} />
              {group.agent.id ? <Link className="text-primary underline underline-offset-4 hover:text-primary/80" to={`/agents/${group.agent.id}/configuration`}>{group.agent.name}</Link> : group.agent.name}
            </h3>
            <ul aria-label={interfaceText("m_7df5d0442bd454", { value0: (group.agent.name) })}>{group.items.map(({ item, source }) => itemRow(item, source))}</ul>
          </li>)}
        </ul>
        {(data.hasMoreEvents || data.hasMoreRuns) && <p className="text-xs">{interfaceText("m_771282d2a447c6")}</p>}
      </>}
    </div>}
  </div>;
}
