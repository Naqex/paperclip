import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { ToolbarSearch } from "@/components/ToolbarSearch";
import { CatalogSourceFilters, type CatalogSource } from "./CatalogSourceFilters";

/** Shared catalog search and source filters; data and scope changes stay in Browse. */
export function ConnectorsToolbar({ query, onQueryChange, source, onSourceChange }: {
  query: string;
  onQueryChange: (value: string) => void;
  source: CatalogSource;
  onSourceChange: (value: CatalogSource) => void;
}) {
  useInterfaceLanguage();
  return <header data-canonical-toolbar="connectors" role="toolbar" aria-label={interfaceText("m_8b98f23edf9203")} className="flex flex-wrap items-center gap-3">
    <div className="w-full">
      <ToolbarSearch query={query} onQueryChange={onQueryChange} label={interfaceText("m_706a6068c6a0dc")} placeholder={interfaceText("m_fad7e42dfd243a")} inputType="search" />
    </div>
    <CatalogSourceFilters source={source} onChange={onSourceChange} />
  </header>;
}
