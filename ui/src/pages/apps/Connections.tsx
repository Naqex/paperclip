import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { isRetiredComposioConnection, RETIRED_COMPOSIO_MESSAGE } from "@paperclipai/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppWindow, Cloud, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, Trash2 } from "lucide-react";
import type {
  ToolApplication,
  ToolConnection,
  ToolProfileWithDetails,
} from "@paperclipai/shared";
import {
  humanizeConnectionDisplayName,
  isToolConnectionAttentionHealth as isAttentionHealthStatus,
} from "@paperclipai/shared";
import { useNavigate } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useToast } from "@/context/ToastContext";
import { queryKeys } from "@/lib/queryKeys";
import { toolsApi } from "@/api/tools";
import { accessApi } from "@/api/access";
import { buildCompanyUserProfileMap } from "@/lib/company-members";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/timeAgo";
import { AppLogo } from "./AppLogo";
import { ConnectionProvenanceChip } from "./ConnectionProvenanceChip";
import {
  appApplicationSourceSlug,
  appDefinitionDarkLogoUrl,
  appDefinitionLogoUrl,
  appDefinitionName,
  appDefinitionSlug,
  type AppGalleryDisplayEntry,
} from "./app-definition-display";
import { useReviewCount } from "./useReviewCount";
import { connectionNameForCredentialPolicy, connectionTypeLabel } from "./connection-identity";
import {
  ConnectionOwnerIdentity,
  connectionDisplayNameForOwner,
  connectionOwnerProfile,
  type ConnectionOwnerProfile,
} from "./connection-owner";

const BROWSE_HREF = "/apps";

type StatusFilter = "all" | "attention";

type AppStatus = {
  label: string;
  tone: "connected" | "attention" | "paused" | "not_connected";
};

type AppRow = {
  application: ToolApplication;
  connection: ToolConnection | null;
  displayName: string;
  brandKey: string;
  owner: ConnectionOwnerProfile | null;
  remainingAgentAvailableConnectionCount: number;
  status: AppStatus;
  actionCount: number;
  lastUsedAt: Date | string | null;
  logoUrl?: string | null;
  darkLogoUrl?: string | null;
};

/**
 * F6 (PAP-13254 / U3 §4): a single health signal is the source of truth for
 * BOTH the row highlight and the Status pill so they can never disagree. The
 * pill's `attention` tone and the row highlight are now the *same* predicate.
 */
function statusFor(application: ToolApplication, connections: ToolConnection[]): AppStatus {
  if (connections.some(isRetiredComposioConnection)) return { label: interfaceText("m_a9f71bc2404c91"), tone: "attention" };
  if (connections.length === 0) {
    return { label: interfaceText("m_0303e182467081"), tone: "not_connected" };
  }
  if (
    application.status === "disabled" ||
    application.status === "archived" ||
    connections.every((connection) => connection.enabled === false || connection.status === "disabled")
  ) {
    return { label: interfaceText("m_e159b06187d369"), tone: "paused" };
  }
  if (connections.some((connection) => isAttentionHealthStatus(connection.healthStatus))) {
    return { label: interfaceText("m_c1ebc7817870e5"), tone: "attention" };
  }
  return { label: interfaceText("m_7f1e323b6272c6"), tone: "connected" };
}

/** The single health-derived predicate that drives highlight, pill, banner, filter (F6). */
function rowNeedsAttention(row: AppRow): boolean {
  return row.status.tone === "attention";
}

const STATUS_CLASS: Record<AppStatus["tone"], string> = {
  connected: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  attention: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  paused: "border-border bg-muted text-muted-foreground",
  not_connected: "border-border bg-background text-muted-foreground",
};

export function Connections() {
  useInterfaceLanguage();
  const interfaceLanguage = useInterfaceLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const reviewCount = useReviewCount();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [connectionToDelete, setConnectionToDelete] = useState<{
    id: string;
    appName: string;
    remainingConnectionCount: number;

  } | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: interfaceText("m_c3d2e79ebdd046"), href: "/apps" },
      { label: interfaceText("m_dc273117482b44") },
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs, interfaceLanguage]);

  const galleryQuery = useQuery({
    queryKey: queryKeys.apps.gallery(selectedCompanyId ?? "__none__"),
    queryFn: () => toolsApi.listGallery(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const applicationsQuery = useQuery({
    queryKey: queryKeys.tools.applications(selectedCompanyId ?? "__none__"),
    queryFn: () => toolsApi.listApplications(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const connectionsQuery = useQuery({
    queryKey: queryKeys.tools.connections(selectedCompanyId ?? "__none__"),
    queryFn: () => toolsApi.listConnections(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const profilesQuery = useQuery({
    queryKey: queryKeys.tools.profiles(selectedCompanyId ?? "__none__"),
    queryFn: () => toolsApi.listProfiles(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const userDirectoryQuery = useQuery({
    queryKey: queryKeys.access.companyUserDirectory(selectedCompanyId ?? "__none__"),
    queryFn: () => accessApi.listUserDirectory(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });
  const connectorEnrollmentQuery = useQuery({
    queryKey: ["cloud-connector", "enrollment"],
    queryFn: () => toolsApi.getCloudConnectorEnrollment(),
  });
  const startConnectorEnrollment = useMutation({
    mutationFn: () => toolsApi.startCloudConnectorEnrollment(selectedCompanyId!, selectedCompany?.name),
    onSuccess: (status) => {
      if (status.verificationUrl) window.location.assign(status.verificationUrl);
    },
    onError: (error) => pushToast({
      title: interfaceText("m_79f035657540a3"),
      body: error instanceof Error ? error.message : interfaceText("m_29cc3339fce99f"),
      tone: "error",
    }),
  });

  const deleteConnection = useMutation({
    mutationFn: (target: {
      id: string;
      appName: string;
      remainingConnectionCount: number;

    }) =>
      toolsApi.archiveConnection(target.id),
    onSuccess: (_connection, target) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.connections(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.applications(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.apps.attention(selectedCompanyId!) });
      pushToast({
        title: interfaceText("m_d0294a63a52c33"),
        body: target.remainingConnectionCount > 0
          ? interfaceText("m_4b9e080b64cf14", { value0: (target.appName), value1: (target.remainingConnectionCount), value2: (target.remainingConnectionCount === 1 ? "connection" : "connections") })
          : interfaceText("m_8fcc4fa0e4d27b", { value0: (target.appName) }),
        tone: "success",
      });
      setConnectionToDelete(null);
    },
    onError: (error) =>
      pushToast({
        title: interfaceText("m_1ef396039a6f63"),
        body: error instanceof Error ? error.message : interfaceText("m_eea4fb33efd382"),
        tone: "error",
      }),
  });

  const gallery = (galleryQuery.data?.apps ?? []) as AppGalleryDisplayEntry[];
  const logoByName = useMemo(() => {
    const map = new Map<string, AppGalleryDisplayEntry>();
    for (const entry of gallery) map.set(appDefinitionName(entry).toLowerCase(), entry);
    return map;
  }, [gallery]);
  const logoByKey = useMemo(() => {
    const map = new Map<string, AppGalleryDisplayEntry>();
    for (const entry of gallery) map.set(appDefinitionSlug(entry), entry);
    return map;
  }, [gallery]);

  // "Actions on" = enabled tools in each app's per-connection access profile,
  // mirroring what App detail shows so the count never disagrees with the page.
  const actionCountByConnection = useMemo(() => {
    const map = new Map<string, number>();
    for (const profile of profilesQuery.data?.profiles ?? []) {
      map.set(profile.profileKey, enabledActionCount(profile));
    }
    return map;
  }, [profilesQuery.data]);

  const connections = (connectionsQuery.data?.connections ?? []).filter(
    (c) => c.status !== "archived",
  );
  const applications = (applicationsQuery.data?.applications ?? []).filter(
    (application) => application.status !== "archived",
  );
  const connectionsByApplication = useMemo(() => {
    const map = new Map<string, ToolConnection[]>();
    for (const connection of connections) {
      map.set(connection.applicationId, [...(map.get(connection.applicationId) ?? []), connection]);
    }
    return map;
  }, [connections]);
  const userProfileById = useMemo(
    () => buildCompanyUserProfileMap(userDirectoryQuery.data?.users),
    [userDirectoryQuery.data],
  );

  const rows = useMemo<AppRow[]>(() => {
    return applications.flatMap((application): AppRow[] => {
      const appConnections = connectionsByApplication.get(application.id) ?? [];
      const appSourceSlug = appApplicationSourceSlug(application);
      const resolvedGalleryEntry = logoByKey.get(appSourceSlug ?? "") ??
        logoByName.get(application.name.toLowerCase());
      const logoUrl = appDefinitionLogoUrl(resolvedGalleryEntry);
      const brandKey = appSourceSlug ?? application.name;
      const darkLogoUrl = appDefinitionDarkLogoUrl(resolvedGalleryEntry);
      const agentAvailableConnectionCount = appConnections.filter(
        (connection) => connection.status === "active" && connection.enabled,
      ).length;
      if (appConnections.length === 0) {
        return [{
          application,
          connection: null,
          displayName: application.name,
          brandKey,
          owner: null,
          remainingAgentAvailableConnectionCount: 0,
          status: statusFor(application, []),
          actionCount: 0,
          lastUsedAt: null,
          logoUrl,
          darkLogoUrl,
        }];
      }
      return appConnections.map((connection) => {
        const owner = connectionOwnerProfile(connection, userProfileById);
        const displayName = connection.credentialPolicy === "shared" || connection.credentialPolicy === "per_user_with_fallback"
          ? connectionNameForCredentialPolicy(
              humanizeConnectionDisplayName(connection),
              connection.credentialPolicy,
            )
          : connectionDisplayNameForOwner(connection, application.name, owner);
        return {
          application,
          connection,
          displayName,
          brandKey,
          owner,
          remainingAgentAvailableConnectionCount: Math.max(
            0,
            agentAvailableConnectionCount -
              (connection.status === "active" && connection.enabled ? 1 : 0),
          ),
          status: statusFor(application, [connection]),
          actionCount: actionCountByConnection.get(`app:${connection.id}`) ?? 0,
          lastUsedAt: connection.lastUsedAt ?? null,
          logoUrl,
          darkLogoUrl,
        };
      });
    });
  }, [actionCountByConnection, applications, connectionsByApplication, logoByKey, logoByName, userProfileById]);

  const rowsNeedingAttention = rows.filter(rowNeedsAttention);
  const visibleRows = filter === "attention" ? rowsNeedingAttention : rows;

  if (!selectedCompanyId) {
    return <div className="p-6 text-sm text-muted-foreground">{interfaceText("m_c62bf64e9f0c2f")}</div>;
  }

  const loading = applicationsQuery.isLoading || connectionsQuery.isLoading || galleryQuery.isLoading;

  return (
    <div className="max-w-5xl space-y-5">
      {!connectorEnrollmentQuery.isLoading ? (
        <CloudConnectorEnrollmentBanner
          status={connectorEnrollmentQuery.data}
          unavailable={connectorEnrollmentQuery.isError}
          busy={startConnectorEnrollment.isPending}
          onEnable={() => {
            const verificationUrl = connectorEnrollmentQuery.data?.verificationUrl;
            if (verificationUrl) window.location.assign(verificationUrl);
            else startConnectorEnrollment.mutate();
          }}
        />
      ) : null}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyConnections onBrowse={() => navigate(BROWSE_HREF)} />
      ) : (
        <div className="space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{interfaceText("m_dc273117482b44")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{interfaceText("m_86c96136650cf3")}</p>
            </div>
            <Button onClick={() => navigate(BROWSE_HREF)}>{interfaceText("m_bf6c07f8707584")}</Button>
          </header>

          <div className="flex flex-wrap items-center gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>{interfaceText("m_6ddbebadc0708e")}{rows.length})
            </FilterChip>
            <FilterChip
              active={filter === "attention"}
              tone="danger"
              disabled={rowsNeedingAttention.length === 0}
              onClick={() => setFilter("attention")}
            >{interfaceText("m_41b551ee391c0b")}{rowsNeedingAttention.length})
            </FilterChip>
          </div>

          {reviewCount > 0 && (
            <button
              type="button"
              onClick={() => navigate("/apps/review")}
              className="flex w-full items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left transition-colors hover:bg-amber-500/15"
            >
              <ShieldQuestion className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  {reviewCount} {reviewCount === 1 ? interfaceText("m_547602d87c05f6") : interfaceText("m_5273e4e9e2bc4d")}{interfaceText("m_44e95243c51b5a")}</div>
                <div className="truncate text-xs text-amber-700 dark:text-amber-300">{interfaceText("m_c81a8bf451c4e8")}</div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-amber-800 dark:text-amber-200">{interfaceText("m_ab7681eab1638a")}</span>
            </button>
          )}

          {rowsNeedingAttention.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter("attention")}
              className="flex w-full items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-left transition-colors hover:bg-red-500/15"
            >
              <ShieldAlert className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-red-900 dark:text-red-100">
                  {rowsNeedingAttention.length} {rowsNeedingAttention.length === 1 ? interfaceText("m_015cb24780ba83") : interfaceText("m_9b7c9d6dfbabe4")}{interfaceText("m_0e593b3ef7e900")}</div>
                <div className="truncate text-xs text-red-700 dark:text-red-300">
                  {floatSummary(rowsNeedingAttention)}
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-red-800 dark:text-red-200">{interfaceText("m_9049952f0b0af5")}</span>
            </button>
          )}

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-(length:--text-micro) font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5">{interfaceText("m_639a40e82b9a96")}</th>
                  <th className="px-4 py-2.5">{interfaceText("m_baaddf70fb5d43")}</th>
                  <th className="px-4 py-2.5">{interfaceText("m_9952ce521b7857")}</th>
                  <th className="px-4 py-2.5">{interfaceText("m_920e413c7d411b")}</th>
                  <th className="px-4 py-2.5">{interfaceText("m_ff8059dc6752af")}</th>
                  <th className="px-4 py-2.5">{interfaceText("m_830ec7f812f9d8")}</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const { application, connection, status } = row;
                  const attention = rowNeedsAttention(row);
                  const hint =
                    connection && isRetiredComposioConnection(connection) ? RETIRED_COMPOSIO_MESSAGE :
                    status.tone === "attention"
                      ? connection?.authKind === "oauth"
                        ? "Reconnect required — sign in again to restore access."
                        : "The key stopped working — reconnect to fix."
                      : status.tone === "paused"
                        ? "Paused — agents can’t use it right now."
                        : status.tone === "not_connected"
                          ? "Connect it so agents can use it."
                          : row.displayName !== application.name
                            ? application.name
                            : null;
                  const appHref = connection
                    ? `/apps/${connection.id}/permissions`
                    : `/apps/app/${application.id}/permissions`;
                  const actionLabel = !connection
                    ? interfaceText("m_1a2303ede07493")
                    : connection && isRetiredComposioConnection(connection) ? interfaceText("m_aff0766a5290e1")
                    : status.tone === "attention"
                      ? interfaceText("m_bf8a9eab9e7e14")
                      : interfaceText("m_abccc78cc93c07");
                  return (
                    <tr
                      key={connection?.id ?? application.id}
                      onClick={() => navigate(appHref)}
                      className={cn(
                        "cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30",
                        attention && "bg-amber-500/[0.06]",
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <AppLogo
                            name={row.displayName}
                            brandKey={row.brandKey}
                            logoUrl={row.logoUrl}
                            darkLogoUrl={row.darkLogoUrl}
                            size={32}
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{row.displayName}</span>
                              <ConnectionProvenanceChip connection={row.connection} />
                            </div>
                            {hint && (
                              <div className="truncate text-xs text-muted-foreground">{hint}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-foreground">
                          {connection ? connectionTypeLabel(connection.credentialPolicy) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ConnectionOwnerIdentity owner={row.owner} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            STATUS_CLASS[status.tone],
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{row.actionCount}{interfaceText("m_582bfe13a74808")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {row.lastUsedAt ? timeAgo(row.lastUsedAt) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant={attention ? "default" : "outline"}
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(appHref);
                            }}
                          >
                            {actionLabel}
                          </Button>
                          {connection && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-destructive"
                              aria-label={interfaceText("m_3fad8392143123", { value0: (row.displayName) })}
                              onClick={(event) => {
                                event.stopPropagation();
                                setConnectionToDelete({
                                  id: connection.id,
                                  appName: application.name,
                                  remainingConnectionCount: row.remainingAgentAvailableConnectionCount,

                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">{interfaceText("m_b1c276b4f72104")}</p>
          </div>
        </div>
      )}

      <AlertDialog
        open={connectionToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteConnection.isPending) setConnectionToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{interfaceText("m_85941fb9c99253")}{connectionToDelete?.appName ?? interfaceText("m_1eb79602411ef0")}{interfaceText("m_4849412e36f699")}</AlertDialogTitle>
            <AlertDialogDescription>
              {connectionToDelete && connectionToDelete.remainingConnectionCount > 0
                ? interfaceText("m_4da27f466cf5c4", { value0: (connectionToDelete.appName), value1: (connectionToDelete.remainingConnectionCount), value2: (connectionToDelete.remainingConnectionCount === 1 ? "connection" : "connections") })
                : interfaceText("m_a1f881ceeabde6")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConnection.isPending}>{interfaceText("m_19766ed6ccb2f4")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!connectionToDelete || deleteConnection.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (connectionToDelete) deleteConnection.mutate(connectionToDelete);
              }}
            >
              {deleteConnection.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {deleteConnection.isPending ? interfaceText("m_685ecb984ac29c") : interfaceText("m_e960651babb1d7")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CloudConnectorEnrollmentBanner({
  status,
  unavailable,
  busy,
  onEnable,
}: {
  status: Awaited<ReturnType<typeof toolsApi.getCloudConnectorEnrollment>> | undefined;
  unavailable: boolean;
  busy: boolean;
  onEnable: () => void;
}) {
  useInterfaceLanguage();
  if (status?.configured) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{interfaceText("m_267735c56afaf1")}</div>
          <div className="truncate text-xs text-muted-foreground">{interfaceText("m_e56312c18f224d")}{status.brokerBaseUrl}{interfaceText("m_d404b53aabe640")}</div>
        </div>
      </div>
    );
  }
  if (unavailable) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <Cloud className="h-5 w-5 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">{interfaceText("m_92a8b2077bb666")}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <Cloud className="h-5 w-5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">
          {status?.status === "pending" ? interfaceText("m_7a2c43bceb52ca") : interfaceText("m_fd849c5675861b")}
        </div>
        <div className="text-xs text-muted-foreground">{interfaceText("m_895b87768fb3b3")}</div>
      </div>
      <Button variant="outline" size="sm" disabled={busy} onClick={onEnable}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {status?.status === "pending" ? interfaceText("m_97317cdb204147") : interfaceText("m_5342e09f2729fb")}
      </Button>
    </div>
  );
}

function FilterChip({
  active,
  tone = "default",
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  tone?: "default" | "danger";
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        active
          ? tone === "danger"
            ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
            : "border-foreground/30 bg-foreground/[0.06] text-foreground"
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function enabledActionCount(profile: ToolProfileWithDetails): number {
  let count = 0;
  for (const entry of profile.entries ?? []) {
    if (entry.effect === "include" && entry.catalogEntryId) count += 1;
  }
  return count;
}

function floatSummary(rows: AppRow[]): string {
  const names = rows.map((row) => humanizeConnectionDisplayName(row.application.name));
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

function EmptyConnections({ onBrowse }: { onBrowse: () => void }) {
  useInterfaceLanguage();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{interfaceText("m_dc273117482b44")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{interfaceText("m_86c96136650cf3")}</p>
      </header>

      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AppWindow className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">{interfaceText("m_643013cde6f1db")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{interfaceText("m_41d18cd9179281")}<span className="font-medium text-foreground">{interfaceText("m_89dd748442c194")}</span>{interfaceText("m_0be83219d07832")}</p>
        <Button className="mt-6" onClick={onBrowse}>{interfaceText("m_cc28cdd0d000cd")}</Button>
      </div>
    </div>
  );
}
