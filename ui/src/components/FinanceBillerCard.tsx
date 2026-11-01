import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { FinanceByBiller } from "@paperclipai/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents, providerDisplayName } from "@/lib/utils";

interface FinanceBillerCardProps {
  row: FinanceByBiller;
}

export function FinanceBillerCard({ row }: FinanceBillerCardProps) {
  useInterfaceLanguage();
  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{providerDisplayName(row.biller)}</CardTitle>
            <CardDescription className="mt-1 text-xs">
              {row.eventCount}{interfaceText("m_2d4f349e8e93af")}{row.eventCount === 1 ? "" : interfaceText("m_043a718774c572")}{interfaceText("m_3d3b931befd806")}{row.kindCount}{interfaceText("m_e6dc2930d13592")}{row.kindCount === 1 ? "" : interfaceText("m_043a718774c572")}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums">{formatCents(row.netCents, row.currency)}</div>
            <div className="text-(length:--text-micro) uppercase tracking-(--tracking-eyebrow) text-muted-foreground">net</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-3">
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="border border-border p-3">
            <div className="text-(length:--text-micro) uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{interfaceText("m_d2277130577674")}</div>
            <div className="mt-1 font-medium tabular-nums">{formatCents(row.debitCents, row.currency)}</div>
          </div>
          <div className="border border-border p-3">
            <div className="text-(length:--text-micro) uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{interfaceText("m_be379a30f1aa05")}</div>
            <div className="mt-1 font-medium tabular-nums">{formatCents(row.creditCents, row.currency)}</div>
          </div>
          <div className="border border-border p-3">
            <div className="text-(length:--text-micro) uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{interfaceText("m_d342ed822e55a9")}</div>
            <div className="mt-1 font-medium tabular-nums">{formatCents(row.estimatedDebitCents, row.currency)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
