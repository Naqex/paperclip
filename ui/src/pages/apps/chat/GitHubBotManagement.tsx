import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  GitPullRequest,
  MoreHorizontal,
  RefreshCw,
  Search,
} from "lucide-react";
import type {
  GitHubChatConfiguration,
  GitHubTaskReview,
} from "@paperclipai/shared";
import {
  githubChatApi,
  type GitHubConfigurationRecord,
} from "@/api/githubChat";
import {
  chatEndpointsApi,
  type ChatEndpoint,
} from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { MarkdownBody } from "@/components/MarkdownBody";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/lib/router";
import { formatDateTime } from "@/lib/utils";
import {
  GitHubAccessEditor,
  GitHubPolicyEditor,
  GitHubToggle,
} from "./GitHubBotConfiguration";
import { ChatExecutionDefaults } from "./ChatExecutionDefaults";

export function GitHubRepositoryAccess({
  endpointId,
  companyId,
  managementUrl,
  pending,
  onRefresh,
  onChange,
  onToggleAll,
}: {
  endpointId: string;
  companyId: string;
  managementUrl: string;
  pending: boolean;
  onRefresh: () => void;
  onChange: (id: string, enabled: boolean) => void;
  onToggleAll: (enabled: boolean) => void;
}) {
  useInterfaceLanguage();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLDivElement>(null);
  const list = useInfiniteQuery({
    queryKey: ["github-bot-repository-pages", endpointId, search],
    queryFn: ({ pageParam }) => githubChatApi.repositories(endpointId, { limit: 20, offset: pageParam, search }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
  });
  const rows = list.data?.pages.flatMap((page) => page.items) ?? [];
  const summary = list.data?.pages[0];
  const disableAll = (summary?.enabledCount ?? 0) > 0;
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [search]);
  useEffect(() => {
    if (!list.hasNextPage || list.isFetching || list.isError || pending || !more.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void list.fetchNextPage({ cancelRefetch: false });
    }, { root: scroller.current });
    observer.observe(more.current);
    return () => observer.disconnect();
  }, [list.hasNextPage, list.isFetching, list.isError, list.fetchNextPage, pending]);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{interfaceText("m_1e32af87ea7427")}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={interfaceText("m_7d701a0d7414d5")}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={managementUrl} target="_blank" rel="noreferrer">{interfaceText("m_03298bf58cdbfd")}<ExternalLink className="size-4" />
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem disabled={pending} onClick={onRefresh}>
              <RefreshCw className="size-4" />{interfaceText("m_31be4d41775978")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-xs text-muted-foreground">{interfaceText("m_a03f23af56679f")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={interfaceText("m_a134ed6423fab0")} placeholder={interfaceText("m_a134ed6423fab0")} className="pl-9"
            value={search} maxLength={200} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Button variant="outline" size="sm" disabled={pending || list.isFetching || !summary || !summary.totalCount || (!disableAll && !summary.availableCount)}
          aria-label={interfaceText("m_2529badff6d0dd", { value0: (disableAll ? "Disable" : "Enable") })}
          onClick={() => onToggleAll(!disableAll)}>
          {disableAll ? interfaceText("m_6cb2279dbfe762") : interfaceText("m_06f08e7c2f8a8c")}
        </Button>
      </div>
      {summary && <p className="text-xs text-muted-foreground">
        {summary.enabledCount}{interfaceText("m_a4282e4b2298b9")}{summary.totalCount}{interfaceText("m_a6a01ecf354978")}</p>}
      {list.isError && <p role="alert" className="text-sm text-destructive">{interfaceText("m_3793ac427e20ad")}<Button variant="link" size="sm" onClick={() => void list.refetch()}>{interfaceText("m_d8b8392e2c5429")}</Button>
      </p>}
      <div ref={scroller} role="region" aria-label={interfaceText("m_1e32af87ea7427")} tabIndex={0}
        className="max-h-96 overflow-y-auto overscroll-contain border-y border-border">
        <div className="divide-y divide-border">
        {rows.map((resource) => (
          <div key={resource.id} className="px-1 py-1">
            <GitHubToggle
              label={resource.label ?? resource.providerResourceId}
              checked={resource.enabled}
              disabled={
                pending ||
                (resource.availability !== "available" && !resource.enabled)
              }
              description={
                resource.availability === "available"
                  ? undefined
                  : interfaceText("m_8f5c76928e6467")
              }
              onChange={(enabled) => onChange(resource.id, enabled)}
            />
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">{interfaceText("m_1aa47f4285de39")}</summary>
              <div className="pt-3">
                <ChatExecutionDefaults
                  companyId={companyId}
                  value={resource.executionDefaults}
                  resource
                  onSave={async (executionDefaults) => {
                    await chatEndpointsApi.updateResources(endpointId, [{ id: resource.id, executionDefaults }]);
                    await client.invalidateQueries({ queryKey: ["github-bot-repositories", endpointId] });
                    await client.invalidateQueries({ queryKey: ["github-bot-repository-pages", endpointId] });
                  }}
                />
              </div>
            </details>
          </div>
        ))}
        </div>
        {list.isPending ? <p role="status" className="py-4 text-sm text-muted-foreground">{interfaceText("m_460ca92c825aee")}</p> : rows.length === 0 && !list.isError && (
          <p className="py-4 text-sm text-muted-foreground">
            {search ? interfaceText("m_454e420a8cf9b4") : interfaceText("m_376e51eba0ca33")}
          </p>
        )}
        {list.hasNextPage && <div ref={more} className="flex justify-center py-2">
          <Button variant="ghost" size="sm" disabled={pending || list.isFetching}
            onClick={() => void list.fetchNextPage({ cancelRefetch: false })}>
            {list.isFetchingNextPage ? interfaceText("m_460ca92c825aee") : interfaceText("m_43a13fa4d739c8")}
          </Button>
        </div>}
      </div>
    </section>
  );
}

export function GitHubBotManagement({
  endpoint,
  view,
}: {
  endpoint: ChatEndpoint;
  view: "settings" | "access";
}) {
  useInterfaceLanguage();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["github-bot-configuration", endpoint.id],
    queryFn: () => githubChatApi.configuration(endpoint.id),
  });
  const [draft, setDraft] = useState<GitHubConfigurationRecord | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [scoreText, setScoreText] = useState<string | null>(null);
  const [automaticMode, setAutomaticMode] = useState<"linked_authors" | "allowed_authors" | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const record = draft ?? query.data;
  const currentScoreText = scoreText ?? String(record?.configuration.defaults.ratingThreshold ?? 5);
  const score = Number(currentScoreText);
  const scoreValid = record?.configuration.defaults.ratingThreshold === null ||
    (currentScoreText.trim() !== "" && Number.isInteger(score) && score >= 1 && score <= 5);
  const dirty = Boolean(
    draft &&
      JSON.stringify(draft.configuration) !==
        JSON.stringify(query.data?.configuration),
  );
  const edit = (configuration: GitHubChatConfiguration) => {
    if (record) {
      if (configuration.defaults.invocation !== "mentions_only")
        setAutomaticMode(configuration.defaults.invocation);
      else if (record.configuration.defaults.invocation !== "mentions_only")
        setAutomaticMode(record.configuration.defaults.invocation);
      setDraft({ ...record, configuration });
    }
    setNotice("");
  };
  const act = async (fn: () => Promise<unknown>) => {
    setPending(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setPending(false);
    }
  };
  if (query.isError)
    return (
      <p role="alert" className="text-sm text-destructive">{interfaceText("m_520186526fb3e2")}{" "}
        <Button
          variant="link"
          onClick={() => {
            void query.refetch();
          }}
        >{interfaceText("m_d8b8392e2c5429")}</Button>
      </p>
    );
  if (!record)
    return (
      <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_bc8fd86dcffdd9")}</p>
    );
  const config = record.configuration;
  return (
    <section className="max-w-3xl space-y-8">
      <fieldset disabled={pending} className="min-w-0 space-y-8">
        {view === "access" ? (
          <>
            <GitHubRepositoryAccess
              endpointId={endpoint.id}
              companyId={endpoint.companyId}
              pending={pending}
              managementUrl={
                endpoint.setup?.github?.managementUrl ??
                endpoint.setup?.github?.installationUrl ??
                "https://github.com/settings/installations"
              }
              onRefresh={() =>
                void act(async () => {
                  await githubChatApi.refreshRepositories(endpoint.id);
                  await client.invalidateQueries({ queryKey: ["github-bot-repositories", endpoint.id] });
                  await client.invalidateQueries({ queryKey: ["github-bot-repository-pages", endpoint.id] });
                  setNotice(
                    "Repository access refreshed. New repositories stay disabled.",
                  );
                })
              }
              onChange={(id, enabled) =>
                void act(async () => {
                  await chatEndpointsApi.updateResources(endpoint.id, [
                    { id, enabled },
                  ]);
                  await client.invalidateQueries({ queryKey: ["github-bot-repositories", endpoint.id] });
                  await client.invalidateQueries({ queryKey: ["github-bot-repository-pages", endpoint.id] });
                })
              }
              onToggleAll={(enabled) => void act(async () => {
                await githubChatApi.toggleAllRepositories(endpoint.id, enabled);
                await client.invalidateQueries({ queryKey: ["github-bot-repositories", endpoint.id] });
                await client.invalidateQueries({ queryKey: ["github-bot-repository-pages", endpoint.id] });
              })}
            />
            <GitHubAccessEditor
              endpointId={endpoint.id}
              companyId={endpoint.companyId}
              configuration={config}
              onChange={edit}
            />
            {!config.toolsEnabled && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{interfaceText("m_31c25d6e6c872b")}</p>
                <Button
                  variant="outline"
                  onClick={() => edit({ ...config, toolsEnabled: true })}
                >{interfaceText("m_71332787d66781")}</Button>
              </div>
            )}
            {endpoint.connectionId && (
              <Link
                className="text-xs text-muted-foreground underline underline-offset-4"
                to={`/apps/${endpoint.connectionId}`}
              >{interfaceText("m_cb2aaaa9da5648")}</Link>
            )}
          </>
        ) : (
          <>
            <GitHubPolicyEditor key={editorVersion}
              readOnly={pending}
              scoreText={currentScoreText}
              onScoreTextChange={setScoreText}
              rememberedAutomaticMode={automaticMode ?? (config.defaults.invocation === "mentions_only" ? "linked_authors" : config.defaults.invocation)}
              accessHref={`/apps/chat/${endpoint.id}/access`}
              policy={config.defaults}
              onChange={(defaults) => edit({ ...config, defaults })}
            />
          </>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {(dirty || !scoreValid) && (
        <div className="sticky bottom-(--tc-composer-bottom) z-10 flex items-center justify-between gap-3 border-t border-border bg-background py-4 md:bottom-0">
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setDraft(null);
              setScoreText(null);
              setAutomaticMode(null);
              setEditorVersion((value) => value + 1);
              setError("");
            }}
          >{interfaceText("m_f9bfa3dc7c8fcd")}</Button>
          <Button
            disabled={pending || !scoreValid}
            onClick={() =>
              void act(async () => {
                const saved = await githubChatApi.save(
                  endpoint.id,
                  record.revision,
                  config,
                );
                client.setQueryData(
                  ["github-bot-configuration", endpoint.id],
                  saved,
                );
                setDraft(null);
                setScoreText(null);
                setAutomaticMode(null);
                setNotice("Changes saved.");
              })
            }
          >
            {pending ? interfaceText("m_23e39291d61358") : interfaceText("m_dd0ae7a5cbcf23")}
          </Button>
        </div>
      )}
    </section>
  );
}

export function orderedGitHubReviews(reviews: GitHubTaskReview[]) {
  return [...reviews].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
}

export function gitHubReviewResultLabel(review: GitHubTaskReview) {
  const completed = review.state === "completed" && review.assessment?.complete;
  const conclusion = review.conclusion
    ? {
        success: "Passed",
        failure: "Below threshold",
        neutral: "Report only",
        action_required: "Action required",
      }[review.conclusion]
    : "Awaiting check";
  const state = {
    queued: "Queued",
    running: "Reviewing",
    completed: "Incomplete",
    incomplete: "Incomplete",
    error: "Review failed",
    superseded: "Superseded",
    manual_required: "Action required",
  }[review.state];
  return completed ? `${review.assessment!.score}/5 · ${conclusion}` : state;
}

function ReviewResult({ review }: { review: GitHubTaskReview }) {
  useInterfaceLanguage();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="text-sm font-medium">
          {gitHubReviewResultLabel(review)}
        </span>
        <span className="text-xs text-muted-foreground">
          Commit <code>{review.headSha.slice(0, 7)}</code> ·{" "}
          {formatDateTime(review.updatedAt)}
        </span>
      </div>
      {review.assessment ? (
        <MarkdownBody className="text-sm">
          {review.assessment.summary}
        </MarkdownBody>
      ) : (
        <p className="text-sm text-muted-foreground">{interfaceText("m_8d5fdd017b5474")}</p>
      )}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <Link
          className="underline underline-offset-4"
          to={`/issues/${review.issueId}`}
        >{interfaceText("m_ff44b378e15c1f")}</Link>
        {review.summaryUrl && (
          <a
            className="underline underline-offset-4"
            href={review.summaryUrl}
            target="_blank"
            rel="noreferrer"
          >{interfaceText("m_d119f0c5993d22")}</a>
        )}
        {review.checkUrl && (
          <a
            className="underline underline-offset-4"
            href={review.checkUrl}
            target="_blank"
            rel="noreferrer"
          >{interfaceText("m_9d60841e0a7891")}</a>
        )}
      </div>
      <section className="space-y-4 text-sm" aria-label={interfaceText("m_5e068aeb73ef51")}>
        <div className="space-y-3">
          {review.runId && (
            <Link
              className="text-xs underline underline-offset-4"
              to={`/issues/${review.issueId}?runId=${review.runId}`}
            >{interfaceText("m_5b89ba1a2ec542")}</Link>
          )}
          {review.assessment && (
            <>
              <h3 className="font-medium">{interfaceText("m_58f23be0ac904b")}</h3>
              <MarkdownBody>{review.assessment.rationale}</MarkdownBody>
              {review.assessment.findings.length > 0 && (
                <section className="space-y-3">
                  <h3 className="font-medium">{interfaceText("m_e171c2ff25b55e")}</h3>
                  {review.assessment.findings.map((finding) => (
                    <div
                      key={finding.key}
                      className="space-y-2 border-l border-border pl-4"
                    >
                      <p className="break-all font-mono text-xs">
                        {finding.path}:{finding.line} · {finding.severity}
                      </p>
                      <MarkdownBody>{finding.body}</MarkdownBody>
                    </div>
                  ))}
                </section>
              )}
              <h3 className="font-medium">{interfaceText("m_523487a5de21ad")}</h3>
              <p className="text-xs text-muted-foreground">
                {review.assessment.coverage.reviewedPaths.length}{interfaceText("m_896fa18ab12386")}{review.assessment.coverage.omittedPaths.length}{interfaceText("m_0d9a7e08fb85eb")}</p>
              {review.assessment.coverage.limitations.map((limit, index) => (
                <p key={index} className="text-xs text-muted-foreground">
                  {limit}
                </p>
              ))}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export function GitHubReviewList({
  endpointId,
  reviews,
}: {
  endpointId: string;
  reviews: GitHubTaskReview[];
}) {
  useInterfaceLanguage();
  if (!reviews.length)
    return (
      <EmptyState
        icon={GitPullRequest}
        message={interfaceText("m_8b670b7eead75f")}
        description={interfaceText("m_f1ea1d50cdca41")}
      />
    );
  return (
    <ul
      aria-label={interfaceText("m_84cb7871b741c3")}
      className="divide-y divide-border border-y border-border"
    >
      {orderedGitHubReviews(reviews).map((review) => (
        <li key={review.id}>
          <Link
            to={`/apps/chat/${endpointId}/reviews/${review.id}`}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4 text-sm hover:bg-accent/50"
          >
            <div className="min-w-0 flex-1 basis-48 space-y-1">
              <p className="break-words font-medium">
                {review.event.title || `Pull request #${review.pullNumber}`}
              </p>
              <p className="break-all text-xs text-muted-foreground">
                {review.repository} #{review.pullNumber} ·{" "}
                <code>{review.headSha.slice(0, 7)}</code>
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="font-medium">{gitHubReviewResultLabel(review)}</p>
              <time
                className="text-xs text-muted-foreground"
                dateTime={review.createdAt}
              >
                {formatDateTime(review.createdAt)}
              </time>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function GitHubReviewDetail({
  endpointId,
  review,
}: {
  endpointId: string;
  review: GitHubTaskReview;
}) {
  useInterfaceLanguage();
  return (
    <article className="max-w-3xl space-y-6">
      <Link
        className="text-sm text-muted-foreground hover:underline"
        to={`/apps/chat/${endpointId}/reviews`}
      >{interfaceText("m_e33611013684e5")}</Link>
      <header className="space-y-2">
        <h2 className="text-lg font-semibold">
          {review.event.title || `Pull request #${review.pullNumber}`}
        </h2>
        <a
          className="break-all text-sm text-muted-foreground hover:underline"
          href={`https://github.com/${review.repository}/pull/${review.pullNumber}`}
          target="_blank"
          rel="noreferrer"
        >
          {review.repository} #{review.pullNumber}
        </a>
      </header>
      <ReviewResult review={review} />
    </article>
  );
}

export function GitHubReviews({
  endpointId,
  reviewId,
}: {
  endpointId: string;
  reviewId?: string;
}) {
  useInterfaceLanguage();
  const query = useQuery({
    queryKey: ["github-bot-reviews", endpointId, reviewId ?? "list"],
    queryFn: async () => reviewId ? [await githubChatApi.review(endpointId, reviewId)] : githubChatApi.reviews(endpointId),
    refetchInterval: 5000,
  });
  if (query.isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        {reviewId ? interfaceText("m_9241edac1949a8") : interfaceText("m_58b6d1547d5375")}{" "}
        <Button variant="link" onClick={() => void query.refetch()}>{interfaceText("m_d8b8392e2c5429")}</Button>
      </p>
    );
  if (query.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_510c765f211f33")}</p>
    );
  if (reviewId) {
    const review = query.data.find((review) => review.id === reviewId);
    return review ? (
      <GitHubReviewDetail endpointId={endpointId} review={review} />
    ) : (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-muted-foreground">{interfaceText("m_835786fb9b3839")}</p>
        <Link
          to={`/apps/chat/${endpointId}/reviews`}
          className="text-sm underline"
        >{interfaceText("m_ab84bf98f25922")}</Link>
      </div>
    );
  }
  return <GitHubReviewList endpointId={endpointId} reviews={query.data} />;
}
