import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useMemo, type CSSProperties } from "react";
import { Folder, GitBranch, GitBranchPlus, Monitor } from "lucide-react";
import type { ExecutionWorkspaceSummary } from "@paperclipai/shared";
import { SearchableSelect, type SearchableSelectOption } from "@/components/SearchableSelect";
import { orderReusableExecutionWorkspaces } from "@/lib/reusable-execution-workspaces";

interface WorktreeOption extends SearchableSelectOption {
  mode: string;
  workspaceId?: string;
  description: string;
}

interface ComposerWorktreePickerProps {
  mode: string;
  workspaceId: string;
  workspaces: readonly ExecutionWorkspaceSummary[];
  onChange: (mode: string, workspaceId: string) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  disabled?: boolean;
  mobile?: boolean;
  contentStyle?: CSSProperties;
  selectedWorkspaceLabel?: string;
}

const MODE_OPTIONS: WorktreeOption[] = [
  { key: "isolated_workspace", value: "isolated_workspace", mode: "isolated_workspace", get label() { return interfaceText("m_4f210afedcabde"); }, description: "Start in an isolated checkout." },
  { key: "shared_workspace", value: "shared_workspace", mode: "shared_workspace", get label() { return interfaceText("m_ce016e7f0a41c4"); }, description: "Use the project's shared checkout." },
  { key: "operator_branch", value: "operator_branch", mode: "operator_branch", get label() { return interfaceText("m_7f445154d63473"); }, description: "Create a branch in the project workspace." },
  { key: "agent_default", value: "agent_default", mode: "agent_default", get label() { return interfaceText("m_90340504c623ec"); }, description: "Let the agent choose its workspace." },
  { key: "inherit", value: "inherit", mode: "inherit", get label() { return interfaceText("m_e8cb80e5c5cb7d"); }, description: "Use the project's worktree settings." },
];

/** Reuses the searchable selector and the existing workspace recency ordering. */
export function ComposerWorktreePicker({
  mode, workspaceId, workspaces, onChange, loading, error, onRetry,
  disabled, mobile, contentStyle, selectedWorkspaceLabel,
}: ComposerWorktreePickerProps) {
  const interfaceLanguage = useInterfaceLanguage();
  const groups = useMemo(() => [
    { id: "new", options: [MODE_OPTIONS[0]!] },
    {
      id: "reuse", label: interfaceText("m_b15c650efb5b88"),
      options: orderReusableExecutionWorkspaces(workspaces).map((workspace): WorktreeOption => ({
        key: `reuse:${workspace.id}`, value: `reuse:${workspace.id}`,
        workspaceId: workspace.id, mode: "reuse_existing", label: workspace.name,
        description: workspace.branchName ?? "Existing workspace",
        searchText: `${workspace.branchName ?? ""} ${workspace.id}`,
      })),
    },
    {
      id: "other", label: interfaceText("m_2cbe84655eb291"),
      options: MODE_OPTIONS.filter((option) => option.mode === "shared_workspace"
        || (option.mode !== "isolated_workspace" && option.mode === mode)),
    },
  ], [mode, workspaces, interfaceLanguage]);

  const value = mode === "reuse_existing" ? `reuse:${workspaceId}` : mode;
  return (
    <SearchableSelect<string, WorktreeOption>
      value={value}
      groups={groups}
      onValueChange={(_, option) => onChange(option.mode, option.workspaceId ?? "")}
      placeholder={interfaceText("m_aec2f93d67b7c4")}
      triggerAriaLabel="Worktrees"
      mobileTitle="Worktrees"
      searchPlaceholder={interfaceText("m_30081ada1ec381")}
      emptyMessage={interfaceText("m_220f59569a5b7d")}
      disabled={disabled}
      modal={mobile}
      contentStyle={contentStyle}
      contentWidth="auto"
      className="min-w-0 flex-1 sm:flex-none sm:max-w-72"
      triggerClassName="h-8 gap-1.5 border-0 bg-transparent px-2 text-xs font-medium shadow-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-0"
      renderValue={(option) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <GitBranch className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            <span className="hidden text-muted-foreground sm:inline">{interfaceText("m_df36ecab332d10")}</span>
            {option?.label ?? selectedWorkspaceLabel ?? interfaceText("m_0b86e7de2cb93b")}
          </span>
        </span>
      )}
      renderOption={(option) => {
        const Icon = option.workspaceId ? GitBranch : option.mode === "isolated_workspace" ? GitBranchPlus
          : option.mode === "agent_default" ? Monitor : option.mode === "operator_branch" ? GitBranch : Folder;
        return (
          <>
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{option.label}</span>
              <span className="truncate text-xs text-muted-foreground">{option.description}</span>
            </span>
          </>
        );
      }}
      listFooter={loading || error || workspaces.length === 0 ? (
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground" role="status">
          {loading ? interfaceText("m_d52f3d5ac872c1") : error ? (
            <span className="flex items-center justify-between gap-2">{interfaceText("m_33ebd59042ebc2")}<button type="button" className="rounded px-2 py-1 text-foreground hover:bg-accent" onClick={onRetry}>{interfaceText("m_942087cc2d41e0")}</button>
            </span>
          ) : interfaceText("m_3024c664e2d3e2")}
        </div>
      ) : undefined}
    />
  );
}
