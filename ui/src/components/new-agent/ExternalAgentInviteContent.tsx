import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useId } from "react";
import { AGENT_ROLES, AGENT_ROLE_LABELS } from "@paperclipai/shared";
import type { MuseInvitationDraft } from "@/lib/muse-invitation-draft";
import { Input } from "../ui/input";
import { Link } from "@/lib/router";
import { ArrowLeft, Bot, Check, Circle, CircleAlert, Loader2 } from "lucide-react";
import { AdapterMark } from "../AdapterMark";
import { AgentSetupPrompt } from "../AgentSetupPrompt";
import { Button } from "../ui/button";
import { DialogDescription, DialogTitle } from "../ui/dialog";
import { cn } from "@/lib/utils";

export type ExternalAgentPreset = "dot" | "grok_bot" | "muse" | "hermes" | "other";
export type DotConnectionState = {
  phase: "waiting" | "connected" | "subscribed" | "testing" | "finishing" | "ready";
  problem?: "event_timeout" | "prompt_unavailable" | "offline" | "agent_unavailable";
};

const presets = [
  { id: "dot", name: "Dot", adapter: "openai_dot", description: "Your Dot in ChatGPT" },
  { id: "grok_bot", name: "Grok Bot", adapter: "grok_bot", description: "An existing Bot in Grok" },
  { id: "muse", name: "Muse — Personal agent", adapter: "muse", description: "Your personal Muse at muse.ai" },
  { id: "hermes", name: "Hermes", adapter: "hermes_gateway", description: "An existing Hermes agent" },
  { id: "other", name: "Other", adapter: "http", description: "Any agent that can connect to Paperclip" },
] as const;

export function ExternalAgentPresetPicker({ onSelect, dotDisabledReason, grokDisabledReason, museEnabled = false }: { onSelect: (preset: ExternalAgentPreset) => void; dotDisabledReason?: string; grokDisabledReason?: string; museEnabled?: boolean }) {
  return <div className={cn("grid grid-cols-2 gap-3", !museEnabled && "sm:grid-cols-4")}>
    {presets.filter(preset => preset.id !== "muse" || museEnabled).map(preset => <button
      key={preset.id}
      type="button"
      onClick={() => onSelect(preset.id)}
      disabled={preset.id === "dot" && !!dotDisabledReason || preset.id === "grok_bot" && !!grokDisabledReason}
      title={preset.id === "dot" ? dotDisabledReason : preset.id === "grok_bot" ? grokDisabledReason : undefined}
      className="flex aspect-square flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-3 py-4 text-center transition-colors disabled:opacity-50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <AdapterMark type={preset.adapter} className="size-8" />
      <span className="text-sm font-medium">{preset.name}</span>
      <span className="sr-only">{preset.description}</span>
    </button>)}
  </div>;
}

const checks = [
  { title: "Connected to Paperclip", description: "Your Dot has connected to this agent." },
  { title: "Task updates enabled", description: "Your Dot is subscribed to new assignments and messages." },
  { title: "Test event confirmed", description: "Your Dot received our test and replied to Paperclip." },
];

/** Controlled by server evidence in the invite controller, never by copying a prompt. */
export function DotConnectionChecks({ state }: { state: DotConnectionState }) {
  useInterfaceLanguage();
  const completed = { waiting: 0, connected: 1, subscribed: 2, testing: 2, finishing: 3, ready: 3 }[state.phase];
  const message = state.problem === "agent_unavailable" ? interfaceText("m_b7943a4afdf739")
    : state.problem === "offline" ? interfaceText("m_0ac86248876731")
    : state.problem === "prompt_unavailable" ? interfaceText("m_9e442cc45bdea8")
    : state.problem === "event_timeout" ? interfaceText("m_fe6f905ccbcb86")
    : state.phase === "finishing" ? interfaceText("m_c8ad7564f0de58")
    : state.phase === "ready" ? interfaceText("m_9c2bdcca9627eb")
    : state.phase === "waiting" ? interfaceText("m_f4d8732ff5a556")
    : state.phase === "connected" ? interfaceText("m_468c40a47d620d")
    : interfaceText("m_0987dfc96914db");
  return <section aria-label={interfaceText("m_0c8a99e80eed8f")} className="space-y-4">
    <ol className="space-y-4">
      {checks.map((check, index) => {
        const done = index < completed;
        const failed = index === completed && state.problem === "event_timeout";
        const active = index === completed && !state.problem;
        const Icon = done ? Check : failed ? CircleAlert : active ? Loader2 : Circle;
        return <li key={check.title} className="flex items-start gap-3" aria-current={active ? "step" : undefined}>
          <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", done ? "bg-accent text-foreground" : failed ? "text-destructive" : "text-muted-foreground")}>
            <Icon className={cn("size-4", active && "animate-spin motion-reduce:animate-none")} />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={cn("text-sm", done || active || failed ? "font-medium" : "text-muted-foreground")}>
              {check.title}<span className="sr-only">{done ? interfaceText("m_1fdd2a3e0615a0") : failed ? interfaceText("m_1b7268b694579e") : active ? interfaceText("m_490c5d40186c6e") : interfaceText("m_1c9b478097648c")}</span>
            </p>
            {done && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.description}</p>}
          </div>
        </li>;
      })}
    </ol>
    <p role={state.problem && state.problem !== "prompt_unavailable" ? "alert" : "status"} aria-live="polite" className={cn("text-sm leading-relaxed", state.problem && state.problem !== "prompt_unavailable" ? "text-destructive" : "text-muted-foreground")}>{message}</p>
  </section>;
}

export type MuseConnectionState = {
  paired: boolean;
  receiverDetected: boolean;
  backgroundReplyVerified: boolean;
  ready: boolean;
  finishing?: boolean;
  testing?: boolean;
  problem?: "no_recent_response" | "prompt_unavailable" | "offline" | "agent_unavailable" | "disconnected" | "disabled" | "connection_expired";
};

/** Receiver contact is separate from an authenticated, independent worker reply. */
export function MuseConnectionChecks({ state }: { state: MuseConnectionState }) {
  useInterfaceLanguage();
  const milestones = [
    { title: "Paired with Paperclip", done: state.paired, description: "Paperclip authorized the scoped Muse agent connection." },
    { title: "Receiver detected", done: state.receiverDetected, description: "Paperclip observed a public receiver check. Only an authenticated reply confirms Muse can work." },
    { title: "Background reply verified", done: state.backgroundReplyVerified, description: "Muse replied to an independent background test." },
  ];
  const checksPassed = milestones.every(item => item.done);
  const message = state.problem === "offline" ? interfaceText("m_2d0d62d1da1bc7")
    : state.problem === "disconnected" ? interfaceText("m_33847a47a21bb2")
    : state.problem === "connection_expired" ? interfaceText("m_74afa03cadd4fa")
    : state.problem === "disabled" ? interfaceText("m_06f4a4769acd15")
    : state.problem === "prompt_unavailable" ? interfaceText("m_108001aa6f6caf")
    : state.problem === "agent_unavailable" ? interfaceText("m_ccaecda49c53c9")
    : state.problem === "no_recent_response" ? interfaceText("m_a06e9e19bc200e")
    : state.testing ? interfaceText("m_17cdb043328200")
    : checksPassed && state.ready ? interfaceText("m_682714e43036e9")
    : checksPassed ? interfaceText("m_54e7f02d7a0ae3")
    : !state.paired ? interfaceText("m_25e9eb15362104")
    : !state.receiverDetected ? interfaceText("m_e52de1dc5d7f47")
    : interfaceText("m_0411f9b02a365c");
  return <section aria-label={interfaceText("m_7a76c92733ebdb")} className="space-y-4">
    <ol className="space-y-4">
      {milestones.map(item => <li key={item.title} className="flex items-start gap-3">
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", item.done ? "bg-accent text-foreground" : "text-muted-foreground")}>
          {item.done ? <Check className="size-4" /> : <Circle className="size-4" />}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className={cn("text-sm", item.done ? "font-medium" : "text-muted-foreground")}>
            {item.title}<span className="sr-only">{item.done ? interfaceText("m_1fdd2a3e0615a0") : interfaceText("m_1c9b478097648c")}</span>
          </p>
          {item.done && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}
        </div>
      </li>)}
    </ol>
    <p role="status" aria-live="polite" className="text-sm leading-relaxed text-muted-foreground">{message}</p>
  </section>;
}

/** Shared presentation for the invitation flow. The caller owns invitations and watching. */
export function ExternalAgentInviteContent({
  preset, prompt, companyName, connection, onSelect, onBack, onClose, onCopied, onRetry, onNewPrompt,
  dotDisabledReason, grokDisabledReason, busy = false, error, approvalHref, museEnabled = false, museConnection, museDraft, onMuseDraftChange, onMuseContinue,
}: {
  museEnabled?: boolean;
  museConnection?: MuseConnectionState;
  museDraft?: MuseInvitationDraft;
  onMuseDraftChange?: (draft: MuseInvitationDraft) => void;
  onMuseContinue?: () => void;
  dotDisabledReason?: string;
  grokDisabledReason?: string;
  busy?: boolean;
  error?: string;
  approvalHref?: string;
  preset: ExternalAgentPreset | null;
  prompt: string;
  companyName: string;
  connection: DotConnectionState;
  onSelect: (preset: ExternalAgentPreset) => void;
  onBack: () => void;
  onClose: () => void;
  onCopied: () => void;
  onRetry: () => void;
  onNewPrompt: () => void;
}) {
  useInterfaceLanguage();
  const detailsId = useId();
  const muse = preset === "muse";
  const museDetails = muse && !!museDraft;
  const museAwaitingInvitation = muse && !museDetails && !museConnection && !approvalHref;
  const museReady = muse && !!museConnection?.ready && museConnection.paired && museConnection.receiverDetected && museConnection.backgroundReplyVerified && !museConnection.problem && !museConnection.testing;
  const provider = presets.find(item => item.id === preset);
  const dot = preset === "dot";
  const ready = museReady || (dot && connection.phase === "ready" && !connection.problem);
  const connecting = dot && connection.phase !== "waiting";
  const progressLabel = connection.problem === "agent_unavailable" ? interfaceText("m_d6bf283bee98b1")
    : connection.problem === "offline" ? interfaceText("m_fee1ce1889f2b9")
    : connection.problem === "event_timeout" ? interfaceText("m_c1ebc7817870e5")
    : connection.phase === "finishing" ? interfaceText("m_6e06d26442b0e4")
    : connection.phase === "connected" ? interfaceText("m_72021eb70e91b4") : interfaceText("m_4984b6f091dd1a");
  return <>
    <div className="min-h-0 space-y-6 overflow-y-auto px-6 pb-6 pt-8 sm:px-8">
      <div className="space-y-3 pr-5">
        {muse && <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="size-4" />{interfaceText("m_76900f1bfd16c8")}</Button>}
        {provider && <AdapterMark type={provider.adapter} className="size-10" />}
        <div className="space-y-2">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {!provider ? interfaceText("m_0c21d4548b1504") : muse ? ready ? interfaceText("m_35b1e644000333") : museDetails || museAwaitingInvitation ? interfaceText("m_4af6c11b3221c5") : interfaceText("m_3e78038c450021") : dot ? ready ? interfaceText("m_fb43dfd6e86aee") : interfaceText("m_767ddfb33ac2cd") : preset === "hermes" ? interfaceText("m_ac9065918d5719") : interfaceText("m_ed92323744524a")}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {!provider ? interfaceText("m_eaf1bd5f53b5ea", { value0: (companyName) })
              : muse ? museDetails ? interfaceText("m_9e69dc3926e9b5", { value0: (companyName) })
              : museAwaitingInvitation ? interfaceText("m_5e7ef9e6d8ece5")
              : ready ? interfaceText("m_d5e83324fd4f74", { value0: (companyName) })
              : !prompt && !museConnection?.paired ? interfaceText("m_b752ba886515a2")
              : interfaceText("m_2882d02d5341aa")
              : ready ? interfaceText("m_2385078af875d8", { value0: (companyName) })
              : connection.problem === "agent_unavailable" ? interfaceText("m_f43d4b7282ffab")
              : connection.phase === "finishing" ? interfaceText("m_71c04a6b6ae262")
              : connecting ? interfaceText("m_c3420609adf279")
              : dot ? interfaceText("m_1a2636dd3a80ca")
              : interfaceText("m_c36cee5ecd6d36", { value0: (preset === "hermes" ? "Hermes " : "") })}
          </DialogDescription>
        </div>
      </div>
      {error && <div role="alert" className="space-y-3 text-sm text-destructive"><p>{error}</p>{!museAwaitingInvitation && <Button variant="outline" disabled={busy} onClick={onRetry}>{interfaceText("m_d8b8392e2c5429")}</Button>}</div>}
      {!provider ? <><ExternalAgentPresetPicker onSelect={onSelect} dotDisabledReason={dotDisabledReason} grokDisabledReason={grokDisabledReason} museEnabled={museEnabled} />
        {dotDisabledReason && <p className="text-sm text-muted-foreground">{dotDisabledReason}</p>}{grokDisabledReason && grokDisabledReason !== dotDisabledReason && <p className="text-sm text-muted-foreground">{grokDisabledReason}</p>}</>
        : approvalHref ? <p className="text-sm text-muted-foreground">{interfaceText("m_f6ba32f418285b")}{muse ? "Muse" : "Dot"}{interfaceText("m_40e2a50748a522")}</p>
        : museAwaitingInvitation ? busy ? <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_c896313a41e131")}</p> : null
        : muse && busy && !museDetails && !prompt && !museConnection?.paired ? <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_2bcbde55ab9e1d")}</p>
        : museDetails ? <form id={detailsId} className="space-y-4" onSubmit={event => { event.preventDefault(); if (museDraft.name.trim() && !busy) onMuseContinue?.(); }}>
          <div className="space-y-2">
            <label htmlFor={`${detailsId}-name`} className="text-sm font-medium">{interfaceText("m_1cfb21871a0357")}</label>
            <Input id={`${detailsId}-name`} disabled={busy} autoFocus maxLength={100} value={museDraft.name} placeholder="Muse" onChange={event => onMuseDraftChange?.({ ...museDraft, name: event.target.value })} />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${detailsId}-role`} className="text-sm font-medium">{interfaceText("m_14736a2eb9f415")}</label>
            <select id={`${detailsId}-role`} disabled={busy} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={museDraft.role} onChange={event => {
              const role = AGENT_ROLES.find(value => value === event.target.value);
              if (role) onMuseDraftChange?.({ ...museDraft, role });
            }}>{AGENT_ROLES.map(role => <option key={role} value={role}>{AGENT_ROLE_LABELS[role]}</option>)}</select>
          </div>
          <p className="text-xs text-muted-foreground">{interfaceText("m_67526936d456d7")}</p>
        </form>
        : muse && museConnection ? <>
          <MuseConnectionChecks state={museConnection} />
          {museConnection.problem === "no_recent_response" && <Button variant="outline" disabled={busy} onClick={onRetry}>{interfaceText("m_c97eb158dc61db")}</Button>}
          {museConnection.problem === "offline" && <Button variant="outline" disabled={busy} onClick={onRetry}>{interfaceText("m_73791f628e8319")}</Button>}
          {!museConnection.paired && <a href="https://muse.ai" target="_blank" rel="noopener noreferrer" className="inline-flex text-sm text-foreground underline underline-offset-4">{interfaceText("m_bf2479752678e5")}</a>}
          <p className="text-xs text-muted-foreground">{interfaceText("m_b67a323bfb1a40")}</p>
        </>
        : busy && !prompt && connection.phase === "waiting" ? <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_af6af592f6a377")}</p> : dot ? <>
        <div className="border-t pt-6"><DotConnectionChecks state={connection} />
          {connection.phase === "waiting" && <p className="mt-4 text-xs text-muted-foreground">{interfaceText("m_af3778f52251f5")}</p>}</div>
        {connection.problem === "event_timeout" && <Button variant="outline" disabled={busy} onClick={onRetry}>{interfaceText("m_962ff36dfb2891")}</Button>}
        {connection.problem === "offline" && <Button variant="outline" disabled={busy} onClick={onRetry}>{interfaceText("m_9060b2cfa7f2c8")}</Button>}
      </> : <p className="text-sm leading-relaxed text-muted-foreground">{interfaceText("m_3a84806fff5dd5")}{companyName}{interfaceText("m_e9532a9cad8724")}</p>}
    </div>
    <div className="flex items-center justify-between gap-3 border-t px-6 py-4 sm:px-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={muse ? onClose : provider ? onBack : onClose}>
          {provider && !muse && <ArrowLeft className="size-4" />}{muse ? ready ? interfaceText("m_7d9eb7acb13e24") : interfaceText("m_0bd63bf3d32e91") : provider ? interfaceText("m_76900f1bfd16c8") : interfaceText("m_19766ed6ccb2f4")}
        </Button>
      </div>
      {provider && (approvalHref ? <Button asChild><Link to={approvalHref} onClick={onClose}>{interfaceText("m_3e5b6519eab1df")}</Link></Button>
        : museDetails ? <Button type="submit" form={detailsId} disabled={busy || !museDraft.name.trim()}>{busy ? interfaceText("m_5d1fa38bcf0d88") : interfaceText("m_31fbef162594de")}</Button>
        : ready ? <Button onClick={onClose}>{interfaceText("m_11a6767d5674c7")}</Button>
        : museAwaitingInvitation ? <Button disabled={busy} onClick={onRetry}>{busy ? interfaceText("m_f0e4e00078be3f") : interfaceText("m_f52ee1d3866769")}</Button>
        : muse ? museConnection?.problem === "disconnected" || museConnection?.problem === "connection_expired" ? <Button disabled={busy} onClick={onNewPrompt}>{interfaceText("m_766016a6b56731")}</Button>
          : museConnection?.problem === "prompt_unavailable" ? <Button disabled={busy} onClick={onNewPrompt}>{interfaceText("m_8e13d0695e1503")}</Button>
          : !museConnection?.paired && prompt ? <AgentSetupPrompt key={prompt} prompt={prompt} label={interfaceText("m_9a5d81ccb428b2")} title={interfaceText("m_3e78038c450021")} agent={{ name: "Muse", icon: <Bot className="size-5" /> }} description={interfaceText("m_142ad9ee3b77fd")} align="end" className="min-w-0 shrink" onCopied={onCopied} />
          : busy ? <Button disabled>{interfaceText("m_5d1fa38bcf0d88")}</Button>
          : <Button asChild><a href="https://muse.ai" target="_blank" rel="noopener noreferrer">{interfaceText("m_bf2479752678e5")}</a></Button>
        : connecting ? <Button disabled aria-live="polite">
          {!connection.problem && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {progressLabel}
        </Button>
        : dot && connection.problem === "prompt_unavailable" ? <Button disabled={busy} onClick={onNewPrompt}>{interfaceText("m_8e13d0695e1503")}</Button>
        : !prompt || busy ? <Button disabled>{busy ? interfaceText("m_5d1fa38bcf0d88") : interfaceText("m_356acc5e9e5ffb")}</Button>
        : <AgentSetupPrompt
          key={preset}
          prompt={prompt}
          label={dot ? interfaceText("m_9a5d81ccb428b2") : interfaceText("m_f745c56581a66f")}
          title={dot ? interfaceText("m_767ddfb33ac2cd") : interfaceText("m_ed92323744524a")}
          description={dot ? interfaceText("m_35a46b44f37437") : interfaceText("m_9932ca25cfe410")}
          agent={dot ? { name: "Dot", src: "/brands/adapters/openai-dot.svg" } : undefined}
          align="end"
          className="min-w-0 shrink"
          onCopied={onCopied}
        />)}
    </div>
  </>;
}
