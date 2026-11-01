import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { TaskBrowser } from "@paperclipai/shared";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TaskBrowserActivity({
  browser,
  label = interfaceText("m_d31de1a5c5c8ba"),
  onOpen,
}: {
  browser: TaskBrowser;
  label?: string;
  onOpen?: (id: string) => void;
}) {
  useInterfaceLanguage();
  const closed = browser.status === "closed" || browser.status === "failed";
  return (
    <div className="flex flex-wrap items-center gap-2 py-1 text-sm" aria-label={interfaceText("m_20bc150e78d758", { value0: (label) })}>
      <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>{label}</span>
      <span className="text-muted-foreground">· {browser.status}</span>
      {onOpen && (
        <Button variant="ghost" size="sm" onClick={() => onOpen(browser.id)}>
          {closed ? interfaceText("m_4fbf3281b1f8d3") : interfaceText("m_b84a7dc03e31fe")}
        </Button>
      )}
    </div>
  );
}
