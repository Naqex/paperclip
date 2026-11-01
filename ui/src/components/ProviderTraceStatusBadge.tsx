import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { ProviderTraceMetadata } from "@paperclipai/shared";
import { Bug, CircleOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function runRequestedProviderTrace(
  contextSnapshot: Record<string, unknown> | null | undefined,
) {
  if (!contextSnapshot) return false;
  const debug = contextSnapshot.debug;
  return (
    typeof debug === "object" &&
    debug !== null &&
    !Array.isArray(debug) &&
    (debug as Record<string, unknown>).providerTrace === "raw"
  );
}

export function ProviderTraceStatusBadge({
  trace,
  requested = false,
  showOff = false,
  className,
}: {
  trace?: ProviderTraceMetadata | null;
  requested?: boolean;
  showOff?: boolean;
  className?: string;
}) {
  useInterfaceLanguage();
  const status = trace?.status;
  const expired = trace
    ? new Date(trace.expiresAt).getTime() <= Date.now()
    : false;
  const label = expired
    ? interfaceText("m_c208aa1a887c04")
    : status === "capturing"
      ? interfaceText("m_812a3547ae58cb")
      : status === "complete"
        ? interfaceText("m_c5a0a578f310e3")
        : status === "incomplete"
          ? interfaceText("m_329116c84b54da")
          : status === "truncated"
            ? interfaceText("m_0efe370c05e764")
            : status === "expired"
              ? interfaceText("m_c208aa1a887c04")
              : status === "deleted"
                ? interfaceText("m_ce1e0dd216423b")
                : requested
                  ? interfaceText("m_f1ebbe0e1e0eaf")
                  : showOff
                    ? interfaceText("m_56a98a22636089")
                    : null;
  if (!label) return null;
  const warning =
    status === "incomplete" ||
    status === "truncated" ||
    status === "expired" ||
    status === "deleted" ||
    expired;
  const off = !expired && !status && !requested && showOff;
  const inactive = off || expired || status === "expired" || status === "deleted";
  const Icon = off ? CircleOff : Bug;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-(length:--text-micro) font-medium",
        inactive
          ? "border-border bg-background text-muted-foreground"
          : warning
            ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        className,
      )}
      title={
        trace
          ? interfaceText("m_e9b181279b1325", { value0: (trace.frameCount), value1: (trace.byteCount), value2: (new Date(trace.expiresAt).toLocaleString()) })
          : requested
            ? interfaceText("m_4398e38a3b9eff")
            : interfaceText("m_90c06cbcbdc3e1")
      }
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
