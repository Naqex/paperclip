import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect } from "react";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { NewAgentSetup } from "../components/new-agent/NewAgentSetup";

export function NewAgent() {
  const interfaceLanguage = useInterfaceLanguage();
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    setBreadcrumbs([
      { label: interfaceText("m_279b44d2ab4b40"), href: "/agents" },
      { label: interfaceText("m_98a23e6db3431d") },
    ]);
  }, [setBreadcrumbs, interfaceLanguage]);
  return <NewAgentSetup />;
}
