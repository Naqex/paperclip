import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { ReactNode } from "react";
import { Check, Layers } from "lucide-react";
import type { ArtifactGroupBy, ArtifactKindFilter } from "@/api/artifacts";
import { TabFilters, type TabSize } from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { ToolbarSearch } from "@/components/ToolbarSearch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const ARTIFACT_KIND_FILTERS: { value: ArtifactKindFilter; label: string }[] = [
  { value: "all", get label() { return interfaceText("m_a52ace420f2175"); } },
  { value: "image", get label() { return interfaceText("m_be7e2f20129365"); } },
  { value: "video", get label() { return interfaceText("m_c9a9639463c219"); } },
  { value: "document", get label() { return interfaceText("m_b4e929d8bcfe04"); } },
  { value: "text", get label() { return interfaceText("m_71988c4d8e0803"); } },
  { value: "file", get label() { return interfaceText("m_abc7e9892806b0"); } },
];

export const ARTIFACT_GROUP_OPTIONS: { value: ArtifactGroupBy; label: string }[] = [
  { value: "none", get label() { return interfaceText("m_dc937b59892604"); } },
  { value: "task", get label() { return interfaceText("m_4bc74b21357c6c"); } },
  { value: "parent_task", get label() { return interfaceText("m_fb8d859156cd03"); } },
];

export function artifactGroupByLabel(value: ArtifactGroupBy): string {
  return ARTIFACT_GROUP_OPTIONS.find((option) => option.value === value)?.label ?? interfaceText("m_dc937b59892604");
}

/** Canonical collection filters; compact standalone, standard in the toolbar. */
export function ArtifactKindFilters({ kind, onKindChange, size = "compact" }: { kind: ArtifactKindFilter; onKindChange: (value: ArtifactKindFilter) => void; size?: TabSize }) {
  useInterfaceLanguage();
  return <TabFilters items={ARTIFACT_KIND_FILTERS} value={kind} onValueChange={onKindChange} size={size} label={interfaceText("m_ff8bce095215eb")} />;
}

export interface ArtifactsToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  groupBy: ArtifactGroupBy;
  onGroupByChange: (value: ArtifactGroupBy) => void;
  kind: ArtifactKindFilter;
  onKindChange: (value: ArtifactKindFilter) => void;
  /** Replaces the kind filter row (Artifacts V1 shows its own view tabs). */
  filters?: ReactNode;
}

/** Shared shipped Artifacts controls. Canonical proposal: Components / Toolbars / Artifacts. */
export function ArtifactsToolbar({ query: draftQuery, onQueryChange: setDraftQuery, groupBy, onGroupByChange: selectGroupBy, kind, onKindChange: selectKind, filters }: ArtifactsToolbarProps) {
  useInterfaceLanguage();
  const grouping = groupBy !== "none";
  return (
    <div data-canonical-toolbar="artifacts" role="toolbar" aria-label={interfaceText("m_e239d8d34234b0")} className="flex flex-col items-start gap-4">
      <div className="design-toolbar-controls flex w-full flex-wrap items-center gap-4">
        <ToolbarSearch query={draftQuery} onQueryChange={setDraftQuery} label={interfaceText("m_c71436cce0eb86")} placeholder={interfaceText("m_394d741796dc6d")} clearLabel="Clear artifact search" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={interfaceText("m_e31dfa163f5f7c", { value0: (artifactGroupByLabel(groupBy)) })}
              title={interfaceText("m_49a9799e9ea9f8")}
              data-testid="artifact-group-control"
              data-group-by={groupBy}
              data-active={grouping}
              className={cn("h-8 w-8 shrink-0", grouping && "bg-accent")}
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>{interfaceText("m_956a51f6b098a4")}</DropdownMenuLabel>
            {ARTIFACT_GROUP_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                data-testid={`artifact-group-option-${option.value}`}
                aria-selected={groupBy === option.value}
                onSelect={() => selectGroupBy(option.value)}
                className="justify-between"
              >
                {option.label}
                {groupBy === option.value ? <Check className="h-3.5 w-3.5" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {filters ?? <ArtifactKindFilters kind={kind} onKindChange={selectKind} size="standard" />}
    </div>
  );
}
