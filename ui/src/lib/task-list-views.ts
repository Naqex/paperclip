import { interfaceText } from "@/i18n/interface-copy";
import type { Issue } from "@paperclipai/shared";

export const taskListViews = [
  { value: "inbox", get label() { return interfaceText("m_94835ea2fcf775"); } },
  { value: "unread", get label() { return interfaceText("m_1b9f384c1436f6"); } },
  { value: "blocked", get label() { return interfaceText("m_c1ebc7817870e5"); } },
  { value: "all", get label() { return interfaceText("m_cb66482383df9e"); } },
] as const;

export type TaskListView = typeof taskListViews[number]["value"];
type ViewIssue = Pick<Issue, "createdByUserId" | "assigneeUserId" | "status">;

/** Apply within the current company's accessible tasks; ancestors are added separately. */
export function matchesTaskListView(view: TaskListView, issue: ViewIssue, unread: boolean, userId: string | null): boolean {
  switch (view) {
    case "inbox": return Boolean(userId && (issue.createdByUserId === userId || issue.assigneeUserId === userId));
    case "unread": return unread;
    case "blocked": return issue.status === "blocked" || issue.status === "in_review";
    case "all": return true;
  }
}

export function taskListViewStorageKey(scope: string, userId: string): string {
  return `paperclip:task-list-view:v1:${encodeURIComponent(scope)}:${encodeURIComponent(userId)}`;
}

type ViewStorage = Pick<Storage, "getItem" | "setItem">;
function browserStorage(): ViewStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadTaskListView(key: string, storage: ViewStorage | null = browserStorage()): TaskListView {
  try {
    const value = storage?.getItem(key);
    return taskListViews.find(option => option.value === value)?.value ?? "all";
  } catch {
    return "all";
  }
}

export function saveTaskListView(key: string, view: TaskListView, storage: ViewStorage | null = browserStorage()): void {
  try {
    storage?.setItem(key, view);
  } catch {
    // Storage denial must not prevent changing the current view.
  }
}
