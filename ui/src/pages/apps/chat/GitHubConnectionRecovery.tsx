import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useState } from "react";
import { AlertTriangle, CircleHelp, ExternalLink, Loader2 } from "lucide-react";
import type { ChatEndpoint } from "@/api/chatEndpoints";
import { chatEndpointsApi } from "@/api/chatEndpoints";
import { CopyText } from "@/components/CopyText";
import { SetupWizardFooter } from "@/components/SetupWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "@/lib/router";
import { gitHubAppSettingsUrl } from "./GitHubAppIdentity";

export function GitHubConnectionRecoveryNotice({ endpoint }: { endpoint: ChatEndpoint }) {
  useInterfaceLanguage();
  if (!["attention", "revoked"].includes(endpoint.status)) return null;
  return (
    <section aria-label={interfaceText("m_bf67cc37d8339c")} className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
      <div className="min-w-0 space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{endpoint.status === "revoked" ? interfaceText("m_373356aec1904c") : interfaceText("m_bf67cc37d8339c")}</h2>
          <p className="text-sm">{interfaceText("m_434b4363e9192c")}</p>
        </div>
        <Button asChild><Link to={`/apps/chat/connect?provider=github&resume=${endpoint.id}&reconnect=1`}>{interfaceText("m_aa7b6cd1932516")}</Link></Button>
        {(endpoint.lastError || endpoint.healthMessage) && <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{interfaceText("m_51bfffbcdbcfbc")}</summary>
          <p className="mt-2 break-words">{endpoint.lastError ?? endpoint.healthMessage}</p>
        </details>}
      </div>
    </section>
  );
}

export const GITHUB_APP_CREDENTIAL_FIELDS = ["privateKey", "webhookSecret", "clientSecret"] as const;
export type GitHubAppCredentialField = typeof GITHUB_APP_CREDENTIAL_FIELDS[number];
export type GitHubAppCredentials = { appId: string; privateKey: string; webhookSecret: string; clientSecret?: string };

function CredentialLabel({ id, label, help }: { id: string; label: string; help: string }) {
  useInterfaceLanguage();
  return <div className="flex items-center gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Tooltip><TooltipTrigger asChild><button type="button" aria-label={interfaceText("m_43b3b45eda399b", { value0: (label) })} className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
      <CircleHelp className="size-3.5" aria-hidden="true" />
    </button></TooltipTrigger><TooltipContent className="max-w-xs">{help}</TooltipContent></Tooltip>
  </div>;
}

export function GitHubAppRecovery({ endpoint, reconnect, credentialFields, requireAllCredentialFields = false, rotateWebhookSecret = false, rotationAlreadyCommitted = false, onConnect, onExit }: {
  endpoint: ChatEndpoint;
  reconnect: boolean;
  credentialFields?: readonly GitHubAppCredentialField[];
  requireAllCredentialFields?: boolean;
  rotateWebhookSecret?: boolean;
  rotationAlreadyCommitted?: boolean;
  onConnect: (credentials?: GitHubAppCredentials) => Promise<void>;
  onExit: () => void;
}) {
  useInterfaceLanguage();
  const [replace, setReplace] = useState(!!credentialFields || !reconnect);
  const [credentials, setCredentials] = useState<GitHubAppCredentials>({ appId: endpoint.botExternalId ?? "", privateKey: "", webhookSecret: "" });
  const [privateKeyDraft, setPrivateKeyDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fileError, setFileError] = useState("");
  const [rotationSecret, setRotationSecret] = useState("");
  const [rotationGeneration, setRotationGeneration] = useState<string | null>(null);
  const [rotationUncertain, setRotationUncertain] = useState(false);
  const needsPrivateKey = !credentialFields || credentialFields.includes("privateKey");
  const needsWebhookSecret = credentialFields ? credentialFields.includes("webhookSecret") : !reconnect && !["active", "paused", "revoked"].includes(endpoint.status);
  const appName = endpoint.botLabel ?? endpoint.setup?.github?.appName ?? "your existing App";
  const appIdInvalid = !!credentials.appId.trim() && !/^\d+$/.test(credentials.appId.trim());
  const keyInvalid = !!credentials.privateKey.trim() && !/-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(credentials.privateKey);
  const keyLoaded = !!credentials.privateKey.trim() && !keyInvalid && !privateKeyDraft;
  const incomplete = credentialFields
    ? !credentialFields.length || appIdInvalid || keyInvalid || (requireAllCredentialFields
      ? credentialFields.some(field => !credentials[field]?.trim())
      : credentialFields.every(field => !credentials[field]?.trim()))
    : replace && (!credentials.appId.trim() || !credentials.privateKey.trim() || appIdInvalid || keyInvalid || (needsWebhookSecret && !credentials.webhookSecret.trim()));
  const actionLabel = pending ? interfaceText("m_b9094c85afe7f4") : replace ? (reconnect ? interfaceText("m_bf4288cb19cb64") : interfaceText("m_960166595ad0fb")) : interfaceText("m_cd20f6f2a082c7");
  async function connect() {
    setPending(true);
    setError("");
    try { await onConnect(replace ? credentials : undefined); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reconnect GitHub. Try again."); }
    finally { setPending(false); }
  }
  async function checkSavedRotation(expected: string | null | undefined) {
    try {
      const saved = await chatEndpointsApi.get(endpoint.id);
      if (expected !== undefined && (saved.setup?.credentialRotationId ?? null) === expected) {
        setRotationUncertain(false);
        return true;
      }
      setRotationSecret("");
      setRotationGeneration(null);
      setError("The webhook secret changed, but this page did not receive it. Generate another secret and update GitHub.");
    } catch {
      // A failed status read cannot establish that the earlier secret is current.
    }
    setRotationUncertain(true);
    return false;
  }
  async function generateSecret() {
    const previousGeneration = rotationGeneration ?? (rotationSecret ? undefined : endpoint.setup?.credentialRotationId ?? null);
    setPending(true);
    setError("");
    try {
      const result = await chatEndpointsApi.generateSetupSecret(endpoint.id);
      setRotationSecret(result.webhookSecret);
      setRotationGeneration(result.credentialRotationId ?? null);
      setRotationUncertain(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate the webhook secret. Try again.");
      setRotationUncertain(true);
      await checkSavedRotation(previousGeneration);
    }
    finally { setPending(false); }
  }
  return <div className="space-y-6">
    {reconnect && <div className="space-y-3">
      <p className="text-sm">{interfaceText("m_5128bfa26323df")}<strong>{appName}</strong>{interfaceText("m_9e6c8d80dc8581")}</p>
      <p className="text-sm text-muted-foreground">{interfaceText("m_70596a0207f0a5")}</p>
    </div>}
    {rotateWebhookSecret && <section aria-label={interfaceText("m_e0e762da1d3dc1")} className="space-y-3">
      <h2 className="text-base font-semibold">{interfaceText("m_109896d0720892")}</h2>
      <p className="text-sm">{rotationAlreadyCommitted ? interfaceText("m_b5d0c35edede8a") : <>{interfaceText("m_adc8d03232070e")}<a href={gitHubAppSettingsUrl(endpoint)} target="_blank" rel="noreferrer" className="underline">{interfaceText("m_0d112ffa24870b")}</a>{interfaceText("m_a43ed4d74edf4b")}</>}</p>
      <p className="text-sm text-muted-foreground">{interfaceText("m_b2906e4058a1f9")}</p>
      <Button type="button" variant="outline" disabled={pending} onClick={() => void generateSecret()}>{rotationSecret || rotationAlreadyCommitted ? interfaceText("m_8c6f0bacc2e54b") : interfaceText("m_cfbc14dea167cb")}</Button>
      {rotationUncertain && <p role="status" className="text-sm">{interfaceText("m_732460ec58e2f9")}</p>}
      {rotationUncertain && rotationSecret && <Button type="button" variant="outline" disabled={pending} onClick={async () => {
        setPending(true);
        try { if (await checkSavedRotation(rotationGeneration ?? undefined)) setError(""); }
        finally { setPending(false); }
      }}>{interfaceText("m_f9fcdf284d7dce")}</Button>}
      {rotationSecret && !rotationUncertain && <div className="space-y-2">
        <Label htmlFor="github-rotation-secret">{interfaceText("m_2c422ebf28420d")}</Label>
        <Input id="github-rotation-secret" type="password" autoComplete="off" disabled={pending} readOnly value={rotationSecret} />
        {!pending && <CopyText text={rotationSecret} ariaLabel="Copy webhook secret" className="text-sm underline">{interfaceText("m_a6635b8ce0379c")}</CopyText>}
      </div>}
    </section>}
    {error && <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-medium">{rotateWebhookSecret ? interfaceText("m_73295970304936") : replace ? interfaceText("m_d83574caf8857b") : interfaceText("m_14ca9f019a95b0")}</p>
      <p className="break-words">{error}</p>
      <p>{rotateWebhookSecret ? interfaceText("m_9323279432a437") : interfaceText("m_a88096bf0a1e67")}</p>
    </div>}
    {reconnect && !rotateWebhookSecret && !credentialFields && <Button variant="link" className="h-auto p-0" disabled={pending} onClick={() => { setReplace(!replace); setError(""); }}>
      {replace ? interfaceText("m_226b30afa3279e") : interfaceText("m_6527b53672299f")}
    </Button>}
    {replace && <div className="space-y-6">
      <div className="space-y-2 text-sm">
        <h2 className="text-base font-semibold">{reconnect ? interfaceText("m_0cf5ed2b7f007a") : interfaceText("m_9b919bdcab4b6e")}</h2>
        <p><a href={gitHubAppSettingsUrl(endpoint)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">{interfaceText("m_1395525a0077c9")}<ExternalLink className="size-3.5" /></a>{interfaceText("m_22478c86495e7a")}<strong>{appName}</strong>.</p>
        <p className="text-muted-foreground">{interfaceText("m_0effc20d900ddf")}</p>
        {credentialFields && <p className="text-muted-foreground">{interfaceText("m_7cee9aa7ab0de1")}</p>}
      </div>
      {needsPrivateKey && <div className="space-y-2">
        <CredentialLabel id="github-app-id" label="App ID" help="The numeric App ID on the GitHub App’s settings page. This is different from its Client ID or installation ID." />
        <p id="github-app-id-help" className="text-sm text-muted-foreground">{interfaceText("m_26dd0263242680")}<strong>App ID</strong>{interfaceText("m_3949035cd3455d")}{reconnect && interfaceText("m_a55e4f35bfd196")}</p>
        <Input id="github-app-id" aria-describedby="github-app-id-help" inputMode="numeric" value={credentials.appId} disabled={pending} aria-invalid={appIdInvalid} onChange={event => setCredentials({ ...credentials, appId: event.target.value })} />
        {appIdInvalid && <p role="alert" className="text-sm text-destructive">{interfaceText("m_0e8fc54f2c76a4")}</p>}
      </div>}
      {needsPrivateKey && <div className="space-y-2">
        <CredentialLabel id="github-private-key" label={interfaceText("m_477bf990a2b3a4")} help="Upload the .pem file downloaded from this GitHub App, or paste its entire contents, including the BEGIN and END lines." />
        <ol id="github-private-key-help" className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>{interfaceText("m_0d2462e76c0ec7")}<strong>{interfaceText("m_181a6a3d82250e")}</strong>{interfaceText("m_0120f252cdbead")}<strong>{interfaceText("m_97d6253bf89ad5")}</strong>.</li>
          <li>{interfaceText("m_9910d7682bc4ad")}<strong>.pem</strong>{interfaceText("m_799cbd653791cc")}</li>
        </ol>
        <p className="text-sm text-muted-foreground">{interfaceText("m_e4ab5997d623bb")}</p>
        <Input type="file" accept=".pem" aria-label={interfaceText("m_917d8f6a5c185b")} disabled={pending} onChange={async event => {
          const file = event.target.files?.[0];
          if (!file) return;
          setFileError("");
          try {
            const privateKey = await file.text();
            setCredentials(current => ({ ...current, privateKey }));
            setPrivateKeyDraft("");
          } catch { setFileError("Could not read this file. Try again or paste the key below."); }
        }} />
        <Input id="github-private-key" type="password" autoComplete="off" placeholder={keyLoaded ? interfaceText("m_8dd1ed34861323") : interfaceText("m_7e25afcabe1503")} aria-describedby="github-private-key-help" disabled={pending} value={privateKeyDraft} aria-invalid={keyInvalid}
          onPaste={event => { event.preventDefault(); setCredentials({ ...credentials, privateKey: event.clipboardData.getData("text") }); setPrivateKeyDraft(""); setFileError(""); }}
          onChange={event => { setPrivateKeyDraft(event.target.value); setCredentials({ ...credentials, privateKey: event.target.value }); }} />
        {keyLoaded && <p role="status" className="text-sm">{interfaceText("m_0b0018ad920f9a")}</p>}
        {keyInvalid && <p role="alert" className="text-sm text-destructive">{interfaceText("m_443c26ee715e93")}</p>}
        {fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
        <a className="inline-flex items-center gap-1 text-sm underline" href="https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps" target="_blank" rel="noreferrer">{interfaceText("m_9793075cb176ac")}<ExternalLink className="size-3.5" /></a>
      </div>}
      {needsWebhookSecret && <div className="space-y-2">
        <CredentialLabel id="github-webhook-secret" label={interfaceText("m_342da97208cceb")} help="The secret configured for this App’s webhook. It must match GitHub exactly." />
        <p className="text-sm text-muted-foreground">{interfaceText("m_2ce549548ba3a1")}</p>
        <Input id="github-webhook-secret" type="password" autoComplete="off" disabled={pending} value={credentials.webhookSecret} onChange={event => setCredentials({ ...credentials, webhookSecret: event.target.value })} />
      </div>}
      {credentialFields?.includes("clientSecret") && <div className="space-y-2">
        <CredentialLabel id="github-client-secret" label={interfaceText("m_4aded5faf15623")} help="The client secret for this GitHub App’s user authentication. Leave the saved private key in place." />
        <Input id="github-client-secret" type="password" autoComplete="off" disabled={pending} value={credentials.clientSecret ?? ""} onChange={event => setCredentials({ ...credentials, clientSecret: event.target.value })} />
      </div>}
    </div>}
    <SetupWizardFooter onSaveExit={onExit} disabled={pending}>
      <Button aria-label={actionLabel} disabled={pending || incomplete || rotationUncertain || (rotateWebhookSecret && !rotationSecret && !rotationAlreadyCommitted)} onClick={() => void connect()}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        <span className="sm:hidden" aria-hidden="true">{pending ? interfaceText("m_ec963ffc911b84") : reconnect ? interfaceText("m_bf8a9eab9e7e14") : interfaceText("m_1a2303ede07493")}</span>
        <span className="hidden sm:inline" aria-hidden="true">{actionLabel}</span>
      </Button>
    </SetupWizardFooter>
  </div>;
}
