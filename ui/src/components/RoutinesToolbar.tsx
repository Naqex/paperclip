import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { ArrowUpDown, Check, Layers, Plus } from "lucide-react";
import { Link } from "@/lib/router";
import { ToolbarSearch } from "./ToolbarSearch";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export type RoutineGroupBy = "folder" | "none" | "project" | "assignee";
export type RoutineSortField = "updated" | "created" | "title" | "lastRun";
export type RoutineSortDir = "asc" | "desc";

export function RoutinesToolbar({ query, onQueryChange, sortField, sortDir, groupBy, onSortChange, onGroupChange, onNewFolder, onCreateRoutine, tasksHref, selectMode, onToggleSelect }: {
  query: string;
  onQueryChange: (value: string) => void;
  sortField: RoutineSortField;
  sortDir: RoutineSortDir;
  groupBy: RoutineGroupBy;
  onSortChange: (field: RoutineSortField, direction: RoutineSortDir) => void;
  onGroupChange: (value: RoutineGroupBy) => void;
  onNewFolder?: () => void;
  onCreateRoutine: () => void;
  tasksHref?: string;
  selectMode?: boolean;
  onToggleSelect?: () => void;
}) {
  useInterfaceLanguage();
  return <div data-canonical-toolbar="routines" role="toolbar" aria-label={interfaceText("m_67bdfdc982395e")} className="flex flex-wrap items-center gap-4">
    <ToolbarSearch query={query} onQueryChange={onQueryChange} label={interfaceText("m_57d0f61ea7511c")} placeholder={interfaceText("m_80582992936115")} />
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" title={interfaceText("m_bec69036aa27e7")}>
          <ArrowUpDown className="h-3.5 w-3.5 sm:h-3 sm:w-3 sm:mr-1" />
          <span >{interfaceText("m_bec69036aa27e7")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-0">
        <div className="p-2 space-y-0.5">
          {([
            ["updated", "Updated"],
            ["created", "Created"],
            ["lastRun", "Last run"],
            ["title", "Title"],
          ] as const).map(([field, label]) => (
            <button
                type="button"
              key={field}
              className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm ${
                sortField === field
                  ? "bg-accent/50 text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
              onClick={() => {
                onSortChange(field, sortField === field
                  ? (sortDir === "asc" ? "desc" : "asc")
                  : (field === "title" ? "asc" : "desc"));
              }}
            >
              <span>{label}</span>
              {sortField === field ? (
                <span className="text-xs text-muted-foreground">
                  {sortDir === "asc" ? interfaceText("m_cddeba5cfc9a05") : interfaceText("m_5c4419a6999d2a")}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" title={interfaceText("m_34ca0e76608842")}>
          <Layers className="h-3.5 w-3.5 sm:h-3 sm:w-3 sm:mr-1" />
          <span >{interfaceText("m_34ca0e76608842")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-0">
        <div className="p-2 space-y-0.5">
          {([
            ["folder", "Folder"],
            ["project", "Project"],
            ["assignee", "Agent"],
            ["none", "None"],
          ] as const).map(([value, label]) => (
            <button
                type="button"
              key={value}
              className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm ${
                groupBy === value
                  ? "bg-accent/50 text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
              onClick={() => onGroupChange(value)}
            >
              <span>{label}</span>
              {groupBy === value ? <Check className="h-3.5 w-3.5" /> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
    <div className="design-toolbar-actions">
      {onToggleSelect && <Button variant="outline" size="sm" onClick={onToggleSelect}>{selectMode ? interfaceText("m_11a6767d5674c7") : interfaceText("m_2a78025de6aae5")}</Button>}
      {tasksHref && <Button variant="outline" size="sm" asChild><Link data-toolbar-control to={tasksHref}>{interfaceText("m_44b54ba5cef386")}</Link></Button>}
      {onNewFolder && <Button variant="outline" size="sm" onClick={onNewFolder}><Plus className="h-4 w-4" />{interfaceText("m_cf28f49ec597a6")}</Button>}
      <Button variant="outline" size="sm" data-toolbar-primary onClick={onCreateRoutine}><Plus className="h-4 w-4" />{interfaceText("m_f0fe070861695a")}</Button>
    </div>
  </div>;
}
