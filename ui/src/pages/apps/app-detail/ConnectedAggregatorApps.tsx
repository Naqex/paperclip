import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RefreshCw } from "lucide-react";
import type { ToolConnection } from "@paperclipai/shared";
import { AGGREGATOR_APP_CATALOG } from "@paperclipai/shared/aggregator-app-catalog";
import { AGGREGATOR_NAMES, type AggregatorAppSnapshot, isAppAggregator } from "@paperclipai/shared/aggregator-apps";
import { useAccountIdentity } from "@/api/companies-query";
import { toolsApi } from "@/api/tools";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import { AppLogo } from "../AppLogo";

const catalogBySlug = new Map(AGGREGATOR_APP_CATALOG.map(app => [app.slug, app]));

export function ConnectedAggregatorApps({ connection }: { connection: ToolConnection }) {
  useInterfaceLanguage();
  const queryClient = useQueryClient();
  const { userId, settled, failed } = useAccountIdentity();
  const queryKey = queryKeys.tools.aggregatorApps(connection.id, userId);
  const firstRefreshFor = useRef<string | null>(null);
  const identityKey = JSON.stringify([connection.id, userId]);
  const query = useQuery({
    queryKey,
    queryFn: () => toolsApi.listAggregatorApps(connection.id),
    enabled: settled,
    retry: false,
    refetchOnWindowFocus: "always",
    refetchInterval: query => query.state.data?.sync.status === "syncing" ? 1500 : 60_000,
  });
  const refresh = useMutation({
    mutationFn: (_viewingUserId: string | null) => toolsApi.syncAggregatorApps(connection.id, true),
    onSuccess: (result, viewingUserId) => queryClient.setQueryData(queryKeys.tools.aggregatorApps(connection.id, viewingUserId), result),
  });
  const data = settled ? query.data : undefined;
  const provider = data?.provider ?? connection.config?.sourceTemplateKey;
  const providerName = isAppAggregator(provider) ? AGGREGATOR_NAMES[provider] : "provider";
  const waitingForFirstRefresh = settled && data?.discovery.availability === "available" && firstRefreshFor.current !== identityKey;
  const syncing = waitingForFirstRefresh || refresh.isPending || data?.sync.status === "syncing";
  const loadFailed = query.isError || failed;
  const syncFailed = refresh.isError || data?.sync.status === "error";
  const unavailable = data && data.discovery.availability !== "available";
  const apps = useMemo(() => {
    const grouped = new Map<string, AggregatorAppSnapshot[]>();
    for (const snapshot of data?.apps ?? []) {
      if (!snapshot.accounts.length) continue;
      grouped.set(snapshot.appSlug, [...(grouped.get(snapshot.appSlug) ?? []), snapshot]);
    }
    return [...grouped.values()].sort((a, b) => a[0].appName.localeCompare(b[0].appName));
  }, [data?.apps]);
  useEffect(() => {
    if (!waitingForFirstRefresh) return;
    firstRefreshFor.current = identityKey;
    refresh.mutate(userId);
  }, [waitingForFirstRefresh, identityKey, refresh.mutate, userId]);

  return <section aria-labelledby="connected-aggregator-apps-heading" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="connected-aggregator-apps-heading" className="text-sm font-semibold">{interfaceText("m_c023d120dd17bd")}</h2>
      <Button variant="outline" size="sm" aria-label={interfaceText("m_7e2470d65d81f4", { value0: (providerName) })}
        disabled={!settled || query.isLoading || syncing || Boolean(unavailable)}
        onClick={() => refresh.mutate(userId)}>
        <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
        {syncing ? interfaceText("m_1c0def7be0607b") : interfaceText("m_7e2470d65d81f4", { value0: (providerName) })}
      </Button>
    </div>
    {loadFailed || syncFailed ? <p role="alert" className="text-sm text-destructive">{interfaceText("m_7fa4522ec766d3")}{providerName}{interfaceText("m_fe6c14957dd239")}{apps.length ? interfaceText("m_4dde8599ad4511") : interfaceText("m_b4caf4617045d9")}
    </p> : null}
    {syncing ? <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_742164951e3125")}{data?.sync.total ? interfaceText("m_72b931efe40b01", { value0: (data.sync.checked), value1: (data.sync.total) }) : ""}
    </p> : refresh.isSuccess && !syncFailed && !unavailable ? <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_3d1a63906a392e")}</p> : null}
    {(!settled && !failed) || query.isLoading ? <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_f8bcca389b9584")}</p>
      : apps.length ? <ul aria-label={interfaceText("m_aa5150ae790303", { value0: (providerName) })} tabIndex={0}
        className="max-h-80 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {apps.map(snapshots => {
          const app = snapshots[0];
          const accounts = [...new Map(snapshots.flatMap(snapshot => snapshot.accounts).map(account => [account.id, account])).values()];
          const stale = loadFailed || syncFailed || unavailable || snapshots.some(snapshot => snapshot.freshness === "stale" || snapshot.errorAt);
          const connected = !stale && accounts.some(account => account.status === "ACTIVE");
          const status = stale ? "Not verified" : connected ? "Connected"
            : accounts.some(account => account.status === "UNVERIFIED") ? "Not verified"
            : accounts.some(account => account.status === "INITIATED") ? "Waiting for sign-in" : "Needs sign-in";
          const logoUrl = catalogBySlug.get(app.appSlug)?.routes.find(route => route.provider === provider)?.logoUrl;
          return <li key={app.appSlug} className="flex items-center gap-3 px-3 py-3">
            <AppLogo name={app.appName} brandKey={app.appSlug} logoUrl={logoUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={app.appName}>{app.appName}</p>
              {accounts.length > 1 ? <p className="text-xs text-muted-foreground">{accounts.length}{interfaceText("m_efa83732e98381")}</p>
                : accounts[0]?.alias ? <p className="truncate text-xs text-muted-foreground">{accounts[0].alias}</p> : null}
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              {connected ? <Check className="size-4 text-(--status-task-done)" aria-hidden="true" /> : null}
              {status}
            </span>
          </li>;
        })}
      </ul> : !loadFailed && !syncFailed && !syncing ? <p className="text-sm text-muted-foreground">
        {data?.discovery.message ?? interfaceText("m_256334ed955cf6", { value0: (providerName) })}
      </p> : null}
  </section>;
}
