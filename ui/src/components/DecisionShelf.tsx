import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sun } from "lucide-react";
import type { Agent, AttentionItem } from "@paperclipai/shared";
import { decisionQueuesApi } from "../api/decisionQueues";
import { useToastActions } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { attentionIdleDays } from "../lib/attention";
import { AttentionQueueRow } from "./AttentionQueueRow";
import { IssueGroupHeader } from "./IssueGroupHeader";
import { Button } from "./ui/button";

/**
 * A collapsible shelf header + body (snoozed / dismissed / aging / decided /
 * expired). Shared by the desk and the per-queue page so both collapse the same
 * way across both decision surfaces.
 */
export function Curtain({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count?: number | string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <IssueGroupHeader
        label={count == null ? label : `${label} (${count})`}
        collapsible
        collapsed={!open}
        onToggle={onToggle}
        className="text-muted-foreground"
      />
      {open && <div className="space-y-4">{children}</div>}
    </section>
  );
}

/**
 * An aging-shelf row (§4.4): the standard card, prefaced by an idle-duration
 * label and a "Keep on desk" affordance that clears the shelf flag server-side
 * (P1 retention `keep`). Shared by the desk and the per-queue page.
 */
export function AgingItemRow({
  item,
  companyId,
  now,
  agentMap,
  agents,
  currentUserId,
  expanded,
  onToggleExpand,
  onDismiss,
  onSnooze,
}: {
  item: AttentionItem;
  companyId: string;
  now: number;
  agentMap: Map<string, Agent>;
  agents: Agent[] | undefined;
  currentUserId: string | null;
  expanded: boolean;
  onToggleExpand: (item: AttentionItem) => void;
  onDismiss: (item: AttentionItem) => void;
  onSnooze: (item: AttentionItem, snoozedUntil: string) => void;
}) {
  useInterfaceLanguage();
  const queryClient = useQueryClient();
  const { pushToast } = useToastActions();
  const idleDays = attentionIdleDays(item, now);
  const keep = useMutation({
    mutationFn: () => decisionQueuesApi.setKeep(companyId, item.sourceKind, item.subject.id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attention(companyId) });
      pushToast({ title: interfaceText("m_d5c41d425cac94"), body: item.subject.title ?? undefined, tone: "success" });
    },
    onError: (error) =>
      pushToast({
        title: interfaceText("m_f5156cd3b49f04"),
        body: error instanceof Error ? error.message : interfaceText("m_eea4fb33efd382"),
        tone: "error",
      }),
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-(length:--text-nano) text-muted-foreground">{interfaceText("m_5e16d1a24e5875")}{idleDays} {idleDays === 1 ? interfaceText("m_944c27e5b97ab7") : interfaceText("m_ab51004e9d71a4")}
        </span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-7 gap-1"
          disabled={keep.isPending || item.keep}
          onClick={() => keep.mutate()}
        >
          {keep.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          <Sun className="h-3.5 w-3.5" />
          {item.keep ? interfaceText("m_c159e7465c1ab2") : interfaceText("m_00ede66c9842be")}
        </Button>
      </div>
      <AttentionQueueRow
        item={item}
        companyId={companyId}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onDismiss={onDismiss}
        onSnooze={onSnooze}
        agentMap={agentMap}
        agents={agents}
        showTriage
        currentUserId={currentUserId}
      />
    </div>
  );
}
