import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { ArrowUpRight, Check, MessageSquare, X } from "lucide-react";
import type { IssueThreadInteraction } from "@/lib/issue-thread-interactions";
import { Link } from "@/lib/router";
import { CoordinatorRelativeTime } from "./CoordinatorRelativeTime";
import { decisionReceiptHref } from "@/lib/decision-receipt-navigation";

/** Compact notification; the original request and its full result stay in the task. */
export function CoordinatorInteractionReceipt({ interaction }: { interaction: IssueThreadInteraction }) {
  useInterfaceLanguage();
  const target = "target" in interaction.payload ? interaction.payload.target : null;
  const accepted = interaction.status === "accepted";
  const answered = interaction.status === "answered";
  const label = answered ? interfaceText("m_37d183a42baee5") : accepted ? interfaceText("m_87b42e40c2a290") : interaction.status === "rejected" ? interfaceText("m_10a92a8ad3ee58") : interaction.status.replaceAll("_", " ");
  const Icon = answered ? MessageSquare : accepted ? Check : X;
  const answerAnchor = `comment-interaction-response:${interaction.id}`;
  const href = answered ? `#${answerAnchor}` : decisionReceiptHref({ issueHref: `/issues/${interaction.issueId}`, interactionId: interaction.id, target });
  return <Link to={href} disableIssueQuicklook onClick={answered ? (event) => {
    const answer = document.getElementById(answerAnchor);
    if (answer) {
      event.preventDefault();
      answer.scrollIntoView({ block: "start", behavior: "auto" });
    }
  } : undefined} className="coordinator-decision-receipt" data-testid="coordinator-decision-receipt">
    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium">{label}{target?.type === "issue_document" && target.revisionNumber ? ` · v${target.revisionNumber}` : ""}</span>
      <span className="block truncate text-xs text-muted-foreground">{interaction.title ?? target?.label ?? interfaceText("m_74f6b4f16ac137")}</span>
    </span>
    {interaction.resolvedAt ? <CoordinatorRelativeTime value={interaction.resolvedAt} className="shrink-0 text-xs text-muted-foreground" /> : null}
    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  </Link>;
}
