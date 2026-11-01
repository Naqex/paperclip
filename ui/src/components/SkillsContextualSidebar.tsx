import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { GithubIcon } from "@/components/icons/github-icon";
import { Compass, Library, PencilRuler } from "lucide-react";
import { useLocation } from "@/lib/router";
import {
  resolveSkillsNavigationView,
  SKILLS_NAVIGATION_HREFS,
} from "@/pages/skills/skills-navigation";
import { ContextualSidebarFrame } from "./ContextualSidebarFrame";
import { SidebarNavItem } from "./SidebarNavItem";
import { contextualSidebarStyles } from "./contextual-sidebar-styles";

export {
  resolveSkillsDiscoveryView,
  resolveSkillsNavigationView,
  SKILLS_NAVIGATION_HREFS,
  withSkillsDiscoveryView,
  type SkillsNavigationView,
} from "@/pages/skills/skills-navigation";

export function SkillsContextualSidebar() {
  useInterfaceLanguage();
  const location = useLocation();
  const activeView = resolveSkillsNavigationView(location.pathname, location.search);

  return (
    <ContextualSidebarFrame
      surface="skills"
      title={interfaceText("m_66d0f523a379b2")}
      icon={Library}
      fallbackTo="/dashboard"
      showHeader={false}
      className="border-r border-border bg-background"
    >
      <nav
        aria-label={interfaceText("m_66d0f523a379b2")}
        data-slot="contextual-sidebar-nav"
        className={contextualSidebarStyles.nav}
      >
        <div data-slot="contextual-sidebar-group" className={contextualSidebarStyles.group}>
          <SidebarNavItem
            to={SKILLS_NAVIGATION_HREFS.installed}
            label={interfaceText("m_f8b32f4e92bd84")}
            icon={Library}
            active={activeView === "installed"}
            end
          />
          <SidebarNavItem
            to={SKILLS_NAVIGATION_HREFS.discover}
            label={interfaceText("m_d4a33d5b78bcce")}
            icon={Compass}
            active={activeView === "discover"}
            end
          />
          <SidebarNavItem to={SKILLS_NAVIGATION_HREFS.sources} label={interfaceText("m_caf85b0888d78f")} icon={GithubIcon} active={activeView === "sources"} />
        </div>

        <div data-slot="contextual-sidebar-section" className={contextualSidebarStyles.section}>
          <div
            data-slot="contextual-sidebar-section-label"
            className={contextualSidebarStyles.sectionLabel}
          >{interfaceText("m_d95082a2ee57f3")}</div>
          <p
            data-slot="contextual-sidebar-section-description"
            className={contextualSidebarStyles.sectionDescription}
          >{interfaceText("m_cd7c4b5f9ef8e9")}</p>
          <div data-slot="contextual-sidebar-group" className={contextualSidebarStyles.group}>
            <SidebarNavItem
              to={SKILLS_NAVIGATION_HREFS.authored}
              label={interfaceText("m_ea424d66243dff")}
              icon={PencilRuler}
              active={activeView === "authored"}
            />
          </div>
        </div>
      </nav>
    </ContextualSidebarFrame>
  );
}
