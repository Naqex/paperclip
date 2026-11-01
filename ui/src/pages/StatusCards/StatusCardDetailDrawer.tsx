import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompanySearchIssueSummary, StatusCardUpdate, SummarySlotIssueRef } from "@paperclipai/shared";
import { AlertTriangle, ChevronDown, ExternalLink, History, Loader2, RefreshCw, Wand2 } from "lucide-react";

import { statusCardsApi, type StatusCardDryRun } from "@/api/statusCards";
import { MarkdownBody } from "@/components/MarkdownBody";
import { useSummaryDraftStream } from "@/components/useSummaryDraftStream";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { IssueStatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineBanner } from "@/components/InlineBanner";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import {
  deriveStatusCardLifecycle,
  describeRefreshPolicy,
  STATUS_CARD_LIFECYCLE_PRESENTATION,
} from "@/lib/status-card-state";
import {
  StatusCardSettingsForm,
  defaultSettingsValue,
  type StatusCardSettingsValue,
} from "./StatusCardSettingsForm";
import { SummarizerAgentSelect } from "./SummarizerAgentSelect";
import {
  formatCents,
  formatTokens,
  formatTokenSplit,
  rollupUpdatesToday,
  updateKindLabel,
} from "./format";
import type { StatusCardView } from "./types";

export function StatusCardDetailDrawer({
  card,
  companyId,
  open,
  onOpenChange,
  initialTab = "summary",
}: {
  card: StatusCardView | null;
  companyId: string | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: string;
}) {
  useInterfaceLanguage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("summary");
  const [settings, setSettings] = useState<StatusCardSettingsValue>(defaultSettingsValue());
  // Rename + interest ("query") are edited in Settings alongside the policy.
  const [title, setTitle] = useState("");
  const [interest, setInterest] = useState("");
  // "" → the built-in Summarizer; otherwise the id of the override agent.
  const [summarizerAgentId, setSummarizerAgentId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  // A short confirmation after a build/refresh is queued (the state dot + badge
  // also update, but a card that finishes fast can look like "nothing happened").
  const [actionNote, setActionNote] = useState<string | null>(null);
  // null → show the latest summary; otherwise a historical update id.
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);

  useEffect(() => {
    if (card) {
      setSettings({ refreshPolicy: card.refreshPolicy });
      setTitle(card.title ?? "");
      setInterest(card.interestPrompt);
      setSummarizerAgentId(card.agentId ?? "");
      setActionError(null);
      setActionNote(null);
      setSelectedRevisionId(null);
    }
  }, [card]);

  // Open to the requested tab (e.g. "Query debug" on the tile deep-links to
  // Settings) whenever the drawer (re)opens.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  const updatesQuery = useQuery({
    queryKey: card ? queryKeys.statusCards.updates(card.id) : ["status-cards", "detail", "none", "updates"],
    queryFn: () => statusCardsApi.updates(card!.id),
    enabled: Boolean(card && open),
  });
  const summaryRevisionsQuery = useQuery({
    queryKey: card ? queryKeys.statusCards.summaryRevisions(card.id) : ["status-cards", "detail", "none", "summary-revisions"],
    queryFn: () => statusCardsApi.summaryRevisions(card!.id),
    enabled: Boolean(card && open && card.documentId),
  });
  const dryRunQuery = useQuery({
    queryKey: card ? queryKeys.statusCards.dryRun(card.id) : ["status-cards", "detail", "none", "dry-run"],
    queryFn: () => statusCardsApi.dryRun(card!.id),
    enabled: Boolean(card && open && tab === "watched" && (card.queries.length > 0 || (card.mentionedIssueIds?.length ?? 0) > 0)),
  });
  const lifecycle = card ? deriveStatusCardLifecycle(card) : "fresh";
  const generatingIssue = useMemo<SummarySlotIssueRef | null>(
    () =>
      card && lifecycle === "updating" && card.generatingIssueId
        ? { id: card.generatingIssueId, identifier: null, title: card.title ?? "Status update", status: "in_progress" }
        : null,
    [card, lifecycle],
  );
  const draftStream = useSummaryDraftStream(companyId, generatingIssue);

  const invalidateCard = async () => {
    if (!card) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.statusCards.list(card.companyId, false) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.statusCards.detail(card.id) }),
    ]);
  };

  const refreshMutation = useMutation({
    mutationFn: () => statusCardsApi.refresh(card!.id),
    onMutate: () => {
      setActionError(null);
      setActionNote(null);
    },
    onSuccess: async () => {
      await invalidateCard();
      setActionNote("Refresh queued — the Summarizer is updating this card.");
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Could not refresh the card."),
  });

  const recompileMutation = useMutation({
    mutationFn: () => statusCardsApi.recompile(card!.id),
    onMutate: () => {
      setActionError(null);
      setActionNote(null);
    },
    onSuccess: async () => {
      await invalidateCard();
      setActionNote("Run queued — the Summarizer is updating this card.");
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Could not run the card."),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () => {
      const trimmedTitle = title.trim();
      const trimmedInterest = interest.trim();
      const interestChanged = trimmedInterest.length > 0 && trimmedInterest !== card!.interestPrompt.trim();
      return statusCardsApi.patch(card!.id, {
        // An explicit name pins the title so a recompile won't overwrite it;
        // clearing it hands naming back to the compiler.
        title: trimmedTitle || null,
        titlePinned: trimmedTitle.length > 0,
        // Editing the card prompt triggers a server-side recompile.
        ...(interestChanged ? { interestPrompt: trimmedInterest } : {}),
        agentId: summarizerAgentId || null,
        refreshPolicy: settings.refreshPolicy,
      });
    },
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      if (!card) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.statusCards.list(card.companyId, false) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.statusCards.detail(card.id) }),
      ]);
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Could not save settings."),
  });

  if (!card) return null;

  const updates = updatesQuery.data ?? [];
  const latestUpdate = updates[0] ?? null;
  const todayRollup = rollupUpdatesToday(updates);

  // Each successful summary-producing update is a summary revision (reuses the
  // SummarySlotCard revision-history pattern). The finishedAt check excludes
  // updates whose generation is still in flight — their document revision does
  // not exist yet.
  const summaryRevisions = updates.filter(
    (update) => update.status === "ok" && update.finishedAt && (update.kind === "full" || update.kind === "incremental"),
  );
  const selectedRevision = selectedRevisionId
    ? summaryRevisions.find((update) => update.id === selectedRevisionId) ?? null
    : null;
  // Updates (newest-first, completed content updates only) correspond 1:1 with
  // the card's summary-document revisions (newest-first): writeSummary creates
  // both in one transaction. Positional matching recovers the full summary
  // body for a historical pick; the change-summary fallback covers any gap.
  const documentRevisions = summaryRevisionsQuery.data ?? [];
  const selectedRevisionBody = selectedRevision
    ? documentRevisions[summaryRevisions.indexOf(selectedRevision)]?.body ?? null
    : null;
  const latestRevisionNumber = summaryRevisions.length;
  const revisionNumberOf = (update: StatusCardUpdate) => latestRevisionNumber - summaryRevisions.indexOf(update);
  const displayedChanges = selectedRevision ? selectedRevision.changes : latestUpdate?.changes ?? [];
  const presentation = STATUS_CARD_LIFECYCLE_PRESENTATION[lifecycle];
  const hasSummary = Boolean(card.summaryBody && card.summaryBody.trim().length > 0);
  // Setup is genuinely in flight only while a generation task exists; a null id
  // on a compiling card means the first run stalled and needs a manual re-kick.
  const setupRunning = lifecycle === "compiling" && Boolean(card.generatingIssueId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border p-4">
          <div className="flex items-center gap-2 pr-8">
            <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", presentation.dotClassName)} aria-hidden="true" />
            <SheetTitle className="min-w-0 flex-1 truncate text-lg">{card.title ?? interfaceText("m_29fc54324b6c82")}</SheetTitle>
            <Badge variant="outline">{presentation.label}</Badge>
            {lifecycle === "compiling" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => recompileMutation.mutate()}
                // While the setup run is live, "Run now" is disabled — kicking a
                // second run would race the one already building the card.
                disabled={recompileMutation.isPending || setupRunning}
              >
                {setupRunning || recompileMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="h-3.5 w-3.5" />
                )}
                {setupRunning ? interfaceText("m_c894bba9c3e787") : recompileMutation.isPending ? interfaceText("m_46c541363b0253") : interfaceText("m_0991397702fabb")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending || lifecycle === "updating"}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", refreshMutation.isPending && "animate-spin")} />
                {refreshMutation.isPending ? interfaceText("m_1c0def7be0607b") : interfaceText("m_0e91610117029a")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {card.lastGeneratedAt ? interfaceText("m_8f124f40e9bee7", { value0: (relativeTime(card.lastGeneratedAt)) }) : interfaceText("m_f098ecd6800609")} ·{" "}
            {describeRefreshPolicy(card.refreshPolicy)}
          </p>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList variant="line" className="w-full justify-start gap-4 border-b border-border px-4">
            <TabsTrigger value="summary">{interfaceText("m_8e76a94ac8320d")}</TabsTrigger>
            <TabsTrigger value="settings">{interfaceText("m_74a883a037bc22")}</TabsTrigger>
            <TabsTrigger value="watched">{interfaceText("m_df63da53661a1b")}</TabsTrigger>
            <TabsTrigger value="history">{interfaceText("m_0e769600933790")}</TabsTrigger>
          </TabsList>

          {actionError ? (
            <div className="px-4 pt-3">
              <InlineBanner tone="warning" title={interfaceText("m_dc1f657d6c09a8")}>{actionError}</InlineBanner>
            </div>
          ) : actionNote ? (
            <div className="px-4 pt-3">
              <InlineBanner tone="info" title={interfaceText("m_d55b6d1bbd56f5")}>{actionNote}</InlineBanner>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <TabsContent value="summary" className="mt-0 space-y-5">
              {/* Revision picker lives on the right, unpilled. A single-revision
                  card shows a plain label; multi-revision cards get a dropdown
                  capped at the 30 most recent revisions. */}
              {(hasSummary || summaryRevisions.length > 0) && lifecycle !== "compiling" ? (
                <div className="flex items-center justify-end gap-2">
                  {summaryRevisions.length > 1 ? (
                    <Select
                      value={selectedRevisionId ?? "__latest__"}
                      onValueChange={(value) => setSelectedRevisionId(value === "__latest__" ? null : value)}
                    >
                      <SelectTrigger size="sm" className="w-auto gap-1.5" aria-label={interfaceText("m_e9e258ba6e6839")}>
                        <History className="h-3.5 w-3.5" aria-hidden="true" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end" position="popper">
                        <SelectItem value="__latest__" className="text-xs">{interfaceText("m_e330d85ff90102")}{latestRevisionNumber}{interfaceText("m_7c912ed3c3bd06")}</SelectItem>
                        <SelectSeparator />
                        {summaryRevisions.slice(0, 30).map((update) => (
                          <SelectItem
                            key={update.id}
                            value={update.id}
                            className="text-xs"
                            title={formatDateTime(update.startedAt)}
                          >{interfaceText("m_65dae0c1e49d78")}{revisionNumberOf(update)} · {updateKindLabel(update.kind)} · {relativeTime(update.startedAt)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : latestRevisionNumber > 0 ? (
                    <span className="text-xs text-muted-foreground">{interfaceText("m_e330d85ff90102")}{latestRevisionNumber}{interfaceText("m_7c912ed3c3bd06")}</span>
                  ) : null}
                </div>
              ) : null}

              {lifecycle === "updating" && draftStream.draft && !selectedRevision ? (
                <MarkdownBody className="text-sm leading-7">{draftStream.draft}</MarkdownBody>
              ) : selectedRevision ? (
                <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground" title={formatDateTime(selectedRevision.startedAt)}>{interfaceText("m_e330d85ff90102")}{revisionNumberOf(selectedRevision)} · {updateKindLabel(selectedRevision.kind)} ·{" "}
                    {relativeTime(selectedRevision.startedAt)}
                  </p>
                  {selectedRevisionBody ? (
                    <MarkdownBody className="text-sm leading-7">{selectedRevisionBody}</MarkdownBody>
                  ) : selectedRevision.changeSummary ? (
                    <>
                      <MarkdownBody className="text-sm leading-7">{selectedRevision.changeSummary}</MarkdownBody>
                      <p className="text-xs text-muted-foreground/70">{interfaceText("m_3a956e3a8a06b4")}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{interfaceText("m_8be76f660b5315")}</p>
                  )}
                </div>
              ) : hasSummary ? (
                <MarkdownBody className="text-sm leading-7">{card.summaryBody!}</MarkdownBody>
              ) : lifecycle === "compiling" ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    {setupRunning ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    )}
                    {setupRunning
                      ? interfaceText("m_b88e778ab100e0")
                      : interfaceText("m_af145c69a095a8")}
                  </p>
                  {setupRunning && card.generatingIssueId ? (
                    <Link
                      to={`/issues/${card.generatingIssueId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />{interfaceText("m_6b5859989f3fdb")}</Link>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{interfaceText("m_ec44e68ae5c284")}</p>
              )}

              {displayedChanges.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {selectedRevision ? interfaceText("m_42b2ab8b03110e") : interfaceText("m_b990fa3d66d8f8")} (
                    {displayedChanges.length} {displayedChanges.length === 1 ? interfaceText("m_12ea12eace7d65") : interfaceText("m_d0b4ba2311b3e8")})
                  </h3>
                  <div className="space-y-1.5">
                    {displayedChanges.map((change) => (
                      <ChangeRow key={change.issueId} change={change} />
                    ))}
                  </div>
                </section>
              ) : null}
            </TabsContent>

            <TabsContent value="history" className="mt-0 space-y-3">
              {/* History and cost live together: the today rollup up top, then
                  every recorded update (each update is one summary revision). */}
              {updatesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />{interfaceText("m_3c7e6cd562b94c")}</div>
              ) : updates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{interfaceText("m_f0a917b114336c")}</p>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">{interfaceText("m_627ac69da52cc8")}{todayRollup.updateCount}{" "}
                    {todayRollup.updateCount === 1 ? interfaceText("m_2937013f218181") : interfaceText("m_35759b3ca7da9a")} ·{" "}
                    {formatTokens(todayRollup.totalTokens)} · {formatCents(todayRollup.totalCostCents)}
                    {card.refreshPolicy.dailyTokenCap ? interfaceText("m_8d116844c21496", { value0: (formatTokens(card.refreshPolicy.dailyTokenCap)) }) : ""}
                  </div>
                  <div className="divide-y divide-border">
                    {updates.map((update) => (
                      <div key={update.id} className="py-2.5 first:pt-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            {updateKindLabel(update.kind)}
                            <Badge variant={update.status === "failed" ? "destructive" : "secondary"}>
                              {update.status === "ok" ? update.trigger : update.status}
                            </Badge>
                          </span>
                          <span className="text-xs text-muted-foreground" title={formatDateTime(update.startedAt)}>
                            {relativeTime(update.startedAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTokenSplit(update.inputTokens, update.outputTokens)} · {formatCents(update.costCents)}
                          {update.model ? ` · ${update.model}` : ""}
                          {update.changes.length > 0 ? interfaceText("m_a267d4077e610b", { value0: (update.changes.length) }) : ""}
                        </p>
                        {update.error ? <p className="mt-1 text-xs text-destructive">{update.error}</p> : null}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="watched" className="mt-0 space-y-3">
              {card.queries.length === 0 && (card.mentionedIssueIds?.length ?? 0) === 0 ? (
                <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{interfaceText("m_40fedd14b62097")}</div>
              ) : dryRunQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />{interfaceText("m_d2980dee526a98")}</div>
              ) : dryRunQuery.isError ? (
                <InlineBanner tone="danger" title={interfaceText("m_9ab2d3318d994a")}>
                  {dryRunQuery.error instanceof Error ? dryRunQuery.error.message : interfaceText("m_a0c2cc1374d949")}
                </InlineBanner>
              ) : (
                <MatchedIssueList
                  queries={dryRunQuery.data?.queries ?? []}
                  mentioned={dryRunQuery.data?.mentionedIssues ?? []}
                />
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{interfaceText("m_e260ce2668950e")}</h3>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={interfaceText("m_9165924dad1959")}
                  className="text-sm"
                  aria-label={interfaceText("m_e260ce2668950e")}
                />
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">{interfaceText("m_1e934501d807f9")}</h3>
                <Textarea
                  value={interest}
                  onChange={(event) => setInterest(event.target.value)}
                  rows={3}
                  className="text-sm"
                  aria-label={interfaceText("m_1e934501d807f9")}
                />
                <p className="text-xs text-muted-foreground">{interfaceText("m_08fec083302100")}</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Agent</h3>
                <SummarizerAgentSelect
                  companyId={card.companyId}
                  value={summarizerAgentId}
                  onChange={setSummarizerAgentId}
                  enabled={open}
                />
              </section>

              <StatusCardSettingsForm value={settings} onChange={setSettings} />

              <QueryDebugSection card={card} />

              <div className="flex justify-end border-t border-border pt-4">
                <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>
                  {saveSettingsMutation.isPending ? <Loader2 className="animate-spin" /> : null}{interfaceText("m_1509f561f24165")}</Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The compiled query is agent-maintained (the Summarizer writes it from its
 * generation task) and normally hidden. Surfaced read-only here (moved out of
 * the old standalone debug drawer, PAP-15223) so the raw query + version stay
 * inspectable without leaving Settings.
 */
function QueryDebugSection({ card }: { card: StatusCardView }) {
  useInterfaceLanguage();
  const queryJson = JSON.stringify({ queries: card.queries, limit: 50 }, null, 2);
  return (
    <Collapsible className="rounded-md border border-border">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold">
        <span className="flex items-center gap-2">{interfaceText("m_58f8683ddefe9f")}<Badge variant="secondary">v{card.queryVersion}</Badge>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 border-t border-border px-3 py-3">
        <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
          {card.queries.length > 0 ? queryJson : interfaceText("m_ac5cf2a4d48555")}
        </pre>
        <p className="text-xs text-muted-foreground">
          {card.queryCompiledAt
            ? interfaceText("m_02e41a9120f6ce", { value0: (relativeTime(card.queryCompiledAt)), value1: (card.queryVersion) })
            : interfaceText("m_c3fd0b87f43134")}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Live matched-issue list for the Watched tab, fed by the dry-run endpoint.
 * Queries in the compiled array are a union, so issues matched by more than
 * one query are deduplicated by id. Issues mentioned in the latest summary
 * join the watched set too and render as their own group below the matches.
 */
function MatchedIssueList({ queries, mentioned }: { queries: StatusCardDryRun["queries"]; mentioned: CompanySearchIssueSummary[] }) {
  useInterfaceLanguage();
  const seen = new Set<string>();
  const matched: CompanySearchIssueSummary[] = [];
  for (const { result } of queries) {
    for (const item of result.results) {
      if (!item.issue || seen.has(item.issue.id)) continue;
      seen.add(item.issue.id);
      matched.push(item.issue);
    }
  }
  const mentionedOnly = mentioned.filter((issue) => !seen.has(issue.id));
  if (matched.length === 0 && mentionedOnly.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">{interfaceText("m_6bf003b65a2391")}</div>
    );
  }
  return (
    <div className="space-y-3">
      {matched.length > 0 ? (
        <div className="space-y-1.5">
          {matched.map((issue) => (
            <WatchedIssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      ) : null}
      {mentionedOnly.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{interfaceText("m_af6b8ee2be6bf8")}</p>
          {mentionedOnly.map((issue) => (
            <WatchedIssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WatchedIssueRow({ issue }: { issue: CompanySearchIssueSummary }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
      <Link
        to={`/issues/${issue.identifier ?? issue.id}`}
        className="shrink-0 font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {issue.identifier ?? issue.id.slice(0, 8)}
      </Link>
      <IssueStatusBadge status={issue.status} externalConversationState={issue.externalConversationState} />
      <span className="min-w-0 flex-1 truncate">{issue.title}</span>
      <span className="shrink-0 text-muted-foreground">{relativeTime(issue.updatedAt)}</span>
    </div>
  );
}

/**
 * One row in the "Integrated in this update" change list. Status transitions
 * render with the product's issue status pills (recognition over recall,
 * design-system consistency) and every row deep-links to the issue.
 */
function ChangeRow({ change }: { change: StatusCardUpdate["changes"][number] }) {
  const isTransition = Boolean(change.from && change.to);
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
      <Link
        to={`/issues/${change.identifier}`}
        className="shrink-0 font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {change.identifier}
      </Link>
      {isTransition ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <IssueStatusBadge status={change.from!} />
          <span aria-hidden="true" className="text-muted-foreground">→</span>
          <IssueStatusBadge status={change.to!} />
        </span>
      ) : (
        <span className="truncate text-muted-foreground">{describeChangeKind(change.changeKind)}</span>
      )}
    </div>
  );
}

function describeChangeKind(changeKind: string): string {
  if (changeKind === "entered_query" || changeKind === "new") return "new issue matched the query";
  if (changeKind === "left_query") return "left the query";
  return changeKind.replace(/_/g, " ");
}
