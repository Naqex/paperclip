import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useMemo, useState } from "react";
import { useCoordinatorChatTaskHandoffs } from "./CoordinatorChatTaskHandoffs";
import { CoordinatorCreatedTaskLink } from "./CoordinatorTaskCommitment";
import { ToolbarSearch } from "@/components/ToolbarSearch";
import { NativeSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/** The task list is source-conversation scoped, independent of reassignment. */
export function CoordinatorConversationTasksPanel({ conversationIssueId }: { conversationIssueId: string }) {
  useInterfaceLanguage();
  const tasks = useCoordinatorChatTaskHandoffs(conversationIssueId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return tasks.handoffs.filter(task => (!status || task.status === status) && (!needle || `${task.identifier ?? ""} ${task.title}`.toLocaleLowerCase().includes(needle)))
      .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : (sort === "oldest" ? 1 : -1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  }, [tasks.handoffs, query, status, sort]);
  return <section className="space-y-4" aria-label={interfaceText("m_8752e6d1a1e6dd")}>
    <div className="space-y-1"><h2 className="text-lg font-medium">{interfaceText("m_b3a60e61a5233d")}</h2><p className="text-sm text-muted-foreground">{interfaceText("m_379e4f9c80a921")}</p></div>
    <ToolbarSearch query={query} onQueryChange={setQuery} label={interfaceText("m_a85cd5124ab1c8")} placeholder={interfaceText("m_79f9b89a0d2e54")} />
    <div className="flex flex-wrap gap-2">
      <NativeSelect value={status} onChange={event => setStatus(event.target.value)} aria-label={interfaceText("m_de43fd9c3d4e1d")} className="w-auto"><option value="">{interfaceText("m_8ee57323a6f24c")}</option><option value="todo">{interfaceText("m_bc403cd60f89b0")}</option><option value="in_progress">{interfaceText("m_c1f88e9d6c4145")}</option><option value="in_review">{interfaceText("m_07297fa94a997d")}</option><option value="blocked">{interfaceText("m_18f2a0947f9d65")}</option><option value="done">{interfaceText("m_11a6767d5674c7")}</option><option value="cancelled">{interfaceText("m_d353a99eb45568")}</option></NativeSelect>
      <NativeSelect value={sort} onChange={event => setSort(event.target.value)} aria-label={interfaceText("m_60587310b92e02")} className="w-auto"><option value="newest">{interfaceText("m_ffb6f5764bddb6")}</option><option value="oldest">{interfaceText("m_6e2ebdab3c02a3")}</option><option value="title">{interfaceText("m_7e8cd2056da73a")}</option></NativeSelect>
    </div>
    {tasks.isPending && <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_9ae9f7d835d95a")}</p>}
    {tasks.isError && <div role="alert" className="space-y-2"><p className="text-sm">{interfaceText("m_6efc21ac5f4486")}</p><Button variant="outline" onClick={() => void tasks.refetch()}>{interfaceText("m_942087cc2d41e0")}</Button></div>}
    <div className="space-y-3">{visible.map(task => <div key={task.id} className="overflow-hidden rounded-xl border border-border bg-card"><CoordinatorCreatedTaskLink task={task} /></div>)}</div>
    {!tasks.isPending && !tasks.isError && !visible.length && <p className="py-4 text-sm text-muted-foreground">{query || status ? interfaceText("m_d41a500a2cb69f") : interfaceText("m_1dbab0dd1a799b")}</p>}
    {tasks.hasNextPage && <Button variant="outline" disabled={tasks.isFetchingNextPage} onClick={() => void tasks.fetchNextPage()}>{tasks.isFetchingNextPage ? interfaceText("m_ba3bbbe10d8bef") : interfaceText("m_af07ba09cbf86d")}</Button>}
  </section>;
}
