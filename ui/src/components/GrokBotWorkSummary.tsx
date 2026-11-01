import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useQuery } from "@tanstack/react-query";
import { grokBotApi } from "@/api/grokBot";
import { Link } from "@/lib/router";
/** Reports observed Paperclip activity; this is not a provider availability indicator. */
export function GrokBotWorkSummary({ companyId, agentId }: { companyId: string; agentId: string }) {
  useInterfaceLanguage();
  const state = useQuery({ queryKey: ["grok-binding", companyId, agentId], queryFn: ({ signal }) => grokBotApi.connection(companyId, agentId, signal), retry: false, refetchInterval: 10000 });
  const data = state.data, binding = data?.binding, routine = binding?.routine;
  return <div className="space-y-2 text-sm">
    {state.error && <p role="alert" className="text-destructive">{interfaceText("m_87acea8a55f2a6")}{state.error.message}</p>}
    <p>{data?.recoveryNeeded ? interfaceText("m_1ffe056fff955d") : binding?.assignment?.status === "offered" ? interfaceText("m_4f75534ca776f9") : binding?.assignment ? interfaceText("m_9aadca0e4dc087") : routine?.verified ? interfaceText("m_f9ccc2091f616d") : interfaceText("m_4c2f41f8417478")}</p>
    {data?.currentTask && <Link className="underline" to={`/issues/${data.currentTask.id}`}>{data.currentTask.identifier}: {data.currentTask.title}</Link>}
    <p className="text-muted-foreground">{interfaceText("m_ea104792ea7945")}{data?.queuedTaskCount ?? interfaceText("m_ec963ffc911b84")}</p>
    <p className="text-muted-foreground">{interfaceText("m_4a3a0416daf85e")}{routine?.lastContactAt ? new Date(routine.lastContactAt).toLocaleString() : interfaceText("m_1d3efcd60643d3")}</p>
    <p className="text-xs text-muted-foreground">{interfaceText("m_89802309ae6bb9")}</p>
  </div>;
}
