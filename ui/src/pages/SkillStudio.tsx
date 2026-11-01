import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { SkillsPageNavigation } from "@/components/skill-studio/SkillsNavigationTabs";
import { interactionReadinessRefetchInterval } from "@/lib/issue-thread-interactions";
import { SkillBinaryFile } from "../components/SkillBinaryFile";
import { SkillSourceProvenance } from "../components/SkillSourceProvenance";
import { AgentIdentity } from "@/components/AgentIdentity";
import { QueryErrorState, useQueryView } from "@/components/QueryView";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  FileCode,
  FilePlus,
  FileText,
  FolderMinus,
  FolderPlus,
  FlaskConical,
  GitFork,
  History,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react";
import type {
  Agent,
  CompanySkillDetail,
  CompanySkillListItem,
  CompanySkillTestInput,
  CompanySkillTestRun,
  CompanySkillTestRunDetail,
  CompanySkillTestRunTemplate,
  CompanySkillTestRunTemplateCreateRequest,
  CompanySkillTestRunTemplateUpdateRequest,
  IssueDocument,
  IssueThreadInteraction,
  AskUserQuestionsInteraction,
  AskUserQuestionsAnswer,
} from "@paperclipai/shared";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "@/lib/router";
import {
  SearchableSelect,
  type SearchableSelectGroup,
  type SearchableSelectOption,
} from "@/components/SearchableSelect";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { useOptionalToastActions } from "../context/ToastContext";
import { classifySkillDenial } from "@/lib/skill-policy-denial";
import { agentsApi } from "@/api/agents";
import { companySkillsApi } from "@/api/companySkills";
import { ApiError } from "@/api/client";
import { issuesApi } from "@/api/issues";
import { queryKeys } from "@/lib/queryKeys";
import { copyTextToClipboard } from "@/lib/clipboard";
import { useCopyToast } from "@/lib/use-copy-action";
import { skillStudioNewRoute, skillStudioRoute } from "@/lib/company-skill-routes";
import {
  buildBlankSkillDraft,
  buildForkSkillDraft,
  defaultSkillMarkdown,
  normalizeSkillDraftSlug,
  SKILL_CREATE_ACCENTS,
  skillAccentColor,
  skillCreateDraftToPayload,
  splitCategoryDraft,
  type SkillCreateDraft,
} from "@/lib/skill-create";
import { getRecentStudioSkillIds, trackRecentStudioSkill } from "@/lib/recent-skills";
import { AgentsUsingSkillBadge } from "@/components/skill-studio/AgentsUsingSkillDialog";
import { ForkSkillDialog } from "@/components/skill-studio/ForkSkillDialog";
import {
  ProjectScanNotice,
  SkillLineageChip,
} from "@/components/skill-studio/SkillProvenance";
import { isProjectScanSkill } from "@/lib/skill-fork";
import { cn, formatCents, relativeTime } from "@/lib/utils";
import { SkillCardIcon, type DiscoveryCard } from "./CompanySkills";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable-panels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileTree, buildFileTree, type FileTreeNode } from "@/components/FileTree";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { FrontmatterPanel } from "@/components/FrontmatterPanel";
import { joinFrontmatterBlock, splitFrontmatterBlock } from "@paperclipai/shared";
import { MarkdownBody } from "@/components/MarkdownBody";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { EntityRow } from "@/components/EntityRow";
import { FilterBar } from "@/components/FilterBar";
import { Identity } from "@/components/Identity";
import { IssueThreadInteractionCard } from "@/components/IssueThreadInteractionCard";
import { IssueAttachmentsSection } from "@/components/IssueAttachmentsSection";
import { ImageGalleryModal, type GalleryMediaItem } from "@/components/ImageGalleryModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IssueOutputSection } from "@/components/issue-output/IssueOutputSection";
import { buildLineDiff } from "@/lib/line-diff";
import {
  buildCreateRunRequest,
  buildReRunRequest,
  DEFAULT_TEST_RUN_TEMPLATE_ID,
  EMPTY_SAVED_INPUT_DRAFT_STATE,
  evaluateRunGate,
  getRunAdditionalDocuments,
  getRunMediaGalleryItems,
  getRunRawAttachments,
  isAgentSelectable,
  isInteractionAnswerable,
  isTerminalRunStatus,
  orderRecentlyUpdatedSkills,
  orderRecentlyVisitedSkills,
  skillEditorAvatar,
  NO_TEST_RUN_TEMPLATE_STORAGE_VALUE,
  parseRunTemplateSelection,
  routeInteraction,
  runBadgeStatus,
  runHarnessUnavailableCopy,
  runOutputMode,
  runShortId,
  resolveRunTemplateSelection,
  serializeRunTemplateSelection,
  savedInputDraftDirty,
  selectedSavedInputDraft,
  shouldPollRun,
  showRunErrorCard,
  syncSavedInputDraftState,
  testTaskLinkState,
  type RunTemplateSelection,
  type SavedInputDraftState,
} from "@/lib/skill-studio";

const PANE_STORAGE_KEY = "skillStudio.paneSizes";
const RUN_TEMPLATE_STORAGE_KEY_PREFIX = "skillStudio.runTemplate";
const MOBILE_BREAKPOINT = 900;
const POLL_MS = 2000;
const EMPTY_RUN_TEMPLATES: CompanySkillTestRunTemplate[] = [];

/**
 * Surface a mutation rejection as an error toast. Every Studio mutation routes
 * failures through here so server rejections (409 agent_not_assignable, 422
 * read-only, …) never get silently swallowed (PAP-13001).
 */
function useMutationErrorToast() {
  const toast = useOptionalToastActions();
  return useCallback(
    (title: string) => (error: unknown) => {
      // Under the open default there is no permission chrome. When an action is
      // actually denied — by an explicit company policy (State B) or a platform
      // safety invariant (State C) — show the actionable denial title/remediation
      // instead of a generic "try again" error (§9.10, PAP-13865). Transient
      // failures keep the plain error toast.
      const denial = classifySkillDenial(error);
      if (denial) {
        toast?.pushToast({ tone: "warn", title: denial.title, body: denial.remediation });
        return;
      }
      const body =
        error instanceof Error && error.message ? error.message : "Please try again.";
      toast?.pushToast({ tone: "error", title, body });
    },
    [toast],
  );
}

// ---------------------------------------------------------------------------
// Pane-size persistence (contract: persist per user `skillStudio.paneSizes`)
// ---------------------------------------------------------------------------

type PaneLayout = { skill: number; input: number; runs: number };
const DEFAULT_LAYOUT: PaneLayout = { skill: 37.5, input: 25, runs: 37.5 };

function loadPaneLayout(): PaneLayout {
  try {
    const raw = localStorage.getItem(PANE_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<PaneLayout>;
    if (
      typeof parsed?.skill === "number"
      && typeof parsed?.input === "number"
      && typeof parsed?.runs === "number"
    ) {
      return { skill: parsed.skill, input: parsed.input, runs: parsed.runs };
    }
  } catch {
    /* ignore malformed persisted layout */
  }
  return DEFAULT_LAYOUT;
}

function runTemplateStorageKey(companyId: string) {
  return `${RUN_TEMPLATE_STORAGE_KEY_PREFIX}.${companyId}`;
}

function loadRunTemplateSelection(companyId: string): RunTemplateSelection {
  try {
    return parseRunTemplateSelection(localStorage.getItem(runTemplateStorageKey(companyId)));
  } catch {
    return DEFAULT_TEST_RUN_TEMPLATE_ID;
  }
}

function persistRunTemplateSelection(companyId: string, selection: RunTemplateSelection) {
  try {
    localStorage.setItem(runTemplateStorageKey(companyId), serializeRunTemplateSelection(selection));
  } catch {
    /* storage may be unavailable (private mode) — non-fatal */
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export function SkillStudio() {
  const interfaceLanguage = useInterfaceLanguage();
  const { skillId = "" } = useParams<{ skillId: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const companyId = selectedCompanyId ?? "";
  const isCreateMode = location.pathname.replace(/\/+$/, "").endsWith("/skills/studio/new");
  const forkFromSkillId = isCreateMode ? searchParams.get("forkFrom")?.trim() || null : null;
  // New skills created from a folder context (e.g. My Skills) carry their
  // destination folder through this query param; without it the created skill
  // silently lands in Unfiled (PAP-14086).
  const newSkillFolderId = isCreateMode ? searchParams.get("folderId")?.trim() || null : null;

  const skillsQuery = useQuery({
    queryKey: queryKeys.companySkills.list(companyId),
    queryFn: () => companySkillsApi.list(companyId, { sort: "alphabetical" }),
    enabled: Boolean(companyId),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.companySkills.detail(companyId, skillId),
    queryFn: () => companySkillsApi.detail(companyId, skillId),
    enabled: Boolean(companyId && skillId && !isCreateMode),
  });
  const detailView = useQueryView(detailQuery);
  const forkDetailQuery = useQuery({
    queryKey: queryKeys.companySkills.detail(companyId, forkFromSkillId ?? ""),
    queryFn: () => companySkillsApi.detail(companyId, forkFromSkillId!),
    enabled: Boolean(companyId && forkFromSkillId),
  });
  const skill = detailQuery.data ?? null;

  useEffect(() => {
    setBreadcrumbs(
      isCreateMode
        ? [
            { label: interfaceText("m_66d0f523a379b2"), href: "/skills" },
            { label: "Studio", href: "/skills/studio" },
            { label: interfaceText("m_9bf06a86c934b7") },
          ]
        : skill
        ? [
            { label: interfaceText("m_66d0f523a379b2"), href: "/skills" },
            { label: "Studio", href: "/skills/studio" },
            { label: skill.name },
          ]
        : [
            { label: interfaceText("m_66d0f523a379b2"), href: "/skills" },
            { label: "Studio" },
          ],
    );
  }, [isCreateMode, setBreadcrumbs, skill, interfaceLanguage]);

  // Record a per-browser visit whenever a skill successfully opens, powering the
  // landing's "Recently visited" section (PAP-13150).
  useEffect(() => {
    if (skill?.id) trackRecentStudioSkill(skill.id);
  }, [skill?.id]);

  if (!companyId) {
    return <StudioMessage message={interfaceText("m_5722dd9d9f8b47")} />;
  }
  if (isCreateMode) {
    return (
      <StudioCreateMode
        companyId={companyId}
        skills={skillsQuery.data ?? []}
        skillsLoading={skillsQuery.isLoading}
        forkFromSkillId={forkFromSkillId}
        folderId={newSkillFolderId}
        forkSkill={forkDetailQuery.data ?? null}
        forkLoading={forkDetailQuery.isLoading}
        forkError={forkDetailQuery.isError}
        onSelectSkill={(nextSkillId) => navigate(skillStudioRoute(nextSkillId))}
      />
    );
  }
  if (!skillId) {
    return (
      <StudioLanding
        companyId={companyId}
        skills={skillsQuery.data ?? []}
        skillsLoading={skillsQuery.isLoading}
        onSelectSkill={(nextSkillId) => navigate(skillStudioRoute(nextSkillId))}
        onCreateNew={() => navigate(skillStudioNewRoute())}
      />
    );
  }
  if (detailQuery.isLoading || detailView.kind === "reconnecting") {
    return <StudioMessage message={interfaceText("m_5c57e60fe4ca90")} />;
  }
  // "Not found" only for a real 404; an outage never looks like a missing skill.
  if (detailView.kind === "error" && detailView.errorKind !== "not_found") {
    return (
      <QueryErrorState
        size="page"
        error={detailQuery.error}
        action={interfaceText("m_7797bc2ca387cd")}
        onRetry={detailView.retry}
        retrying={detailView.isFetching}
      />
    );
  }
  if (detailView.kind === "error" || !detailQuery.data) {
    return <StudioMessage message={interfaceText("m_97cd06e1a48e2a")} />;
  }

  return (
    <StudioShell
      companyId={companyId}
      skill={detailQuery.data}
      skills={skillsQuery.data ?? []}
      skillsLoading={skillsQuery.isLoading}
    />
  );
}

function StudioCreateMode({
  companyId,
  skills,
  skillsLoading,
  forkFromSkillId,
  folderId,
  forkSkill,
  forkLoading,
  forkError,
  onSelectSkill,
}: {
  companyId: string;
  skills: CompanySkillListItem[];
  skillsLoading: boolean;
  forkFromSkillId: string | null;
  folderId: string | null;
  forkSkill: CompanySkillDetail | null;
  forkLoading: boolean;
  forkError: boolean;
  onSelectSkill: (skillId: string) => void;
}) {
  useInterfaceLanguage();
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-3 py-2">
          <SkillSwitcher
            skill={null}
            skills={skills}
            loading={skillsLoading}
            onSelectSkill={onSelectSkill}
            emptyLabel={interfaceText("m_9bf06a86c934b7")}
          />
        </header>
        <SkillsPageNavigation activeView="authored" />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <StudioNewSkillPanel
            companyId={companyId}
            forkFromSkillId={forkFromSkillId}
            folderId={folderId}
            forkSkill={forkSkill}
            forkLoading={forkLoading}
            forkError={forkError}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

function StudioNewSkillPanel({
  companyId,
  forkFromSkillId,
  folderId,
  forkSkill,
  forkLoading,
  forkError,
}: {
  companyId: string;
  forkFromSkillId: string | null;
  folderId: string | null;
  forkSkill: CompanySkillDetail | null;
  forkLoading: boolean;
  forkError: boolean;
}) {
  useInterfaceLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useOptionalToastActions();
  const initialDraft = useMemo(() => {
    const base = forkSkill ? buildForkSkillDraft(forkSkill) : buildBlankSkillDraft();
    // An explicit folder context from the URL wins over a fork source's folder
    // so the new skill is filed where the user launched creation (PAP-14086).
    return folderId ? { ...base, folderId } : base;
  }, [forkSkill, folderId]);
  const [draft, setDraft] = useState<SkillCreateDraft>(initialDraft);
  const [slugDirty, setSlugDirty] = useState(initialDraft.slug.trim().length > 0);
  const [categoryDraft, setCategoryDraft] = useState(initialDraft.categories.join(", "));
  const parsedCategories = splitCategoryDraft(categoryDraft);
  const effectiveSlug = draft.slug.trim() || normalizeSkillDraftSlug(draft.name);
  const nameValid = draft.name.trim().length > 0;

  useEffect(() => {
    setDraft(initialDraft);
    setSlugDirty(initialDraft.slug.trim().length > 0);
    setCategoryDraft(initialDraft.categories.join(", "));
  }, [initialDraft]);

  function patchDraft(patch: Partial<SkillCreateDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  const createSkill = useMutation({
    mutationFn: () => companySkillsApi.create(companyId, skillCreateDraftToPayload({
      ...draft,
      categories: parsedCategories,
    })),
    onSuccess: async (skill) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.companySkills.list(companyId) });
      toast?.pushToast({
        tone: "success",
        title: skill.forkedFromSkillId ? interfaceText("m_7806f0fc7194ca") : interfaceText("m_b25ab5d5e2a5af"),
        body: interfaceText("m_8b6689492579a7", { value0: (skill.name) }),
      });
      navigate(skillStudioRoute(skill.id));
    },
    onError: (error) => {
      toast?.pushToast({
        tone: "error",
        title: interfaceText("m_bb3edc7034fe7d"),
        body: error instanceof Error ? error.message : interfaceText("m_993d12daccdd2d"),
      });
    },
  });

  if (forkFromSkillId && forkLoading) {
    return <StudioMessage message={interfaceText("m_1604c13e4409da")} />;
  }

  const previewCard: DiscoveryCard = {
    key: effectiveSlug || draft.name || "new-skill",
    skillId: null,
    catalogRef: null,
    name: draft.name || "New Skill",
    slug: effectiveSlug || "skill",
    author: "you",
    version: null,
    tagline: draft.tagline || null,
    description: draft.tagline,
    categories: parsedCategories,
    iconUrl: null,
    color: draft.color,
    starCount: 0,
    agentCount: 0,
    forkCount: 0,
    installed: false,
    required: false,
    forkedFrom: Boolean(draft.forkedFromSkillId),
    updatedAt: Date.now(),
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">
          {draft.forkedFromSkillId ? interfaceText("m_fa941eb0ebcedd") : interfaceText("m_334c7dd95ab433")}
        </h1>
        <p className="text-sm text-muted-foreground">{interfaceText("m_deec896561ffdb")}</p>
      </div>

      {draft.forkedFromName ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <GitFork className="h-4 w-4" />{interfaceText("m_f22a16ea5fcbb1")}{draft.forkedFromName}
        </div>
      ) : forkError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />{interfaceText("m_e993a0331e068b")}</div>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">{interfaceText("m_8fdd2ee8475e29")}</h2>
          <p className="text-xs text-muted-foreground">{interfaceText("m_0701145e12e7a3")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="skill-name">{interfaceText("m_dcd1d5223f73b3")}</Label>
            <Input
              id="skill-name"
              value={draft.name}
              onChange={(event) => {
                const nextName = event.target.value;
                patchDraft({
                  name: nextName,
                  slug: slugDirty ? draft.slug : normalizeSkillDraftSlug(nextName),
                  markdown: draft.markdown === defaultSkillMarkdown(draft.name, draft.tagline)
                    ? defaultSkillMarkdown(nextName, draft.tagline)
                    : draft.markdown,
                });
              }}
              placeholder={interfaceText("m_3d2006711d4cf0")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill-slug">{interfaceText("m_d15387ecc6c5e2")}</Label>
            <Input
              id="skill-slug"
              value={draft.slug}
              onChange={(event) => {
                const nextSlug = normalizeSkillDraftSlug(event.target.value);
                setSlugDirty(nextSlug.length > 0);
                patchDraft({ slug: nextSlug });
              }}
              placeholder="code-review"
              className="font-mono"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skill-tagline">{interfaceText("m_fdab2c2f2be28e")}</Label>
          <Textarea
            id="skill-tagline"
            value={draft.tagline}
            onChange={(event) => {
              const nextTagline = event.target.value;
              patchDraft({
                tagline: nextTagline,
                description: draft.description ? draft.description : nextTagline,
                markdown: draft.markdown === defaultSkillMarkdown(draft.name, draft.tagline)
                  ? defaultSkillMarkdown(draft.name, nextTagline)
                  : draft.markdown,
              });
            }}
            placeholder={interfaceText("m_1ca7c5025827d1")}
            className="min-h-20"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">{interfaceText("m_3907fa7f80722a")}</h2>
          <p className="text-xs text-muted-foreground">{interfaceText("m_b87e0c2d950f3d")}</p>
        </div>
        <div className="flex items-center gap-3">
          <SkillCardIcon card={previewCard} size={48} />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{previewCard.name}</div>
            <div className="truncate text-xs text-muted-foreground">{draft.tagline || interfaceText("m_8e4cf121c0a339")}</div>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{interfaceText("m_6b73191a0a4b67")}</Label>
          <div className="flex flex-wrap items-center gap-2">
            {SKILL_CREATE_ACCENTS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => patchDraft({ color })}
                className={cn(
                  "h-7 w-7 rounded-md border",
                  draft.color === color ? "border-foreground" : "border-border",
                )}
                style={{ backgroundColor: color }}
                aria-label={interfaceText("m_58f72e4aa68c93", { value0: (color) })}
              />
            ))}
            <Input
              aria-label={interfaceText("m_91f4e4b13e5701")}
              value={draft.color}
              onChange={(event) => patchDraft({ color: event.target.value })}
              className="h-7 w-28 font-mono text-xs"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skill-categories">{interfaceText("m_b8b1d894c68372")}</Label>
          <Input
            id="skill-categories"
            value={categoryDraft}
            onChange={(event) => setCategoryDraft(event.target.value)}
            placeholder={interfaceText("m_60bdd3ca934986")}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">{interfaceText("m_bbedc70e985fe0")}</h2>
          <p className="text-xs text-muted-foreground">{interfaceText("m_4522d7745d48ef")}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["company", "private"] as const).map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => patchDraft({ sharingScope: scope })}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm",
                draft.sharingScope === scope ? "border-foreground bg-accent/50" : "border-border",
              )}
            >
              <span className="block font-medium">{scope === "company" ? interfaceText("m_d764d42592fc96") : interfaceText("m_c63eb6720c6e88")}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {scope === "company" ? interfaceText("m_07a1e6d8eaf2c1") : interfaceText("m_efbca2276ff1f7")}
              </span>
            </button>
          ))}
          <button
            type="button"
            disabled
            className="rounded-md border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground"
          >
            <span className="block font-medium">{interfaceText("m_591935b15b1c88")}</span>
            <span className="mt-1 block text-xs">{interfaceText("m_3ff09ef158dc5f")}</span>
          </button>
        </div>
      </section>

      <details className="rounded-md border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-foreground">{interfaceText("m_237b19788583e3")}</summary>
        <Textarea
          value={draft.markdown}
          onChange={(event) => patchDraft({ markdown: event.target.value })}
          className="mt-3 min-h-(--sz-22rem) resize-y font-mono text-xs"
        />
      </details>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={() => navigate("/skills/studio")} disabled={createSkill.isPending}>{interfaceText("m_19766ed6ccb2f4")}</Button>
        <Button onClick={() => createSkill.mutate()} disabled={createSkill.isPending || !nameValid}>
          <FilePlus className="h-4 w-4" />
          {createSkill.isPending ? interfaceText("m_def70944c9bb9c") : draft.forkedFromSkillId ? interfaceText("m_d217b73b9ff2c7") : interfaceText("m_1a9030082a20b6")}
        </Button>
      </div>
    </div>
  );
}

function StudioMessage({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-(--sz-60vh) items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function StudioEmptyState({
  skills,
  skillsLoading,
  onSelectSkill,
  onCreateNew,
}: {
  skills: CompanySkillListItem[];
  skillsLoading: boolean;
  onSelectSkill: (skillId: string) => void;
  onCreateNew: () => void;
}) {
  useInterfaceLanguage();
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-3 py-2">
          <SkillSwitcher
            skill={null}
            skills={skills}
            loading={skillsLoading}
            onSelectSkill={onSelectSkill}
            emptyLabel={interfaceText("m_4511ad1cfc1d13")}
          />
        </header>
        <SkillsPageNavigation activeView="authored" />
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={FileCode}
            message={skillsLoading ? interfaceText("m_7cf5fa27969286") : interfaceText("m_4173f6cd118861")}
            action={interfaceText("m_334c7dd95ab433")}
            onAction={onCreateNew}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Landing — recently visited + recently updated (PAP-13150)
// ---------------------------------------------------------------------------

function StudioLanding({
  companyId,
  skills,
  skillsLoading,
  onSelectSkill,
  onCreateNew,
}: {
  companyId: string;
  skills: CompanySkillListItem[];
  skillsLoading: boolean;
  onSelectSkill: (skillId: string) => void;
  onCreateNew: () => void;
}) {
  useInterfaceLanguage();
  // Recency-sorted list, enriched with the last human editor (PAP-13149) — the
  // source for both landing sections. Kept separate from the alphabetical
  // switcher list so each cache stays sorted the way its consumer expects.
  const recentQuery = useQuery({
    queryKey: queryKeys.companySkills.listRecent(companyId),
    queryFn: () => companySkillsApi.list(companyId, { sort: "recent", include: ["lastEditor"] }),
    enabled: Boolean(companyId),
  });
  const recentSkills = recentQuery.data ?? [];

  const visited = useMemo(
    () => orderRecentlyVisitedSkills(recentSkills, getRecentStudioSkillIds()),
    [recentSkills],
  );
  const updated = useMemo(
    () => orderRecentlyUpdatedSkills(recentSkills, visited.map((skill) => skill.id)),
    [recentSkills, visited],
  );

  // No skills at all (or still loading) -> today's empty/loading fallback.
  if (recentSkills.length === 0) {
    return (
      <StudioEmptyState
        skills={skills}
        skillsLoading={skillsLoading || recentQuery.isLoading}
        onSelectSkill={onSelectSkill}
        onCreateNew={onCreateNew}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-3 py-2">
          <SkillSwitcher
            skill={null}
            skills={skills}
            loading={skillsLoading}
            onSelectSkill={onSelectSkill}
            emptyLabel={interfaceText("m_4511ad1cfc1d13")}
          />
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onCreateNew}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />{interfaceText("m_9bf06a86c934b7")}</Button>
        </header>
        <SkillsPageNavigation activeView="authored" />
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
            {visited.length > 0 ? (
              <StudioLandingSection
                title={interfaceText("m_b3f3bc0459891f")}
                skills={visited}
                onSelectSkill={onSelectSkill}
              />
            ) : null}
            <StudioLandingSection
              title={interfaceText("m_474b2a869ac147")}
              skills={updated}
              onSelectSkill={onSelectSkill}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function StudioLandingSection({
  title,
  skills,
  onSelectSkill,
}: {
  title: string;
  skills: CompanySkillListItem[];
  onSelectSkill: (skillId: string) => void;
}) {
  if (skills.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {skills.map((skill) => (
          <StudioLandingRow
            key={skill.id}
            skill={skill}
            onSelect={() => onSelectSkill(skill.id)}
          />
        ))}
      </div>
    </section>
  );
}

function StudioLandingRow({
  skill,
  onSelect,
}: {
  skill: CompanySkillListItem;
  onSelect: () => void;
}) {
  useInterfaceLanguage();
  const editor = skillEditorAvatar(skill.lastEditor);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent"
    >
      <SkillLandingIcon skill={skill} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{skill.name}</span>
        {skill.tagline ? (
          <span className="truncate text-xs text-muted-foreground">{skill.tagline}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{interfaceText("m_53961930ab4482")}{relativeTime(skill.updatedAt)}
      </span>
      {editor ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar size="xs">
              {editor.imageUrl ? <AvatarImage src={editor.imageUrl} alt="" /> : null}
              <AvatarFallback>{editor.initials}</AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{editor.name}</TooltipContent>
        </Tooltip>
      ) : (
        <span className="w-5 shrink-0" aria-hidden="true" />
      )}
    </button>
  );
}

function SkillLandingIcon({ skill }: { skill: CompanySkillListItem }) {
  if (skill.iconUrl) {
    return (
      <img
        src={skill.iconUrl}
        alt=""
        className="h-9 w-9 shrink-0 rounded-md object-cover"
      />
    );
  }
  const accent = skillAccentColor(skill.key, skill.color);
  const letter = (skill.slug || skill.name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
      style={{ backgroundColor: accent }}
    >
      {letter}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shell — header + three panes (or mobile tabs)
// ---------------------------------------------------------------------------

function StudioShell({
  companyId,
  skill,
  skills,
  skillsLoading,
}: {
  companyId: string;
  skill: CompanySkillDetail;
  skills: CompanySkillListItem[];
  skillsLoading: boolean;
}) {
  const skillId = skill.id;
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- selection / cross-pane state ---
  const [selectedInputId, setSelectedInputId] = useState<string | null>(
    () => searchParams.get("input"),
  );
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    () => searchParams.get("run"),
  );
  const [adHocMode, setAdHocMode] = useState(false);
  const [adHocContent, setAdHocContent] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [skillDirty, setSkillDirty] = useState(false);
  const [versionSheetOpen, setVersionSheetOpen] = useState(false);
  const [forkDialogOpen, setForkDialogOpen] = useState(false);

  const layoutRef = useRef<PaneLayout>(loadPaneLayout());

  // Keep deep-link params in sync (?input, ?run).
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedInputId) next.set("input", selectedInputId);
    else next.delete("input");
    if (selectedRunId) next.set("run", selectedRunId);
    else next.delete("run");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInputId, selectedRunId]);

  const inputsQuery = useQuery({
    queryKey: queryKeys.companySkills.testInputs(companyId, skillId),
    queryFn: () => companySkillsApi.testInputs(companyId, skillId),
    enabled: Boolean(companyId && skillId),
  });

  const persistLayout = useCallback((layout: Record<string, number>) => {
    const next: PaneLayout = {
      skill: layout.skill ?? layoutRef.current.skill,
      input: layout.input ?? layoutRef.current.input,
      runs: layout.runs ?? layoutRef.current.runs,
    };
    layoutRef.current = next;
    try {
      localStorage.setItem(PANE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage may be unavailable (private mode) — non-fatal */
    }
  }, []);

  const inputs = inputsQuery.data ?? [];
  const selectedInput = inputs.find((i) => i.id === selectedInputId) ?? null;

  const leftPane = (
    <SkillPane
      companyId={companyId}
      skill={skill}
      onDirtyChange={setSkillDirty}
      onEditACopy={() => setForkDialogOpen(true)}
    />
  );
  const projectScan = isProjectScanSkill(skill.metadata);
  const middlePane = (
    <InputPane
      companyId={companyId}
      skillId={skillId}
      inputs={inputs}
      loading={inputsQuery.isLoading}
      selectedInputId={selectedInputId}
      adHocMode={adHocMode}
      adHocContent={adHocContent}
      onAdHocChange={setAdHocContent}
      onSelectInput={(id) => {
        setSelectedInputId(id);
        setAdHocMode(false);
      }}
      onSelectAdHoc={() => {
        setAdHocContent("");
        setAdHocMode(true);
        setSelectedInputId(null);
      }}
    />
  );
  const rightPane = (
    <RunsPane
      companyId={companyId}
      skill={skill}
      inputs={inputs}
      selectedInput={selectedInput}
      adHocMode={adHocMode}
      adHocContent={adHocContent}
      selectedRunId={selectedRunId}
      onSelectRun={setSelectedRunId}
      selectedAgentId={selectedAgentId}
      onSelectAgent={setSelectedAgentId}
      skillDirty={skillDirty}
      filterInput={selectedInput}
      onClearFilter={() => setSelectedInputId(null)}
    />
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full min-h-0 flex-col">
        <StudioHeader
          companyId={companyId}
          skill={skill}
          skillDirty={skillDirty}
          skills={skills}
          skillsLoading={skillsLoading}
          onSelectSkill={(nextSkillId) => navigate(skillStudioRoute(nextSkillId))}
          onOpenVersions={() => setVersionSheetOpen(true)}
        />
        <SkillsPageNavigation activeView="authored" />
        {projectScan ? (
          <ProjectScanNotice skill={skill} onEditACopy={() => setForkDialogOpen(true)} />
        ) : null}
        {isMobile ? (
          <MobileTabs skill={leftPane} input={middlePane} runs={rightPane} />
        ) : (
          <ResizablePanelGroup
            className="flex-1 min-h-0"
            defaultLayout={{
              skill: layoutRef.current.skill,
              input: layoutRef.current.input,
              runs: layoutRef.current.runs,
            }}
            onLayoutChanged={persistLayout}
          >
            <ResizablePanel id="skill" minSize="280px" className="border-r border-border">
              {leftPane}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel
              id="input"
              minSize="240px"
              collapsible
              collapsedSize="40px"
              className="border-r border-border"
            >
              {middlePane}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel id="runs" minSize="360px">
              {rightPane}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
      <VersionHistorySheet
        open={versionSheetOpen}
        onOpenChange={setVersionSheetOpen}
        companyId={companyId}
        skill={skill}
        onRestored={() => {
          setSkillDirty(false);
          queryClient.invalidateQueries({
            queryKey: queryKeys.companySkills.detail(companyId, skillId),
          });
        }}
        onFilterRuns={(inputId) => setSelectedInputId(inputId)}
      />
      <ForkSkillDialog
        companyId={companyId}
        skill={skill}
        open={forkDialogOpen}
        onOpenChange={setForkDialogOpen}
      />
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function StudioHeader({
  companyId,
  skill,
  skillDirty,
  skills,
  skillsLoading,
  onSelectSkill,
  onOpenVersions,
}: {
  companyId: string;
  skill: CompanySkillDetail;
  skillDirty: boolean;
  skills: CompanySkillListItem[];
  skillsLoading: boolean;
  onSelectSkill: (skillId: string) => void;
  onOpenVersions: () => void;
}) {
  const interfaceLanguage = useInterfaceLanguage();
  const version = skill.currentVersion?.revisionNumber ?? null;
  const toast = useOptionalToastActions();
  const copyShareLink = useCallback(() => {
    const href = typeof window !== "undefined" ? window.location.href : "";
    void copyTextToClipboard(href)
      .then(() => toast?.pushToast({ tone: "success", title: interfaceText("m_d12860c21e78ba"), body: interfaceText("m_2ec2fa0ded4d2c") }))
      .catch((error) => toast?.pushToast({
        tone: "error",
        title: interfaceText("m_5b50e7a693fee9"),
        body: error instanceof Error ? error.message : interfaceText("m_f5e805d39112ad"),
      }));
  }, [toast, interfaceLanguage]);

  return (
    <header className="flex items-center gap-3 border-b border-border px-3 py-2">
      <SkillSwitcher
        skill={skill}
        skills={skills}
        loading={skillsLoading}
        onSelectSkill={onSelectSkill}
      />
      {version !== null && (
        <span className="font-mono text-xs text-muted-foreground">v{version}</span>
      )}
      {skillDirty ? (
        <Badge variant="secondary">{interfaceText("m_4cea356a17a185")}</Badge>
      ) : null}
      {!skill.editable ? (
        <Badge variant="secondary">{interfaceText("m_72bb90897ab1ea")}</Badge>
      ) : null}
      {skill.forkedFromSkillId ? (
        <SkillLineageChip
          companyId={companyId}
          forkedFromSkillId={skill.forkedFromSkillId}
        />
      ) : null}
      <AgentsUsingSkillBadge companyId={companyId} skill={skill} />
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onOpenVersions}>
          <History className="mr-1.5 h-3.5 w-3.5" />{interfaceText("m_a6df11e706c514")}</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={interfaceText("m_b7bc60e8f9c384")}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={copyShareLink}>
              <Share2 className="mr-2 h-4 w-4" />{interfaceText("m_777ba33c11851f")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

type SkillSwitcherOption = SearchableSelectOption<string> & {
  skill: CompanySkillListItem | CompanySkillDetail;
};

function SkillSwitcher({
  skill,
  skills,
  loading,
  onSelectSkill,
  emptyLabel = "Select skill",
}: {
  skill: CompanySkillDetail | null;
  skills: CompanySkillListItem[];
  loading: boolean;
  onSelectSkill: (skillId: string) => void;
  emptyLabel?: string;
}) {
  useInterfaceLanguage();
  const groups = useMemo<readonly SearchableSelectGroup<string, SkillSwitcherOption>[]>(() => {
    const options: SkillSwitcherOption[] = withCurrentSkill(skills, skill).map((item) => ({
      key: item.id,
      value: item.id,
      label: item.name,
      title: item.name,
      searchText: [item.name, item.slug, item.key, item.description ?? ""].join(" "),
      skill: item,
    }));
    return [{ id: "skills", options }];
  }, [skill, skills]);

  return (
    <SearchableSelect<string, SkillSwitcherOption>
      value={skill?.id ?? ""}
      groups={groups}
      loading={loading}
      loadingMessage="Loading skills..."
      placeholder={emptyLabel}
      searchPlaceholder={interfaceText("m_65104bc415b313")}
      emptyMessage={interfaceText("m_18f3ee30c2ff2b")}
      onValueChange={(value) => {
        if (value !== skill?.id) onSelectSkill(value);
      }}
      triggerClassName="h-8 w-64 border-0 bg-transparent px-0 text-base font-semibold shadow-none hover:bg-accent md:w-80"
      contentClassName="w-80"
      contentWidth="auto"
      renderValue={(option) => option?.label ?? skill?.name ?? emptyLabel}
      renderOption={(option, { selected }) => (
        <span className="flex min-w-0 flex-col">
          <span className={cn("truncate", selected && "font-medium")}>{option.label}</span>
          <span className="truncate text-(length:--text-micro) text-muted-foreground">
            {option.skill.slug}
          </span>
        </span>
      )}
    />
  );
}

function withCurrentSkill(
  skills: CompanySkillListItem[],
  skill: CompanySkillDetail | null,
): Array<CompanySkillListItem | CompanySkillDetail> {
  if (!skill) return skills;
  return skills.some((candidate) => candidate.id === skill.id) ? skills : [skill, ...skills];
}

// ---------------------------------------------------------------------------
// Left — Skill files + editor
// ---------------------------------------------------------------------------

function SkillPane({
  companyId,
  skill,
  onDirtyChange,
  onEditACopy,
}: {
  companyId: string;
  skill: CompanySkillDetail;
  onDirtyChange: (dirty: boolean) => void;
  onEditACopy: () => void;
}) {
  useInterfaceLanguage();
  const skillId = skill.id;
  const queryClient = useQueryClient();
  const onError = useMutationErrorToast();
  const paths = useMemo(
    () => skill.fileInventory.map((f) => f.path),
    [skill.fileInventory],
  );
  const [selectedFile, setSelectedFile] = useState<string>(
    () => paths.find((p) => /skill\.md$/i.test(p)) ?? paths[0] ?? "SKILL.md",
  );
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<string>("");
  const [savedContent, setSavedContent] = useState<string>("");
  const [versionConflict, setVersionConflict] = useState(false);
  const [createDialog, setCreateDialog] = useState<"file" | "folder" | null>(null);
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
  // Gate rich-editor onChange until the user actually interacts with the body.
  // MDXEditor can emit a normalizing onChange on mount, which would otherwise
  // dirty the file on open and break the byte-identity guarantee (PAP-13156).
  const bodyInteractedRef = useRef(false);
  const markBodyInteracted = useCallback(() => {
    bodyInteractedRef.current = true;
  }, []);

  const nodes: FileTreeNode[] = useMemo(
    () => buildFileTree(Object.fromEntries(paths.map((p) => [p, ""]))),
    [paths],
  );

  const [baseVersionId, setBaseVersionId] = useState<string | null | undefined>();
  const draftFileRef = useRef<string | null>(null);
  const currentDraftRef = useRef({ skillId, selectedFile, draft });
  currentDraftRef.current = { skillId, selectedFile, draft };
  const fileQuery = useQuery({
    queryKey: queryKeys.companySkills.file(companyId, skillId, selectedFile),
    queryFn: () => companySkillsApi.file(companyId, skillId, selectedFile),
    enabled: Boolean(companyId && skillId && selectedFile),
  });

  useEffect(() => {
    if (fileQuery.data) {
      if (draftFileRef.current === selectedFile && draft !== savedContent) return;
      draftFileRef.current = selectedFile;
      setBaseVersionId(fileQuery.data.versionId);
      setVersionConflict(false);
      bodyInteractedRef.current = false;
      setDraft(fileQuery.data.content);
      setSavedContent(fileQuery.data.content);
    }
  }, [fileQuery.data]);

  const dirty = draft !== savedContent;
  const currentFolder = parentFolder(selectedFile);
  const pathSet = useMemo(() => new Set(paths), [paths]);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const selectFile = useCallback((path: string) => {
    if (path === selectedFile) return;
    if (
      dirty
      && typeof window !== "undefined"
      && !window.confirm("Discard unsaved edits and switch files?")
    ) {
      return;
    }
    setSelectedFile(path);
  }, [dirty, selectedFile]);

  const saveMutation = useMutation({
    mutationFn: ({ path, content, versionId }: { path: string; content: string; versionId: string | null | undefined }) =>
      companySkillsApi.updateFile(companyId, skillId, path, content, { expectedVersionId: versionId }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.companySkills.file(companyId, skillId, updated.path), updated);
      if (draftFileRef.current === updated.path) {
        setBaseVersionId(updated.versionId);
        setSavedContent(updated.content);
        setVersionConflict(false);
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.detail(companyId, skillId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.list(companyId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.versions(companyId, skillId),
      });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) setVersionConflict(true);
      onError("Couldn't save file")(error);
    },
  });

  async function loadLatestSavedFile() {
    if (dirty && !window.confirm("Discard unsaved edits and load the latest saved file?")) return;
    const result = await fileQuery.refetch();
    if (result.error) { onError("Couldn't load latest file")(result.error); return; }
    if (!result.data) return;
    // Discard confirmation covers only the draft that started this request.
    const current = currentDraftRef.current;
    if (current.skillId !== skillId || current.selectedFile !== selectedFile || current.draft !== draft) return;
    draftFileRef.current = selectedFile;
    setDraft(result.data.content);
    setSavedContent(result.data.content);
    setBaseVersionId(result.data.versionId);
    setVersionConflict(false);
  }

  const createMutation = useMutation({
    mutationFn: ({ path, content }: { path: string; content: string }) =>
      companySkillsApi.updateFile(companyId, skillId, path, content, { expectedVersionId: baseVersionId ?? skill.currentVersionId }),
    onSuccess: (created) => {
      setBaseVersionId(created.versionId);
      queryClient.setQueryData(queryKeys.companySkills.file(companyId, skillId, created.path), created);
      setSelectedFile(created.path);
      setDraft(created.content);
      setSavedContent(created.content);
      setCreateDialog(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.detail(companyId, skillId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.list(companyId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.versions(companyId, skillId),
      });
    },
    onError: onError("Couldn't create file"),
  });

  const deleteMutation = useMutation({
    mutationFn: (input: { path: string; target: "file" | "folder" }) =>
      companySkillsApi.deleteFile(companyId, skillId, { ...input, expectedVersionId: baseVersionId ?? skill.currentVersionId }),
    onSuccess: (result) => {
      setBaseVersionId(result.versionId);
      queryClient.invalidateQueries({ queryKey: queryKeys.companySkills.file(companyId, skillId, selectedFile) });
      const deleted = new Set(result.deletedPaths);
      const remaining = paths.filter((path) => !deleted.has(path));
      setSelectedFile(remaining.find((path) => /skill\.md$/i.test(path)) ?? remaining[0] ?? "SKILL.md");
      setDeleteFolderOpen(false);
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.detail(companyId, skillId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.list(companyId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.versions(companyId, skillId),
      });
    },
    onError: onError("Couldn't delete file"),
  });

  // Read-only skills (bundled Paperclip, remote GitHub, URL, skills.sh) reject
  // file writes server-side; reflect that up-front instead of letting the user
  // type into an editor whose Save silently 422s (PAP-13001 Bug B).
  const readOnly = skill.editable === false || fileQuery.data?.editable === false;

  if (paths.length === 0) {
    return (
      <PaneScaffold
        title={<SkillPaneTitle skillName={skill.name} folder="root" />}
        action={
          <SkillFileActions
            readOnly={readOnly}
            selectedFile={selectedFile}
            currentFolder=""
            canDeleteFile={false}
            pending={createMutation.isPending || deleteMutation.isPending || dirty}
            onAddFile={() => setCreateDialog("file")}
            onAddFolder={() => setCreateDialog("folder")}
            onDeleteFile={() => {}}
            onDeleteFolder={() => setDeleteFolderOpen(true)}
          />
        }
      >
        <EmptyState icon={FileCode} message={interfaceText("m_f677a0f2d473e1")} />
        <SkillPathDialog
          mode={createDialog}
          open={createDialog !== null}
          onOpenChange={(open) => {
            if (!open) setCreateDialog(null);
          }}
          currentFolder=""
          existingPaths={pathSet}
          pending={createMutation.isPending}
          onSubmit={(path, content) => createMutation.mutate({ path, content })}
        />
      </PaneScaffold>
    );
  }

  const isMarkdown = fileQuery.data?.markdown ?? /\.md$/i.test(selectedFile);
  const markdownBlock = isMarkdown ? splitFrontmatterBlock(draft) : null;

  return (
    <PaneScaffold
      title={<SkillPaneTitle skillName={skill.name} folder={currentFolder || "root"} />}
      action={
        <SkillFileActions
          readOnly={readOnly}
          selectedFile={selectedFile}
          currentFolder={currentFolder}
          canDeleteFile={selectedFile !== "SKILL.md"}
          pending={createMutation.isPending || deleteMutation.isPending || dirty}
          onAddFile={() => setCreateDialog("file")}
          onAddFolder={() => setCreateDialog("folder")}
          onDeleteFile={() => deleteMutation.mutate({ path: selectedFile, target: "file" })}
          onDeleteFolder={() => setDeleteFolderOpen(true)}
        />
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {versionConflict ? (
          <div role="alert" className="flex items-center gap-2 border-b border-border bg-muted px-3 py-2 text-xs">
            <span>{interfaceText("m_bf46a984eb2943")}</span>
            <Button size="sm" variant="outline" disabled={fileQuery.isFetching} onClick={() => void loadLatestSavedFile()}>{interfaceText("m_3ca17c504d1e42")}</Button>
          </div>
        ) : null}
        {dirty && !readOnly ? (
          <div className="flex items-start gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>{interfaceText("m_9484eaf86e613e")}</span>
          </div>
        ) : null}
        <div className="max-h-(--sz-11_75rem) overflow-auto border-b border-border p-1">
          <FileTree
            nodes={nodes}
            selectedFile={selectedFile}
            expandedDirs={expandedDirs}
            onToggleDir={(path) =>
              setExpandedDirs((prev) => {
                const next = new Set(prev);
                if (next.has(path)) next.delete(path);
                else next.add(path);
                return next;
              })
            }
            onSelectFile={selectFile}
            showCheckboxes={false}
            ariaLabel="Skill files"
          />
        </div>
        <SkillSourceProvenance skill={skill} />
        {readOnly && (
          <div className="flex items-start gap-3 border-b border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p>
                {skill.metadata?.skillSourceId ? interfaceText("m_ae518f49ce7537") : skill.editableReason ?? interfaceText("m_cc235b680b7fca")}
                {" "}{interfaceText("m_12741dd950f498")}</p>
              <Button
                type="button"
                size="sm"
                className="mt-2"
                onClick={onEditACopy}
              >
                <GitFork className="mr-1.5 h-3.5 w-3.5" />{interfaceText("m_e61974e66c687e")}</Button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <span className="truncate font-mono text-xs text-muted-foreground">
            {selectedFile}
            {skill.currentVersion ? ` · v${skill.currentVersion.revisionNumber}` : ""}
          </span>
          <div className="flex items-center gap-2">
            {readOnly ? (
              <Badge variant="secondary">{interfaceText("m_72bb90897ab1ea")}</Badge>
            ) : (
              <>
                {dirty && <Badge variant="secondary">{interfaceText("m_6250d5725dda6d")}</Badge>}
                <Button
                  size="sm"
                  disabled={!dirty || saveMutation.isPending}
                  onClick={() => saveMutation.mutate({ path: selectedFile, content: draft, versionId: baseVersionId })}
                >
                  {saveMutation.isPending ? interfaceText("m_23e39291d61358") : interfaceText("m_1509f561f24165")}
                </Button>
              </>
            )}
          </div>
        </div>
        {isMarkdown && markdownBlock?.hasFrontmatter ? (
          <FrontmatterPanel
            key={`fm:${selectedFile}`}
            frontmatterText={markdownBlock.frontmatterText}
            hasFrontmatter={markdownBlock.hasFrontmatter}
            fileName={selectedFile}
            skillSlug={skill.slug}
            readOnly={readOnly}
            onChange={(change) => {
              setDraft((prev) =>
                joinFrontmatterBlock({
                  frontmatterText: change.frontmatterText,
                  body: splitFrontmatterBlock(prev).body,
                  hasFrontmatter: change.hasFrontmatter,
                }),
              );
            }}
          />
        ) : null}
        <div
          className="min-h-0 flex-1 overflow-auto px-3 pb-3"
          onBeforeInputCapture={markBodyInteracted}
          onDropCapture={markBodyInteracted}
          onInput={markBodyInteracted}
          onKeyDownCapture={markBodyInteracted}
          onPasteCapture={markBodyInteracted}
          onPointerDownCapture={markBodyInteracted}
        >
          {fileQuery.data?.encoding === "base64" ? <SkillBinaryFile file={fileQuery.data} /> : isMarkdown && markdownBlock ? (
            <MarkdownEditor
              key={`body:${selectedFile}`}
              value={markdownBlock.body}
              onChange={(nextBody) => {
                // Ignore MDXEditor's on-mount normalization; only apply real edits.
                if (!bodyInteractedRef.current) return;
                setDraft((prev) => {
                  const block = splitFrontmatterBlock(prev);
                  return joinFrontmatterBlock({ ...block, body: nextBody });
                });
              }}
              bordered={false}
              readOnly={readOnly}
              className="min-h-(--sz-320px)"
            />
          ) : (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              readOnly={readOnly}
              className="min-h-(--sz-320px) font-mono text-xs"
              spellCheck={false}
            />
          )}
        </div>
      </div>
      <SkillPathDialog
        mode={createDialog}
        open={createDialog !== null}
        onOpenChange={(open) => {
          if (!open) setCreateDialog(null);
        }}
        currentFolder={currentFolder}
        existingPaths={pathSet}
        pending={createMutation.isPending}
        onSubmit={(path, content) => createMutation.mutate({ path, content })}
      />
      <DeleteFolderDialog
        open={deleteFolderOpen}
        onOpenChange={setDeleteFolderOpen}
        currentFolder={currentFolder}
        existingPaths={pathSet}
        pending={deleteMutation.isPending}
        onSubmit={(path) => deleteMutation.mutate({ path, target: "folder" })}
      />
    </PaneScaffold>
  );
}

function parentFolder(filePath: string) {
  const parts = filePath.split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

function normalizeStudioPath(value: string) {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .split("/")
    .filter((segment) => segment && segment !== ".")
    .join("/");
}

function folderSeedFile(folderPath: string) {
  return `${folderPath}/README.md`;
}

function folderSeedContent(folderPath: string) {
  const label = folderPath.split("/").filter(Boolean).at(-1) ?? interfaceText("m_74ccd43303847f");
  return `# ${label}\n`;
}

function SkillPaneTitle({ skillName, folder }: { skillName: string; folder: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate">{skillName}</span>
      <ChevronRight className="h-3 w-3 shrink-0" />
      <span className="truncate font-mono normal-case tracking-normal">{folder}</span>
    </span>
  );
}

function SkillFileActions({
  readOnly,
  selectedFile,
  canDeleteFile,
  pending,
  onAddFile,
  onAddFolder,
  onDeleteFile,
  onDeleteFolder,
}: {
  readOnly: boolean;
  selectedFile: string;
  currentFolder: string;
  canDeleteFile: boolean;
  pending: boolean;
  onAddFile: () => void;
  onAddFolder: () => void;
  onDeleteFile: () => void;
  onDeleteFolder: () => void;
}) {
  useInterfaceLanguage();
  const disabled = readOnly || pending;
  const deleteDisabled = disabled || !canDeleteFile;
  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="ghost" size="icon-sm" disabled={disabled} onClick={onAddFile} aria-label={interfaceText("m_2c83c00f0e83b3")}>
              <FilePlus className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{interfaceText("m_2c83c00f0e83b3")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="ghost" size="icon-sm" disabled={disabled} onClick={onAddFolder} aria-label={interfaceText("m_5bbfc5a69b25b4")}>
              <FolderPlus className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{interfaceText("m_5bbfc5a69b25b4")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={deleteDisabled}
              onClick={() => {
                if (typeof window === "undefined" || window.confirm(`Delete ${selectedFile}?`)) {
                  onDeleteFile();
                }
              }}
              aria-label={interfaceText("m_28e18dc9db382d")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{canDeleteFile ? interfaceText("m_28e18dc9db382d") : interfaceText("m_6d30e9630e4ae8")}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button variant="ghost" size="icon-sm" disabled={disabled} onClick={onDeleteFolder} aria-label={interfaceText("m_39f35f2d44d611")}>
              <FolderMinus className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{interfaceText("m_39f35f2d44d611")}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function SkillPathDialog({
  mode,
  open,
  onOpenChange,
  currentFolder,
  existingPaths,
  pending,
  onSubmit,
}: {
  mode: "file" | "folder" | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolder: string;
  existingPaths: Set<string>;
  pending: boolean;
  onSubmit: (path: string, content: string) => void;
}) {
  useInterfaceLanguage();
  const [pathValue, setPathValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !mode) return;
    setPathValue(mode === "folder"
      ? normalizeStudioPath(currentFolder ? `${currentFolder}/new-folder` : "new-folder")
      : normalizeStudioPath(currentFolder ? `${currentFolder}/new-file.md` : "notes.md"));
    setError(null);
  }, [currentFolder, mode, open]);

  const title = mode === "folder" ? interfaceText("m_5bbfc5a69b25b4") : interfaceText("m_2c83c00f0e83b3");
  const label = mode === "folder" ? interfaceText("m_98bca2fab915ab") : interfaceText("m_2fb6d38632ea2c");

  function submit() {
    if (!mode) return;
    const normalized = normalizeStudioPath(pathValue);
    if (!normalized) {
      setError(`${label} is required.`);
      return;
    }
    if (mode === "file") {
      if (existingPaths.has(normalized)) {
        setError("A file already exists at that path.");
        return;
      }
      onSubmit(normalized, "");
      return;
    }

    const folderPath = normalized.replace(/\/+$/, "");
    if ([...existingPaths].some((path) => path.startsWith(`${folderPath}/`))) {
      setError("A folder already exists at that path.");
      return;
    }
    onSubmit(folderSeedFile(folderPath), folderSeedContent(folderPath));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{interfaceText("m_083269633fb9f8")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="skill-path-input">{label}</Label>
          <Input
            id="skill-path-input"
            value={pathValue}
            onChange={(event) => {
              setPathValue(event.target.value);
              setError(null);
            }}
            placeholder={mode === "folder" ? "references/examples" : "references/examples.md"}
          />
          {mode === "folder" ? (
            <p className="text-xs text-muted-foreground">{interfaceText("m_07f10711eadb62")}</p>
          ) : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{interfaceText("m_19766ed6ccb2f4")}</Button>
          <Button disabled={pending} onClick={submit}>{interfaceText("m_4759498ac2a719")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteFolderDialog({
  open,
  onOpenChange,
  currentFolder,
  existingPaths,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolder: string;
  existingPaths: Set<string>;
  pending: boolean;
  onSubmit: (path: string) => void;
}) {
  useInterfaceLanguage();
  const [pathValue, setPathValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPathValue(currentFolder);
    setError(null);
  }, [currentFolder, open]);

  function submit() {
    const normalized = normalizeStudioPath(pathValue).replace(/\/+$/, "");
    if (!normalized) {
      setError("Folder path is required.");
      return;
    }
    const matchingFiles = [...existingPaths].filter((path) => path.startsWith(`${normalized}/`));
    if (matchingFiles.length === 0) {
      setError("No files exist under that folder.");
      return;
    }
    if (matchingFiles.includes("SKILL.md")) {
      setError("SKILL.md cannot be deleted.");
      return;
    }
    onSubmit(normalized);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{interfaceText("m_39f35f2d44d611")}</DialogTitle>
          <DialogDescription>{interfaceText("m_2055145168d120")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="skill-folder-delete">{interfaceText("m_98bca2fab915ab")}</Label>
          <Input
            id="skill-folder-delete"
            value={pathValue}
            onChange={(event) => {
              setPathValue(event.target.value);
              setError(null);
            }}
            placeholder="references/examples"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{interfaceText("m_19766ed6ccb2f4")}</Button>
          <Button variant="destructive" disabled={pending} onClick={submit}>{interfaceText("m_e2d0a54968ead2")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Middle — Inputs (path-foldered) + editor + save-as-input
// ---------------------------------------------------------------------------

function InputPane({
  companyId,
  skillId,
  inputs,
  loading,
  selectedInputId,
  adHocMode,
  adHocContent,
  onAdHocChange,
  onSelectInput,
  onSelectAdHoc,
}: {
  companyId: string;
  skillId: string;
  inputs: CompanySkillTestInput[];
  loading: boolean;
  selectedInputId: string | null;
  adHocMode: boolean;
  adHocContent: string;
  onAdHocChange: (value: string) => void;
  onSelectInput: (id: string) => void;
  onSelectAdHoc: () => void;
}) {
  useInterfaceLanguage();
  const queryClient = useQueryClient();
  const onError = useMutationErrorToast();
  // The row's menu closes on click, so its copy confirmation goes to a toast.
  const copyWithToast = useCopyToast();
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [savedInputDraft, setSavedInputDraft] = useState<SavedInputDraftState>(
    EMPTY_SAVED_INPUT_DRAFT_STATE,
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const selectedInput = inputs.find((i) => i.id === selectedInputId) ?? null;

  // In ad-hoc mode the editor is controlled by the shared shell state; otherwise
  // it edits a local copy of the selected saved input.
  const savedDraft = selectedSavedInputDraft(savedInputDraft, selectedInput);
  const draft = adHocMode ? adHocContent : savedDraft;
  const setDraft = adHocMode
    ? onAdHocChange
    : (value: string) => {
        setSavedInputDraft((previous) => ({
          inputId: selectedInput?.id ?? previous.inputId,
          draft: value,
          baselineContent: selectedInput?.content ?? previous.baselineContent,
        }));
      };

  useEffect(() => {
    if (adHocMode) return;
    setSavedInputDraft((previous) => syncSavedInputDraftState(previous, selectedInput));
  }, [adHocMode, selectedInput?.content, selectedInput?.id]);

  useEffect(() => {
    if (!loading && inputs.length === 0 && !adHocMode && !selectedInputId) {
      onSelectAdHoc();
    }
  }, [adHocMode, inputs.length, loading, onSelectAdHoc, selectedInputId]);

  const nameToId = useMemo(
    () => new Map(inputs.map((i) => [i.name, i.id])),
    [inputs],
  );
  const nodes: FileTreeNode[] = useMemo(
    () => buildFileTree(Object.fromEntries(inputs.map((i) => [i.name, i.content]))),
    [inputs],
  );
  const selectedName = selectedInput?.name ?? null;
  const dirty = !adHocMode && savedInputDraftDirty(savedInputDraft, selectedInput);
  const canSaveSelectedInput = Boolean(selectedInput && dirty && draft.trim());

  const confirmDiscardDirtyInput = useCallback(() => {
    if (!dirty) return true;
    return (
      typeof window === "undefined"
      || window.confirm("Discard unsaved changes to this input?")
    );
  }, [dirty]);

  const selectSavedInput = useCallback((id: string) => {
    if (!adHocMode && id === selectedInputId) return;
    if (!confirmDiscardDirtyInput()) return;
    onSelectInput(id);
  }, [adHocMode, confirmDiscardDirtyInput, onSelectInput, selectedInputId]);

  const selectAdHocInput = useCallback(() => {
    if (!adHocMode && !confirmDiscardDirtyInput()) return;
    onSelectAdHoc();
  }, [adHocMode, confirmDiscardDirtyInput, onSelectAdHoc]);

  const updateMutation = useMutation({
    mutationFn: (payload: { content: string }) =>
      companySkillsApi.updateTestInput(companyId, skillId, selectedInput!.id, payload),
    onSuccess: (updated) => {
      setSavedInputDraft({
        inputId: updated.id,
        draft: updated.content,
        baselineContent: updated.content,
      });
      queryClient.setQueryData<CompanySkillTestInput[]>(
        queryKeys.companySkills.testInputs(companyId, skillId),
        (current) => current?.map((input) => input.id === updated.id ? updated : input),
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.testInputs(companyId, skillId),
      });
    },
    onError: onError("Couldn't save input"),
  });
  const deleteMutation = useMutation({
    mutationFn: (inputId: string) => companySkillsApi.deleteTestInput(companyId, skillId, inputId),
    onSuccess: (deleted) => {
      if (deleted.id === selectedInputId) {
        onSelectAdHoc();
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.testInputs(companyId, skillId),
      });
    },
    onError: onError("Couldn't delete input"),
  });

  return (
    <PaneScaffold
      title={
        <span className="flex min-w-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={collapsed ? interfaceText("m_8999b91a9b7602") : interfaceText("m_55720f6ca31fc2")}
                onClick={() => setCollapsed((current) => !current)}
              >
                {collapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{collapsed ? interfaceText("m_8999b91a9b7602") : interfaceText("m_55720f6ca31fc2")}</TooltipContent>
          </Tooltip>
          <span>{interfaceText("m_36ecb4f8669133")}</span>
        </span>
      }
      action={
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={selectAdHocInput} aria-label={interfaceText("m_6ab4b7742a1a35")}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{interfaceText("m_6ab4b7742a1a35")}</TooltipContent>
          </Tooltip>
        </div>
      }
    >
      {collapsed ? (
        <button
          type="button"
          className="flex min-h-(--sz-32px) items-center gap-2 border-b border-border px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{interfaceText("m_32c15719fd6c49")}</span>
        </button>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {loading || inputs.length > 0 ? (
            <div className="max-h-(--sz-11_75rem) overflow-auto border-b border-border p-1">
              {loading ? (
                <div className="p-3 text-xs text-muted-foreground">{interfaceText("m_828e1062249418")}</div>
              ) : (
                <>
                  {adHocMode && (
                    <div className="flex items-center gap-2 rounded px-2 py-1.5 text-sm italic text-muted-foreground">
                      <FilePlus className="h-3.5 w-3.5" />{interfaceText("m_d846e3226476c5")}</div>
                  )}
                  <FileTree
                    nodes={nodes}
                    selectedFile={selectedName}
                    expandedDirs={expandedDirs}
                    onToggleDir={(path) =>
                      setExpandedDirs((prev) => {
                        const next = new Set(prev);
                        if (next.has(path)) next.delete(path);
                        else next.add(path);
                        return next;
                      })
                    }
                    onSelectFile={(name) => {
                      const id = nameToId.get(name);
                      if (id) selectSavedInput(id);
                    }}
                    showCheckboxes={false}
                    renderFileExtra={(node) => {
                      const id = nameToId.get(node.path);
                      if (!id) return null;
                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                              aria-label={interfaceText("m_4e92b974ba8e38", { value0: (node.name) })}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => {
                                const input = inputs.find((i) => i.id === id);
                                if (input) void copyWithToast(input.content, "Input content copied");
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />{interfaceText("m_bc0dd0bf192d98")}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />{interfaceText("m_3534d686f23a5b")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    }}
                    ariaLabel="Test inputs"
                  />
                </>
              )}
            </div>
          ) : null}
          <div className="flex min-h-0 flex-1">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={interfaceText("m_7be6c2fbad6fdd")}
              aria-label={interfaceText("m_b36f6be0a6f9ed")}
              className="min-h-0 flex-1 resize-none border-0 bg-transparent px-3 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 border-t border-border px-3 py-2">
            <div className="mr-auto flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">
                {selectedInput ? selectedInput.name : adHocMode ? interfaceText("m_6ab4b7742a1a35") : interfaceText("m_60e878f72164d4")}
              </span>
              {dirty ? <Badge variant="secondary">{interfaceText("m_6250d5725dda6d")}</Badge> : null}
            </div>
            {selectedInput && dirty ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={updateMutation.isPending}
                  onClick={() => setSavedInputDraft({
                    inputId: selectedInput.id,
                    draft: selectedInput.content,
                    baselineContent: selectedInput.content,
                  })}
                >{interfaceText("m_0026c505347863")}</Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canSaveSelectedInput || updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ content: draft })}
                >
                  {updateMutation.isPending ? interfaceText("m_dc85af8f2b1d0d") : interfaceText("m_dd0ae7a5cbcf23")}
                </Button>
              </>
            ) : null}
            <Button
              size="sm"
              disabled={!draft.trim()}
              onClick={() => setSaveDialogOpen(true)}
            >{interfaceText("m_32f0265144e0e1")}</Button>
          </div>
        </div>
      )}
      <SaveInputDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        companyId={companyId}
        skillId={skillId}
        initialContent={draft}
        onSaved={(input) => {
          setSaveDialogOpen(false);
          onSelectInput(input.id);
        }}
      />
    </PaneScaffold>
  );
}

function SaveInputDialog({
  open,
  onOpenChange,
  companyId,
  skillId,
  initialContent,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  skillId: string;
  initialContent: string;
  onSaved: (input: CompanySkillTestInput) => void;
}) {
  useInterfaceLanguage();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setName("");
    }
  }, [open, initialContent]);

  const createMutation = useMutation({
    mutationFn: () => companySkillsApi.createTestInput(companyId, skillId, { name: name.trim(), content }),
    onSuccess: (input) => {
      queryClient.setQueryData<CompanySkillTestInput[]>(
        queryKeys.companySkills.testInputs(companyId, skillId),
        (current) => {
          const withoutDuplicate = (current ?? []).filter((item) => item.id !== input.id);
          return [...withoutDuplicate, input].sort((a, b) =>
            a.name.localeCompare(b.name) || Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)),
          );
        },
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.testInputs(companyId, skillId),
      });
      onSaved(input);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{interfaceText("m_a94553cb633d28")}</DialogTitle>
          <DialogDescription>{interfaceText("m_66fb8b9b1165f7")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="input-name">{interfaceText("m_dcd1d5223f73b3")}</Label>
            <Input
              id="input-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="onboarding/happy-path"
            />
            <p className="text-xs text-muted-foreground">{interfaceText("m_51b6a98f49e450")}</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="input-content">{interfaceText("m_47bd29075f8b80")}</Label>
            <Textarea
              id="input-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-(--sz-160px)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{interfaceText("m_19766ed6ccb2f4")}</Button>
          <Button
            disabled={!name.trim() || !content.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >{interfaceText("m_1509f561f24165")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Right — agent picker + Run + history + detail
// ---------------------------------------------------------------------------

type RunTemplateDialogState =
  | { mode: "create"; source?: CompanySkillTestRunTemplate | null }
  | { mode: "edit"; source: CompanySkillTestRunTemplate }
  | null;

function RunsPane({
  companyId,
  skill,
  inputs,
  selectedInput,
  adHocMode,
  adHocContent,
  selectedRunId,
  onSelectRun,
  selectedAgentId,
  onSelectAgent,
  skillDirty,
  filterInput,
  onClearFilter,
}: {
  companyId: string;
  skill: CompanySkillDetail;
  inputs: CompanySkillTestInput[];
  selectedInput: CompanySkillTestInput | null;
  adHocMode: boolean;
  adHocContent: string;
  selectedRunId: string | null;
  onSelectRun: (id: string | null) => void;
  selectedAgentId: string | null;
  onSelectAgent: (id: string | null) => void;
  skillDirty: boolean;
  filterInput: CompanySkillTestInput | null;
  onClearFilter: () => void;
}) {
  const interfaceLanguage = useInterfaceLanguage();
  const skillId = skill.id;
  const queryClient = useQueryClient();
  const onError = useMutationErrorToast();
  const toast = useOptionalToastActions();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<RunTemplateSelection>(
    () => loadRunTemplateSelection(companyId),
  );
  const [templateDialog, setTemplateDialog] = useState<RunTemplateDialogState>(null);

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: Boolean(companyId),
  });
  const agents = agentsQuery.data ?? [];
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

  useEffect(() => {
    setSelectedTemplateId(loadRunTemplateSelection(companyId));
  }, [companyId]);

  const updateTemplateSelection = useCallback((selection: RunTemplateSelection) => {
    setSelectedTemplateId(selection);
    persistRunTemplateSelection(companyId, selection);
  }, [companyId]);

  const templatesQuery = useQuery({
    queryKey: queryKeys.companySkills.testRunTemplates(companyId),
    queryFn: () => companySkillsApi.testRunTemplates(companyId),
    enabled: Boolean(companyId),
  });
  const templates = templatesQuery.data ?? EMPTY_RUN_TEMPLATES;

  useEffect(() => {
    if (!templatesQuery.isSuccess) return;
    const resolution = resolveRunTemplateSelection(selectedTemplateId, templates);
    if (!resolution.recovered) return;
    updateTemplateSelection(resolution.selection);
    toast?.pushToast({
      tone: "warn",
      title: interfaceText("m_e086416755d82c"),
      body: interfaceText("m_1424acb9eb6ab6"),
      dedupeKey: `skill-studio-template-reset:${companyId}`,
    });
  }, [
    companyId,
    selectedTemplateId,
    templates,
    templatesQuery.isSuccess,
    toast,
    updateTemplateSelection,
  interfaceLanguage]);

  const filterInputId = filterInput?.id ?? null;
  const runsQuery = useQuery({
    queryKey: queryKeys.companySkills.testRuns(companyId, skillId, filterInputId),
    queryFn: () =>
      companySkillsApi.testRuns(companyId, skillId, filterInputId ? { inputId: filterInputId } : {}),
    enabled: Boolean(companyId && skillId),
    refetchInterval: (query) => {
      const data = query.state.data as CompanySkillTestRun[] | undefined;
      return data?.some((r) => shouldPollRun(r.status)) ? POLL_MS : false;
    },
  });
  const runs = runsQuery.data ?? [];

  const hasInput = adHocMode ? adHocContent.trim().length > 0 : Boolean(selectedInput?.content.trim());
  const gate = evaluateRunGate({
    hasAgent: Boolean(selectedAgent),
    hasInput,
    skillFileCount: skill.fileInventory.length,
    hasUnsavedSkillEdits: skillDirty,
  });
  const templateGateReason = templatesQuery.isLoading
    ? "Loading run templates"
    : templatesQuery.isError
      ? "Run templates couldn't load"
      : null;

  const createTemplateMutation = useMutation({
    mutationFn: (payload: CompanySkillTestRunTemplateCreateRequest) =>
      companySkillsApi.createTestRunTemplate(companyId, payload),
    onSuccess: (template) => {
      setTemplateDialog(null);
      updateTemplateSelection(template.id);
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.testRunTemplates(companyId),
      });
      toast?.pushToast({
        tone: "success",
        title: interfaceText("m_1b34f8ff69d42e"),
        body: interfaceText("m_3c2ced3c0e92ab", { value0: (template.name) }),
      });
    },
    onError: onError("Couldn't save template"),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ templateId, payload }: {
      templateId: string;
      payload: CompanySkillTestRunTemplateUpdateRequest;
    }) => companySkillsApi.updateTestRunTemplate(companyId, templateId, payload),
    onSuccess: (template) => {
      setTemplateDialog(null);
      updateTemplateSelection(template.id);
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.testRunTemplates(companyId),
      });
      toast?.pushToast({
        tone: "success",
        title: interfaceText("m_cc9213d2617d81"),
        body: interfaceText("m_3c2ced3c0e92ab", { value0: (template.name) }),
      });
    },
    onError: onError("Couldn't update template"),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) => companySkillsApi.deleteTestRunTemplate(companyId, templateId),
    onSuccess: (template) => {
      const fallback = resolveRunTemplateSelection(selectedTemplateId, templates.filter((entry) => entry.id !== template.id));
      if (selectedTemplateId === template.id || fallback.recovered) {
        updateTemplateSelection(fallback.selection);
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.testRunTemplates(companyId),
      });
      toast?.pushToast({
        tone: "success",
        title: interfaceText("m_8fa9d4a8b8272f"),
        body: interfaceText("m_07cd2cd24204be", { value0: (template.name) }),
      });
    },
    onError: onError("Couldn't delete template"),
  });

  const selectedTemplate = selectedTemplateId === null
    ? null
    : templates.find((template) => template.id === selectedTemplateId) ?? null;
  const selectedTemplateName = selectedTemplateId === null
    ? "No template"
    : selectedTemplate?.name ?? "Default test template";
  const runDisabledReason = gate.reason ?? templateGateReason;

  const createRunMutation = useMutation({
    mutationFn: () => {
      if (!templatesQuery.isSuccess) {
        throw new Error(templateGateReason ?? "Run templates are not ready.");
      }
      const resolution = resolveRunTemplateSelection(selectedTemplateId, templates);
      if (resolution.recovered) {
        updateTemplateSelection(resolution.selection);
        throw new Error("Selected run template is no longer available. The selection was reset.");
      }
      return companySkillsApi.createTestRun(companyId, skillId, buildCreateRunRequest({
        agentId: selectedAgentId!,
        inputId: adHocMode ? null : selectedInput?.id ?? null,
        content: adHocMode ? adHocContent : selectedInput ? null : adHocContent,
        templateId: resolution.selection,
      }));
    },
    onSuccess: (run) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.testRuns(companyId, skillId, filterInputId),
      });
      onSelectRun(run.id);
    },
    onError: onError("Couldn't start run"),
  });

  if (selectedRunId) {
    return (
      <RunDetailView
        companyId={companyId}
        skill={skill}
        runId={selectedRunId}
        agents={agents}
        onBack={() => onSelectRun(null)}
        onSelectRun={onSelectRun}
      />
    );
  }

  return (
    <PaneScaffold
      title={interfaceText("m_70b86f32d7b06f")}
      action={
        <div className="flex items-center gap-2">
          <AgentPicker
            agents={agents}
            selectedAgent={selectedAgent}
            onSelect={onSelectAgent}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              {/* span wrapper keeps the tooltip reachable while the button is disabled */}
              <span>
                <Button
                  size="sm"
                  disabled={gate.disabled || Boolean(templateGateReason) || createRunMutation.isPending}
                  onClick={() => createRunMutation.mutate()}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />{interfaceText("m_f2ccba5f900cb1")}</Button>
              </span>
            </TooltipTrigger>
            {runDisabledReason && <TooltipContent side="bottom">{runDisabledReason}</TooltipContent>}
          </Tooltip>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <RunTemplateAdvancedPanel
          open={advancedOpen}
          onOpenChange={setAdvancedOpen}
          templates={templates}
          templatesLoading={templatesQuery.isLoading}
          templatesError={templatesQuery.isError}
          selectedTemplateId={selectedTemplateId}
          selectedTemplate={selectedTemplate}
          selectedTemplateName={selectedTemplateName}
          onSelectTemplate={updateTemplateSelection}
          onCreateTemplate={() => setTemplateDialog({ mode: "create" })}
          onEditTemplate={(template) => setTemplateDialog({ mode: "edit", source: template })}
          onDuplicateTemplate={(template) => setTemplateDialog({ mode: "create", source: template })}
          onDeleteTemplate={(template) => {
            if (
              typeof window !== "undefined"
              && !window.confirm(`Delete run template "${template.name}"?`)
            ) {
              return;
            }
            deleteTemplateMutation.mutate(template.id);
          }}
          deletingTemplateId={deleteTemplateMutation.variables ?? null}
          actionPending={
            createTemplateMutation.isPending
            || updateTemplateMutation.isPending
            || deleteTemplateMutation.isPending
          }
        />
        {filterInput && (
          <div className="px-3 pt-2">
            <FilterBar
              filters={[{ key: "input", label: interfaceText("m_36ecb4f8669133"), value: filterInput.name }]}
              onRemove={onClearFilter}
              onClear={onClearFilter}
            />
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {runsQuery.isLoading ? (
            <div className="text-xs text-muted-foreground">{interfaceText("m_8438ea394d1520")}</div>
          ) : runs.length === 0 ? (
            <EmptyState icon={FlaskConical} message={interfaceText("m_b255891684153e")} />
          ) : (
            <div className="space-y-1 rounded-md border border-border p-1">
              {runs.map((run) => (
                <RunHistoryRow
                  key={run.id}
                  run={run}
                  agents={agents}
                  onSelect={() => onSelectRun(run.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <RunTemplateDialog
        state={templateDialog}
        pending={createTemplateMutation.isPending || updateTemplateMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setTemplateDialog(null);
        }}
        onSubmit={(payload) => {
          if (templateDialog?.mode === "edit") {
            updateTemplateMutation.mutate({ templateId: templateDialog.source.id, payload });
          } else {
            createTemplateMutation.mutate(payload);
          }
        }}
      />
    </PaneScaffold>
  );
}

type RunTemplateOption = SearchableSelectOption<string> & {
  description: string | null;
  builtIn: boolean;
};

function runTemplateOptionValue(selection: RunTemplateSelection) {
  return selection ?? NO_TEST_RUN_TEMPLATE_STORAGE_VALUE;
}

function runTemplateSelectionFromOption(value: string): RunTemplateSelection {
  return value === NO_TEST_RUN_TEMPLATE_STORAGE_VALUE ? null : value;
}

function RunTemplateAdvancedPanel({
  open,
  onOpenChange,
  templates,
  templatesLoading,
  templatesError,
  selectedTemplateId,
  selectedTemplate,
  selectedTemplateName,
  onSelectTemplate,
  onCreateTemplate,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  deletingTemplateId,
  actionPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: CompanySkillTestRunTemplate[];
  templatesLoading: boolean;
  templatesError: boolean;
  selectedTemplateId: RunTemplateSelection;
  selectedTemplate: CompanySkillTestRunTemplate | null;
  selectedTemplateName: string;
  onSelectTemplate: (selection: RunTemplateSelection) => void;
  onCreateTemplate: () => void;
  onEditTemplate: (template: CompanySkillTestRunTemplate) => void;
  onDuplicateTemplate: (template: CompanySkillTestRunTemplate) => void;
  onDeleteTemplate: (template: CompanySkillTestRunTemplate) => void;
  deletingTemplateId: string | null;
  actionPending: boolean;
}) {
  const interfaceLanguage = useInterfaceLanguage();
  const templateGroups = useMemo<readonly SearchableSelectGroup<string, RunTemplateOption>[]>(() => {
    const noTemplateOption: RunTemplateOption = {
      key: "no-template",
      value: NO_TEST_RUN_TEMPLATE_STORAGE_VALUE,
      label: interfaceText("m_46b57ee92f038c"),
      title: "No template",
      description: "Run only the input text.",
      builtIn: true,
      searchText: "no template plain input",
    };
    const toOption = (template: CompanySkillTestRunTemplate): RunTemplateOption => ({
      key: template.id,
      value: template.id,
      label: template.name,
      title: template.name,
      description: template.description,
      builtIn: template.builtIn,
      searchText: [template.name, template.description ?? "", template.builtIn ? "built in" : "custom"].join(" "),
    });
    const builtIn = templates.filter((template) => template.builtIn).map(toOption);
    const custom = templates.filter((template) => !template.builtIn).map(toOption);
    return [
      { id: "built-in", label: interfaceText("m_78a6a8fe9be5ec"), options: [noTemplateOption, ...builtIn] },
      ...(custom.length > 0 ? [{ id: "custom", label: interfaceText("m_494ca78f7374e4"), options: custom }] : []),
    ];
  }, [templates, interfaceLanguage]);

  const selectedValue = runTemplateOptionValue(selectedTemplateId);
  const selectedMissing = selectedTemplateId !== null && !selectedTemplate && !templatesLoading;
  const canEdit = Boolean(selectedTemplate && !selectedTemplate.builtIn);
  const canDuplicate = Boolean(selectedTemplate);
  const canDelete = Boolean(selectedTemplate && !selectedTemplate.builtIn);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        className="flex min-h-(--sz-32px) w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={() => onOpenChange(!open)}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span className="font-semibold uppercase tracking-wide">{interfaceText("m_9f088dbebd6c3c")}</span>
        <span className="ml-auto truncate">{selectedTemplateName}</span>
      </button>
      {open ? (
        <div className="space-y-3 px-3 pb-3 pt-1">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Label>{interfaceText("m_b940a3fbe1da59")}</Label>
              <SearchableSelect<string, RunTemplateOption>
                value={selectedValue}
                groups={templateGroups}
                loading={templatesLoading}
                disabled={templatesLoading || templatesError}
                loadingMessage="Loading templates..."
                placeholder={interfaceText("m_8e56330b72291e")}
                searchPlaceholder={interfaceText("m_79760c54dcedf9")}
                emptyMessage={interfaceText("m_1c9dddadddb3b9")}
                contentClassName="w-(--sz-320px)"
                onValueChange={(value) => onSelectTemplate(runTemplateSelectionFromOption(value))}
                renderValue={(option) => option?.label ?? selectedTemplateName}
                renderOption={(option, { selected }) => (
                  <span className="flex min-w-0 flex-col">
                    <span className={cn("truncate", selected && "font-medium")}>{option.label}</span>
                    <span className="truncate text-(length:--text-micro) text-muted-foreground">
                      {option.description ?? (option.builtIn ? interfaceText("m_78a6a8fe9be5ec") : interfaceText("m_494ca78f7374e4"))}
                    </span>
                  </span>
                )}
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={interfaceText("m_1306b1ea628075")}
                  disabled={actionPending}
                  onClick={onCreateTemplate}
                >
                  <Plus />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{interfaceText("m_1306b1ea628075")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={interfaceText("m_2842f471425cfe")}
                    disabled={!canEdit || actionPending}
                    onClick={() => selectedTemplate && onEditTemplate(selectedTemplate)}
                  >
                    <Pencil />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{interfaceText("m_72b92d094d8b17")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={interfaceText("m_d75ef08f8c129a")}
                    disabled={!canDuplicate || actionPending}
                    onClick={() => selectedTemplate && onDuplicateTemplate(selectedTemplate)}
                  >
                    <Copy />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {selectedTemplate?.builtIn ? interfaceText("m_4b61c8e828540d") : interfaceText("m_b876040a89849e")}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={interfaceText("m_de584e70409231")}
                    className="text-destructive hover:text-destructive"
                    disabled={!canDelete || actionPending || deletingTemplateId === selectedTemplate?.id}
                    onClick={() => selectedTemplate && onDeleteTemplate(selectedTemplate)}
                  >
                    <Trash2 />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{interfaceText("m_08edc0924dda0d")}</TooltipContent>
            </Tooltip>
          </div>

          {templatesError ? (
            <p className="text-xs text-destructive">{interfaceText("m_b698b60fe284ee")}</p>
          ) : selectedTemplateId === null ? (
            <p className="text-xs text-muted-foreground">{interfaceText("m_dcda7d05f46bd4")}</p>
          ) : selectedMissing ? (
            <p className="text-xs text-destructive">{interfaceText("m_3fb121a0db47f7")}</p>
          ) : selectedTemplate ? (
            <div className="space-y-2">
              {selectedTemplate.description ? (
                <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
              ) : null}
              <pre className="max-h-(--sz-240px) overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                {selectedTemplate.body}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{interfaceText("m_f687834dd2b9e0")}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RunTemplateDialog({
  state,
  pending,
  onOpenChange,
  onSubmit,
}: {
  state: RunTemplateDialogState;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CompanySkillTestRunTemplateCreateRequest) => void;
}) {
  useInterfaceLanguage();
  const source = state?.source ?? null;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!state) return;
    setName(state.mode === "edit" ? source?.name ?? "" : source ? `${source.name} copy` : "");
    setDescription(source?.description ?? "");
    setBody(source?.body ?? "");
  }, [source, state]);

  const title = state?.mode === "edit"
    ? interfaceText("m_2842f471425cfe")
    : source?.builtIn
      ? interfaceText("m_4b61c8e828540d")
      : interfaceText("m_1306b1ea628075");
  const descriptionText = state?.mode === "edit"
    ? interfaceText("m_430b00cb0527f7")
    : interfaceText("m_1cda952937ad5f");

  return (
    <Dialog open={Boolean(state)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="run-template-name">{interfaceText("m_dcd1d5223f73b3")}</Label>
            <Input
              id="run-template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={interfaceText("m_791d5c0fcd15c6")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="run-template-description">{interfaceText("m_526e0087cc3f25")}</Label>
            <Input
              id="run-template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={interfaceText("m_d03d6192cf93d6")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="run-template-body">{interfaceText("m_6ccaa6415b5ee4")}</Label>
            <Textarea
              id="run-template-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-(--sz-240px) font-mono text-xs leading-5"
            />
            <p className="text-xs text-muted-foreground">{interfaceText("m_ccb432e691e328")}{"{{skillName}}"}, {"{{skillKey}}"}, {"{{skillInvocation}}"}, {"{{skillVersion}}"}, {"{{runId}}"}, {"{{issueId}}"}, {"{{outputDocumentKey}}"}.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>{interfaceText("m_19766ed6ccb2f4")}</Button>
          <Button
            disabled={!name.trim() || !body.trim() || pending}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                description: description.trim() || null,
                body,
              })
            }
          >
            {pending ? interfaceText("m_dc85af8f2b1d0d") : interfaceText("m_47f72a2f3e91d3")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RunHistoryRow({
  run,
  agents,
  onSelect,
}: {
  run: CompanySkillTestRun;
  agents: Agent[];
  onSelect: () => void;
}) {
  useInterfaceLanguage();
  const agent = agents.find((a) => a.id === run.agentId) ?? null;
  const removed = !agent;
  const snapshotName =
    (run.agentConfigSnapshot?.name as string | undefined) ?? "Agent";
  const name = agent?.name ?? snapshotName;
  return (
    <EntityRow
      leading={<StatusBadge status={runBadgeStatus(run.status)} />}
      identifier={runShortId(run)}
      title={removed ? interfaceText("m_7963cb2860b2e6", { value0: (name) }) : name}
      subtitle={relativeTime(run.createdAt)}
      trailing={
        <span className="font-mono text-xs text-muted-foreground">
          {formatCents(run.cost.costCents)}
        </span>
      }
      onClick={onSelect}
    />
  );
}

function AgentPicker({
  agents,
  selectedAgent,
  onSelect,
}: {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelect: (id: string) => void;
}) {
  useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {selectedAgent ? (
            <AgentIdentity agent={selectedAgent} size="xs" />
          ) : (
            <span className="text-muted-foreground">{interfaceText("m_012c15d65531b0")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <Command>
          <CommandInput placeholder={interfaceText("m_e05cb78e973da3")} />
          <CommandList>
            <CommandEmpty>{interfaceText("m_04e3179bbc03e7")}</CommandEmpty>
            <CommandGroup>
              {agents.map((agent) => {
                const selectable = isAgentSelectable(agent);
                return (
                  <CommandItem
                    key={agent.id}
                    value={agent.name}
                    disabled={!selectable}
                    onSelect={() => {
                      if (!selectable) return;
                      onSelect(agent.id);
                      setOpen(false);
                    }}
                    className={cn("flex items-center gap-2", !selectable && "opacity-50")}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        selectable ? "bg-green-500" : "bg-orange-400",
                      )}
                      aria-hidden
                    />
                    <AgentIdentity agent={agent} size="xs" />
                    {!selectable && (
                      <Badge variant="secondary" className="ml-auto">{interfaceText("m_e159b06187d369")}</Badge>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Run detail
// ---------------------------------------------------------------------------

function RunDetailView({
  companyId,
  skill,
  runId,
  agents,
  onBack,
  onSelectRun,
}: {
  companyId: string;
  skill: CompanySkillDetail;
  runId: string;
  agents: Agent[];
  onBack: () => void;
  onSelectRun: (id: string | null) => void;
}) {
  useInterfaceLanguage();
  const skillId = skill.id;
  const queryClient = useQueryClient();
  const onError = useMutationErrorToast();
  const detailQuery = useQuery({
    queryKey: queryKeys.companySkills.testRunDetail(companyId, skillId, runId),
    queryFn: () => companySkillsApi.testRunDetail(companyId, skillId, runId),
    enabled: Boolean(companyId && skillId && runId),
    refetchInterval: (query) => {
      const data = query.state.data as CompanySkillTestRunDetail | undefined;
      return data && shouldPollRun(data.status) ? POLL_MS : false;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => companySkillsApi.cancelTestRun(companyId, skillId, runId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.companySkills.testRunDetail(companyId, skillId, runId),
      }),
    onError: onError("Couldn't cancel run"),
  });

  // Re-run reproduces the VIEWED run's snapshots — pinned skill version, saved
  // input (or the ad-hoc snapshot), and agent — rather than whatever the picker
  // happens to hold this session (PAP-13001 Bug A). Reading detailQuery.data at
  // mutate() time keeps the hook order stable across the loading guards below.
  const reRunMutation = useMutation({
    mutationFn: () => {
      const d = detailQuery.data;
      if (!d) throw new Error("Run details are still loading.");
      return companySkillsApi.createTestRun(companyId, skillId, buildReRunRequest(d));
    },
    onSuccess: (run) => {
      queryClient.invalidateQueries({
        queryKey: ["company-skills", companyId, skillId, "test-runs"],
      });
      onSelectRun(run.id);
    },
    onError: onError("Couldn't re-run"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => companySkillsApi.deleteTestRun(companyId, skillId, runId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["company-skills", companyId, skillId, "test-runs"],
      });
      onSelectRun(null);
    },
    onError: onError("Couldn't delete run"),
  });

  const detail = detailQuery.data ?? null;
  const additionalDocuments = useMemo(() => detail ? getRunAdditionalDocuments(detail) : [], [detail]);
  const rawAttachments = useMemo(() => detail ? getRunRawAttachments(detail) : [], [detail]);
  const unavailableCopy = useMemo(() => detail ? runHarnessUnavailableCopy(detail) : null, [detail]);
  const mediaGalleryItems = useMemo<GalleryMediaItem[]>(
    () => detail ? getRunMediaGalleryItems(detail) : [],
    [detail],
  );
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  if (detailQuery.isLoading) {
    return (
      <PaneScaffold title={interfaceText("m_00d60e31a4e6b8")} action={<BackButton onBack={onBack} />}>
        <div className="p-3 text-xs text-muted-foreground">{interfaceText("m_ad8b3027693b85")}</div>
      </PaneScaffold>
    );
  }
  if (!detail) {
    return (
      <PaneScaffold title={interfaceText("m_00d60e31a4e6b8")} action={<BackButton onBack={onBack} />}>
        <div className="p-3 text-xs text-muted-foreground">{interfaceText("m_3e498fa2dc954e")}</div>
      </PaneScaffold>
    );
  }

  const agent = agents.find((a) => a.id === detail.agentId) ?? null;
  const agentName =
    agent?.name ?? (detail.agentConfigSnapshot?.name as string | undefined) ?? "Agent";
  const removed = !agent;
  const outputMode = runOutputMode(detail);
  const nonTerminal = !isTerminalRunStatus(detail.status);
  const taskLink = testTaskLinkState(detail);

  return (
    <PaneScaffold title={interfaceText("m_00d60e31a4e6b8")} action={<BackButton onBack={onBack} />}>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={runBadgeStatus(detail.status)} />
          <AgentIdentity agent={agent ?? { id: detail.agentId, name: agentName }} size="xs" />
          {removed && <Badge variant="secondary">{interfaceText("m_e1f79758cc42e6")}</Badge>}
          <span className="font-mono text-xs text-muted-foreground">
            v{detail.skillVersion.revisionNumber}
          </span>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {formatCents(detail.cost.costCents)}
          </span>
        </div>

        {/* snapshot property block */}
        <div className="rounded-md border border-border text-xs">
          <PropRow label={interfaceText("m_36ecb4f8669133")} value={detail.inputId ? "saved input" : "ad-hoc paste"} />
          <PropRow label={interfaceText("m_0575f29df888a2")} value={detail.templateName ?? "No template"} />
          <PropRow label={interfaceText("m_4ba072982170df")} value={`v${detail.skillVersion.revisionNumber}`} />
          <PropRow label={interfaceText("m_d70b9e24bca26b")} value={relativeTime(detail.createdAt)} />
        </div>

        {showRunErrorCard(detail.status) && (
          <Card className="border-destructive/50">
            <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-sm font-medium">{interfaceText("m_97fddf2d43e8df")}</span>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {detail.error ?? interfaceText("m_5c8600f3387cd3")}
            </CardContent>
          </Card>
        )}

        {/* Output snapshot / draft-at-failure */}
        {outputMode === "output" || outputMode === "draft" ? (
          <section className="space-y-2">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {outputMode === "draft" ? interfaceText("m_39d035d4476ea4") : interfaceText("m_1a9c81c2637dd3")}
            </h3>
            <div className="rounded-md border border-border p-3">
              <MarkdownBody>{detail.outputBody || interfaceText("m_f136184631ca6d")}</MarkdownBody>
            </div>
          </section>
        ) : outputMode === "pending" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />{interfaceText("m_96a2a81582fcaf")}</div>
        ) : null}

        {unavailableCopy ? (
          <RunHarnessUnavailableNotice copy={unavailableCopy} />
        ) : null}

        {additionalDocuments.length > 0 ? (
          <RunDocumentsSection documents={additionalDocuments} />
        ) : null}

        <IssueOutputSection
          workProducts={detail.harnessContent.workProducts}
          onMediaClick={(item) => {
            const meta = item.metadata;
            if (!meta) return;
            const idx = mediaGalleryItems.findIndex((galleryItem) => (
              galleryItem.contentPath === meta.contentPath ||
              galleryItem.id === `work-product-${item.id}` ||
              galleryItem.id === meta.attachmentId
            ));
            setGalleryIndex(idx >= 0 ? idx : 0);
            setGalleryOpen(true);
          }}
        />

        {rawAttachments.length > 0 ? (
          <IssueAttachmentsSection
            attachments={rawAttachments}
            onImageClick={(attachment) => {
              const idx = mediaGalleryItems.findIndex((item) => (
                item.id === attachment.id || item.contentPath === attachment.contentPath
              ));
              setGalleryIndex(idx >= 0 ? idx : 0);
              setGalleryOpen(true);
            }}
          />
        ) : null}

        {/* Interactions */}
        <InteractionSection
          companyId={companyId}
          detail={detail}
          agents={agents}
          onAnswered={() =>
            queryClient.invalidateQueries({
              queryKey: queryKeys.companySkills.testRunDetail(companyId, skillId, runId),
            })
          }
        />

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            disabled={reRunMutation.isPending}
            onClick={() => reRunMutation.mutate()}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />{interfaceText("m_1e642a49050c06")}</Button>
          {nonTerminal ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >{interfaceText("m_19766ed6ccb2f4")}</Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />{interfaceText("m_3534d686f23a5b")}</Button>
          )}
          {taskLink.enabled && detail.harnessIssue ? (
            <Button variant="link" size="sm" asChild>
              <Link to={`/issues/${detail.harnessIssue.id}`}>{interfaceText("m_0c16eec1cfdd39")}</Link>
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-not-allowed text-xs text-muted-foreground">{interfaceText("m_0c16eec1cfdd39")}</span>
              </TooltipTrigger>
              <TooltipContent>{taskLink.reason}</TooltipContent>
            </Tooltip>
          )}
        </div>

        <ImageGalleryModal
          items={mediaGalleryItems}
          initialIndex={galleryIndex}
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
        />
      </div>
    </PaneScaffold>
  );
}

function RunHarnessUnavailableNotice({
  copy,
}: {
  copy: NonNullable<ReturnType<typeof runHarnessUnavailableCopy>>;
}) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-foreground">{copy.title}</p>
        <p className="text-muted-foreground">{copy.body}</p>
      </div>
    </div>
  );
}

function RunDocumentsSection({ documents }: { documents: IssueDocument[] }) {
  useInterfaceLanguage();
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-medium text-muted-foreground">{interfaceText("m_b4e929d8bcfe04")}</h3>
        <span className="text-xs text-muted-foreground">{documents.length}</span>
      </div>
      <div className="space-y-2">
        {documents.map((document) => (
          <article key={document.id} className="rounded-md border border-border p-3">
            <div className="mb-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate font-medium text-foreground">
                {document.title ?? document.key}
              </span>
              <span className="ml-auto shrink-0">{relativeTime(document.updatedAt)}</span>
            </div>
            <MarkdownBody className="paperclip-edit-in-place-content text-sm leading-7" softBreaks={false}>
              {document.body}
            </MarkdownBody>
          </article>
        ))}
      </div>
    </section>
  );
}

function InteractionSection({
  companyId,
  detail,
  agents,
  onAnswered,
}: {
  companyId: string;
  detail: CompanySkillTestRunDetail;
  agents: Agent[];
  onAnswered: () => void;
}) {
  useInterfaceLanguage();
  const harnessIssueId = detail.harnessIssue?.id ?? null;
  const hasInlineAnswerable = detail.interactions.some((i) => isInteractionAnswerable(i));

  // Only fetch the full interaction objects (needed to render answerable cards)
  // when there is at least one pending inline interaction on a live harness issue.
  const fullQuery = useQuery({
    queryKey: ["skill-studio", "interactions", harnessIssueId],
    queryFn: () => issuesApi.listInteractions(harnessIssueId!),
    enabled: Boolean(harnessIssueId && hasInlineAnswerable),
    refetchInterval: (query) => interactionReadinessRefetchInterval(query.state.data, hasInlineAnswerable ? POLL_MS : false),
  });
  const fullById = useMemo(
    () => new Map((fullQuery.data ?? []).map((i) => [i.id, i])),
    [fullQuery.data],
  );
  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);

  const accept = useMutation({
    mutationFn: (vars: { interaction: IssueThreadInteraction; optionIds?: string[] }) =>
      issuesApi.acceptInteraction(harnessIssueId!, vars.interaction.id, {
        selectedOptionIds: vars.optionIds,
      }),
    onSuccess: onAnswered,
  });
  const respond = useMutation({
    mutationFn: (vars: { interaction: AskUserQuestionsInteraction; answers: AskUserQuestionsAnswer[] }) =>
      issuesApi.respondToInteraction(harnessIssueId!, vars.interaction.id, { answers: vars.answers }),
    onSuccess: onAnswered,
  });
  const reject = useMutation({
    mutationFn: (vars: { interaction: IssueThreadInteraction; reason?: string }) =>
      issuesApi.rejectInteraction(harnessIssueId!, vars.interaction.id, vars.reason),
    onSuccess: onAnswered,
  });

  if (detail.interactions.length === 0) return null;

  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{interfaceText("m_9089e4b79eb7fd")}</h3>
      <div className="space-y-2">
        {detail.interactions.map((summary) => {
          const inline = routeInteraction(summary.kind) === "inline";
          const full = fullById.get(summary.id);
          if (inline && full) {
            return (
              <IssueThreadInteractionCard
                key={summary.id}
                interaction={full}
                agentMap={agentMap}
                onAcceptInteraction={async (interaction, _keys, optionIds) => {
                  await accept.mutateAsync({ interaction, optionIds });
                }}
                onRejectInteraction={async (interaction, reason) => {
                  await reject.mutateAsync({ interaction, reason });
                }}
                onSubmitInteractionAnswers={async (interaction, answers) => {
                  await respond.mutateAsync({ interaction, answers });
                }}
              />
            );
          }
          // Fallback: summary row + open-test-task link (never dropped).
          return (
            <EntityRow
              key={summary.id}
              title={summary.title}
              subtitle={`${summary.kind} · ${summary.status}`}
              trailing={
                harnessIssueId ? (
                  <Button variant="link" size="xs" asChild>
                    <Link to={`/issues/${harnessIssueId}`}>{interfaceText("m_0c16eec1cfdd39")}</Link>
                  </Button>
                ) : null
              }
            />
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Version history drawer
// ---------------------------------------------------------------------------

function VersionHistorySheet({
  open,
  onOpenChange,
  companyId,
  skill,
  onRestored,
  onFilterRuns,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  skill: CompanySkillDetail;
  onRestored: () => void;
  onFilterRuns: (inputId: string) => void;
}) {
  useInterfaceLanguage();
  const skillId = skill.id;
  const queryClient = useQueryClient();
  const versionsQuery = useQuery({
    queryKey: queryKeys.companySkills.versions(companyId, skillId),
    queryFn: () => companySkillsApi.versions(companyId, skillId),
    enabled: open && Boolean(companyId && skillId),
  });
  const versions = versionsQuery.data ?? [];
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  const restore = useMutation({
    mutationFn: async (selection: { id: string }) => {
      if (skill.sourceType === "local_path") {
        const version = await companySkillsApi.version(companyId, skillId, selection.id);
        let expectedVersionId = skill.currentVersionId;
        for (const file of version.fileInventory) {
          const saved = await companySkillsApi.updateFile(companyId, skillId, file.path, file.content, {
            encoding: file.encoding, executable: file.executable ?? false, expectedVersionId,
          });
          expectedVersionId = saved.versionId ?? expectedVersionId;
        }
        return companySkillsApi.createVersion(companyId, skillId, {
          label: `Restore of v${version.revisionNumber}`, expectedVersionId,
        });
      }
      return companySkillsApi.createVersion(companyId, skillId, {
        sourceVersionId: selection.id, expectedVersionId: skill.currentVersionId,
        label: interfaceText("m_1cc10a9adc31eb"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companySkills.versions(companyId, skillId) });
      onRestored();
    },
  });

  const leftQuery = useQuery({
    queryKey: [...queryKeys.companySkills.versions(companyId, skillId), leftId],
    queryFn: () => companySkillsApi.version(companyId, skillId, leftId!),
    enabled: open && Boolean(leftId && rightId),
  });
  const rightQuery = useQuery({
    queryKey: [...queryKeys.companySkills.versions(companyId, skillId), rightId],
    queryFn: () => companySkillsApi.version(companyId, skillId, rightId!),
    enabled: open && Boolean(leftId && rightId),
  });
  const left = leftQuery.data ?? null;
  const right = rightQuery.data ?? null;
  const diff = left && right ? buildLineDiff(
    left.fileInventory.map((f) => `# ${f.path}${f.executable ? " (executable)" : ""}\n${f.encoding === "base64" ? "[Binary asset]" : f.content}`).join("\n\n"),
    right.fileInventory.map((f) => `# ${f.path}${f.executable ? " (executable)" : ""}\n${f.encoding === "base64" ? "[Binary asset]" : f.content}`).join("\n\n"),
  ) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-(--sz-560px)">
        <SheetHeader>
          <SheetTitle>{interfaceText("m_a6df11e706c514")}</SheetTitle>
        </SheetHeader>
        <div className="mt-3 space-y-2 overflow-auto">
          {versionsQuery.isLoading ? (
            <div className="text-xs text-muted-foreground">{interfaceText("m_9780e2c99c1b82")}</div>
          ) : versions.length === 0 ? (
            <EmptyState icon={History} message={interfaceText("m_1fba7c480a664b")} />
          ) : (
            <div className="space-y-1 rounded-md border border-border p-1">
              {versions.map((v) => (
                <EntityRow
                  key={v.id}
                  identifier={`v${v.revisionNumber}`}
                  title={v.label ?? interfaceText("m_15217bc76da070", { value0: (v.revisionNumber) })}
                  subtitle={relativeTime(v.createdAt)}
                  selected={v.id === leftId || v.id === rightId}
                  onClick={() => {
                    // click to build a two-version diff selection
                    if (!leftId) setLeftId(v.id);
                    else if (!rightId && v.id !== leftId) setRightId(v.id);
                    else {
                      setLeftId(v.id);
                      setRightId(null);
                    }
                  }}
                  trailing={
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={restore.isPending || skill.editable === false}
                      onClick={(e) => {
                        e.stopPropagation();
                        restore.mutate(v);
                      }}
                    >{interfaceText("m_4944ba4460502f")}{(skill.currentVersion?.revisionNumber ?? v.revisionNumber) + 1}
                    </Button>
                  }
                />
              ))}
            </div>
          )}
          {(versionsQuery.error || leftQuery.error || rightQuery.error || restore.error) && (
            <p role="alert" className="text-sm text-destructive">
              {(versionsQuery.error ?? leftQuery.error ?? rightQuery.error ?? restore.error)?.message}
            </p>
          )}
          {leftId && rightId && (leftQuery.isLoading || rightQuery.isLoading) && (
            <p className="text-sm text-muted-foreground">{interfaceText("m_942d2c9b28081a")}</p>
          )}
          {diff && (
            <div className="rounded-md border border-border">
              <div className="border-b border-border px-3 py-1.5 text-xs text-muted-foreground">{interfaceText("m_97888195a596c4")}{left?.revisionNumber} → v{right?.revisionNumber}
              </div>
              <pre className="max-h-64 overflow-auto p-2 text-xs">
                {diff.map((row, i) => (
                  <div
                    key={i}
                    className={cn(
                      "whitespace-pre-wrap",
                      row.kind === "added" && "bg-green-500/10 text-green-700 dark:text-green-300",
                      row.kind === "removed" && "bg-red-500/10 text-red-700 dark:text-red-300",
                    )}
                  >
                    {row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " "}
                    {row.text}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function PaneScaffold({
  title,
  action,
  children,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {action}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  useInterfaceLanguage();
  return (
    <Button variant="ghost" size="sm" onClick={onBack}>
      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />{interfaceText("m_709d9085c264e6")}</Button>
  );
}

function MobileTabs({
  skill,
  input,
  runs,
}: {
  skill: React.ReactNode;
  input: React.ReactNode;
  runs: React.ReactNode;
}) {
  useInterfaceLanguage();
  return (
    <Tabs defaultValue="skill" className="flex flex-1 flex-col">
      <TabsList variant="line" className="px-3">
        <TabsTrigger value="skill">{interfaceText("m_6df1bb18a59ab9")}</TabsTrigger>
        <TabsTrigger value="input">{interfaceText("m_36ecb4f8669133")}</TabsTrigger>
        <TabsTrigger value="runs">{interfaceText("m_848f54e89660ce")}</TabsTrigger>
      </TabsList>
      <TabsContent value="skill" className="min-h-0 flex-1">
        {skill}
      </TabsContent>
      <TabsContent value="input" className="min-h-0 flex-1">
        {input}
      </TabsContent>
      <TabsContent value="runs" className="min-h-0 flex-1">
        {runs}
      </TabsContent>
    </Tabs>
  );
}
