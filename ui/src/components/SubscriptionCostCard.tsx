import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SUBSCRIPTION_CURRENCIES, centsToUsd, usdToCents, type SubscriptionAccountReport, type SubscriptionCostReport, type SubscriptionUsage } from "@paperclipai/shared";
import { subscriptionsApi } from "../api/subscriptions";
import { formatCents, formatDateTime, formatTokens, providerDisplayName } from "../lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function subscriptionMoney(cents: string, currency: string) {
  return currency === "USD" ? formatCents(Number(cents))
    : new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "code" }).format(Number(cents) / 100);
}

export function SubscriptionTokenUsage({ usage }: { usage: SubscriptionUsage }) {
  useInterfaceLanguage();
  return <span className="font-mono text-xs text-muted-foreground">
    {formatTokens(usage.inputTokens + usage.cachedInputTokens)}{interfaceText("m_6c0f0853571446")}{formatTokens(usage.outputTokens)}{interfaceText("m_34ae63eca17174")}{usage.cachedInputTokens > 0 && <span className="block">{formatTokens(usage.cachedInputTokens)}{interfaceText("m_bb2c1e0acc28e5")}</span>}
  </span>;
}

function SubscriptionEditor({ account, accounts, companyId, onDone }: {
  account: SubscriptionAccountReport; accounts: SubscriptionAccountReport[]; companyId: string; onDone: () => void;
}) {
  useInterfaceLanguage();
  const [plan, setPlan] = useState(account.price.plan);
  const [amount, setAmount] = useState(account.price.amountCents == null ? "" : centsToUsd(account.price.amountCents).replace(/\.?0+$/, ""));
  const [currency, setCurrency] = useState(account.price.currency);
  const [cadence, setCadence] = useState(account.price.cadence);
  const [status, setStatus] = useState(account.price.status);
  const [targetId, setTargetId] = useState("");
  const save = useMutation({ mutationFn: () => subscriptionsApi.update(companyId, account.id, {
    expectedRevision: account.price.revision, plan, amountCents: amount.trim() ? usdToCents(amount.trim()) : null,
    currency: currency as typeof SUBSCRIPTION_CURRENCIES[number], cadence, status,
  }), onSuccess: onDone });
  const link = useMutation({ mutationFn: () => subscriptionsApi.link(companyId, account.id, targetId, account.price.revision,
    accounts.find(row => row.id === targetId)!.price.revision), onSuccess: onDone });
  const targets = accounts.filter(row => row.id !== account.id && row.provider === account.provider && row.canEdit);
  const busy = save.isPending || link.isPending;
  const selectClass = "h-9 rounded-md border border-input bg-background px-3 text-sm";
  return <div className="space-y-5">
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <div className="space-y-2"><Label htmlFor="subscription-plan">Plan</Label><Input id="subscription-plan" value={plan} onChange={event => setPlan(event.target.value)} required maxLength={100} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="subscription-price">{interfaceText("m_7dbebe108aca74")}</Label><Input id="subscription-price" type="number" min="0" step="any" value={amount} placeholder={interfaceText("m_b764cdc0eab713")} onChange={event => setAmount(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="subscription-currency">{interfaceText("m_3ac1a9ec4fa7a9")}</Label><select id="subscription-currency" className={selectClass} value={currency} onChange={event => setCurrency(event.target.value)}>{SUBSCRIPTION_CURRENCIES.map(code => <option key={code}>{code}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="subscription-cadence">{interfaceText("m_b3a9f29f68ac9c")}</Label><select id="subscription-cadence" className={selectClass} value={cadence} onChange={event => setCadence(event.target.value as typeof cadence)}><option value="month">{interfaceText("m_9b11f6b707d2a0")}</option><option value="year">{interfaceText("m_1ec9d1d50f1458")}</option></select></div>
        <div className="space-y-2"><Label htmlFor="subscription-status">{interfaceText("m_36b6ca1886195c")}</Label><select id="subscription-status" className={selectClass} value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="active">{interfaceText("m_92340695899bd2")}</option><option value="ended">{interfaceText("m_5048e351a312ac")}</option><option value="excluded">{interfaceText("m_eb7eb0156ec259")}</option></select></div>
      </div>
      <p className="text-xs text-muted-foreground">{interfaceText("m_ef0679af81092d")}</p>
      {save.error && <p role="alert" className="text-sm text-destructive">{interfaceText("m_fd0a8b5173130d")}</p>}
      <div className="flex items-center justify-between"><Button type="button" variant="ghost" disabled={busy} onClick={onDone}>{interfaceText("m_19766ed6ccb2f4")}</Button><Button type="submit" disabled={busy}>{save.isPending ? interfaceText("m_23e39291d61358") : interfaceText("m_3ae1d715e782a9")}</Button></div>
    </form>
    {targets.length > 0 && <div className="space-y-2 border-t border-border pt-4">
      <Label htmlFor="subscription-link">{interfaceText("m_6d632248cbe87c")}</Label>
      <select id="subscription-link" className={selectClass} value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">{interfaceText("m_0e4dbf48c2e075")}</option>{targets.map(row => <option key={row.id} value={row.id}>{row.name} · {row.price.plan}</option>)}</select>
      <p className="text-xs text-muted-foreground">{interfaceText("m_e3bd59a075e4aa")}</p>
      {link.error && <p role="alert" className="text-sm text-destructive">{interfaceText("m_e6091b8283d098")}</p>}
      <Button type="button" variant="outline" disabled={!targetId || busy} onClick={() => link.mutate()}>{interfaceText("m_5f1d8bf69664b3")}</Button>
    </div>}
  </div>;
}

export function SubscriptionCostCard({ companyId, report, error, onChanged }: {
  companyId: string; report?: SubscriptionCostReport; error?: unknown; onChanged: () => void;
}) {
  useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionAccountReport | null>(null);
  const closeEditor = () => { setEditing(null); onChanged(); };
  const known = report?.monthlyTotals.length;
  const estimatedCount = report?.monthlyTotals.reduce((sum, total) => sum + total.estimatedCount, 0) ?? 0;
  return <>
    <Card className="block p-4">
      <div className="text-(length:--text-micro) uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{interfaceText("m_a151f2e912fe8d")}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">
        {known ? report!.monthlyTotals.map(total => <div key={total.currency}>{subscriptionMoney(total.amountCents, total.currency)}<span className="text-sm font-normal">{interfaceText("m_eec5d08bc9b291")}</span></div>) : report && report.activeCount === 0 && report.accounts.length > 0 ? interfaceText("m_e5e2e135f6c9d8") : "—"}
      </div>
      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
        {report ? <>
          {estimatedCount > 0 && <div><Badge variant="outline" className="font-normal text-muted-foreground">{estimatedCount < report.activeCount - report.unknownPriceCount ? interfaceText("m_4178459d7eab9d") : interfaceText("m_b774599a9cd1f9")}</Badge></div>}
          {report.unknownPriceCount > 0 && !!known && <div>{interfaceText("m_2920eb5cab3018")}</div>}
          <div>{report.accounts.length === 0 ? interfaceText("m_d31142aa935343") : <>{report.activeCount}{interfaceText("m_84064be1b536ba")}{report.activeCount === 1 ? interfaceText("m_a8fa7fd6089341") : interfaceText("m_9cac91c1f54423")}{report.unknownPriceCount > 0 && interfaceText("m_0adc9f94edf403", { value0: (report.unknownPriceCount), value1: (report.unknownPriceCount === 1 ? "price" : "prices") })}</>}</div>
          {report.accounts.length > 0 && <div>{interfaceText("m_44398b734dd44f")}</div>}
          {report.unidentifiedAccountCount > 0 && <div>{report.unidentifiedAccountCount}{interfaceText("m_fdd23b00b9db70")}{report.unidentifiedAccountCount === 1 ? interfaceText("m_abdd1e9d0f48b5") : interfaceText("m_dede4eae1c0926")}</div>}
          <SubscriptionTokenUsage usage={report.subscription} />
        </> : error ? <div>{interfaceText("m_0432221536035c")}</div> : <div>{interfaceText("m_d98d84b2eaa511")}</div>}
        {report && error ? <div>{interfaceText("m_dc480d4f013f55")}</div> : null}
      </div>
      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOpen(true)} disabled={!report}>{interfaceText("m_d1bf045bb524da")}</Button>
    </Card>
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setEditing(null); }}>
      <DialogContent className="max-h-(--sz-80vh) overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{editing ? interfaceText("m_c0c1679b46bfcf") : interfaceText("m_a151f2e912fe8d")}</DialogTitle><DialogDescription>{interfaceText("m_c73e113624cbb8")}</DialogDescription></DialogHeader>
        {editing ? <SubscriptionEditor key={editing.id} companyId={companyId} account={editing} accounts={report?.accounts ?? []} onDone={closeEditor} /> : <div className="space-y-4">
          {report?.accounts.length === 0 && <p className="text-sm text-muted-foreground">{interfaceText("m_c0ee05c77f4edd")}</p>}
          {report?.accounts.map(account => <div key={account.id} className="space-y-2 border-b border-border pb-4 last:border-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="font-medium">{account.name}</div><div className="text-xs text-muted-foreground">{account.shared ? interfaceText("m_e3c4b39d6d5013") : account.ownerName ?? (account.ownerUserId ? interfaceText("m_801ba134b137a7") : interfaceText("m_66d74d1a1a11df"))} · {providerDisplayName(account.provider)} · {account.price.plan}</div></div>
              <div className="text-right"><div className="font-mono">{account.price.status !== "active" ? account.price.status === "ended" ? interfaceText("m_7cdc804e699699") : interfaceText("m_bef1fd9e5caea8") : account.price.monthlyCents == null ? interfaceText("m_d7ffab45541e0c") : interfaceText("m_17ae677cbecbaf", { value0: (subscriptionMoney(account.price.monthlyCents, account.price.currency)) })}</div><div className="text-xs text-muted-foreground">{account.price.source === "catalog" ? interfaceText("m_f79d3c1d9c3766") : account.price.source === "user" ? interfaceText("m_b4a10447154a93") : ""}{account.price.cadence === "year" ? interfaceText("m_e590f6a9ca4708") : ""}</div></div>
            </div>
            <SubscriptionTokenUsage usage={account.usage} />
            {Number(account.usage.costCents) > 0 && <div className="text-xs text-muted-foreground">{formatCents(Number(account.usage.costCents))}{interfaceText("m_f12b72f77dfce8")}</div>}
            {account.agents.length > 0 && <div className="text-xs text-muted-foreground">{interfaceText("m_77c809f8633abf")}{account.agents.map(agent => agent.name).join(", ")}</div>}
            {!account.identityVerified && <p className="text-xs text-muted-foreground">{interfaceText("m_bed366686e1b74")}</p>}
            {account.observedAt && <div className="text-xs text-muted-foreground">{interfaceText("m_c9c61273474bb0")}{formatDateTime(account.observedAt)}{account.refreshStatus === "unavailable" ? interfaceText("m_f77a05df7f6309") : ""}</div>}
            {account.refreshStatus === "unavailable" && !account.observedAt && <p className="text-xs text-muted-foreground">{interfaceText("m_e7ca998bd77436")}</p>}
            {account.canEdit && <div><Button variant="outline" size="sm" onClick={() => setEditing(account)}>{interfaceText("m_75ac63a61163e8")}</Button></div>}
          </div>)}
          {!!report?.unattributedSubscription.eventCount && <p className="text-xs text-muted-foreground">{interfaceText("m_cd467c7cdff476")}</p>}
          <p className="text-xs text-muted-foreground">{interfaceText("m_6311f5d2205077")}</p>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
