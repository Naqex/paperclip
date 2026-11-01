import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { Issue } from "@paperclipai/shared";
import { timeAgo } from "@/lib/timeAgo";
import { IssueRow } from "./IssueRow";

/** Flat, read-style summary of caller-ordered tasks. Reuses the canonical row's
 * navigation, status tooltip, hover, focus and cell-local marquee. Rendering a
 * summary never changes the task's actual read state. */
export function TaskSummaryList({ issues, label = interfaceText("m_7b940d847536b1"), showIdentifier = true, showUpdated = true, issueLinkState }: {
  issues: readonly Issue[];
  label?: string;
  showIdentifier?: boolean;
  showUpdated?: boolean;
  issueLinkState?: unknown;
}) {
  useInterfaceLanguage();
  return <ul className="task-summary-list" aria-label={label}>
    {issues.map(issue => <li key={issue.id}>
      <IssueRow issue={issue} presentation="task" appearance="refreshed" density="comfortable"
        className="task-summary-row" unreadState="hidden" showIdentifier={showIdentifier}
        trailingMeta={showUpdated ? timeAgo(issue.updatedAt) : undefined} issueLinkState={issueLinkState} />
    </li>)}
  </ul>;
}
