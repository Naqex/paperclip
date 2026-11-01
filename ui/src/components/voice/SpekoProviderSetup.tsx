import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Button } from "@/components/ui/button";
import { SetupWizardFooter } from "@/components/SetupWizard";
import { Input } from "@/components/ui/input";

export interface SpekoProviderSetupProps {
  agentName: string;
  onSaveExit?(): void;
  credentials: Record<string, string>;
  onChange(values: Record<string, string>): void;
  onConnect(values: Record<string, string>): void;
  callbackUrl?: string | null;
  pending?: boolean;
  repairing?: boolean;
  /** Presence only; existing callback secrets never reach the browser. */
  signingSecretConfigured?: boolean;
}
export function SpekoProviderSetup({ agentName, onSaveExit, credentials, onChange, onConnect, callbackUrl, pending = false, repairing = false, signingSecretConfigured }: SpekoProviderSetupProps) {
  useInterfaceLanguage();
  const hasSavedSecret = signingSecretConfigured ?? repairing;
  const ready = repairing && hasSavedSecret || Boolean(credentials.apiKey?.trim() && credentials.agentId?.trim());
  const reachable = callbackUrl?.startsWith("https://") === true;
  function connect() {
    if (!ready || !reachable || pending) return;
    const values = Object.fromEntries(Object.entries(credentials).filter(([, value]) => value.trim()));
    if (!hasSavedSecret && !values.signingSecret) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      values.signingSecret = `whsec_${btoa(String.fromCharCode(...bytes))}`;
      onChange(values);
    }
    onConnect(values);
  }
  return <div className="space-y-5">
    <div>
      <h1 className="text-xl font-bold">{interfaceText("m_3b887c9884f2c9")}{agentName}{interfaceText("m_5c82073fd81cb9")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{interfaceText("m_a17c3314606aa9")}{agentName}{interfaceText("m_5a33b76eabeb27")}</p>
    </div>
    <ol className="list-decimal space-y-2 pl-5 text-sm">
      <li>{interfaceText("m_e58b6dd606ce78")}</li>
      <li>{interfaceText("m_ec78385fb34f30")}</li>
      <li>{interfaceText("m_45661690d6b246")}</li>
    </ol>
    <Button asChild variant="outline"><a href="https://platform.speko.ai/agents" target="_blank" rel="noreferrer">{interfaceText("m_b3e715a9fed655")}</a></Button>
    <label className="grid gap-2 text-sm font-medium">{interfaceText("m_0ffb7f6efc51bc")}<Input autoComplete="off" value={credentials.agentId ?? ""} placeholder={repairing ? interfaceText("m_e519af8a3db776") : "agent_…"} onChange={(event) => onChange({ ...credentials, agentId: event.target.value })} /></label>
    <label className="grid gap-2 text-sm font-medium">{interfaceText("m_8bc494b037d05d")}<Input type="password" autoComplete="new-password" value={credentials.apiKey ?? ""} placeholder={repairing ? interfaceText("m_f93af325a45a3e") : interfaceText("m_fa8108ba83c402")} onChange={(event) => onChange({ ...credentials, apiKey: event.target.value })} /></label>
    {!reachable && <p role="alert" className="text-sm text-destructive">{interfaceText("m_94cb95ed1d45e4")}</p>}
    {reachable && <p className="break-all text-xs text-muted-foreground">{interfaceText("m_076c8e02515f53")}{callbackUrl}</p>}
    <p className="text-sm text-muted-foreground">{interfaceText("m_b6207824f91ae0")}</p>
    {onSaveExit ? <SetupWizardFooter onSaveExit={onSaveExit} disabled={pending}><Button disabled={!ready || !reachable || pending} onClick={connect}>{pending ? interfaceText("m_f72214432a5598") : repairing ? interfaceText("m_74ade6f71c663c") : interfaceText("m_c6a47fd5158cdf")}</Button></SetupWizardFooter> : <div className="flex justify-end"><Button disabled={!ready || !reachable || pending} onClick={connect}>{pending ? interfaceText("m_f72214432a5598") : repairing ? interfaceText("m_74ade6f71c663c") : interfaceText("m_c6a47fd5158cdf")}</Button></div>}
  </div>;
}
