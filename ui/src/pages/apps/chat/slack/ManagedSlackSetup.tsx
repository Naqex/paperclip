import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { slackRegistrationErrorMessage } from "@paperclipai/shared";
import { chatEndpointsApi } from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SetupWizardFooter } from "@/components/SetupWizard";
import type { OwnSlackAppSetup } from "./OwnSlackAppSetup";
import { prepareOAuthNavigation, savePendingCloudHandoff } from "@/lib/oauthHandoff";
import { sanitizedSetupErrorMessage } from "../chat-setup-error";

export function ManagedSlackSetup({ endpoint, disabled, saveDetails, onSaved, onBusy, onSaveExit, autoStart = false, reconnect = false }: ComponentProps<typeof OwnSlackAppSetup> & { autoStart?: boolean; reconnect?: boolean }) {
  useInterfaceLanguage();
  const choices = useQuery({ queryKey: ["slack-managed-workspaces", endpoint.companyId], queryFn: () => chatEndpointsApi.slackSetupOptions(endpoint.companyId), retry: false });
  const [selectedGrant, setSelectedGrant] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inFlight = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const registration = endpoint.setup?.slackRegistration;
  const started = Boolean(registration);
  const workspaces = choices.data?.workspaces ?? [];
  const grantId = registration?.managerGrantId ?? selectedGrant ?? (workspaces.length === 1 ? workspaces[0]!.grantId : null);
  const needsAuthorization = !grantId || registration?.errorCode === "slack_manager_reauthorize" || Boolean(grantId && !workspaces.some(workspace => workspace.grantId === grantId));
  const uncertain = registration?.status === "uncertain";
  const creating = registration?.status === "creating";
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); onBusy(true); setError(null);
    try { await action(); }
    catch (failure) { setError(sanitizedSetupErrorMessage(failure, {})); await Promise.allSettled([choices.refetch(), chatEndpointsApi.get(endpoint.id).then(onSaved)]); }
    finally { inFlight.current = false; setBusy(false); onBusy(false); }
  }
  async function authorize() {
    const authorization = await chatEndpointsApi.authorizeSlackManager(endpoint.id);
    const target = await prepareOAuthNavigation(authorization);
    if (target.kind === "reauthentication" && authorization.handoff) savePendingCloudHandoff(authorization.handoff.session);
    window.location.assign(target.url);
  }
  async function connect() {
    if (needsAuthorization || !grantId) {
      await authorize(); return;
    }
    if (!started) await saveDetails();
    if (confirmed || registration?.status === "failed") requestId.current = crypto.randomUUID();
    const input = { requestId: requestId.current, grantId, ...(reconnect ? { reconnect: true } : {}), ...(confirmed ? { confirmedNoAppCreated: true } : {}) };
    setConfirmed(false);
    const result = await chatEndpointsApi.provisionManagedSlack(endpoint.id, input);
    await choices.refetch();
    onSaved(await chatEndpointsApi.get(endpoint.id));
    if (result.authorization) window.location.assign(result.authorization.authorizationUrl);
  }
  const autoStarted = useRef(false);
  useEffect(() => {
    // Only fresh setup can start itself. Declines, uncertain creation, and saved
    // registration recovery require an explicit action and never recreate an app.
    if (!autoStart || autoStarted.current || disabled || !choices.data?.managedAvailable
      || choices.isFetching || choices.isError || started || endpoint.setup?.slackManagerError
      || workspaces.length > 1) return;
    autoStarted.current = true;
    void run(connect);
  });
  const setupError = (code: string) => code === "slack_manifest_update_pending"
    ? "Your app was created. Retry to finish its configuration."
    : code === "slack_creation_uncertain" ? "Slack may have created your app. Check Slack app settings before trying again."
    : slackRegistrationErrorMessage(code);
  const message = error ?? (endpoint.setup?.slackManagerError ? setupError(endpoint.setup.slackManagerError) : null) ?? (choices.isError ? interfaceText("m_26ce6ba4f19ab6") : registration?.errorCode ? setupError(registration.errorCode) : null);
  return <div className="space-y-5">
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
    {busy || choices.isPending || creating ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{busy ? needsAuthorization ? interfaceText("m_ec985dcdcf1852") : interfaceText("m_51d07201b1df0b") : creating ? interfaceText("m_6a6fceb68d20a0") : interfaceText("m_361da6bf2e8af9")}</p>
      : !choices.data?.managedAvailable ? <p className="text-sm">{interfaceText("m_b1c3356d88a72d")}</p>
      : <>
        {workspaces.length === 1 && <p className="text-sm">{interfaceText("m_8d89e4a829ae84")}<strong>{endpoint.assignedAgentName}</strong>{interfaceText("m_87721689ee42f4")}<strong>{workspaces[0]!.workspaceName}</strong>.</p>}
        {workspaces.length > 1 && <Select value={grantId ?? ""} onValueChange={setSelectedGrant} disabled={busy || started}>
          <SelectTrigger aria-label={interfaceText("m_66b905fa46e908")}><SelectValue placeholder={interfaceText("m_9c9144e86170dd")} /></SelectTrigger>
          <SelectContent>{workspaces.map(workspace => <SelectItem key={workspace.grantId} value={workspace.grantId}>{workspace.workspaceName}</SelectItem>)}</SelectContent>
        </Select>}
        {(!started || registration?.errorCode === "slack_manager_reauthorize") && workspaces.length > 0 && <div><Button variant="link" className="h-auto p-0" disabled={busy} onClick={() => void run(authorize)}>{started ? interfaceText("m_7badbf546d9dc9") : interfaceText("m_8ec2c2856421f0")}</Button></div>}
      </>}
    {uncertain && <div className="space-y-3 text-sm">
      <a className="underline underline-offset-4" href={registration?.managementUrl ?? "https://api.slack.com/apps"} target="_blank" rel="noopener noreferrer">{interfaceText("m_9d209c9d8a5b06")}</a>
      <label className="flex items-center gap-2"><Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} disabled={busy} />{interfaceText("m_9e3ee61e356ef7")}</label>
    </div>}
    <SetupWizardFooter onSaveExit={onSaveExit} disabled={busy}>
      {choices.isError || !choices.isPending && !choices.data?.managedAvailable ? <Button disabled={busy || choices.isFetching} onClick={() => void choices.refetch()}>{interfaceText("m_942087cc2d41e0")}</Button> : <Button disabled={busy || disabled || creating || choices.isPending || !choices.data?.managedAvailable || (workspaces.length > 1 && !grantId) || (uncertain && !confirmed)} onClick={() => void run(connect)}>
        {busy && <Loader2 className="size-4 animate-spin" />}{needsAuthorization && started ? interfaceText("m_49de1e8399e418") : registration?.appId ? interfaceText("m_7758c26afc7326") : interfaceText("m_31fbef162594de")}
      </Button>}
    </SetupWizardFooter>
  </div>;
}
