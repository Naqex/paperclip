import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ScrollText } from "lucide-react";
import { Link } from "@/lib/router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import {
  toolsApi,
  type ToolAuditOutcome,
  type ToolAuditWindow,
  type ToolGatewayActivityEvent,
} from "@/api/tools";
import { agentsApi } from "@/api/agents";
import { AgentSelect } from "@/components/AgentMultiSelect";
import { ToolsPageHeader, LoadingState, ErrorState, RelativeTime } from "./shared";

const PAGE_SIZE = 50;
const ALL = "__all";

/** Outcome chip vocabulary (spec §4C / §5): Allowed · Blocked · Asked first · Failed · Waiting. */
const OUTCOME_META: Record<ToolAuditOutcome, { label: string; status: string }> = {
  allowed: { get label() { return interfaceText("m_1bb201d188352e"); }, status: "allowed" },
  blocked: { get label() { return interfaceText("m_18f2a0947f9d65"); }, status: "denied" },
  asked_first: { get label() { return interfaceText("m_db928628a30ccd"); }, status: "require-approval" },
  waiting: { get label() { return interfaceText("m_6e293a8c009e00"); }, status: "deferred" },
  failed: { get label() { return interfaceText("m_031a8f0f659df8"); }, status: "failed" },
  unknown: { get label() { return interfaceText("m_c7175fa7a0db0d"); }, status: "unchecked" },
};

const OUTCOME_FILTERS: { value: string; label: string }[] = [
  { value: ALL, get label() { return interfaceText("m_1d7f920d0db498"); } },
  { value: "allowed", get label() { return interfaceText("m_1bb201d188352e"); } },
  { value: "blocked", get label() { return interfaceText("m_18f2a0947f9d65"); } },
  { value: "asked_first", get label() { return interfaceText("m_db928628a30ccd"); } },
  { value: "waiting", get label() { return interfaceText("m_6e293a8c009e00"); } },
  { value: "failed", get label() { return interfaceText("m_031a8f0f659df8"); } },
];

const WINDOW_FILTERS: { value: ToolAuditWindow; label: string }[] = [
  { value: "all", get label() { return interfaceText("m_9755c8d7d44a62"); } },
  { value: "1h", get label() { return interfaceText("m_3e88e2410dc4c4"); } },
  { value: "24h", get label() { return interfaceText("m_5c37cf8f018b4a"); } },
  { value: "7d", get label() { return interfaceText("m_0603deca4fcb66"); } },
  { value: "30d", get label() { return interfaceText("m_f8f03fb441b8b4"); } },
];

function detailString(details: Record<string, unknown> | null, key: string): string | undefined {
  const v = details?.[key];
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}

function detailStringArray(details: Record<string, unknown> | null, key: string): string[] {
  const v = details?.[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function detailRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function detailNumber(details: Record<string, unknown> | null, key: string): number | undefined {
  const value = details?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function formattedArguments(details: Record<string, unknown> | null): string | undefined {
  const summary = detailRecord(details?.argumentsSummary);
  const serialized = typeof summary?.summary === "string" ? summary.summary : undefined;
  if (!serialized) return undefined;
  try {
    return JSON.stringify(JSON.parse(serialized), null, 2);
  } catch {
    return serialized;
  }
}

function lifecycleSummary(event: ToolGatewayActivityEvent): string | null {
  if (!event.lifecycleType) return null;
  const who = event.actorDisplayName ?? event.agentDisplayName ?? "Someone";
  const app = event.appDisplayName ?? event.connectionDisplayName ?? "this app";
  const count = detailNumber(event.details, "count") ?? 0;
  const added = detailNumber(event.details, "added") ?? 0;
  const removed = detailNumber(event.details, "removed") ?? 0;
  switch (event.lifecycleType) {
    case "app_connected":
      return `${who} connected ${app}`;
    case "app_paused":
      return `${who} paused ${app}`;
    case "app_resumed":
      return `${who} resumed ${app}`;
    case "reconnected":
      return `${who} reconnected ${app}`;
    case "disconnected":
      return `${who} disconnected ${app}`;
    case "allowlist_changed":
      if (added > 0 && removed === 0) return `${who} added ${added} allowed ${added === 1 ? "item" : "items"} in ${app}`;
      if (removed > 0 && added === 0) return `${who} removed ${removed} allowed ${removed === 1 ? "item" : "items"} in ${app}`;
      return `${who} updated the allowlist for ${app}`;
    case "actions_quarantined":
      return `${count} new ${count === 1 ? "action needs" : "actions need"} review in ${app}`;
    default:
      return `${who} updated ${app}`;
  }
}

/** Plain-words "why" for the row expander, keyed off the reason code. */
function plainReason(event: ToolGatewayActivityEvent): string {
  if (event.lifecycleType) return "This connection change was recorded in the app's activity history.";
  const code = detailString(event.details, "reasonCode");
  if (code === "permitted_connections_not_installed") {
    return "Permitted connections were not installed, so their tools were not added to this run.";
  }
  switch (event.normalizedOutcome) {
    case "allowed":
      return "Allowed by your rules.";
    case "blocked":
      if (code === "rate_limited") return "Blocked because it ran too many times in a short window.";
      if (code?.includes("secret")) return "Blocked to keep a sensitive value from leaving.";
      return "Blocked by a rule.";
    case "asked_first":
      return "Held for someone to approve before it could run.";
    case "waiting":
      return "Waiting — the app it needs wasn't ready yet.";
    case "failed":
      return "The app was allowed to run it, but returned an error.";
    default:
      return "Recorded by Paperclip.";
  }
}

/** Compact monospace fact row inside the Details collapse. */
function DetailFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 break-all text-foreground", mono && "font-mono text-(length:--text-micro)")}>{value}</span>
    </div>
  );
}

function OutcomeChip({ outcome }: { outcome: ToolAuditOutcome }) {
  const meta = OUTCOME_META[outcome] ?? OUTCOME_META.unknown;
  return <StatusBadge status={meta.status} label={meta.label} />;
}

function ActivityRow({
  event,
  ruleNamesById,
}: {
  event: ToolGatewayActivityEvent;
  ruleNamesById: Map<string, string>;
}) {
  useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const who = event.agentDisplayName ?? "An agent";
  const action = event.toolDisplayName ?? "an action";
  const app = event.appDisplayName ?? event.connectionDisplayName ?? event.applicationDisplayName ?? null;
  const lifecycle = lifecycleSummary(event);
  const rawTool = detailString(event.details, "tool") ?? detailString(event.details, "toolName");

  const issueId = detailString(event.details, "issueId");
  const runId = event.runId ?? detailString(event.details, "runId");
  const agentId = event.agentId ?? detailString(event.details, "agentId");
  const reasonCode = detailString(event.details, "reasonCode") ?? event.action.replace("tool_gateway.", "");
  const matchedRuleId = detailStringArray(event.details, "matchedPolicyIds").find((id) => ruleNamesById.has(id));
  const matchedRuleName = matchedRuleId ? ruleNamesById.get(matchedRuleId) : undefined;
  const argumentsText = formattedArguments(event.details);
  const execution = detailRecord(event.details?.execution);
  const request = detailRecord(execution?.request);
  const response = detailRecord(execution?.response);
  const transport = detailString(execution, "transport");
  const requestMethod = detailString(request, "httpMethod");
  const endpoint = detailString(request, "endpoint");
  const mcpMethod = detailString(request, "mcpMethod");
  const requestId = detailString(request, "requestId");
  const httpStatus = detailNumber(response, "httpStatus");
  const contentType = detailString(response, "contentType");
  const responseBytes = detailNumber(response, "bodySizeBytes");
  const upstreamRequestId = detailString(response, "upstreamRequestId");
  const permittedNotInstalledCount = detailNumber(event.details, "permittedNotInstalledCount");
  const permittedNotInstalledConnections = Array.isArray(event.details?.permittedNotInstalledConnections)
    ? event.details.permittedNotInstalledConnections
      .map(detailRecord)
      .filter((connection): connection is Record<string, unknown> => connection !== null)
    : [];
  const isRuntimeMcpDeliveryDiagnostic = reasonCode === "permitted_connections_not_installed";

  return (
    <li className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-accent/50"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1">
          {lifecycle ? (
            <span className="block text-foreground">{lifecycle}</span>
          ) : isRuntimeMcpDeliveryDiagnostic ? (
            <span className="block text-foreground">
              <span className="font-medium">{who}</span>{interfaceText("m_76fb41633e1a54")}{" "}
              <span className="font-medium">{permittedNotInstalledCount ?? permittedNotInstalledConnections.length}</span>{" "}{interfaceText("m_f9e970f212d04a")}{(permittedNotInstalledCount ?? permittedNotInstalledConnections.length) === 1 ? interfaceText("m_b38d9d168c3aed") : interfaceText("m_1e5fac867454a4")}{interfaceText("m_8b1d0c796fe971")}</span>
          ) : (
            <span className="block text-foreground">
              <span className="font-medium">{who}</span>{interfaceText("m_dbe119136b2670")}<span className="font-medium">{action}</span>
              {app ? (
                <>
                  {" "}{interfaceText("m_74241f65e5ac9f")}<span className="font-medium">{app}</span>
                </>
              ) : null}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          {event.lifecycleType ? null : <OutcomeChip outcome={event.normalizedOutcome} />}
          <span className="text-xs text-muted-foreground">
            · <RelativeTime value={event.createdAt} />
          </span>
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-3 pl-10 text-sm">
          <p className="text-foreground">
            {plainReason(event)}
            {matchedRuleName ? (
              <>
                {" "}
                <span className="font-medium">{matchedRuleName}</span>
              </>
            ) : null}
          </p>

          <div className="flex flex-wrap gap-3 text-xs">
            {issueId ? (
              <Link to={`/issues/${issueId}`} className="text-primary hover:underline">{interfaceText("m_01444a2b442a7b")}</Link>
            ) : null}
            {runId && agentId ? (
              <Link to={`/agents/${agentId}/runs/${runId}`} className="text-primary hover:underline">{interfaceText("m_aaf7fccc7d1315")}</Link>
            ) : null}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {detailsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}{interfaceText("m_45989de49fb7f6")}</button>
            {detailsOpen ? (
              <div className="mt-2 space-y-1.5 text-xs">
                {rawTool ? <DetailFact label={interfaceText("m_323a3fff012475")} value={rawTool} mono /> : null}
                <DetailFact label={interfaceText("m_9e13ec9ee6a95a")} value={reasonCode} mono />
                <DetailFact label={interfaceText("m_6d003d9d9a9349")} value={event.actorType ?? "—"} />
                {runId ? <DetailFact label={interfaceText("m_26d3e7aaace434")} value={runId} mono /> : null}
                {transport ? <DetailFact label={interfaceText("m_aaead4abf5d0fd")} value={transport} mono /> : null}
                {requestMethod && endpoint ? <DetailFact label={interfaceText("m_f1ee1152c8b29e")} value={`${requestMethod} ${endpoint}`} mono /> : null}
                {mcpMethod ? <DetailFact label={interfaceText("m_e810a950faf752")} value={mcpMethod} mono /> : null}
                {requestId ? <DetailFact label={interfaceText("m_d561f528baf777")} value={requestId} mono /> : null}
                {request ? <DetailFact label={interfaceText("m_a43dccadeb619e")} value={request.dispatched === true ? "Yes" : "No"} /> : null}
                {httpStatus !== undefined ? <DetailFact label={interfaceText("m_0f7cf91f242cdf")} value={String(httpStatus)} mono /> : null}
                {contentType ? <DetailFact label={interfaceText("m_6f51cb0403204b")} value={contentType} mono /> : null}
                {responseBytes !== undefined ? <DetailFact label={interfaceText("m_3bbd79b42b54c2")} value={`${responseBytes} bytes`} /> : null}
                {upstreamRequestId ? <DetailFact label={interfaceText("m_56ca20b2823d95")} value={upstreamRequestId} mono /> : null}
                {isRuntimeMcpDeliveryDiagnostic ? (
                  <>
                    <DetailFact label={interfaceText("m_e8f93a3ea5e8fb")} value="0" mono />
                    {permittedNotInstalledConnections.map((connection) => {
                      const connectionId = detailString(connection, "id");
                      const connectionName = detailString(connection, "name") ?? "Unnamed connection";
                      return connectionId ? (
                        <div key={connectionId} className="flex gap-2">
                          <span className="shrink-0 text-muted-foreground">{interfaceText("m_d177cdc09a4ea3")}</span>
                          <Link to={`/apps/${connectionId}/permissions`} className="font-medium text-primary hover:underline">
                            {connectionName}
                          </Link>
                        </div>
                      ) : null;
                    })}
                  </>
                ) : null}
                {argumentsText ? (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">{interfaceText("m_7aa473afa7c5f4")}</span>
                    <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground">
                      {argumentsText}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function AuditTab({ companyId }: { companyId: string }) {
  useInterfaceLanguage();
  const [app, setApp] = useState<string>(ALL);
  const [agent, setAgent] = useState<string>(ALL);
  const [outcome, setOutcome] = useState<string>(ALL);
  const [windowKey, setWindowKey] = useState<ToolAuditWindow>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce the search box so each keystroke doesn't fire a server request.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const apps = useQuery({
    queryKey: queryKeys.tools.applications(companyId),
    queryFn: () => toolsApi.listApplications(companyId),
  });
  const agents = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
  });
  // Map matched rule IDs to their humanized names for the row "why" link.
  const policies = useQuery({
    queryKey: queryKeys.tools.policies(companyId),
    queryFn: () => toolsApi.listPolicies(companyId),
  });
  const ruleNamesById = useMemo(
    () => new Map((policies.data?.policies ?? []).map((p) => [p.id, p.name])),
    [policies.data],
  );

  const filters = {
    app: app === ALL ? undefined : app,
    agent: agent === ALL ? undefined : agent,
    outcome: outcome === ALL ? undefined : outcome,
    window: windowKey,
    search: search || undefined,
  };
  const hasActiveFilters =
    app !== ALL || agent !== ALL || outcome !== ALL || windowKey !== "all" || search.length > 0;

  const activity = useInfiniteQuery({
    queryKey: queryKeys.tools.activity(companyId, {
      app: filters.app,
      agent: filters.agent,
      outcome: filters.outcome,
      window: filters.window,
      search: filters.search,
    }),
    queryFn: ({ pageParam }) =>
      toolsApi.listActivity(companyId, { ...filters, limit: PAGE_SIZE, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const events = useMemo(
    () => activity.data?.pages.flatMap((page) => page.events) ?? [],
    [activity.data],
  );

  const clearFilters = () => {
    setApp(ALL);
    setAgent(ALL);
    setOutcome(ALL);
    setWindowKey("all");
    setSearchInput("");
    setSearch("");
  };

  return (
    <div className="space-y-4">
      <ToolsPageHeader
        title={interfaceText("m_38da1505ca8373")}
        description={interfaceText("m_c7a12a9c26f81c")}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={app} onValueChange={setApp}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={interfaceText("m_0d04bfeb7d64b7")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{interfaceText("m_01bed311e7d0c9")}</SelectItem>
            {(apps.data?.applications ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AgentSelect
          agents={[{ id: ALL, name: "All agents" }, ...(agents.data ?? [])]}
          value={agent}
          onChange={setAgent}
          triggerClassName="w-40"
        />
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTCOME_FILTERS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={windowKey} onValueChange={(v) => setWindowKey(v as ToolAuditWindow)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOW_FILTERS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder={interfaceText("m_6f14857bfd04fa")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />
        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>{interfaceText("m_7179ea0035fca7")}</Button>
        ) : null}
      </div>

      {activity.isLoading ? (
        <LoadingState />
      ) : activity.error ? (
        <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
      ) : events.length === 0 ? (
        hasActiveFilters ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <ScrollText className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">{interfaceText("m_2acc5c1033c90d")}</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">{interfaceText("m_4e97d386c47afe")}</p>
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>{interfaceText("m_7179ea0035fca7")}</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <ScrollText className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">{interfaceText("m_49abaf804ab38c")}</p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">{interfaceText("m_3d3eaa1988ecba")}</p>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="px-0 py-0">
            <ul className="divide-y divide-border">
              {events.map((event) => (
                <ActivityRow key={event.id} event={event} ruleNamesById={ruleNamesById} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {activity.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => activity.fetchNextPage()}
            disabled={activity.isFetchingNextPage}
          >
            {activity.isFetchingNextPage ? interfaceText("m_ba3bbbe10d8bef") : interfaceText("m_ac8991ef01019c")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
