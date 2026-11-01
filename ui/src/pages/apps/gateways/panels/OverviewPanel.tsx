import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Copy } from "lucide-react";
import type { ToolMcpGatewayWithTokens, ToolProfileWithDetails } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/clipboard";
import {
  activeTokenCount,
  allowedToolsLabel,
  expiringTokenCount,
  formatScope,
  type GatewayAppRow,
  gatewayAppDisplayName,
  isGatewayOn,
} from "../gateway-helpers";

export function OverviewPanel({
  gateway,
  profile,
  apps,
  agentNames,
  projectNames,
  toggleDisabled,
  onToggle,
}: {
  gateway: ToolMcpGatewayWithTokens;
  profile: ToolProfileWithDetails | undefined;
  apps: GatewayAppRow[];
  agentNames: Map<string, string>;
  projectNames: Map<string, string>;
  toggleDisabled: boolean;
  onToggle: () => void;
}) {
  useInterfaceLanguage();
  const { pushToast } = useToast();
  const endpoint = `${typeof window !== "undefined" ? window.location.origin : ""}${gateway.endpointPath}`;
  const active = activeTokenCount(gateway);
  const expiring = expiringTokenCount(gateway);
  const needsAttention = apps.filter((app) => app.needsAttention);
  const on = isGatewayOn(gateway);

  const snippet = [
    "{",
    '  "mcpServers": {',
    `    "paperclip-${gateway.displaySlug}": {`,
    `      "url": "${endpoint}",`,
    '      "headers": { "Authorization": "Bearer pcgw_•••_TOKEN" }',
    "    }",
    "  }",
    "}",
  ].join("\n");

  async function copy(value: string, label: string) {
    try {
      await copyTextToClipboard(value);
      pushToast({ title: interfaceText("m_8d525e5f158b9a"), body: label, tone: "success" });
    } catch {
      pushToast({ title: interfaceText("m_5b50e7a693fee9"), body: interfaceText("m_0899c211b77f93"), tone: "error" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs font-medium text-muted-foreground">{on ? interfaceText("m_13001175612531") : interfaceText("m_ca7981b46ecf2c")}</div>
          <div className="mt-2">
            <ToggleSwitch checked={on} disabled={toggleDisabled} onCheckedChange={onToggle} aria-label={interfaceText("m_10748b999fbf84")} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{interfaceText("m_a27be6847d5dc2")}</p>
        </div>
        <StatCard label={interfaceText("m_89dd748442c194")}>
          {apps.length} {apps.length === 1 ? interfaceText("m_a172cedcae4747") : interfaceText("m_d56f6359d240f6")}
          {profile ? ` · ${allowedToolsLabel(profile)}` : ""}
        </StatCard>
        <StatCard label={interfaceText("m_a039dfb9628b53")}>
          {active}{interfaceText("m_2a222bd79b1a54")}{expiring > 0 ? interfaceText("m_435bc0358a0009", { value0: (expiring) }) : ""}
        </StatCard>
        <StatCard label={interfaceText("m_55898449eb74fb")}>
          {needsAttention.length === 0 ? interfaceText("m_f7836fc939dae4") : interfaceText("m_f8040b4bac3103", { value0: (needsAttention.length) })}
        </StatCard>
      </div>

      <section className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{interfaceText("m_82d9af69e1a186")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{interfaceText("m_bd0cff72ee9427")}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip>{interfaceText("m_ae65512b06d87b")}{formatScope(gateway, projectNames, agentNames)}</Chip>
          <Chip>{interfaceText("m_353388a3b9cba4")}{profile?.name ?? interfaceText("m_ca184496974204")}</Chip>
          <Chip>{active}{interfaceText("m_84064be1b536ba")}{active === 1 ? "token" : interfaceText("m_c51e455b41df6c")}</Chip>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">{interfaceText("m_f79f93650e91b1")}</h3>
        {apps.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{interfaceText("m_de912bf377c1b8")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {apps.map((app) => (
              <AppRow key={app.application.id} app={app} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{interfaceText("m_0b9f00af0f2ab0")}</h3>
          <Button variant="outline" size="sm" onClick={() => void copy(snippet, "Client config")}>
            <Copy className="mr-1 h-3.5 w-3.5" />{interfaceText("m_e21f935f11d7e9")}</Button>
        </div>
        <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-3 font-mono text-xs text-muted-foreground">
          {snippet}
        </pre>
      </section>
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function AppRow({ app }: { app: GatewayAppRow }) {
  useInterfaceLanguage();
  const href = app.connection
    ? `/apps/${app.connection.id}/permissions`
    : `/apps/app/${app.application.id}/permissions`;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <Link to={href} className="font-medium text-foreground hover:underline">
          {gatewayAppDisplayName(app)}
        </Link>
        <div className="text-xs text-muted-foreground">
          {app.toolCount} {app.toolCount === 1 ? interfaceText("m_7c9bbe5ec9b3fb") : interfaceText("m_f9d35d43770d39")}
          {app.needsAttention && app.attentionReason ? ` · ${app.attentionReason}` : ""}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
          app.needsAttention
            ? "border-foreground bg-foreground text-background"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        )}
      >
        {app.needsAttention ? interfaceText("m_c1ebc7817870e5") : interfaceText("m_7f1e323b6272c6")}
      </span>
    </li>
  );
}
