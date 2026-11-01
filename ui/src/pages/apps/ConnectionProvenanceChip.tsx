import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Blocks } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConnectionProvenanceChip({
  connection,
  className,
}: {
  connection: {
    config?: Record<string, unknown> | null;
    credentialSource?: string;
    externalCredential?: { connectorUid?: string } | null;
  } | null | undefined;
  className?: string;
}) {
  useInterfaceLanguage();
  const chipClass = cn(
    "inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
    className,
  );
  if (connection?.credentialSource === "vercel_connect") {
    const connectorUid = connection.externalCredential?.connectorUid;
    return (
      <span
        className={chipClass}
        title={connectorUid ? interfaceText("m_10f3e1aed837be", { value0: (connectorUid) }) : interfaceText("m_25308b6d7fac3b")}
      >
        <Blocks className="h-3 w-3" />{interfaceText("m_d34e03fbdfb4a5")}</span>
    );
  }

  return null;
}
