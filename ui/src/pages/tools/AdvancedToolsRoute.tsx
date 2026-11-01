import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { Link } from "@/lib/router";
import { accessApi } from "@/api/access";
import { queryKeys } from "@/lib/queryKeys";
import { useCompany } from "@/context/CompanyContext";
import { ToolsAccess } from "./ToolsAccess";

/**
 * Admin gate for the Advanced door (PAP-10862, plan D8). The developer surface
 * lives under `/apps/advanced` and requires `tools:admin` on the server.
 * This is a best-effort UX gate derived from role defaults: local boards,
 * instance admins, and active company owners/admins/operators pass.
 * The server is authoritative.
 */
export function AdvancedToolsRoute() {
  useInterfaceLanguage();
  const { selectedCompanyId } = useCompany();
  const boardAccess = useQuery({
    queryKey: queryKeys.access.currentBoardAccess,
    queryFn: () => accessApi.getCurrentBoardAccess(),
    retry: false,
  });

  if (boardAccess.isLoading) {
    return <div className="mx-auto max-w-xl py-10 text-sm text-muted-foreground">{interfaceText("m_ba3bbbe10d8bef")}</div>;
  }

  const data = boardAccess.data;
  const membership = data?.memberships?.find((m) => m.companyId === selectedCompanyId && m.status === "active");
  const canManageTools =
    data?.source === "local_implicit" ||
    Boolean(data?.isInstanceAdmin) ||
    membership?.membershipRole === "owner" ||
    membership?.membershipRole === "admin" ||
    membership?.membershipRole === "operator" ||
    membership?.membershipRole === "member";

  if (!canManageTools) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">{interfaceText("m_478e00f3859b81")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{interfaceText("m_ccaea7d7270bbe")}{" "}
            <Link to="/apps" className="font-medium text-primary hover:underline">{interfaceText("m_d37a3ccae651b1")}</Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return <ToolsAccess />;
}
