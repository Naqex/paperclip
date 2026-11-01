import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useId } from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { AGENT_ROLES, type CreateGrokInvitation, type DotPairing, type GrokConnection } from "@paperclipai/shared";
import { AdapterMark } from "../AdapterMark";
import { AgentSetupPrompt } from "../AgentSetupPrompt";
import { Button, buttonVariants } from "../ui/button";
import { CopyText } from "../CopyText";
import { Input } from "../ui/input";
import { NativeSelect } from "../ui/select";
import { DialogDescription, DialogTitle } from "../ui/dialog";
import { buildGrokAccessPrompt, buildGrokRoutinePrompt } from "@/lib/grok-bot-setup-prompt";
import { Link } from "@/lib/router";

export type GrokSetupStep = 0 | 1 | 2 | 3;
export interface GrokBotSetupContentProps {
  step: GrokSetupStep; companyName: string; details: CreateGrokInvitation;
  created: boolean; loading?: boolean; busy?: boolean; error?: string;
  managers: Array<{ id: string; name: string }>;
  connection?: GrokConnection; pairing: DotPairing | null; approvalHref?: string;
  webhookUrl: string; webhookKey: string; editingCredentials?: boolean;
  onEditCredentials?: () => void;
  onDetails: (details: CreateGrokInvitation) => void;
  onCredentials: (url: string, key: string) => void;
  onBack: () => void; onExit: () => void; onNext: () => void; onRetry: () => void;
}
const steps = ["Identify Bot", "Connect access", "Enable assignments", "Verify"];
export function GrokBotSetupContent(p: GrokBotSetupContentProps) {
  useInterfaceLanguage();
  const pairingCodeId = useId();
  const binding = p.connection?.binding;
  const routine = binding?.routine;
  const exchange = routine?.lastExchange;
  const delivered = exchange?.status === "accepted" || exchange?.status === "acknowledged";
  const replied = !!routine?.verified && exchange?.status === "acknowledged";
  const ready = replied && p.connection?.agentLifecycleState === "ready" && !!p.connection.canConfigureConnection && !routine?.recoveryNeeded;
  const pending = exchange && ["prepared", "sending", "accepted"].includes(exchange.status) && Date.parse(exchange.expiresAt) > Date.now();
  const nextDisabled = p.busy || p.loading || !!p.approvalHref
    || p.step === 0 && (!p.details.name.trim() || !p.details.botName.trim())
    || p.step === 1 && !binding?.connected
    || p.step === 2 && ((!routine?.configured || p.editingCredentials) && (!p.webhookUrl || !p.webhookKey))
    || p.step === 3 && !ready && (!!pending || !!routine?.recoveryNeeded || !!replied);
  return <>
    <div className="min-h-0 space-y-6 overflow-y-auto px-6 pb-6 pt-8 sm:px-8">
      <div className="space-y-3 pr-5">
        <AdapterMark type="grok_bot" className="size-10" />
        <DialogTitle className="text-xl font-semibold tracking-tight">{ready ? interfaceText("m_a7cf4439591fe4") : interfaceText("m_420a47ee9b1314")}</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">{ready ? interfaceText("m_743d7b1eafee48", { value0: (p.details.botName), value1: (p.companyName) }) : interfaceText("m_b152a31d3f7e65", { value0: (p.companyName) })}</DialogDescription>
      </div>
      <ol aria-label={interfaceText("m_98bafa5312be88")} className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
        {steps.map((label, index) => <li key={label} aria-current={p.step === index ? "step" : undefined} className={p.step === index ? "font-medium text-foreground" : ""}>{index + 1}. {label}</li>)}
      </ol>
      {p.error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{p.error}</p><Button variant="outline" disabled={p.busy} onClick={p.onRetry}>{interfaceText("m_d8b8392e2c5429")}</Button></div>}
      {p.loading ? <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_901169ba1f4558")}</p> : p.approvalHref ? <p className="text-sm text-muted-foreground">{interfaceText("m_cef234deef3b63")}</p> : <>
        {p.step === 0 && <div className="space-y-4">
          <label className="block space-y-2 text-sm"><span>{interfaceText("m_3e105c6df94dd4")}</span><Input value={p.details.name} disabled={p.created} onChange={e => p.onDetails({ ...p.details, name: e.target.value })} autoComplete="off" maxLength={100} /></label>
          <label className="block space-y-2 text-sm"><span>{interfaceText("m_7ce17746c341dc")}</span><Input value={p.details.botName} disabled={p.created} onChange={e => p.onDetails({ ...p.details, botName: e.target.value })} autoComplete="off" maxLength={100} /></label>
          <p className="text-xs text-muted-foreground">{interfaceText("m_d8bbdb8e7c0116")}</p>
          <label className="block space-y-2 text-sm"><span>{interfaceText("m_14736a2eb9f415")}</span><NativeSelect disabled={p.created} value={p.details.role ?? "general"} onChange={e => p.onDetails({ ...p.details, role: e.target.value as CreateGrokInvitation["role"] })}>{AGENT_ROLES.map(role => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</NativeSelect></label>
          <label className="block space-y-2 text-sm"><span>{interfaceText("m_8b2085f74dfa9c")}</span><NativeSelect disabled={p.created} value={p.details.reportsTo ?? ""} onChange={e => p.onDetails({ ...p.details, reportsTo: e.target.value || null })}><option value="">{interfaceText("m_6a4ee4d7c34eba")}</option>{p.managers.map(manager => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</NativeSelect></label>
        </div>}
        {p.step === 1 && <div className="space-y-4 text-sm">
          <p>{interfaceText("m_67097a9e9d1f24")}</p>
          {p.connection?.resourceUrl && <AgentSetupPrompt prompt={buildGrokAccessPrompt(p.connection.resourceUrl, p.details.botName)} label={interfaceText("m_00ef6dec23cf3d")} title={interfaceText("m_7174a1fcb71394")} description={interfaceText("m_16729efad19f00")} />}
          {!binding?.connected && p.pairing && <div className="space-y-2">
            <label htmlFor={pairingCodeId}>{interfaceText("m_a83bf13de16cd6")}</label>
            <div className="flex items-center gap-2">
              <Input id={pairingCodeId} value={p.pairing.pairingCode} readOnly type="password" autoComplete="off" />
              <CopyText text={p.pairing.pairingCode} ariaLabel="Copy pairing code" className={buttonVariants({ variant: "outline", size: "sm" })}>{interfaceText("m_49a0053f3b0d50")}</CopyText>
            </div>
            <p className="text-xs text-muted-foreground">{interfaceText("m_7a527d2414a165")}{new Date(p.pairing.expiresAt).toLocaleTimeString()}.</p>
          </div>}
          <p role="status" aria-live="polite" className="text-muted-foreground">{binding?.connected ? interfaceText("m_3e9cd5705e9eb1") : interfaceText("m_f6037a37fd9808")}</p>
          <p className="text-xs text-muted-foreground">{interfaceText("m_fbd02a79bfbc36")}</p>
        </div>}
        {p.step === 2 && <div className="space-y-4 text-sm">
          <p>{interfaceText("m_815bf70a1ffde7")}</p>
          {binding && <AgentSetupPrompt prompt={buildGrokRoutinePrompt(binding.id, p.details.botName)} label={interfaceText("m_83cc147b04f703")} title={interfaceText("m_82c9fc98a82d13")} description={interfaceText("m_957148849bc2db")} />}
          <p className="text-xs text-muted-foreground">{interfaceText("m_23431c53ee980f")}</p>
          {routine?.configured && !p.editingCredentials && !p.webhookUrl && !p.webhookKey ? <div className="space-y-2"><p role="status" className="text-muted-foreground">{interfaceText("m_2a878489c13959")}</p>{p.onEditCredentials && <Button variant="outline" onClick={p.onEditCredentials} disabled={p.busy}>{interfaceText("m_beb7434a0ddea1")}</Button>}</div> : <>
            <label className="block space-y-2"><span>{interfaceText("m_84805a7574a820")}</span><Input value={p.webhookUrl} onChange={e => p.onCredentials(e.target.value, p.webhookKey)} type="password" autoComplete="off" spellCheck={false} /></label>
            <label className="block space-y-2"><span>{interfaceText("m_f120a132ca1a72")}</span><Input value={p.webhookKey} onChange={e => p.onCredentials(p.webhookUrl, e.target.value)} type="password" autoComplete="off" spellCheck={false} /></label>
          </>}
          <p className="text-xs text-muted-foreground">{interfaceText("m_0ff5575ba78968")}</p>
        </div>}
        {p.step === 3 && <section aria-label={interfaceText("m_77dc840ca347dd")} className="space-y-4 text-sm">
          {[{ label: interfaceText("m_10bc291058bfd3"), done: delivered }, { label: interfaceText("m_80fcb67f933148"), done: replied }].map(check => <p key={check.label} className="flex items-center gap-3">{check.done ? <Check className="size-4" /> : pending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Circle className="size-4 text-muted-foreground" />}{check.label}<span className="text-muted-foreground">{check.done ? interfaceText("m_143b270a32602d") : interfaceText("m_6e293a8c009e00")}</span></p>)}
          <p role="status" aria-live="polite" className="text-muted-foreground">{routine?.recoveryNeeded ? interfaceText("m_7aa52a48ba4071") : ready ? interfaceText("m_00785f187a8f8b") : replied ? interfaceText("m_f104d875e04d86") : exchange?.status === "rejected" ? interfaceText("m_9fe5d601be235c") : delivered ? interfaceText("m_0056f69d1413e5") : interfaceText("m_df9324080e3984")}</p>
          <p className="text-xs text-muted-foreground">{interfaceText("m_0e1850076cb5b6")}</p>
        </section>}
      </>}
    </div>
    <div className="flex items-center justify-between gap-3 border-t px-6 py-4 sm:px-8">
      <div className="flex items-center gap-2"><Button variant="ghost" onClick={p.onBack} disabled={p.busy}>{interfaceText("m_76900f1bfd16c8")}</Button><Button variant="ghost" onClick={p.onExit} disabled={p.busy}>{interfaceText("m_0bd63bf3d32e91")}</Button></div>
      {p.approvalHref ? <Button asChild><Link to={p.approvalHref} onClick={p.onExit}>{interfaceText("m_3e5b6519eab1df")}</Link></Button> : <Button onClick={p.onNext} disabled={nextDisabled}>{p.busy ? interfaceText("m_23e39291d61358") : ready ? interfaceText("m_11a6767d5674c7") : p.step === 3 ? pending ? interfaceText("m_319831ee786d7c") : replied ? interfaceText("m_6e06d26442b0e4") : interfaceText("m_7b840072a1e440") : interfaceText("m_31fbef162594de")}</Button>}
    </div>
  </>;
}
