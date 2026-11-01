import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Agent, AcceptedPlanDecompositionSummary } from "@paperclipai/shared";
import { ChevronRight, GitBranch, Repeat, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "@/lib/router";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { cn, formatDateTime, relativeTime } from "../lib/utils";

interface IssuePlanDecompositionsSectionProps {
  issueId: string;
  issueIdentifier: string | null;
  agentMap?: Map<string, Agent>;
}

function StatusBadge({ status }: { status: AcceptedPlanDecompositionSummary["status"] }) {
  useInterfaceLanguage();
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 text-(length:--text-micro) font-medium text-emerald-900 dark:text-emerald-100">
        <CheckCircle2 className="h-3 w-3" />{interfaceText("m_22a970d2e5b1cc")}</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-(length:--text-micro) font-medium text-amber-900 dark:text-amber-100">
      <Loader2 className="h-3 w-3 animate-spin" />{interfaceText("m_b65abbf5920b27")}</span>
  );
}

export function IssuePlanDecompositionsSection({
  issueId,
  issueIdentifier,
  agentMap,
}: IssuePlanDecompositionsSectionProps) {
  useInterfaceLanguage();
  const { data: decompositions } = useQuery({
    queryKey: queryKeys.issues.acceptedPlanDecompositions(issueId),
    queryFn: () => issuesApi.listAcceptedPlanDecompositions(issueId),
  });

  const items = useMemo(() => decompositions ?? [], [decompositions]);
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{interfaceText("m_b574bd1cca1997")}</h3>
        <span className="text-(length:--text-micro) text-muted-foreground/80">
          {items.length === 1 ? interfaceText("m_991dbe78cf4363") : interfaceText("m_074621354d8a37", { value0: (items.length) })}
        </span>
      </div>

      <ul className="space-y-3">
        {items.map((record) => {
          const requested = record.requestedChildCount ?? 0;
          const created = record.childIssueIds?.length ?? 0;
          const ownerName = record.ownerAgentId
            ? agentMap?.get(record.ownerAgentId)?.name ?? "agent"
            : null;
          const revisionLabel =
            record.acceptedPlanRevisionNumber != null
              ? interfaceText("m_f51ae9e8e1b7e9", { value0: (record.acceptedPlanRevisionNumber) })
              : interfaceText("m_f51ae9e8e1b7e9", { value0: (record.acceptedPlanRevisionId.slice(0, 8)) });
          const completedAt =
            record.completedAt && typeof record.completedAt === "string"
              ? record.completedAt
              : record.completedAt instanceof Date
                ? record.completedAt.toISOString()
                : null;
          const updatedAt =
            typeof record.updatedAt === "string"
              ? record.updatedAt
              : record.updatedAt instanceof Date
                ? record.updatedAt.toISOString()
                : null;
          const startedAt =
            typeof record.createdAt === "string"
              ? record.createdAt
              : record.createdAt instanceof Date
                ? record.createdAt.toISOString()
                : null;

          return (
            <li
              key={record.id}
              // design-allow(card-pattern): semantic <li> row inside a <ul>; Card renders a div (C5a Run 3)
              className="rounded-md border border-border bg-card/50 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={record.status} />
                <span className="text-xs text-muted-foreground">{interfaceText("m_af56fe657b853c")}{revisionLabel}
                </span>
                <span className="text-xs text-muted-foreground/70">·</span>
                <span className="inline-flex items-center gap-1 text-xs text-foreground">
                  <GitBranch className="h-3 w-3 text-muted-foreground" />
                  {created}{interfaceText("m_a4282e4b2298b9")}{requested}{interfaceText("m_fafb919f770800")}{requested === 1 ? interfaceText("m_0ebb429fa86d48") : interfaceText("m_085154084c7427")}{interfaceText("m_244de782ca9286")}</span>
                {record.status === "completed" && requested > 0 ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-sm border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-(length:--text-nano) font-medium text-sky-900 dark:text-sky-100"
                    title={interfaceText("m_0c407f0aaf6203")}
                  >
                    <Repeat className="h-3 w-3" />{interfaceText("m_33d4ffdad20c0b")}</span>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-(length:--text-micro) text-muted-foreground">
                {ownerName ? <span>{interfaceText("m_60d5bbcba717b8")}{ownerName}</span> : null}
                {startedAt ? (
                  <span title={formatDateTime(startedAt)}>{interfaceText("m_fdc85156a1e21f")}{relativeTime(startedAt)}</span>
                ) : null}
                {completedAt ? (
                  <span title={formatDateTime(completedAt)}>{interfaceText("m_c6af4d5c4f1518")}{relativeTime(completedAt)}</span>
                ) : updatedAt ? (
                  <span title={formatDateTime(updatedAt)}>{interfaceText("m_a919c7c2d1a486")}{relativeTime(updatedAt)}</span>
                ) : null}
                {issueIdentifier ? (
                  <Link
                    to={`/issues/${issueIdentifier}#document-plan`}
                    className="underline-offset-2 hover:underline"
                  >{interfaceText("m_f0f6f3502007e5")}</Link>
                ) : null}
              </div>

              {record.childIssues && record.childIssues.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {record.childIssues.map((child) => (
                    <li key={child.id}>
                      <Link
                        to={`/issues/${child.identifier ?? child.id}`}
                        className={cn(
                          "inline-flex max-w-full items-center gap-1 rounded-sm border border-border bg-background px-2 py-0.5 text-(length:--text-micro) text-foreground transition-colors hover:bg-accent/40",
                        )}
                        title={child.title}
                      >
                        <span className="font-medium">
                          {child.identifier ?? child.id.slice(0, 8)}
                        </span>
                        <span className="truncate max-w-(--sz-24ch) text-muted-foreground">
                          {child.title}
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
