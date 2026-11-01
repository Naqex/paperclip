import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { CostByAgent } from "@paperclipai/shared";
import { Badge } from "./ui/badge";

/** Use this group's ledger counts, never the page-wide estimate count. */
export function CostEstimateLabel({
  eventCount,
  estimatedEventCount,
}: Partial<Pick<CostByAgent, "eventCount" | "estimatedEventCount">>) {
  useInterfaceLanguage();
  if (!estimatedEventCount) return null;
  const allEstimated = estimatedEventCount === eventCount;
  return (
    <Badge
      variant="outline"
      className="font-normal text-muted-foreground"
      title={interfaceText("m_5c4721c5fd94ee", { value0: (estimatedEventCount), value1: (estimatedEventCount === 1 ? "charge" : "charges") })}
    >
      {allEstimated ? interfaceText("m_b774599a9cd1f9") : interfaceText("m_4178459d7eab9d")}
    </Badge>
  );
}
