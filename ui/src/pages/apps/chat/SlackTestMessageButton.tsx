import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Send } from "lucide-react";
import type { SlackTestMessageResult } from "@paperclipai/shared";
import { chatEndpointsApi } from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { queryKeys } from "@/lib/queryKeys";

export function SlackTestMessageButton({ endpointId }: { endpointId: string }) {
  useInterfaceLanguage();
  const queryClient = useQueryClient();
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [accounts, setAccounts] = useState<Extract<SlackTestMessageResult, { status: "connection_required" }>["accounts"] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [invitationExpired, setInvitationExpired] = useState(false);
  const [search, setSearch] = useState("");
  const send = useMutation({
    mutationFn: (input: { slackUserId?: string; accountCursor?: string; requestId?: string }) => chatEndpointsApi.sendSlackTestMessage(endpointId, { requestId, ...input }),
    onSuccess: (result, input) => {
      if (result.status === "connection_required") {
        setAccounts(previous => input.accountCursor ? [...new Map([...(previous ?? []), ...result.accounts].map(account => [account.id, account])).values()] : result.accounts);
        setNextCursor(result.nextCursor);
        return;
      }
      setAccounts(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.chatEndpoints.principals(endpointId) });
    },
  });
  const sent = send.data?.status === "sent";
  const pendingConnection = send.data?.status === "connection_pending" ? send.data : null;
  useEffect(() => {
    setInvitationExpired(false);
    if (!pendingConnection) return;
    const timer = setTimeout(() => setInvitationExpired(true), Math.max(0, new Date(pendingConnection.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timer);
  }, [pendingConnection?.expiresAt]);
  const principals = useQuery({
    queryKey: queryKeys.chatEndpoints.principals(endpointId),
    queryFn: () => chatEndpointsApi.listPrincipals(endpointId),
    enabled: Boolean(pendingConnection) && !invitationExpired, refetchInterval: pendingConnection && !invitationExpired ? 3000 : false,
  });
  const confirmed = Boolean(pendingConnection && principals.data?.some(link => link.principalId === pendingConnection.principalId && link.status === "linked"));
  useEffect(() => {
    if (confirmed && !send.isPending && !send.isError) send.mutate({ slackUserId: selected });
  }, [confirmed, send.isPending, send.isError]);
  const reset = () => { setRequestId(crypto.randomUUID()); send.reset(); };
  const startTest = () => {
    if (invitationExpired) {
      const next = crypto.randomUUID(); setRequestId(next);
      send.mutate({ requestId: next, slackUserId: selected });
    } else send.mutate({});
  };
  return <div className="space-y-2">
      <Button variant="outline" disabled={send.isPending || sent || Boolean(pendingConnection && !invitationExpired)} onClick={startTest}>
        {send.isPending ? <Loader2 className="size-4 animate-spin" /> : sent ? <Check className="size-4" /> : <Send className="size-4" />}
        {send.isPending ? interfaceText("m_b8ed5279e897be") : sent ? interfaceText("m_c0918a3cb3fa06") : invitationExpired ? interfaceText("m_611e58aba15deb") : pendingConnection ? interfaceText("m_25c3e4b2438cee") : interfaceText("m_6086eb7ca35d60")}
      </Button>
    {pendingConnection && <p role="status" className="text-sm text-muted-foreground">{invitationExpired ? interfaceText("m_cb1dcf6df0466f") : interfaceText("m_47d97721d95c0b")}</p>}
    {send.isError && <div role="alert" className="max-w-sm text-sm text-destructive">
      {send.error.message} <button className="underline" onClick={reset}>{interfaceText("m_48845bff334a50")}</button>
    </div>}
    <Dialog open={accounts !== null} onOpenChange={(open) => { if (!open && !send.isPending) setAccounts(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{interfaceText("m_afd67dc63f4e0d")}</DialogTitle>
          <DialogDescription>{interfaceText("m_a016724ffe89e6")}</DialogDescription>
        </DialogHeader>
        <Input aria-label={interfaceText("m_76ad700426e421")} placeholder={interfaceText("m_1cde852356d5d6")} value={search} onChange={event => setSearch(event.target.value)} />
        <div className="max-h-64 space-y-1 overflow-y-auto" role="radiogroup" aria-label={interfaceText("m_aa3bf950fb191b")}>
          {accounts?.filter(account => `${account.name} ${account.id}`.toLowerCase().includes(search.toLowerCase())).map(account =>
            <label key={account.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm">
              <input type="radio" name="slack-account" value={account.id} checked={selected === account.id} onChange={() => setSelected(account.id)} />
              <span>{account.name} <span className="text-muted-foreground">({account.id})</span></span>
            </label>)}
          {accounts?.length === 0 && <p className="text-sm text-muted-foreground">{interfaceText("m_226b8dc715b087")}</p>}
        </div>
        {nextCursor && <Button variant="ghost" disabled={send.isPending} onClick={() => send.mutate({ accountCursor: nextCursor })}>{interfaceText("m_1a2321376ef413")}</Button>}
        {send.isError && <p role="alert" className="text-sm text-destructive">{send.error.message}</p>}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" disabled={send.isPending} onClick={() => setAccounts(null)}>{interfaceText("m_19766ed6ccb2f4")}</Button>
          <Button disabled={!selected || send.isPending} onClick={() => send.mutate({ slackUserId: selected })}>{send.isPending ? interfaceText("m_04bbb6e0c246d8") : interfaceText("m_a630d1c3096e29")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
