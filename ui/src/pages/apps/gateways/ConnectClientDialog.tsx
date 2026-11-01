import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Braces,
  Check,
  Code2,
  Copy,
  HelpCircle,
  Link as LinkIcon,
  MousePointer2,
  TerminalSquare,
} from "lucide-react";
import type {
  ToolMcpGatewayClientSnippet,
  ToolMcpGatewayTokenCreated,
  ToolMcpGatewayWithTokens,
} from "@paperclipai/shared";
import { toolsApi } from "@/api/tools";
import { SearchableSelect, type SearchableSelectGroup } from "@/components/SearchableSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/context/ToastContext";
import { copyTextToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import {
  defaultGatewayTokenName,
  formatHydratedSnippetConfig,
  maskedTokenLabel,
  orderedSnippets,
  tokenStatus,
} from "./gateway-helpers";
import { gatewaysQueryKey } from "./NewGatewayDialog";

type PanelKey = string;
type ClientIcon = ComponentType<{ className?: string }>;

const CLIENT_ICONS: Record<ToolMcpGatewayClientSnippet["client"], ClientIcon> = {
  cursor: MousePointer2,
  claude_desktop: Bot,
  vscode: Code2,
  claude_code: TerminalSquare,
  opencode: Braces,
};

type TokenOption = {
  key: string;
  value: string;
  label: string;
  title: string;
  searchText: string;
  token: ToolMcpGatewayTokenCreated;
};

export function ConnectClientDialog({
  gateway,
  open,
  onOpenChange,
  createdTokens,
  onTokenCreated,
}: {
  gateway: ToolMcpGatewayWithTokens;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  createdTokens: ToolMcpGatewayTokenCreated[];
  onTokenCreated: (token: ToolMcpGatewayTokenCreated) => void;
}) {
  const interfaceLanguage = useInterfaceLanguage();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const snippets = useMemo(() => orderedSnippets(gateway.clientSnippets ?? []), [gateway.clientSnippets]);
  const endpoint = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${gateway.endpointPath}`;
  }, [gateway.endpointPath]);

  const availableTokens = useMemo(
    () => createdTokens.filter((createdToken) => {
      const persisted = gateway.tokens.find((token) => token.id === createdToken.id);
      const status = tokenStatus(persisted ?? createdToken);
      return status === "active" || status === "expiring";
    }),
    [createdTokens, gateway.tokens],
  );
  const tokenGroups = useMemo<SearchableSelectGroup<string, TokenOption>[]>(() => [{
    id: "tokens",
    label: interfaceText("m_07bcb127b1a140"),
    options: availableTokens.map((token) => ({
      key: token.id,
      value: token.id,
      label: token.name,
      title: token.clientLabel,
      searchText: `${token.name} ${token.clientLabel} ${token.tokenPrefix}`,
      token,
    })),
  }], [availableTokens, interfaceLanguage]);

  const [active, setActive] = useState<PanelKey>(snippets[0]?.client ?? "raw_url");
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const selectedToken = availableTokens.find((token) => token.id === selectedTokenId) ?? null;

  useEffect(() => {
    if (!open) return;
    setActive(snippets[0]?.client ?? "raw_url");
    setSelectedTokenId((current) =>
      availableTokens.some((token) => token.id === current) ? current : availableTokens[0]?.id ?? "",
    );
  }, [availableTokens, open, snippets]);

  const issueTokenMutation = useMutation({
    mutationFn: () => {
      const name = defaultGatewayTokenName(gateway);
      return toolsApi.createGatewayToken(gateway.companyId, gateway.id, {
        name,
        clientLabel: name,
        ownerNote: "",
        allowedActions: ["tools/list", "tools/call"],
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
    },
    onSuccess: async (token) => {
      onTokenCreated(token);
      setSelectedTokenId(token.id);
      pushToast({
        title: interfaceText("m_819e5d266a5b8c"),
        body: interfaceText("m_e8f457fd84ac11"),
        tone: "success",
      });
      await queryClient.invalidateQueries({ queryKey: gatewaysQueryKey(gateway.companyId) });
    },
    onError: (error) => pushToast({
      title: interfaceText("m_2f956f6dd26efe"),
      body: error instanceof Error ? error.message : String(error),
      tone: "error",
    }),
  });

  async function copyText(value: string, label: string) {
    try {
      await copyTextToClipboard(value);
      pushToast({ title: interfaceText("m_8d525e5f158b9a"), body: label, tone: "success" });
    } catch (error) {
      pushToast({
        title: interfaceText("m_5b50e7a693fee9"),
        body: error instanceof Error ? error.message : interfaceText("m_0899c211b77f93"),
        tone: "error",
      });
    }
  }

  const activeSnippet = snippets.find((snippet) => snippet.client === active) ?? null;
  const displayConfigText = activeSnippet
    ? formatHydratedSnippetConfig(activeSnippet.config, {
        endpointPath: gateway.endpointPath,
        endpoint,
        token: selectedToken ? maskedTokenLabel(selectedToken) : "pcgw_•••",
      })
    : "";
  const copyConfigText = activeSnippet && selectedToken
    ? formatHydratedSnippetConfig(activeSnippet.config, {
        endpointPath: gateway.endpointPath,
        endpoint,
        token: selectedToken.token,
      })
    : null;

  function issueToken() {
    if (!issueTokenMutation.isPending) issueTokenMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{interfaceText("m_e79437e88b5f57")}<Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={interfaceText("m_217e85ca455e22")} className="text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{interfaceText("m_e635f34bd13ca8")}</TooltipContent>
            </Tooltip>
          </DialogTitle>
          <DialogDescription>{interfaceText("m_d4d88fc91f9dd8")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <span className="text-xs font-medium text-muted-foreground">{interfaceText("m_ca5839e38a1543")}</span>
          {availableTokens.length > 0 ? (
            <SearchableSelect<string, TokenOption>
              value={selectedTokenId}
              groups={tokenGroups}
              onValueChange={setSelectedTokenId}
              placeholder={interfaceText("m_1418067b77b66b")}
              searchPlaceholder={interfaceText("m_6323cd5be8f82c")}
              emptyMessage={interfaceText("m_fe96bdc5faf621")}
              contentWidth="auto"
              triggerClassName="h-8 w-auto max-w-xs rounded-full px-3"
              renderValue={(option) => option ? `${option.label} · ${maskedTokenLabel(option.token)}` : "Issue a token"}
              renderOption={(option) => (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{option.label}</span>
                  <span className="truncate font-mono text-(length:--text-micro) text-muted-foreground">
                    {maskedTokenLabel(option.token)}
                  </span>
                </span>
              )}
              createItem={{
                render: () => <span>{interfaceText("m_6cc76e03641014")}</span>,
                onSelect: issueToken,
              }}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={issueTokenMutation.isPending}
              onClick={issueToken}
            >
              {issueTokenMutation.isPending ? interfaceText("m_0247fb13108802") : interfaceText("m_1418067b77b66b")}
            </Button>
          )}
          {selectedToken ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void copyText(`Authorization: Bearer ${selectedToken.token}`, "Authorization header")}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />{interfaceText("m_575ecd504c1aa6")}</Button>
          ) : null}
        </div>

        {!selectedToken ? (
          <p className="text-xs text-muted-foreground">{interfaceText("m_75772ed65a466c")}<code>Authorization: Bearer …</code>{interfaceText("m_c9116bd22c3f5b")}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-(--gtc-10)">
          <nav className="flex gap-1 overflow-x-auto sm:flex-col" aria-label={interfaceText("m_65a7256542c301")}>
            {snippets.map((snippet) => {
              const Icon = CLIENT_ICONS[snippet.client];
              return (
                <button
                  key={snippet.client}
                  type="button"
                  onClick={() => setActive(snippet.client)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                    active === snippet.client
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {snippet.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setActive("raw_url")}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                active === "raw_url"
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              <LinkIcon className="h-4 w-4 shrink-0" />{interfaceText("m_79300f3f02172a")}</button>
          </nav>

          <div className="min-w-0 space-y-3">
            {active === "raw_url" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-foreground">{interfaceText("m_2578179d177903")}</div>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                      {endpoint}
                    </code>
                    <Button variant="outline" size="sm" onClick={() => void copyText(endpoint, "Endpoint URL")}>
                      <Copy className="mr-1 h-3.5 w-3.5" />{interfaceText("m_e21f935f11d7e9")}</Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-sm font-medium text-foreground">{interfaceText("m_8e68075cabda5e")}</div>
                  <code className="block truncate rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                    {selectedToken ? `Authorization: Bearer ${maskedTokenLabel(selectedToken)}` : "Authorization: Bearer pcgw_•••"}
                  </code>
                </div>
              </div>
            ) : activeSnippet ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-foreground">{activeSnippet.label}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!copyConfigText}
                    onClick={() => copyConfigText && void copyText(copyConfigText, `${activeSnippet.label} config`)}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />{interfaceText("m_e21f935f11d7e9")}</Button>
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
                  {displayConfigText}
                </pre>
                {activeSnippet.notes.length > 0 ? (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {activeSnippet.notes.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{interfaceText("m_b7752029f5db55")}</p>
            )}

            <p className="text-xs text-muted-foreground">{interfaceText("m_8dce392d556d7d")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            <Check className="mr-1.5 h-4 w-4" />{interfaceText("m_11a6767d5674c7")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
