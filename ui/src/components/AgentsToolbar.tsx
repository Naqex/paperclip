import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { List, Network, Plus } from "lucide-react";
import { ToolbarSearch } from "./ToolbarSearch";
import { Button } from "./ui/button";

export interface AgentsToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  view: "list" | "org";
  onViewChange: (value: "list" | "org") => void;
  hideViewToggle?: boolean;
  onNewAgent: () => void;
}

/** Shared roster search, view controls and actions for the page and stories. */
export function AgentsToolbar({ query, onQueryChange, view, onViewChange, hideViewToggle, onNewAgent }: AgentsToolbarProps) {
  useInterfaceLanguage();
  return <div data-canonical-toolbar="agents" role="toolbar" aria-label={interfaceText("m_e13f828b2f4513")} className="flex flex-wrap items-center gap-3">
    <div className="design-toolbar-controls flex w-full flex-wrap items-center gap-4">
      <ToolbarSearch query={query} onQueryChange={onQueryChange} label={interfaceText("m_212fd04a1d202b")} placeholder={interfaceText("m_e05cb78e973da3")} />
      {!hideViewToggle && <div className="design-view-toggle" role="group" aria-label={interfaceText("m_c26e47e839f072")}>
          <Button type="button" size="icon-sm" variant={view === "list" ? "secondary" : "ghost"} className="design-toolbar-icon" onClick={() => onViewChange("list")} title={interfaceText("m_5d8c3e1b635eed")} aria-label={interfaceText("m_5d8c3e1b635eed")} aria-pressed={view === "list"}><List aria-hidden /></Button>
          <Button type="button" size="icon-sm" variant={view === "org" ? "secondary" : "ghost"} className="design-toolbar-icon" onClick={() => onViewChange("org")} title={interfaceText("m_a33c82404434fb")} aria-label={interfaceText("m_a33c82404434fb")} aria-pressed={view === "org"}><Network aria-hidden /></Button>
      </div>}
      <div className="design-toolbar-actions">
        <Button size="sm" variant="outline" data-toolbar-primary onClick={onNewAgent}><Plus aria-hidden />{interfaceText("m_c548aab130f7e7")}</Button>
      </div>
    </div>
  </div>;
}
