import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useQuery } from "@tanstack/react-query";
import { aiConnectionsApi } from "@/api/ai-connections";
import { AiConnectionCredentialStep } from "@/components/ai-connections/AiConnectionCredentialStep";
import { AiProviderSetup } from "@/components/ai-connections/AiProviderSetup";
import { AiConnectionPoolConnector } from "@/components/ai-connections/AiConnectionPoolConnector";
import { useEffect } from "react";
import { isRetiredComposioConnection } from "@paperclipai/shared";
import { findComposioCatalogApp } from "@paperclipai/shared/aggregator-app-catalog";
import { toolsApi } from "@/api/tools";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { ConnectionSetupFlow } from "@/features/connections/ConnectionSetupFlow";
import { aiProviderSetupPreset, type ToolConnectionCredentialSource } from "@paperclipai/shared";
import { useCompany } from "@/context/CompanyContext";
import { useNavigate, useParams, useSearchParams } from "@/lib/router";
import { consumeSkillSourceReturn, skillSourceReturnPath } from "@/lib/skill-source-connect-return";

export { AccessStep, OAuthConnectStateScreen, type OAuthConnectPhase } from "@/features/connections/ConnectionSetupFlow";

/** Full-page host for the same setup used by inline connection requests. */
export function AppsConnect({ byoOnly = false, credentialSource = "paperclip_vault" }: {
  byoOnly?: boolean;
  credentialSource?: ToolConnectionCredentialSource;
} = {}) {
  useInterfaceLanguage();
  const { selectedCompanyId } = useCompany();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { appKey } = useParams<{ appKey?: string }>();
  const source = searchParams.get("source") ?? appKey ?? searchParams.get("appKey");
  const reconnectId = searchParams.get("reconnect");
  const aiLoginId = searchParams.get("aiLogin");
  const login = useQuery({ queryKey: ["ai-login-setup", selectedCompanyId, aiLoginId],
    queryFn: () => aiConnectionsApi.loginSetup(selectedCompanyId!, aiLoginId!), enabled: Boolean(selectedCompanyId && aiLoginId), retry: false });
  const preset = aiProviderSetupPreset(source);
  const aiReconnectRequested = Boolean(reconnectId && (preset || ["openai", "anthropic", "xai"].includes(source ?? "")));
  const aiAccounts = useQuery({ queryKey: ["ai-connections", selectedCompanyId], queryFn: () => aiConnectionsApi.list(selectedCompanyId!), enabled: Boolean(selectedCompanyId && aiReconnectRequested) });
  const aiReconnect = aiAccounts.data?.connections.find(c => c.id === reconnectId);
  const gallery = useQuery({ queryKey: queryKeys.apps.gallery(selectedCompanyId ?? "__none__"), queryFn: () => toolsApi.listGallery(selectedCompanyId!), enabled: !!selectedCompanyId && !!source?.startsWith("ai-router-") });
  const router = gallery.data?.apps.find(app => app.slug === source)?.aiConnectionRouter;
  const toolkit = searchParams.get("targetToolkit");
  const reuseComposio = source === "composio" && Boolean(toolkit && findComposioCatalogApp(toolkit))
    && searchParams.get("new") !== "1" && !searchParams.get("resume") && !searchParams.get("reconnect")
    && !byoOnly && credentialSource === "paperclip_vault";
  const saved = useQuery({ queryKey: queryKeys.tools.connections(selectedCompanyId ?? "__none__"),
    queryFn: () => toolsApi.listConnections(selectedCompanyId!), enabled: reuseComposio && Boolean(selectedCompanyId), retry: false });
  const hasSavedComposio = reuseComposio && saved.data?.connections.some(connection =>
    connection.config?.sourceTemplateKey === "composio" && connection.transport === "mcp_remote"
    && connection.status === "active" && connection.enabled && !isRetiredComposioConnection(connection));
  useEffect(() => {
    if (hasSavedComposio) navigate(`/apps?source=composio&targetToolkit=${encodeURIComponent(toolkit!)}`, { replace: true });
  }, [hasSavedComposio, toolkit, navigate]);
  if (reuseComposio && selectedCompanyId && (saved.isPending || hasSavedComposio)) return <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_a3d61cc52a9292")}</p>;
  if (reuseComposio && saved.isError) return <div className="space-y-3">
    <p role="alert" className="text-sm text-destructive">{interfaceText("m_f3aea35319be6e")}</p>
    <div className="flex items-center justify-between"><Button variant="ghost" onClick={() => navigate("/apps")}>{interfaceText("m_19766ed6ccb2f4")}</Button><Button onClick={() => void saved.refetch()}>{interfaceText("m_d8b8392e2c5429")}</Button></div>
  </div>;
  const returningToSkills = source === "github" && selectedCompanyId && skillSourceReturnPath(selectedCompanyId);
  function returnToSkills() {
    const path = selectedCompanyId && consumeSkillSourceReturn(selectedCompanyId);
    if (path) navigate(path);
  }
  if (aiLoginId && selectedCompanyId) {
    if (login.isPending) return <p role="status">{interfaceText("m_cc162accdd87c1")}</p>;
    if (!login.data) return <p role="alert">{login.error?.message ?? interfaceText("m_4235437f572cf0")}</p>;
    const { intent, environmentId, connectionId, grantId } = login.data;
    if (connectionId && grantId) return <div className="space-y-4"><p role="status">{interfaceText("m_a97619ea187a68")}</p><Button onClick={() => navigate(`/apps/${connectionId}/permissions`)}>{interfaceText("m_191bc5c516b88d")}</Button></div>;
    return <AiConnectionCredentialStep key={aiLoginId} companyId={selectedCompanyId} {...intent}
      agentIds={intent.agentIds ?? []} allAgents={intent.allAgents ?? false} initialMethod={intent.method} fixedMethod
      environmentId={environmentId} hideName onCancel={() => navigate("/apps")}
      onComplete={binding => navigate(`/apps/${binding.connectionId}/permissions`)} />;
  }
  if (aiReconnectRequested && aiAccounts.isPending) return <p role="status">{interfaceText("m_ca5b56e4cc0be2")}</p>;
  if (aiReconnectRequested && aiAccounts.isError) return <p role="alert">{interfaceText("m_b558646e2b059a")}</p>;
  if (aiReconnectRequested && !aiReconnect) return <p role="alert">{interfaceText("m_44c4224cd103b1")}</p>;
  if (selectedCompanyId && (preset || aiReconnect?.routing)) return (
    <AiProviderSetup
      key={reconnectId ?? source}
      companyId={selectedCompanyId}
      reconnect={aiReconnect}
      initialProvider={preset?.provider}
      initialProtocol={preset?.protocol}
      providerLabel={preset?.label}
      onCancel={() => navigate("/apps")}
      onComplete={binding => navigate(`/apps/${binding.connectionId}/permissions`)}
    />
  );
  if (source?.startsWith("ai-router-")) {
    if (gallery.isPending) return <p role="status">{interfaceText("m_6cd606384bc7b4")}</p>;
    if (!router) return <p role="alert">{gallery.error?.message ?? interfaceText("m_4088b7cf01296d")}</p>;
    return <AiConnectionPoolConnector pluginKey={router.pluginKey} />;
  }
  return <ConnectionSetupFlow byoOnly={byoOnly} credentialSource={credentialSource} host="page"
    onComplete={returningToSkills ? returnToSkills : undefined}
    onCancel={returningToSkills ? returnToSkills : undefined} />;
}
