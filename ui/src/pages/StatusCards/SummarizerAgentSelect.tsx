import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { AgentAvatar } from "@/components/AgentAvatar";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { agentsApi } from "@/api/agents";
import { InlineEntitySelector, type InlineEntityOption } from "@/components/InlineEntitySelector";
import { isAgentTaskTarget } from "@/lib/company-members";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Picker for the agent that runs a card's updates. `value` is the override
 * agent id, or "" for the company's built-in Summarizer (the default).
 */
export function SummarizerAgentSelect({
  companyId,
  value,
  onChange,
  enabled = true,
}: {
  companyId: string | null | undefined;
  value: string;
  onChange: (agentId: string) => void;
  enabled?: boolean;
}) {
  useInterfaceLanguage();
  const agentsQuery = useQuery({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: Boolean(companyId) && enabled,
  });
  const agentById = useMemo(
    () => new Map((agentsQuery.data ?? []).map((agent) => [agent.id, agent])),
    [agentsQuery.data],
  );
  const agentOptions = useMemo<InlineEntityOption[]>(
    () =>
      (agentsQuery.data ?? [])
        .filter(isAgentTaskTarget)
        .map((agent) => ({
          id: `agent:${agent.id}`,
          label: agent.name,
          searchText: `${agent.name} ${agent.role} ${agent.title ?? ""}`,
        })),
    [agentsQuery.data],
  );

  const renderAgent = (option: InlineEntityOption | null) => {
    if (!option || !option.id) return <span>{interfaceText("m_8302e6afb406e7")}</span>;
    const agent = option.id.startsWith("agent:") ? agentById.get(option.id.slice("agent:".length)) : null;
    return (
      <>
        {agent ? <AgentAvatar agent={agent} size={16} className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/> : null}
        <span className="truncate">{option.label}</span>
      </>
    );
  };

  return (
    <InlineEntitySelector
      value={value ? `agent:${value}` : ""}
      options={agentOptions}
      placeholder={interfaceText("m_8302e6afb406e7")}
      noneLabel="Summarizer (default)"
      searchPlaceholder={interfaceText("m_32f4468b0b6f94")}
      emptyMessage={interfaceText("m_61666542b1caa1")}
      onChange={(next) => onChange(next.startsWith("agent:") ? next.slice("agent:".length) : "")}
      className="h-8 text-sm"
      renderTriggerValue={renderAgent}
      renderOption={(option) => renderAgent(option)}
    />
  );
}
