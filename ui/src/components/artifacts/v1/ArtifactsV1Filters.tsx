import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { ArtifactGroupBy, ArtifactKindFilter } from "@/api/artifacts";
import { TabFilters, type TabBarItem } from "@/components/TabBar";

/**
 * The Artifacts page's one row of views (mock node 2129:133457): Tasks —
 * one tile per task, the default — then every file flat, by type. Grouping
 * and the kind filter are still two URL parameters; a view maps onto both.
 */
export type ArtifactsV1View = "tasks" | Exclude<ArtifactKindFilter, never>;

export const ARTIFACTS_V1_VIEWS: TabBarItem<ArtifactsV1View>[] = [
  { value: "tasks", get label() { return interfaceText("m_b3a60e61a5233d"); } },
  { value: "all", get label() { return interfaceText("m_866956901fd153"); } },
  { value: "image", get label() { return interfaceText("m_be7e2f20129365"); } },
  { value: "video", get label() { return interfaceText("m_c9a9639463c219"); } },
  { value: "document", get label() { return interfaceText("m_b4e929d8bcfe04"); } },
  { value: "text", get label() { return interfaceText("m_71988c4d8e0803"); } },
  { value: "file", get label() { return interfaceText("m_abc7e9892806b0"); } },
];

/** Any grouping reads as the Tasks view; flat views are named by their kind. */
export const artifactsV1View = (groupBy: ArtifactGroupBy, kind: ArtifactKindFilter): ArtifactsV1View => (groupBy !== "none" ? "tasks" : kind);

export function ArtifactsV1Filters({ view, onViewChange }: { view: ArtifactsV1View; onViewChange: (view: ArtifactsV1View) => void }) {
  useInterfaceLanguage();
  return <TabFilters items={ARTIFACTS_V1_VIEWS} value={view} onValueChange={onViewChange} size="standard" label={interfaceText("m_faa1d8e27ffd38")} />;
}
