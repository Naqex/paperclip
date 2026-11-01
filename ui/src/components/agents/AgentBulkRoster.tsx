import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Filter, Pencil, X } from "lucide-react";
import type { Agent } from "@paperclipai/shared";
import { aiConnectionsApi } from "@/api/ai-connections";
import { getAdapterLabel } from "@/adapters/adapter-display-registry";
import { agentConnection, agentDefaultModel, bulkAgentDisabledReason, bulkAgentHarness, bulkConnectionName } from "@/lib/bulk-agent-settings";
import { pendingAgentSetupDisplayAdapter } from "@/lib/agent-setup-choice";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const AgentBulkSettingsSheet = lazy(() => import("./AgentBulkSettingsSheet").then(m => ({ default: m.AgentBulkSettingsSheet })));

/** Shared by both roster layouts. Mount with a company key to isolate selection. */
export function AgentBulkRoster({ companyId, agents, visibleAgents, renderAgent }: {
  companyId: string; agents: Agent[]; visibleAgents: Agent[]; renderAgent: (agent: Agent) => ReactNode;
}) {
  useInterfaceLanguage();
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Agent[] | null>(null);
  const [notice, setNotice] = useState("");
  const accounts = useQuery({ queryKey: ["ai-connections", companyId], queryFn: () => aiConnectionsApi.list(companyId), retry: false });
  const visible = visibleAgents.filter(a => filter === "all" || bulkAgentHarness(a) === filter);
  const selectable = visible.filter(a => !bulkAgentDisabledReason(a));
  const selectedAgents = agents.filter(a => selected.includes(a.id) && !bulkAgentDisabledReason(a));
  const harnesses = [...new Set(agents.map(bulkAgentHarness))].sort((a, b) => getAdapterLabel(a).localeCompare(getAdapterLabel(b)));
  const groups = [...new Set(selectedAgents.map(bulkAgentHarness))];
  const all = selectable.length > 0 && selectable.every(a => selected.includes(a.id));
  const some = selectable.some(a => selected.includes(a.id));
  const hidden = selectedAgents.filter(a => !visible.includes(a)).length;
  const toggleAll = () => setSelected(all ? selected.filter(id => !selectable.some(a => a.id === id)) : [...new Set([...selected, ...selectable.map(a => a.id)])]);

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={interfaceText("m_2b2a8e180c4201")} title={filter === "all" ? interfaceText("m_638e249f4a15eb") : interfaceText("m_920fd16f192490", { value0: (getAdapterLabel(filter)) })}
            className={cn("relative h-8 w-8 shrink-0", filter !== "all" && "text-blue-600 dark:text-blue-400")}>
            <Filter className="h-3.5 w-3.5" aria-hidden />
            {filter !== "all" && <span aria-hidden className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-(length:--text-nano) font-bold text-white">1</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent aria-label={interfaceText("m_c2c5a93941683b")} align="start" className="w-64 space-y-3 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{interfaceText("m_546ebb8eb993ea")}</span>
            {filter !== "all" && <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setFilter("all")}>{interfaceText("m_83b12c2216efb4")}</button>}
          </div>
          <div role="group" aria-label={interfaceText("m_e3b5b45953d79a")} className="space-y-1">
            <div className="px-2 text-xs font-medium text-muted-foreground">{interfaceText("m_e3b5b45953d79a")}</div>
            {["all", ...harnesses].map(h => <button key={h} type="button" aria-pressed={filter === h} onClick={() => setFilter(h)}
              className={cn("flex w-full items-center justify-between rounded-sm px-2 py-1 text-left text-sm", filter === h ? "bg-accent/50 text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}>
              {h === "all" ? interfaceText("m_6f5450ea7cf0ae") : getAdapterLabel(h)}{filter === h && <Check className="size-3.5" aria-hidden />}
            </button>)}
          </div>
        </PopoverContent>
      </Popover>
      <span className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? "agent" : interfaceText("m_8c70b25cbbbe8e")}</span>
    </div>
    {selectedAgents.length > 0 && <div role="region" aria-label={interfaceText("m_19f0dd9ac4068a")} className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-md border bg-muted p-3">
      <span className="text-sm font-medium">{selectedAgents.length}{interfaceText("m_97a2e8815acd21")}</span>
      {hidden > 0 && <span className="text-xs text-muted-foreground">{hidden}{interfaceText("m_c730f5cdb8fea5")}</span>}
      {groups.length > 1 && <span className="text-xs text-muted-foreground">{interfaceText("m_ae54863f70cdea")}</span>}
      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">{groups.map(h => <Button key={h} size="sm" variant="outline" onClick={() => setEditing(selectedAgents.filter(a => bulkAgentHarness(a) === h))}>
        <Pencil className="size-3.5" aria-hidden />{groups.length === 1 ? interfaceText("m_57c1cec5663fd6") : interfaceText("m_a65322082a09be", { value0: (selectedAgents.filter(a => bulkAgentHarness(a) === h).length), value1: (getAdapterLabel(h)) })}
      </Button>)}<Button size="icon-sm" variant="ghost" aria-label={interfaceText("m_cea4d2e010b8fd")} onClick={() => setSelected([])}><X className="size-4" /></Button></div>
    </div>}
    {notice && <p role="status" className="flex items-center gap-2 text-sm"><Check className="size-4" aria-hidden />{notice}</p>}
    {accounts.error && <p className="text-xs text-destructive">{interfaceText("m_65f6ee385ce68a")}<Button variant="link" size="sm" onClick={() => void accounts.refetch()}>{interfaceText("m_942087cc2d41e0")}</Button></p>}
    <div className="overflow-x-auto"><table aria-label={interfaceText("m_77a757014ef3ea")} className="w-full text-left text-sm">
      <thead className="text-xs text-muted-foreground [&_th]:px-3 [&_th]:py-3 [&_th]:font-normal"><tr>
        <th className="w-10"><Checkbox aria-label={interfaceText("m_9a0a5fdde41320")} checked={all ? true : some ? "indeterminate" : false} disabled={!selectable.length} onCheckedChange={toggleAll} /></th>
        <th>Agent</th><th>{interfaceText("m_e3b5b45953d79a")}</th><th>{interfaceText("m_639a40e82b9a96")}</th><th>{interfaceText("m_3840d9d29421c4")}</th>
      </tr></thead>
      <tbody>{visible.map(agent => {
        const pendingSetup = pendingAgentSetupDisplayAdapter(agent);
        return <tr key={agent.id} data-state={selected.includes(agent.id) ? "selected" : undefined} className="border-t border-border data-[state=selected]:bg-accent/30 [&_td]:px-3">
        <td title={bulkAgentDisabledReason(agent)}><Checkbox aria-label={interfaceText("m_33de0e8b35aac1", { value0: (agent.name) })} checked={selectedAgents.some(a => a.id === agent.id)} disabled={!!bulkAgentDisabledReason(agent)} onCheckedChange={value => setSelected(value ? [...new Set([...selected, agent.id])] : selected.filter(id => id !== agent.id))} /></td>
        <td className="min-w-64 p-0">{renderAgent(agent)}</td>
        <td className="whitespace-nowrap text-xs">{getAdapterLabel(pendingSetup ?? bulkAgentHarness(agent))}</td>
        <td className="text-xs">{pendingSetup ? interfaceText("m_dd1841d2950242") : ["http", "process"].includes(agent.adapterType) ? interfaceText("m_22684bdf15e55a") : bulkConnectionName(agentConnection(agent), accounts.data)}</td>
        <td className="font-mono text-xs">{pendingSetup ? interfaceText("m_787406ddea2a10") : agentDefaultModel(agent) ?? interfaceText("m_7760912abe8a12")}</td>
      </tr>;
      })}</tbody>
    </table></div>
    {!visible.length && <p className="py-8 text-center text-sm text-muted-foreground">{interfaceText("m_d077c9ec6c6a1b")}</p>}
    {editing && <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">{interfaceText("m_fafb50ef95a206")}</p>}><AgentBulkSettingsSheet companyId={companyId} agents={editing} totalSelected={selectedAgents.length} onClose={(updatedIds, complete) => {
      setEditing(null);
      if (updatedIds.length) {
        setSelected(ids => ids.filter(id => !(complete ? editing.map(a => a.id) : updatedIds).includes(id)));
        setNotice(`Updated ${updatedIds.length} ${getAdapterLabel(bulkAgentHarness(editing[0]))} ${updatedIds.length === 1 ? "agent" : "agents"}.`);
      }
    }} /></Suspense>}
  </div>;
}
