import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { FinanceByKind } from "@paperclipai/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { financeEventKindDisplayName, formatCents } from "@/lib/utils";

interface FinanceKindCardProps {
  rows: FinanceByKind[];
}

export function FinanceKindCard({ rows }: FinanceKindCardProps) {
  useInterfaceLanguage();
  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-1">
        <CardTitle className="text-base">{interfaceText("m_ca44745da64924")}</CardTitle>
        <CardDescription>{interfaceText("m_61cc3a6edc93d2")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4 pt-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{interfaceText("m_66810e6a0789e6")}</p>
        ) : (
          rows.map((row) => (
            <div
              key={`${row.eventKind}:${row.currency}`}
              className="flex items-center justify-between gap-3 border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{financeEventKindDisplayName(row.eventKind)}</div>
                <div className="text-xs text-muted-foreground">
                  {row.eventCount}{interfaceText("m_2d4f349e8e93af")}{row.eventCount === 1 ? "" : interfaceText("m_043a718774c572")} · {row.billerCount}{interfaceText("m_3306e050bd7778")}{row.billerCount === 1 ? "" : interfaceText("m_043a718774c572")}
                </div>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-sm font-medium">{formatCents(row.netCents, row.currency)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCents(row.debitCents, row.currency)}{interfaceText("m_a8623ae1dd4a2b")}</div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
