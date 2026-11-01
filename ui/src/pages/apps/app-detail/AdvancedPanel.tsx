import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight, ChevronRight, Loader2, Lock } from "lucide-react";
import type {
  AppDefinition,
  ConnectionGrant,
  ToolConnection,
  ToolConnectionCredentialPolicy,
} from "@paperclipai/shared";
import { connectionCredentialConfigPath, credentialConfigPath, getAvailableConnectionMethod, humanizeConnectionDisplayName } from "@paperclipai/shared";
import { toolsApi } from "@/api/tools";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useToast } from "@/context/ToastContext";
import { redactUrlSecrets } from "@/lib/redact-url-secrets";
import { navigateTopLevel } from "@/lib/browserNavigation";
import { prepareOAuthNavigation, savePendingCloudHandoff } from "@/lib/oauthHandoff";
import { cn } from "@/lib/utils";
import { Link } from "@/lib/router";
import type { AppDetailSectionProps } from "./types";
import { RevokeGrantDialog } from "./IdentitiesSection";

export function AdvancedPanel({
  connection,
  appName,
  galleryEntry,
  removing,
  onRemove,
  onReplaced,
  canReplaceCredential = true,
  credentialUnavailableMessage = "You don't have permission to replace this identity's credential.",
  appToggleDisabled,
  onToggleApp,
  identityGrant = null,
  identityCurrentUserId = null,
  identityProviderName,
  credentialPolicy,
  identityActionPending = false,
  onReconnectIdentity,
  onRevokeIdentity,
}: Pick<AppDetailSectionProps, "connection" | "appName" | "galleryEntry"> & {
  removing: boolean;
  onRemove: () => void;
  onReplaced: () => void;
  canReplaceCredential?: boolean;
  credentialUnavailableMessage?: string;
  appToggleDisabled: boolean;
  onToggleApp: () => void;
  identityGrant?: ConnectionGrant | null;
  identityCurrentUserId?: string | null;
  identityProviderName?: string;
  credentialPolicy?: ToolConnectionCredentialPolicy;
  identityActionPending?: boolean;
  onReconnectIdentity?: () => void;
  onRevokeIdentity?: (grant: ConnectionGrant) => void;
}) {
  return (
    <div className="space-y-4 border-t border-border pt-8">
      <TechnicalDetails connection={connection} />
      <DangerZone
        appName={appName}
        connection={connection}
        galleryEntry={galleryEntry}
        removing={removing}
        onRemove={onRemove}
        onReplaced={onReplaced}
        canReplaceCredential={canReplaceCredential}
        credentialUnavailableMessage={credentialUnavailableMessage}
        toggleDisabled={appToggleDisabled}
        onToggleConnection={onToggleApp}
        identityGrant={identityGrant}
        identityCurrentUserId={identityCurrentUserId}
        identityProviderName={identityProviderName ?? appName}
        credentialPolicy={credentialPolicy}
        identityActionPending={identityActionPending}
        onReconnectIdentity={onReconnectIdentity}
        onRevokeIdentity={onRevokeIdentity}
      />
    </div>
  );
}

function connectionMethodUnavailable(connection: ToolConnection, galleryEntry: AppDefinition | null): boolean {
  const methodKey = connection.config?.connectionMethodKey;
  return typeof methodKey === "string"
    && methodKey.length > 0
    && !!galleryEntry
    && Array.isArray(galleryEntry.methods)
    && !getAvailableConnectionMethod(galleryEntry, methodKey);
}

function KeySection({
  connection,
  galleryEntry,
  onReplaced,
  canReplace,
  unavailableMessage,
}: {
  connection: ToolConnection;
  galleryEntry: AppDefinition | null;
  onReplaced: () => void;
  canReplace: boolean;
  unavailableMessage: string;
}) {
  useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  return (
    <section>
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-medium text-foreground">{interfaceText("m_bf8a9eab9e7e14")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {canReplace ? interfaceText("m_1282f34d91e90a") : unavailableMessage}
            </p>
          </div>
        </div>
        {canReplace && !open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{interfaceText("m_bf8a9eab9e7e14")}</Button>
        )}
      </div>
      {open && (
        <div className="pt-4">
          <ReconnectForm
            connection={connection}
            galleryEntry={galleryEntry}
            onCancel={() => setOpen(false)}
            onReconnected={() => {
              setOpen(false);
              onReplaced();
            }}
          />
        </div>
      )}
    </section>
  );
}

export function ReconnectCard({
  connection,
  galleryEntry,
  onReconnected,
  onReconnect,
  canReconnect = true,
  reconnectUnavailableMessage,
}: {
  connection: ToolConnection;
  galleryEntry: AppDefinition | null;
  onReconnected: () => void;
  onReconnect?: () => void;
  canReconnect?: boolean;
  reconnectUnavailableMessage?: string;
}) {
  useInterfaceLanguage();
  const { pushToast } = useToast();
  const reconnectOAuth = useMutation({
    // Reconnect is not a new identity choice. Personal-only connections must
    // put the replacement token back on the signed-in user's existing grant;
    // shared and legacy fallback connections keep using the organization slot.
    mutationFn: () => connection.credentialPolicy === "per_user"
      ? toolsApi.startOAuth(connection.id, { asCurrentUser: true })
      : toolsApi.startOAuth(connection.id),
    onSuccess: async (start) => {
      try {
        const target = await prepareOAuthNavigation(start);
        if (target.kind === "reauthentication" && start.handoff) {
          savePendingCloudHandoff(start.handoff.session);
        }
        navigateTopLevel(target.url);
      } catch (error) {
        pushToast({
          title: interfaceText("m_33d85fafdf4b27"),
          body: error instanceof Error ? error.message : interfaceText("m_eea4fb33efd382"),
          tone: "error",
        });
      }
    },
    onError: (error) =>
      pushToast({
        title: interfaceText("m_33d85fafdf4b27"),
        body: error instanceof Error ? error.message : interfaceText("m_eea4fb33efd382"),
        tone: "error",
      }),
  });
  const verifyVercel = useMutation({
    mutationFn: () => toolsApi.checkConnectionHealth(connection.id),
    onSuccess: () => {
      pushToast({
        title: interfaceText("m_48706ce3b76e9d"),
        body: interfaceText("m_245c43bf0e30dd", { value0: (humanizeConnectionDisplayName(connection)) }),
        tone: "success",
      });
      onReconnected();
    },
    onError: (error) => pushToast({
      title: interfaceText("m_cf74236aea7405"),
      body: error instanceof Error ? error.message : interfaceText("m_102132d27b88f7"),
      tone: "error",
    }),
  });
  const oauth = connection.authKind === "oauth";
  const managedByVercel = connection.credentialSource === "vercel_connect";
  const methodUnavailable = connectionMethodUnavailable(connection, galleryEntry);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          {methodUnavailable ? interfaceText("m_0d0dbd14e56a12") : oauth ? interfaceText("m_06b42a9189e10d") : interfaceText("m_a05cc2f85c9bf7")}
        </h2>
        <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">
          {methodUnavailable
            ? interfaceText("m_103fb6519c9bea")
            : connection.healthMessage?.trim() || (oauth
            ? interfaceText("m_52f87146b58500")
            : interfaceText("m_912825a71b2da6"))}
        </p>
      </div>
      <div className="shrink-0">
        {!canReconnect ? (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {reconnectUnavailableMessage ?? interfaceText("m_b611d45d5a90a8")}
          </p>
        ) : methodUnavailable ? (
          <Button size="sm" variant="outline" asChild>
            <Link to={`/apps/connect?source=${encodeURIComponent(galleryEntry!.slug)}`}>{interfaceText("m_fa83864532817b")}</Link>
          </Button>
        ) : onReconnect ? (
          <Button size="sm" variant="outline" onClick={onReconnect}>{interfaceText("m_bf8a9eab9e7e14")}</Button>
        ) : managedByVercel && !oauth ? (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" asChild>
              <a href="https://vercel.com/connect" target="_blank" rel="noreferrer">{interfaceText("m_62eb5aa3c1ed34")}<ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={verifyVercel.isPending}
              onClick={() => verifyVercel.mutate()}
            >
              {verifyVercel.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}{interfaceText("m_fb7099ad8e818d")}</Button>
          </div>
        ) : oauth ? (
          <Button
            type="button"
            size="sm"
            disabled={reconnectOAuth.isPending}
            onClick={() => reconnectOAuth.mutate()}
          >
            {reconnectOAuth.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {reconnectOAuth.isPending ? interfaceText("m_530dc05dadaf4f") : interfaceText("m_bf8a9eab9e7e14")}
          </Button>
        ) : (
          <ReconnectForm connection={connection} galleryEntry={galleryEntry} onReconnected={onReconnected} />
        )}
      </div>
    </div>
  );
}

function ReconnectForm({
  connection,
  galleryEntry,
  onCancel,
  onReconnected,
}: {
  connection: ToolConnection;
  galleryEntry: AppDefinition | null;
  onCancel?: () => void;
  onReconnected: () => void;
}) {
  useInterfaceLanguage();
  const { pushToast } = useToast();
  const methodKey = typeof connection.config?.connectionMethodKey === "string"
    ? connection.config.connectionMethodKey
    : null;
  const method = galleryEntry && Array.isArray(galleryEntry.methods)
    ? getAvailableConnectionMethod(galleryEntry, methodKey)
    : null;
  const galleryFields = (method?.credentialFields ?? []).map((field) => ({
    ...field,
    configPath: credentialConfigPath(field, method),
    helpUrl: method?.consoleLinks?.keys ?? method?.consoleLinks?.docs ?? "",
  }));
  const fields = galleryFields.length > 0 ? galleryFields : (connection.credentialRefs ?? [])
    .filter((ref) => ref.placement === "header" || ref.placement === "url")
    .map((ref) => ({
      configPath: connectionCredentialConfigPath(ref),
      label: ref.placement === "url" ? "MCP server URL" : ref.prefix === "Bearer " ? "App key" : ref.key ?? ref.name,
      helpUrl: "",
      required: true,
    }));
  const [values, setValues] = useState<Record<string, string>>({});
  const [single, setSingle] = useState("");
  const usesFields = fields.length > 0;

  const reconnect = useMutation({
    mutationFn: () => {
      const credentialValues = usesFields
        ? values
        : { "credentials.authorization": single.trim() };
      return toolsApi.reconnectConnection(connection.id, credentialValues);
    },
    onSuccess: (result) => {
      const healthy =
        result.connection.healthStatus === "ok" || result.connection.healthStatus === "healthy" || result.connection.healthStatus === "unknown";
      if (healthy) {
        pushToast({
          title: interfaceText("m_20a447dbc60511"),
          body: interfaceText("m_245c43bf0e30dd", { value0: (humanizeConnectionDisplayName(connection)) }),
          tone: "success",
        });
        onReconnected();
      } else {
        pushToast({
          title: interfaceText("m_46d820c55ac737"),
          body: result.connection.healthMessage?.trim() || interfaceText("m_1fb0c9a9651905"),
          tone: "error",
        });
      }
    },
    onError: (error) =>
      pushToast({
        title: interfaceText("m_5bf9a8b27f980e"),
        body: error instanceof Error ? error.message : interfaceText("m_7e751a81bfdcce"),
        tone: "error",
      }),
  });

  const filled = usesFields
    ? fields.every((f) => f.required === false || (values[f.configPath]?.trim().length ?? 0) > 0)
    : single.trim().length > 0;

  if (connection.credentialSource === "vercel_connect") {
    return (
      <p className="text-sm text-muted-foreground">{interfaceText("m_7352a3aada5fa7")}</p>
    );
  }

  return (
    <div className="space-y-3">
      {usesFields ? (
        fields.map((field) => (
          <div key={field.configPath}>
            <label className="text-xs font-medium text-foreground">{field.label}</label>
            <Input
              type="password"
              aria-label={field.label}
              autoComplete="off"
              value={values[field.configPath] ?? ""}
              onChange={(e) => setValues({ ...values, [field.configPath]: e.target.value })}
              placeholder="****************"
              className="mt-1 h-10 font-mono"
            />
            {field.helpUrl && (
              <a
                href={field.helpUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-foreground underline underline-offset-2"
              >{interfaceText("m_30356b73d35acc")}<ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </div>
        ))
      ) : (
        <Input
          type="password"
          aria-label={interfaceText("m_e9ba76956424f7")}
          autoComplete="off"
          value={single}
          onChange={(e) => setSingle(e.target.value)}
          placeholder={interfaceText("m_0dbd3b63d1b73c")}
          className="h-10 font-mono"
        />
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={!filled || reconnect.isPending} onClick={() => reconnect.mutate()}>
          {reconnect.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {reconnect.isPending ? interfaceText("m_2e5f79bb94a8c4") : interfaceText("m_776e8c8fdef759")}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={reconnect.isPending}>{interfaceText("m_19766ed6ccb2f4")}</Button>
        )}
      </div>
    </div>
  );
}

function TechnicalDetails({ connection }: { connection: ToolConnection }) {
  useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center gap-3 py-1 text-left">
            <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{interfaceText("m_51bfffbcdbcfbc")}</span>
            <ChevronRight
              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <dl className="mt-4 grid gap-2 pb-2 text-xs sm:grid-cols-(--gtc-59)">
            <dt className="text-muted-foreground">{interfaceText("m_56ef8f20955f25")}</dt>
            <dd className="break-all font-mono text-foreground">{connectionAddress(connection)}</dd>
            <dt className="text-muted-foreground">{interfaceText("m_baaddf70fb5d43")}</dt>
            <dd className="text-foreground">{connectionTransportLabel(connection.transport)}</dd>
          </dl>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export function DangerZone({
  appName,
  connection,
  galleryEntry = null,
  removing,
  onRemove,
  onReplaced,
  canReplaceCredential = true,
  credentialUnavailableMessage = "You don't have permission to replace this identity's credential.",
  toggleDisabled = false,
  onToggleConnection,
  identityGrant = null,
  identityCurrentUserId = null,
  identityProviderName = appName,
  credentialPolicy,
  identityActionPending = false,
  onReconnectIdentity,
  onRevokeIdentity,
}: {
  appName: string;
  connection?: ToolConnection;
  galleryEntry?: AppDefinition | null;
  removing: boolean;
  onRemove: () => void;
  onReplaced?: () => void;
  canReplaceCredential?: boolean;
  credentialUnavailableMessage?: string;
  toggleDisabled?: boolean;
  onToggleConnection?: () => void;
  identityGrant?: ConnectionGrant | null;
  identityCurrentUserId?: string | null;
  identityProviderName?: string;
  credentialPolicy?: ToolConnectionCredentialPolicy;
  identityActionPending?: boolean;
  onReconnectIdentity?: () => void;
  onRevokeIdentity?: (grant: ConnectionGrant) => void;
}) {
  useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ConnectionGrant | null>(null);
  const paused = connection
    ? connection.enabled === false || connection.status === "disabled"
    : false;
  const methodUnavailable = connection ? connectionMethodUnavailable(connection, galleryEntry) : false;

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setConfirming(false);
      }}
      asChild
    >
      <section>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 py-1 text-left"
          >
            <span className="min-w-0 flex-1 text-sm font-medium text-destructive">{interfaceText("m_fd8b8dae442166")}</span>
            <ChevronRight
              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 divide-y divide-border border-t border-border">
            {connection && onToggleConnection ? (
              <div className="flex items-center justify-between gap-4 py-4">
                <h2 className="text-sm font-medium text-foreground">{interfaceText("m_722c186746f9e6")}</h2>
                <ToggleSwitch
                  aria-label={interfaceText("m_722c186746f9e6")}
                  checked={paused}
                  disabled={toggleDisabled}
                  onCheckedChange={onToggleConnection}
                  size="lg"
                />
              </div>
            ) : null}

            {connection && !methodUnavailable && connection.authKind !== "oauth" ? (
              <div className="py-4">
                <KeySection
                  connection={connection}
                  galleryEntry={galleryEntry}
                  onReplaced={onReplaced ?? (() => undefined)}
                  canReplace={canReplaceCredential}
                  unavailableMessage={credentialUnavailableMessage}
                />
              </div>
            ) : null}

            {connection?.authKind === "oauth" && !methodUnavailable && (onReconnectIdentity || !canReplaceCredential) ? (
              <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{interfaceText("m_bf8a9eab9e7e14")}</p>
                  <p className="text-xs text-muted-foreground">
                    {canReplaceCredential
                      ? interfaceText("m_c6276b5d575521", { value0: (identityProviderName) })
                      : credentialUnavailableMessage}
                  </p>
                </div>
                {canReplaceCredential && onReconnectIdentity ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={identityActionPending}
                    onClick={onReconnectIdentity}
                  >
                    {identityActionPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}{interfaceText("m_bf8a9eab9e7e14")}</Button>
                ) : null}
              </div>
            ) : null}

            {identityGrant?.capabilities?.canRevoke
              && identityGrant.status !== "revoked"
              && onRevokeIdentity ? (
                <div className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{interfaceText("m_c8534276405e47")}</p>
                    <p className="text-xs text-muted-foreground">{interfaceText("m_fa1ff4ff6cd565")}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setRevokeTarget(identityGrant)}
                  >{interfaceText("m_87e6d00bbf53ec")}</Button>
                </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{interfaceText("m_83be3901aaf06a")}</p>
                <p className="text-xs text-muted-foreground">
                  {interfaceText("m_908493374f6dfb", { value0: (appName) })}
                </p>
              </div>
              {confirming ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={removing}>{interfaceText("m_19766ed6ccb2f4")}</Button>
                  <Button variant="destructive" size="sm" onClick={onRemove} disabled={removing}>
                    {removing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}{interfaceText("m_1ca1346fc4f584")}</Button>
                </div>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>{interfaceText("m_2ce428741dc4fb")}</Button>
              )}
            </div>
          </div>
        </CollapsibleContent>

        {revokeTarget && credentialPolicy ? (
          <RevokeGrantDialog
            grant={revokeTarget}
            providerName={identityProviderName}
            pending={identityActionPending}
            credentialPolicy={credentialPolicy}
            isOwnIdentity={revokeTarget.kind === "user" && revokeTarget.subjectUserId === identityCurrentUserId}
            onCancel={() => setRevokeTarget(null)}
            onConfirm={() => {
              onRevokeIdentity?.(revokeTarget);
              setRevokeTarget(null);
            }}
          />
        ) : null}
      </section>
    </Collapsible>
  );
}

export function connectionAddress(connection: ToolConnection): string {
  const config = connection.config ?? connection.transportConfig ?? {};
  const value = config.url ?? config.endpoint ?? config.remoteUrl;
  if (typeof value === "string" && value.trim().length > 0) return redactUrlSecrets(value);
  if (connection.transport === "local_stdio") return "Local command";
  return "Not set";
}

export function connectionTransportLabel(transport: ToolConnection["transport"]): string {
  if (transport === "mcp_remote") return interfaceText("m_3dd421f74afaf4");
  if (transport === "local_stdio") return interfaceText("m_9b08984b3b3f6b");
  return interfaceText("m_b764cdc0eab713");
}
