import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect } from "react";
import { Link, useLocation } from "@/lib/router";
import { AlertTriangle, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";

type NotFoundScope = "board" | "invalid_company_prefix" | "global";

interface NotFoundPageProps {
  scope?: NotFoundScope;
  requestedPrefix?: string;
}

export function NotFoundPage({ scope = "global", requestedPrefix }: NotFoundPageProps) {
  useInterfaceLanguage();
  const interfaceLanguage = useInterfaceLanguage();
  const location = useLocation();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { companies, selectedCompany } = useCompany();

  useEffect(() => {
    setBreadcrumbs([{ label: interfaceText("m_0019dfc4b32d63") }]);
  }, [setBreadcrumbs, interfaceLanguage]);

  const fallbackCompany = selectedCompany ?? companies[0] ?? null;
  const dashboardHref = fallbackCompany ? `/${fallbackCompany.issuePrefix}/dashboard` : "/";
  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const normalizedPrefix = requestedPrefix?.toUpperCase();

  const title = scope === "invalid_company_prefix" ? interfaceText("m_00c50f7a040462") : interfaceText("m_a469ab4ca4e55b");
  const description =
    scope === "invalid_company_prefix"
      ? interfaceText("m_607df2b4dce283", { value0: (normalizedPrefix ?? "unknown") })
      : interfaceText("m_80eced63616862");

  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card className="block p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{interfaceText("m_4b84b327a445b1")}<code className="font-mono">{currentPath}</code>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link to={dashboardHref}>
              <Compass className="mr-1.5 h-4 w-4" />{interfaceText("m_803f2313cdf442")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">{interfaceText("m_a0aac9145249f1")}</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
