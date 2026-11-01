import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect } from "react";
import { ArrowLeft, RadioTower } from "lucide-react";
import { Link } from "@/lib/router";
import { ActiveAgentsPanel } from "../components/ActiveAgentsPanel";
import { EmptyState } from "../components/EmptyState";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";

const DASHBOARD_LIVE_RUN_LIMIT = 50;

export function DashboardLive() {
  const interfaceLanguage = useInterfaceLanguage();
  const { selectedCompanyId, companies } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: interfaceText("m_67b696468610b8"), href: "/dashboard" },
      { label: interfaceText("m_905f1fefa69324") },
    ]);
  }, [setBreadcrumbs, interfaceLanguage]);

  if (!selectedCompanyId) {
    return (
      <EmptyState
        icon={RadioTower}
        message={companies.length === 0 ? interfaceText("m_dfd72377cca376") : interfaceText("m_1a5b4c52d3d07f")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />{interfaceText("m_67b696468610b8")}</Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">{interfaceText("m_6663a17b699c35")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{interfaceText("m_e4351c0f7022fd")}</p>
        </div>
        <div className="text-sm text-muted-foreground">{interfaceText("m_e8540595e803eb")}{DASHBOARD_LIVE_RUN_LIMIT}</div>
      </div>

      <ActiveAgentsPanel
        companyId={selectedCompanyId}
        title={interfaceText("m_29047d81c75e03")}
        minRunCount={DASHBOARD_LIVE_RUN_LIMIT}
        fetchLimit={DASHBOARD_LIVE_RUN_LIMIT}
        cardLimit={DASHBOARD_LIVE_RUN_LIMIT}
        emptyMessage={interfaceText("m_ae4f00afad4e95")}
        queryScope="dashboard-live"
        showMoreLink={false}
      />
    </div>
  );
}
