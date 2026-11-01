import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { CostByUserReport } from "@paperclipai/shared";
import { CostAmount } from "./CostAmount";
import { Identity } from "./Identity";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { formatTokens } from "../lib/utils";

export function CostByUserTable({ report }: { report: CostByUserReport }) {
  useInterfaceLanguage();
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="gap-0 px-5">
        <CardTitle className="text-base">{interfaceText("m_860ab0fed06c73")}</CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <div className="overflow-x-auto">
          <table aria-label={interfaceText("m_b54d4c9a3aa4f5")} className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-4 text-left font-medium">{interfaceText("m_b512d97e7cbf97")}</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">{interfaceText("m_848f54e89660ce")}</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">{interfaceText("m_36ecb4f8669133")}</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">{interfaceText("m_b2439bcb8dee14")}</th>
                <th scope="col" className="py-2 pl-4 text-right font-medium">{interfaceText("m_204a5eb2cd28bc")}</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-muted-foreground">{interfaceText("m_b40cebee3cef41")}</td></tr>
              )}
              {report.rows.map(row => (
                <tr key={row.userId ?? "unattributed"} className="border-b border-border last:border-0">
                  <th scope="row" className="py-3 pr-4 text-left font-normal">
                    {row.userId ? <Identity name={row.userName ?? "Unknown user"} avatarUrl={row.userImage} /> : interfaceText("m_a5c4e03c56e08f")}
                  </th>
                  <td className="px-4 py-3 text-right tabular-nums">{row.runCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatTokens(row.inputTokens + row.cachedInputTokens)}
                    {row.cachedInputTokens > 0 && <div className="whitespace-nowrap text-xs text-muted-foreground">{formatTokens(row.cachedInputTokens)}{interfaceText("m_7557bedb23d345")}</div>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTokens(row.outputTokens)}</td>
                  <td className="py-3 pl-4 text-right tabular-nums">
                    <CostAmount costCents={row.costCents} eventCount={row.eventCount} estimatedEventCount={row.estimatedEventCount} unpricedEventCount={row.unpricedEventCount} />
                    {row.unpricedEventCount > 0 && <div className="whitespace-nowrap text-xs text-muted-foreground">{row.unpricedEventCount}{interfaceText("m_d17bb0e537d4bb")}{row.unpricedEventCount === 1 ? interfaceText("m_97488fbab32821") : interfaceText("m_7e2a344fa5db9d")}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.rows.some(row => row.userId === null) && (
          <p className="mt-3 text-xs text-muted-foreground">{interfaceText("m_ba96ff0be97e7e")}</p>
        )}
      </CardContent>
    </Card>
  );
}
