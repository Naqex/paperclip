import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useMemo } from "react";
import type { CostByBiller, CostByProviderModel } from "@paperclipai/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuotaBar } from "./QuotaBar";
import { CostAmount } from "./CostAmount";
import { billingTypeDisplayName, formatCents, formatTokens, providerDisplayName } from "@/lib/utils";

interface BillerSpendCardProps {
  row: CostByBiller;
  weekSpendCents: number;
  budgetMonthlyCents: number;
  /** Only compare a current-month report with the monthly budget. */
  showBudgetUtilization?: boolean;
  totalCompanySpendCents: number;
  providerRows: CostByProviderModel[];
}

export function BillerSpendCard({
  row,
  weekSpendCents,
  budgetMonthlyCents,
  showBudgetUtilization = true,
  totalCompanySpendCents,
  providerRows,
}: BillerSpendCardProps) {
  useInterfaceLanguage();
  const providerBreakdown = useMemo(() => {
    const map = new Map<string, { provider: string; costCents: number; inputTokens: number; outputTokens: number }>();
    for (const entry of providerRows) {
      const current = map.get(entry.provider) ?? {
        provider: entry.provider,
        costCents: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      current.costCents += entry.costCents;
      current.inputTokens += entry.inputTokens + entry.cachedInputTokens;
      current.outputTokens += entry.outputTokens;
      map.set(entry.provider, current);
    }
    return Array.from(map.values()).sort((a, b) => b.costCents - a.costCents);
  }, [providerRows]);

  const billingTypeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of providerRows) {
      map.set(entry.billingType, (map.get(entry.billingType) ?? 0) + entry.costCents);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [providerRows]);

  const providerBudgetShare = budgetMonthlyCents;
  const budgetPct =
    providerBudgetShare > 0
      ? Math.min(100, (row.costCents / providerBudgetShare) * 100)
      : 0;

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-0 gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">
              {providerDisplayName(row.biller)}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              <span className="font-mono">{formatTokens(row.inputTokens + row.cachedInputTokens)}</span>{interfaceText("m_8f6b9ac6b27608")}{" · "}
              <span className="font-mono">{formatTokens(row.outputTokens)}</span>{interfaceText("m_34ae63eca17174")}{" · "}
              {row.providerCount}{interfaceText("m_fc7ef838489d40")}{row.providerCount === 1 ? "" : interfaceText("m_043a718774c572")}
              {" · "}
              {row.modelCount}{interfaceText("m_a791e1e893ea42")}{row.modelCount === 1 ? "" : interfaceText("m_043a718774c572")}
            </CardDescription>
          </div>
          <div className="text-xl shrink-0">
            <CostAmount costCents={row.costCents} eventCount={row.eventCount}
              estimatedEventCount={row.estimatedEventCount} unpricedEventCount={row.unpricedEventCount} showUnavailableCount />
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-3 space-y-4">
        {showBudgetUtilization && budgetMonthlyCents > 0 && (
          <QuotaBar
            label={interfaceText("m_9c4819e645eeec")}
            percentUsed={budgetPct}
            leftLabel={formatCents(row.costCents)}
            rightLabel={`${Math.round(budgetPct)}% of company budget`}
          />
        )}

        <div className="text-xs text-muted-foreground">
          {row.apiRunCount > 0 ? interfaceText("m_bd040d0ccf3a0d", { value0: (row.apiRunCount), value1: (row.apiRunCount === 1 ? "" : interfaceText("m_043a718774c572")) }) : interfaceText("m_2f11c82ec0ccc0")}
          {" · "}
          {row.subscriptionRunCount > 0
            ? interfaceText("m_4824cdf6ed8c29", { value0: (row.subscriptionRunCount), value1: (row.subscriptionRunCount === 1 ? "" : interfaceText("m_043a718774c572")) })
            : interfaceText("m_92a4a1c9068854")}
          {" · "}
          {formatCents(weekSpendCents)}{interfaceText("m_8dbf3082826436")}</div>

        {billingTypeBreakdown.length > 0 && (
          <>
            <div className="border-t border-border" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{interfaceText("m_2ebd3c26f0d8f8")}</p>
              <div className="space-y-1.5">
                {billingTypeBreakdown.map(([billingType, costCents]) => (
                  <div key={billingType} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{billingTypeDisplayName(billingType as any)}</span>
                    <span className="font-medium tabular-nums">{formatCents(costCents)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {providerBreakdown.length > 0 && (
          <>
            <div className="border-t border-border" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{interfaceText("m_89ad52e9874c47")}</p>
              <div className="space-y-1.5">
                {providerBreakdown.map((entry) => (
                  <div key={entry.provider} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{providerDisplayName(entry.provider)}</span>
                    <div className="text-right tabular-nums">
                      <div className="font-medium">{formatCents(entry.costCents)}</div>
                      <div className="text-muted-foreground">
                        {formatTokens(entry.inputTokens + entry.outputTokens)} tok
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
