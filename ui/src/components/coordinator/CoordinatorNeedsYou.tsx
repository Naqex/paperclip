import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, History, Loader2 } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import type { Agent, AttentionItem, DecisionHistoryItem } from "@paperclipai/shared";
import { attentionApi } from "@/api/attention";
import { agentsApi } from "@/api/agents";
import { projectsApi } from "@/api/projects";
import { useCompany } from "@/context/CompanyContext";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { usePanel } from "@/context/PanelContext";
import { useSidebar } from "@/context/SidebarContext";
import { useCoordinatorWorkspaceEnabled } from "@/hooks/useCoordinatorWorkspaceEnabled";
import { useNavigate, useSearchParams } from "@/lib/router";
import { queryKeys } from "@/lib/queryKeys";
import { coordinatorAttentionQueryKey, COORDINATOR_RECENT_DECISION_MS, recentDecisionReceipts } from "@/lib/coordinator-attention";
import { attentionDetailLine, isInlineResolvable } from "@/lib/attention";
import { AttentionInteractionResolver } from "@/components/AttentionInteractionResolver";
import { StalledReviewActions } from "@/components/StalledReviewActions";
import { DecisionResolver } from "@/components/DecisionResolver";
import { PROPERTIES_PANE_HEADER_SLOT_ID } from "@/components/PropertiesPanel";
import { SidePanelTab } from "@/components/side-panel";
import { ToolbarSearch } from "@/components/ToolbarSearch";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { parseCssTimeMs } from "@/components/task-chat/motion-tokens";
import { readIssueReviewPolicyMetadata } from "@/lib/review-policy";
import { CoordinatorDecisionReceipt as Receipt } from "./CoordinatorDecisionReceipt";
import { CoordinatorTaskMotion } from "./CoordinatorTaskCommitment";

type Group = "none" | "task" | "agent" | "project";

function HistoryPanel({ companyId, agents, onClose, mobile = false }: { companyId: string; agents: Agent[]; onClose: () => void; mobile?: boolean }) {
  useInterfaceLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("");
  const [agentId, setAgentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [groupBy, setGroupBy] = useState<Group>("none");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const projects = useQuery({ queryKey: queryKeys.projects.list(companyId), queryFn: () => projectsApi.list(companyId) });
  const history = useInfiniteQuery({
    queryKey: [...queryKeys.attention(companyId), "history", { search, outcome, agentId, projectId, sort }],
    queryFn: ({ pageParam }) => attentionApi.history(companyId, { search, outcome, agentId, projectId, sort, cursor: pageParam, limit: 40 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const label = groupBy === "task" ? item.issueIdentifier ?? item.issueTitle : groupBy === "agent" ? item.agentName ?? interfaceText("m_2dc61bdad7a484") : groupBy === "project" ? item.projectName ?? interfaceText("m_f34c2be0d1c5f5") : "";
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  const slot = typeof document !== "undefined" ? document.getElementById(PROPERTIES_PANE_HEADER_SLOT_ID) : null;
  const tab = <SidePanelTab id="decision-history" label={interfaceText("m_b211a72680a81b")} active onSelect={() => {}} onClose={onClose} />;
  return <div className="space-y-5" data-coordinator-decision-history>
    {!mobile ? <>{slot ? createPortal(tab, slot) : tab}<h2 className="text-lg font-medium">{interfaceText("m_b211a72680a81b")}</h2></> : null}
    <ToolbarSearch query={search} onQueryChange={setSearch} label={interfaceText("m_1945564f8c3ef0")} placeholder={interfaceText("m_30cc46536656f5")} />
    <div className="grid grid-cols-2 gap-2">
      <NativeSelect aria-label={interfaceText("m_83cd18b6ed9d32")} value={outcome} onChange={(event) => setOutcome(event.target.value)}>
        <option value="">{interfaceText("m_1d7f920d0db498")}</option><option value="accepted">{interfaceText("m_87b42e40c2a290")}</option><option value="answered">{interfaceText("m_665590354e719b")}</option><option value="rejected">{interfaceText("m_10a92a8ad3ee58")}</option><option value="decided">{interfaceText("m_30ba702eee51c2")}</option><option value="cancelled">{interfaceText("m_d353a99eb45568")}</option><option value="expired">{interfaceText("m_424a2551d35675")}</option>
      </NativeSelect>
      <NativeSelect aria-label={interfaceText("m_ba964b9027316a")} value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="newest">{interfaceText("m_ffb6f5764bddb6")}</option><option value="oldest">{interfaceText("m_6e2ebdab3c02a3")}</option></NativeSelect>
      <NativeSelect aria-label={interfaceText("m_054d244debd9c5")} value={agentId} onChange={(event) => setAgentId(event.target.value)} className="col-span-2"><option value="">{interfaceText("m_54c32d3e2cfa1c")}</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</NativeSelect>
      <NativeSelect aria-label={interfaceText("m_f001d03519fe4d")} value={projectId} onChange={(event) => setProjectId(event.target.value)} className="col-span-2"><option value="">{interfaceText("m_4b87271b6b8170")}</option>{(projects.data ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</NativeSelect>
      <NativeSelect aria-label={interfaceText("m_8172c3c20b2856")} value={groupBy} onChange={(event) => setGroupBy(event.target.value as Group)} className="col-span-2"><option value="none">{interfaceText("m_a638b9f67ff072")}</option><option value="task">{interfaceText("m_f99a5eeffd4abd")}</option><option value="agent">{interfaceText("m_0cb8a702286dad")}</option><option value="project">{interfaceText("m_9335958ece132c")}</option></NativeSelect>
    </div>
    {history.isPending ? <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_627476df62cf0e")}</p> : null}
    {history.isError ? <div role="alert" className="space-y-2 text-sm"><p>{interfaceText("m_b57cd47b6ab13e")}</p><Button variant="outline" onClick={() => void history.refetch()}>{interfaceText("m_942087cc2d41e0")}</Button></div> : null}
    {!history.isPending && !history.isError && !items.length ? <p className="text-sm text-muted-foreground">{interfaceText("m_d1bb591aa4dafa")}</p> : null}
    <div className="space-y-4">{[...groups].map(([label, entries]) => <section key={label} className="space-y-3">{label ? <h3 className="text-sm font-medium text-muted-foreground">{label}</h3> : null}{entries.map((item) => <div key={item.id} className="space-y-1"><Receipt item={item} onOpen={navigate} /><p className="px-1 text-xs text-muted-foreground"><time dateTime={item.resolvedAt}>{new Date(item.resolvedAt).toLocaleString()}</time></p></div>)}</section>)}</div>
    {history.hasNextPage ? <Button variant="outline" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{history.isFetchingNextPage ? interfaceText("m_ba3bbbe10d8bef") : interfaceText("m_10e74bc6847d8b")}</Button> : null}
  </div>;
}

export function CoordinatorNeedsYou() {
  const interfaceLanguage = useInterfaceLanguage();
  const { selectedCompanyId } = useCompany();
  const { userId } = useCoordinatorWorkspaceEnabled();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { openPanel, closePanel, setPanelVisible } = usePanel();
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkDecisionId = searchParams.get("decisionId");
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [groupBy, setGroupBy] = useState<Group>("none");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [settling, setSettling] = useState<AttentionItem[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  useEffect(() => { setSettling([]); setSavedIds(new Set()); }, [selectedCompanyId, userId]);
  const [renderLimit, setRenderLimit] = useState(40);
  const feed = useQuery({ queryKey: coordinatorAttentionQueryKey(selectedCompanyId!),
    queryFn: () => attentionApi.list(selectedCompanyId!, { all: true }), enabled: !!selectedCompanyId, refetchOnWindowFocus: true });
  const agentQuery = useQuery({ queryKey: queryKeys.agents.list(selectedCompanyId!), queryFn: () => agentsApi.list(selectedCompanyId!), enabled: !!selectedCompanyId });
  // Full history lives in its own paginated tab. Only the newest bounded page
  // is fetched here; its window expires visually without deleting any record.
  const recent = useQuery({ queryKey: [...queryKeys.attention(selectedCompanyId!), "history", "recent"],
    queryFn: () => attentionApi.history(selectedCompanyId!, { limit: 100, since: new Date(Date.now() - COORDINATOR_RECENT_DECISION_MS).toISOString() }), enabled: !!selectedCompanyId, refetchOnWindowFocus: true });
  const agentMap = useMemo(() => new Map((agentQuery.data ?? []).map((agent) => [agent.id, agent])), [agentQuery.data]);
  const recentItems = useMemo(() => recentDecisionReceipts(recent.data?.items ?? [], now), [recent.data, now]);
  const settlingIds = useMemo(() => new Set(settling.map(item => `${item.sourceKind}:${item.subject.id}`)), [settling]);
  const visibleRecentItems = useMemo(() => recentItems.filter((item) => {
    if (settlingIds.has(item.id)) return false;
    if (agentFilter && item.agentId !== agentFilter) return false;
    if (projectFilter && item.projectId !== projectFilter) return false;
    return [item.title, item.issueTitle, item.issueIdentifier, item.agentName, item.projectName, item.label]
      .join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }).sort((a, b) => (sort === "oldest" ? 1 : -1) * (Date.parse(a.resolvedAt) - Date.parse(b.resolvedAt))),
  [recentItems, settlingIds, agentFilter, projectFilter, query, sort]);
  const recentGroups = useMemo(() => {
    const result = new Map<string, DecisionHistoryItem[]>();
    for (const item of visibleRecentItems) {
      const label = groupBy === "task" ? item.issueIdentifier ?? item.issueTitle
        : groupBy === "agent" ? item.agentName ?? interfaceText("m_2dc61bdad7a484")
          : groupBy === "project" ? item.projectName ?? interfaceText("m_f34c2be0d1c5f5") : "";
      result.set(label, [...(result.get(label) ?? []), item]);
    }
    return [...result];
  }, [visibleRecentItems, groupBy, interfaceLanguage]);
  const pendingItems = useMemo(() => {
    const receipts = new Set(recentItems.map((item) => item.id));
    const items = new Map((feed.data?.items ?? []).map((item) => [`${item.sourceKind}:${item.subject.id}`, item]));
    for (const item of settling) if (!items.has(`${item.sourceKind}:${item.subject.id}`)) items.set(`${item.sourceKind}:${item.subject.id}`, item);
    return [...items].filter(([key]) => settlingIds.has(key) || (!receipts.has(key) && !savedIds.has(key))).map(([, item]) => item);
  }, [feed.data, settling, settlingIds, recentItems, savedIds]);
  const filtered = useMemo(() => pendingItems.filter((item) => {
    const agentId = String(item.subject.metadata?.createdByAgentId ?? item.subject.metadata?.originAgentId ?? "");
    if (agentFilter && agentId !== agentFilter && item.originAgentName !== agentMap.get(agentFilter)?.name) return false;
    if (projectFilter && item.project?.id !== projectFilter) return false;
    return [item.subject.title, item.relatedIssue?.title, item.relatedIssue?.identifier, item.originAgentName, item.project?.name, attentionDetailLine(item)].join(" ").toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }).sort((a, b) => (sort === "oldest" ? 1 : -1) * (Date.parse(a.activityAt) - Date.parse(b.activityAt))), [pendingItems, agentFilter, projectFilter, query, sort, agentMap]);
  const groups = useMemo(() => {
    const result = new Map<string, AttentionItem[]>();
    for (const item of filtered.slice(0, renderLimit)) {
      const label = groupBy === "task" ? item.relatedIssue?.identifier ?? item.relatedIssue?.title ?? interfaceText("m_e8d0efb555711b")
        : groupBy === "agent" ? item.originAgentName ?? interfaceText("m_2dc61bdad7a484") : groupBy === "project" ? item.project?.name ?? interfaceText("m_f34c2be0d1c5f5") : "";
      result.set(label, [...(result.get(label) ?? []), item]);
    }
    return [...result];
  }, [filtered, groupBy, renderLimit, interfaceLanguage]);
  useEffect(() => {
    if (!deepLinkDecisionId || !selectedCompanyId || !pendingItems.some(item => item.sourceKind === "decision" && item.subject.id === deepLinkDecisionId)) return;
    // A saved decision link takes precedence over local toolbar filters and the
    // rendering window. Consume it only after its actual card has mounted.
    if (query || agentFilter || projectFilter) { setQuery(""); setAgentFilter(""); setProjectFilter(""); return; }
    const index = filtered.findIndex(item => item.sourceKind === "decision" && item.subject.id === deepLinkDecisionId);
    if (index >= renderLimit) { setRenderLimit(Math.ceil((index + 1) / 40) * 40); return; }
    const card = document.getElementById(`coordinator-decision-${deepLinkDecisionId}`);
    if (!card) return;
    card.focus({ preventScroll: true });
    card.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
    setSearchParams(current => { const next = new URLSearchParams(current); next.delete("decisionId"); return next; }, { replace: true });
  }, [deepLinkDecisionId, selectedCompanyId, pendingItems, filtered, query, agentFilter, projectFilter, renderLimit, reducedMotion, setSearchParams]);
  const projects = useMemo(() => [...new Map([
    ...pendingItems.flatMap((item) => item.project ? [[item.project.id, item.project.name] as const] : []),
    ...recentItems.flatMap((item) => item.projectId ? [[item.projectId, item.projectName ?? "Unnamed project"] as const] : []),
  ]).entries()], [pendingItems, recentItems]);
  const filtersActive = Boolean(query.trim() || agentFilter || projectFilter);
  const closeHistory = useCallback(() => { setHistoryOpen(false); closePanel(); }, [closePanel]);
  const showHistory = () => { setHistoryOpen(true); if (!isMobile) setPanelVisible(true); };
  useEffect(() => { setBreadcrumbs([{ label: interfaceText("m_ecc0c1e7426588") }]); }, [setBreadcrumbs, interfaceLanguage]);
  useEffect(() => {
    setSettling([]); setHistoryOpen(false); setNow(Date.now()); closePanel();
    return closePanel;
  }, [selectedCompanyId, closePanel]);
  useEffect(() => {
    if (!historyOpen || !selectedCompanyId || isMobile) { closePanel(); return; }
    setPanelVisible(true);
    openPanel(<HistoryPanel companyId={selectedCompanyId} agents={agentQuery.data ?? []} onClose={closeHistory} />);
  }, [historyOpen, selectedCompanyId, isMobile, agentQuery.data, openPanel, closePanel, closeHistory, setPanelVisible]);
  useEffect(() => {
    const next = recentItems.reduce((earliest, item) => Math.min(earliest, Date.parse(item.resolvedAt) + COORDINATOR_RECENT_DECISION_MS), Infinity);
    if (!Number.isFinite(next)) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, next - Date.now()) + 1);
    return () => window.clearTimeout(timer);
  }, [recentItems]);
  const onResolved = (item: AttentionItem) => {
    const id = `${item.sourceKind}:${item.subject.id}`;
    setSavedIds(current => new Set([...current, id]));
    setSettling(current => current.some(entry => entry.id === item.id) ? current : [...current, item]);
    void recent.refetch().then(result => {
      if (result.isError) setSettling(current => current.filter(entry => `${entry.sourceKind}:${entry.subject.id}` !== id));
    });
    void feed.refetch();
  };
  const duration = typeof document === "undefined" ? 0 : parseCssTimeMs(getComputedStyle(document.documentElement).getPropertyValue("--motion-duration-base")) / 1_000;
  if (!selectedCompanyId) return <p className="text-sm text-muted-foreground">{interfaceText("m_ba231bf587188a")}</p>;
  return <LayoutGroup id="coordinator-decisions"><section className="coordinator-needs-you mx-auto w-full max-w-4xl space-y-6" aria-label={interfaceText("m_ecc0c1e7426588")}>
    {isMobile ? <Sheet open={historyOpen} onOpenChange={open => { if (!open) closeHistory(); }}>
      <SheetContent side="bottom" aria-describedby={undefined} className="mobile-task-side-panel inset-0 h-dvh max-h-dvh w-full max-w-none gap-0 border-0 p-0 pt-(--sz-safe-top) pb-(--sz-safe-bottom)">
        <SheetHeader><SheetTitle>{interfaceText("m_b211a72680a81b")}</SheetTitle></SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4"><HistoryPanel companyId={selectedCompanyId} agents={agentQuery.data ?? []} onClose={closeHistory} mobile /></div>
      </SheetContent>
    </Sheet> : null}
    <header className="flex items-center justify-between gap-3"><h1 className="text-2xl font-medium">{interfaceText("m_ecc0c1e7426588")}</h1><Button variant="ghost" onClick={showHistory}><History className="size-4" />{interfaceText("m_b211a72680a81b")}</Button></header>
    <div role="toolbar" aria-label={interfaceText("m_46d825044ae4cb")} className="flex flex-wrap items-center gap-2">
      <ToolbarSearch query={query} onQueryChange={setQuery} label={interfaceText("m_a941e56ee6706b")} placeholder={interfaceText("m_30cc46536656f5")} />
      <NativeSelect aria-label={interfaceText("m_2b6bef36685eab")} value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)} className="w-auto"><option value="">{interfaceText("m_54c32d3e2cfa1c")}</option>{(agentQuery.data ?? []).map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</NativeSelect>
      <NativeSelect aria-label={interfaceText("m_acdc140d39adce")} value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="w-auto"><option value="">{interfaceText("m_4b87271b6b8170")}</option>{projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</NativeSelect>
      <NativeSelect aria-label={interfaceText("m_1538bb85730264")} value={groupBy} onChange={(event) => setGroupBy(event.target.value as Group)} className="w-auto"><option value="none">{interfaceText("m_a638b9f67ff072")}</option><option value="task">{interfaceText("m_f99a5eeffd4abd")}</option><option value="agent">{interfaceText("m_0cb8a702286dad")}</option><option value="project">{interfaceText("m_9335958ece132c")}</option></NativeSelect>
      <NativeSelect aria-label={interfaceText("m_35a19db586efcf")} value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="w-auto"><option value="newest">{interfaceText("m_ffb6f5764bddb6")}</option><option value="oldest">{interfaceText("m_6e2ebdab3c02a3")}</option></NativeSelect>
    </div>
    {feed.isPending ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{interfaceText("m_627476df62cf0e")}</p> : null}
    {feed.isError ? <div role="alert" className="space-y-2"><p className="text-sm">{interfaceText("m_ebc96aa5631081")}</p><Button variant="outline" onClick={() => void feed.refetch()}>{interfaceText("m_942087cc2d41e0")}</Button></div> : null}
    {!feed.isPending && !feed.isError && filtered.length === 0 ? <div className="space-y-3 py-8 text-center"><p className="text-sm text-muted-foreground">{filtersActive && !visibleRecentItems.length ? interfaceText("m_d1bb591aa4dafa") : pendingItems.length ? interfaceText("m_5d1ee46f9998e0") : interfaceText("m_48254fca201e82")}</p><Button variant="ghost" onClick={showHistory}>{interfaceText("m_4e9f8d783f7ac5")}<ArrowUpRight className="size-4" /></Button></div> : null}
    {groups.map(([label, items]) => <div key={label} className="space-y-4">{label ? <h2 className="text-sm font-medium text-muted-foreground">{label}</h2> : null}{items.map((item) => {
      const issueId = item.relatedIssue?.id ?? String(item.subject.metadata?.issueId ?? "");
      const interaction = item.sourceKind === "issue_thread_interaction" && isInlineResolvable(item) && issueId;
      const decision = item.sourceKind === "decision" && isInlineResolvable(item);
      const stalledReview = item.sourceKind === "review" && item.subject.kind === "issue" && isInlineResolvable(item) && item.subject.metadata?.reviewAttentionState === "stalled";
      const taskRef = item.relatedIssue ?? (item.subject.kind === "issue" ? item.subject : null);
      const taskLink = taskRef?.href ? <button type="button" onClick={() => { if (taskRef.href) navigate(taskRef.href); }} className="flex max-w-full items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground"><span className="shrink-0">{taskRef.identifier ?? interfaceText("m_6b5c9394cb7f90")}</span><span className="truncate">{taskRef.title}</span><ArrowUpRight className="size-4 shrink-0" /></button> : null;
      const id = `${item.sourceKind}:${item.subject.id}`;
      const receipt = settlingIds.has(id) ? recentItems.find(entry => entry.id === id) : undefined;
      const phase = !receipt ? "pending" : ["cancelled", "expired"].includes(receipt.outcome) ? "closed" : "resolved";
      return <motion.div id={item.sourceKind === "decision" ? `coordinator-decision-${item.subject.id}` : undefined} tabIndex={item.sourceKind === "decision" ? -1 : undefined} layout={reducedMotion ? false : "position"} layoutId={reducedMotion ? undefined : id} transition={{ duration }} key={id}>
      <CoordinatorTaskMotion eventId={`decision:${selectedCompanyId}:${userId}:${id}`} phase={phase} createdAt={item.activityAt} className="coordinator-decision-motion"
        onSettled={() => setSettling(current => current.filter(entry => `${entry.sourceKind}:${entry.subject.id}` !== id))}>
      {receipt ? <Receipt item={receipt} onOpen={navigate} /> : <article className="coordinator-decision-card space-y-4 rounded-xl border border-border bg-card p-6">
        {interaction ? <AttentionInteractionResolver footerSlot={taskLink} presentation="coordinator-decision" companyId={selectedCompanyId} issueId={issueId} interactionId={item.subject.id} agentMap={agentMap} currentUserId={userId} onResolved={resolved => {
          if (!resolved || resolved.status === "pending") { void feed.refetch(); void recent.refetch(); return; }
          onResolved(item);
        }} />
          : decision ? <DecisionResolver companyId={selectedCompanyId} decisionId={item.subject.id} originIssue={item.relatedIssue} agentMap={agentMap} onResolved={() => onResolved(item)} />
          : stalledReview ? <><h2 className="text-lg font-medium">{interfaceText("m_11a940b375062b")}</h2><p className="text-sm">{interfaceText("m_1e925f4404863a")}</p><StalledReviewActions footerSlot={taskLink} issueId={item.subject.id} companyId={selectedCompanyId} reviewPolicy={readIssueReviewPolicyMetadata(item.subject.metadata)} approveLabel="Mark task done" onResolved={() => { void feed.refetch(); void recent.refetch(); }} /></>
          : <><h2 className="text-lg font-medium">{item.subject.title ?? item.whyNow}</h2><p className="text-sm">{attentionDetailLine(item) ?? item.whyNow}</p><Button disabled={!item.subject.href} onClick={() => { if (item.subject.href) navigate(item.subject.href); }}>{interfaceText("m_c7bb7cad825ab9")}<ArrowUpRight className="size-4" /></Button></>}
        {!interaction && !stalledReview ? taskLink : null}
      </article>}
      </CoordinatorTaskMotion>
      </motion.div>;
    })}</div>)}
    {filtered.length > renderLimit ? <Button variant="outline" onClick={() => setRenderLimit((value) => value + 40)}>{interfaceText("m_2ac1733d899bf7")}</Button> : null}
    {visibleRecentItems.length ? <section className="space-y-3" aria-label={interfaceText("m_339d5d637454c8")}><h2 className="text-sm font-medium text-muted-foreground">{interfaceText("m_339d5d637454c8")}</h2>{recentGroups.map(([label, items]) => <div key={label} className="space-y-3">{label ? <h3 className="text-sm font-medium text-muted-foreground">{label}</h3> : null}{items.map((item) => <motion.div layout={!reducedMotion} layoutId={reducedMotion ? undefined : item.id} transition={{ duration }} key={item.id}><Receipt item={item} onOpen={navigate} /></motion.div>)}</div>)}</section> : null}
    {recent.isError ? <p role="alert" className="text-sm text-muted-foreground">{interfaceText("m_ceee0df7c7b894")}<button className="underline" onClick={() => void recent.refetch()}>{interfaceText("m_942087cc2d41e0")}</button></p> : null}
  </section></LayoutGroup>;
}
