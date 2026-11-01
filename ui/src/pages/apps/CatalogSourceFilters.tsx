import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { TabFilters } from "@/components/TabBar";

export const CATALOG_SOURCES = ["paperclip", "composio", "arcade", "installed", "all"] as const;
export type CatalogSource = typeof CATALOG_SOURCES[number];
export const CATALOG_SOURCE_NAMES = {
  paperclip: "Paperclip", composio: "Composio", arcade: "Arcade", executor: "Executor",
  get installed() { return interfaceText("m_f8b32f4e92bd84"); },
  get all() { return interfaceText("m_a52ace420f2175"); },
};

export function CatalogSourceFilters({ source, onChange }: { source: CatalogSource; onChange: (source: CatalogSource) => void }) {
  useInterfaceLanguage();
  return <TabFilters label={interfaceText("m_8a51c45b2fc09a")} size="standard" items={CATALOG_SOURCES.map(value => ({ value, label: CATALOG_SOURCE_NAMES[value] }))} value={source} onValueChange={onChange} />;
}
