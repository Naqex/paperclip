import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { ShieldCheck, ShieldX, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

export interface ProjectAccessNoticeProps {
  agentName?: string;
  projectName?: string;
  ready: boolean;
  canManage: boolean;
  canRetry: boolean;
  onManage: () => void;
  onRetry: () => void;
  error?: Error | null;
  className?: string;
}

export function ProjectAccessNotice({ agentName = "This agent", projectName, ready, canManage, canRetry, onManage, onRetry, error, className }: ProjectAccessNoticeProps) {
  useInterfaceLanguage();
  return <section role={ready ? "status" : "alert"} aria-label={interfaceText("m_379e0962ac4e00")} className={cn("space-y-4 rounded-lg border border-border p-4", className)}>
    <div className="flex items-start gap-3">
      {ready ? <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden /> : <ShieldX className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />}
      <div className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold">{ready ? interfaceText("m_f506585536bc3c") : interfaceText("m_079d306138e93c", { value0: (agentName) })}</h3>
        <p className="text-sm text-muted-foreground">{ready
          ? interfaceText("m_72cac524a0b298")
          : interfaceText("m_a2a92b6676b052", { value0: (projectName ?? "a project") })}</p>
        {!ready && !canManage && <p className="text-sm text-muted-foreground">{interfaceText("m_63e49d38a55fa1")}</p>}
      </div>
    </div>
    <div className="flex flex-wrap gap-2 pl-8">
      {ready ? canRetry && <Button size="sm" onClick={onRetry}>{interfaceText("m_f53510edcb35d9")}<ArrowRight className="size-4" aria-hidden /></Button>
        : <Button size="sm" variant="outline" onClick={onManage}>{canManage ? interfaceText("m_e74b944805dd40") : interfaceText("m_8b46dc862ae45e")}<ArrowRight className="size-4" aria-hidden /></Button>}
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
    {!ready && <details className="pl-8 text-xs text-muted-foreground"><summary className="cursor-pointer">{interfaceText("m_7bbc3690527077")}</summary>
      <dl className="mt-3 grid grid-cols-2 gap-2"><dt>{interfaceText("m_f60d25c54f2b52")}</dt><dd>{interfaceText("m_80cbc79c1ad42e")}</dd><dt>{interfaceText("m_f81ab834de5f84")}</dt><dd>{interfaceText("m_45f7104b921df3")}</dd><dt>{interfaceText("m_74320f2d14fcaa")}</dt><dd>{interfaceText("m_1ea442a134b2a1")}</dd></dl>
    </details>}
  </section>;
}
