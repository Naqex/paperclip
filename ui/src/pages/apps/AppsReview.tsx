import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect } from "react";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { ReviewQueueCard } from "./ReviewQueueCard";

/**
 * Review — the "decisions waiting on you" inbox (PAP-12371, Finding B).
 *
 * Ask-first approvals used to live only inside the "Needs attention" page,
 * folded together with health/error triage. That buried the one thing a user
 * must act on for their agents to proceed. This is the explicit, top-level
 * home for those approvals, aligned with the Inbox "waiting for your OK"
 * language from the approved PAP-11178 gateway UX. Health issues stay on
 * "Needs attention"; decisions live here.
 */
export function AppsReview() {
  const interfaceLanguage = useInterfaceLanguage();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: interfaceText("m_c3d2e79ebdd046"), href: "/apps" },
      { label: interfaceText("m_aff0766a5290e1") },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, interfaceLanguage]);

  if (!selectedCompanyId) {
    return <div className="p-6 text-sm text-muted-foreground">{interfaceText("m_85763bcfb321e9")}</div>;
  }

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{interfaceText("m_aff0766a5290e1")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{interfaceText("m_0337302930af42")}</p>
      </header>

      <ReviewQueueCard emptyState="reassure" heading="Waiting for your OK" />
    </div>
  );
}
