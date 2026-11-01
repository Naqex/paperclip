import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { createContext, useContext } from "react";
import { ArrowRight, Crown, Loader2 } from "lucide-react";
import type { Agent } from "@paperclipai/shared";
import { AgentAvatar } from "@/components/AgentAvatar";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Shared presentation for the application and the approved review stories. */
export interface PrimaryAgentPresentation {
  companyId: string;
  primaryAgentId: string | null;
  primaryAgent: Agent | null;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  pendingAgentId?: string | null;
  onChange: (agentId: string) => void;
}

const PrimaryAgentContext = createContext<PrimaryAgentPresentation | null>(null);
export const PrimaryAgentPresentationProvider = PrimaryAgentContext.Provider;

export function usePrimaryAgentPresentation(companyId?: string | null) {
  const value = useContext(PrimaryAgentContext);
  return value && (!companyId || value.companyId === companyId) ? value : null;
}

export function PrimaryAgentIndicator({ agentId, companyId }: { agentId: string; companyId?: string }) {
  useInterfaceLanguage();
  const primary = usePrimaryAgentPresentation(companyId);
  if (!primary || primary.loading || primary.primaryAgentId !== agentId) return null;
  return <Tooltip>
    <TooltipTrigger asChild>
      <span role="img" aria-label={interfaceText("m_b87f07d28173cc")} className="inline-flex shrink-0 text-primary">
        <Crown aria-hidden="true" className="size-3.5" />
      </span>
    </TooltipTrigger>
    <TooltipContent>{interfaceText("m_b87f07d28173cc")}</TooltipContent>
  </Tooltip>;
}

export function SetPrimaryAgentButton({ agent }: {
  agent: Agent;
}) {
  useInterfaceLanguage();
  const primary = usePrimaryAgentPresentation(agent.companyId);
  if (!primary || agent.status === "terminated" || agent.status === "pending_approval") return null;
  if (primary.error) return <Button type="button" variant="link" size="sm" onClick={primary.onRetry}
    className="h-auto justify-start p-0 text-xs text-destructive">{interfaceText("m_7a3231937d796e")}</Button>;
  const selected = primary.primaryAgentId === agent.id;
  const pending = primary.pendingAgentId === agent.id;
  if (selected && !pending && !primary.loading) return null;
  const previous = primary.primaryAgent?.id === primary.primaryAgentId ? primary.primaryAgent : null;
  const loading = primary.loading || Boolean(primary.primaryAgentId && !previous);
  const disabled = loading || Boolean(primary.pendingAgentId);
  const button = <Button type="button" variant="link" size="sm" disabled={disabled}
    onClick={primary.primaryAgentId ? undefined : () => primary.onChange(agent.id)}
    className="h-auto justify-start p-0 text-xs text-muted-foreground hover:text-foreground">
    {pending || loading ? <Loader2 aria-hidden="true" className="size-3 motion-safe:animate-spin" /> : null}
    {loading ? interfaceText("m_1f7c0355d534f6") : pending ? interfaceText("m_a63f7e0c37770b") : interfaceText("m_56fa4288bf77a5")}
  </Button>;
  if (!previous) return button;
  return <AlertDialog key={previous.id}>
    <AlertDialogTrigger asChild>{button}</AlertDialogTrigger>
    <AlertDialogContent>
      <div className="flex items-start justify-center gap-5 pt-2">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <AgentAvatar agent={previous} size={64} label={interfaceText("m_2a8557470f6faf", { value0: (previous.name) })} />
          <span className="max-w-full break-words text-sm font-medium">{previous.name}</span>
        </div>
        <ArrowRight aria-hidden="true" className="mt-5 size-6 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
          <AgentAvatar agent={agent} size={64} label={interfaceText("m_2a8557470f6faf", { value0: (agent.name) })}
            className="rounded-xl ring-1 ring-primary ring-offset-2 ring-offset-background" />
          <span className="flex max-w-full items-center justify-center gap-1.5 text-sm font-medium">
            <span className="min-w-0 break-words">{agent.name}</span>
            <span role="img" aria-label={interfaceText("m_9a49332060d0aa")} className="inline-flex shrink-0 text-primary">
              <Crown aria-hidden="true" className="size-3.5" />
            </span>
          </span>
        </div>
      </div>
      <AlertDialogHeader>
        <AlertDialogTitle>{interfaceText("m_6e929b0141773e")}</AlertDialogTitle>
        <AlertDialogDescription className="break-words">{interfaceText("m_6054ad410a5db4")}{agent.name}{interfaceText("m_75bd184a931826")}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-row justify-between sm:justify-between">
        <AlertDialogCancel>{interfaceText("m_19766ed6ccb2f4")}</AlertDialogCancel>
        <AlertDialogAction disabled={disabled} onClick={() => primary.onChange(agent.id)}>{interfaceText("m_56fa4288bf77a5")}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
