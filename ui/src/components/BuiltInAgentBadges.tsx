import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { brandChipBadge } from "@/lib/status-colors";
import type { BuiltInAgentStatus } from "@/api/builtInAgents";

/**
 * Derived lifecycle chip. Rendered for the amber attention states
 * (`needs_setup`, `pending_approval`). Kept separate from the real agent status
 * (`idle/active/…`) per ux-spec D1.
 */
export function BuiltInLifecycleChip({
  status,
  compact = false,
  className,
}: {
  status: BuiltInAgentStatus;
  compact?: boolean;
  className?: string;
}) {
  useInterfaceLanguage();
  if (status !== "needs_setup" && status !== "pending_approval") return null;
  const isPendingApproval = status === "pending_approval";
  return (
    <Badge
      variant="outline"
      className={cn(
        brandChipBadge.amber,
        compact && "px-1.5 py-0 text-(length:--text-nano)",
        className,
      )}
      title={
        isPendingApproval
          ? interfaceText("m_b6383320de2bac")
          : interfaceText("m_7a0680a66d1a41")
      }
    >
      {isPendingApproval ? (compact ? interfaceText("m_147fb813a25157") : interfaceText("m_bb33a7f41817b3")) : compact ? interfaceText("m_7013af4c42fe43") : interfaceText("m_b6df2441064f14")}
    </Badge>
  );
}
