import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { AlertTriangle } from "lucide-react";
export function EmailSafetyNotice() {
  useInterfaceLanguage();
  return (
    <div
      role="note"
      className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="size-4 shrink-0 text-(--status-agent-paused)" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{interfaceText("m_850d77abd7ec64")}</p>
          <p className="text-sm text-muted-foreground">{interfaceText("m_50c1c42c86a48a")}</p>
          <p className="text-xs text-muted-foreground">{interfaceText("m_db40f3b549c8f9")}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <a
          href="https://console.agentmail.to"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4"
        >{interfaceText("m_1d9d67d1ac149a")}</a>
        <a
          href="https://docs.agentmail.to/knowledge-base/allowlists-blocklists"
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground underline underline-offset-4"
        >{interfaceText("m_0bf5ad9e26216b")}</a>
      </div>
    </div>
  );
}
