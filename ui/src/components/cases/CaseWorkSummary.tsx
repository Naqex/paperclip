import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Clock3 } from "lucide-react";
import type { CaseDetail, CaseHandoffView } from "@/api/cases";
import { AgentIdentity } from "@/components/AgentIdentity";
import type { AvatarAgent } from "@/components/AgentAvatar";
import { IssueReferencePill } from "@/components/IssueReferencePill";
import { IssueStatusBadge } from "@/components/StatusBadge";
import { PropertyRow } from "@/components/issue-properties/primitives";

export type CaseAgentMap = ReadonlyMap<string, AvatarAgent & { status?: string }>;

export function CaseWorkSummary({ caseData, pendingHandoff, agents }: {
  caseData: CaseDetail;
  pendingHandoff?: CaseHandoffView | null;
  agents?: CaseAgentMap;
}) {
  useInterfaceLanguage();
  const task = caseData.workIssue;
  const pending = pendingHandoff === undefined ? caseData.pendingHandoff : pendingHandoff;
  const assignee = task?.assigneeAgentId ? agents?.get(task.assigneeAgentId) ?? {
    id: task.assigneeAgentId,
    name: task.assigneeAgentName ?? "Agent",
  } : null;
  const from = pending?.fromAgentId ? agents?.get(pending.fromAgentId)?.name ?? pending.fromAgentName ?? "the previous agent" : "the previous agent";
  const to = pending ? (pending.toAgentId ? agents?.get(pending.toAgentId)?.name : null) ?? pending.toAgentName ?? "the receiving agent" : null;
  const destination = pending?.toAgentId ? agents?.get(pending.toAgentId) : null;
  const waiting = pending?.destinationKind === "done" ? "Case will close when the task is complete." : pending?.lastError
    ?? (pending?.state === "awaiting_release" ? `Waiting for ${from} to finish.`
      : destination?.status === "paused" ? `${to} is paused.` : `Waiting for ${to} to start.`);

  return <section className="space-y-3" aria-label={interfaceText("m_a81fc1d573acaf")}>
    <h2 className="text-sm font-semibold">{interfaceText("m_104ab9213e28e4")}</h2>
    {caseData.workIssueId ? <div className="space-y-3">
      {task ? <div>
        <PropertyRow label={interfaceText("m_4bc74b21357c6c")}><IssueReferencePill issue={task} className="min-h-11 md:min-h-0" /></PropertyRow>
        <PropertyRow label={interfaceText("m_2e2d5c5649b718")}><span className="text-sm">{caseData.workflow?.name ?? interfaceText("m_b4833c5845b038")}</span></PropertyRow>
        {caseData.phase && <PropertyRow label={interfaceText("m_46342ec1eec9d7")}><span className="text-sm">{caseData.phase}</span></PropertyRow>}
        <PropertyRow label="Agent">{assignee ? <AgentIdentity agent={assignee} size="xs" /> : <span className="text-sm text-muted-foreground">{interfaceText("m_14d33bd014e6b4")}</span>}</PropertyRow>
        <PropertyRow label={interfaceText("m_3fd71308f76067")}><IssueStatusBadge status={task.status} /></PropertyRow>
      </div> : <p className="text-sm text-muted-foreground">{interfaceText("m_f9b441289005c8")}</p>}
      {pending && pending.state !== "delivered" && pending.state !== "completed" && pending.state !== "cancelled" && <div className="flex items-start gap-2 text-sm">
        <Clock3 aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-1">
          {pending.state === "awaiting_release" && <p>{interfaceText("m_1ee8f7531e33f8")}{pending.workflowTransition?.to.name ?? interfaceText("m_b4833c5845b038")} · {pending.phase}</p>}
          <p className="text-xs leading-relaxed text-muted-foreground">{waiting}</p>
        </div>
      </div>}
    </div> : <p className="text-sm text-muted-foreground">{interfaceText("m_9ab7ec8db9bb1e")}</p>}
  </section>;
}
