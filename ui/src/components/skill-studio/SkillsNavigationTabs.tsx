import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { ReactNode } from "react";
import { Link } from "@/lib/router";
import { useStreamlinedUiEnabled } from "@/hooks/useStreamlinedUiEnabled";
import { SKILLS_NAVIGATION_HREFS, type SkillsNavigationView } from "@/pages/skills/skills-navigation";

const views = [
  { value: "installed", get label() { return interfaceText("m_f8b32f4e92bd84"); } },
  { value: "discover", get label() { return interfaceText("m_d4a33d5b78bcce"); } },
  { value: "authored", get label() { return interfaceText("m_ea424d66243dff"); } },
] as const;

/** Route navigation with the canonical tab appearance. Sources stays in the actions menu. */
export function SkillsNavigationTabs({ activeView }: { activeView: SkillsNavigationView }) {
  useInterfaceLanguage();
  return <nav aria-label={interfaceText("m_acfcb8b06f021e")} data-canonical-tabs="standard" className="canonical-tab-list">
    {views.map(view => <Link key={view.value} to={SKILLS_NAVIGATION_HREFS[view.value]}
      className="canonical-tab" data-state={activeView === view.value ? "active" : "inactive"}
      aria-current={activeView === view.value ? "page" : undefined}>{view.label}</Link>)}
  </nav>;
}

/** Standalone Skills pages share navigation beneath their own header controls. */
export function SkillsPageNavigation({ activeView, fallback = null }: { activeView: SkillsNavigationView; fallback?: ReactNode }) {
  const { enabled } = useStreamlinedUiEnabled();
  return enabled ? <div className="shrink-0 border-b border-border px-3 py-2"><SkillsNavigationTabs activeView={activeView} /></div> : fallback;
}
