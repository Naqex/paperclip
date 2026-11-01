import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { AlertTriangle, ExternalLink } from "lucide-react";
import type { AgentPermissions } from "@paperclipai/shared";
import { getTrustPreset } from "@/lib/trust-policy-ui";
import { Button } from "@/components/ui/button";

export const LOW_TRUST_AGENT_GUIDE =
  "https://docs.paperclip.ing/administration/trust-and-low-trust-review/";

export function GitHubAgentTrustWarning({
  agent,
  onChangeToLowTrust,
  disabled,
}: {
  agent:
    { name: string; permissions: Partial<AgentPermissions> } | null | undefined;
  onChangeToLowTrust?: () => void;
  disabled?: boolean;
}) {
  useInterfaceLanguage();
  if (!agent || getTrustPreset(agent.permissions) === "low_trust_review")
    return null;
  return (
    <div
      role="alert"
      className="space-y-2 rounded-lg border border-(--status-task-todo)/30 bg-(--status-task-todo)/10 p-4 text-sm"
    >
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 shrink-0" />
        {agent.name}{interfaceText("m_e44fc82b13556e")}</p>
      <p>{interfaceText("m_e21696adbfdbee")}</p>
      <p className="text-xs text-muted-foreground">{interfaceText("m_638464163964d7")}</p>
      {onChangeToLowTrust && (
        <Button variant="outline" className="h-auto whitespace-normal" disabled={disabled} onClick={onChangeToLowTrust}>{interfaceText("m_9efbdaa8462998")}{agent.name}{interfaceText("m_c23054c3e99e01")}</Button>
      )}
      <a
        className="inline-flex items-center gap-1 underline underline-offset-4"
        href={LOW_TRUST_AGENT_GUIDE}
        target="_blank"
        rel="noreferrer"
      >{interfaceText("m_3c6aaa9894b123")}<ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}
