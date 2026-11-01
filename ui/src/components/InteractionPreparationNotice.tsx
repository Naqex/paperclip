import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Loader2 } from "lucide-react";

export function InteractionPreparationNotice() {
  useInterfaceLanguage();
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 aria-hidden className="h-4 w-4 animate-spin" />{interfaceText("m_3f797b41f4535d")}</div>
  );
}
