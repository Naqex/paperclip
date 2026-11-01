import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Clock3 } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { InlineBanner } from "@/components/InlineBanner";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { ConfigureBuiltInAgentModal } from "@/components/ConfigureBuiltInAgentModal";
import { builtInAgentsApi, type BuiltInAgentState } from "@/api/builtInAgents";
import { agentsApi } from "@/api/agents";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { queryKeys } from "@/lib/queryKeys";
import { agentUrl } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";

export interface BuiltInAgentGateProps {
  /** Registry key of the built-in agent that powers this feature (e.g. "briefs"). */
  agentKey: string;
  companyId: string | null | undefined;
  /** Human label for the gated feature. Defaults to the agent's display name. */
  featureLabel?: string;
  children: ReactNode;
}

/**
 * Wraps a feature surface that depends on a built-in agent and renders the
 * right lifecycle state (ux-spec §4):
 *
 * - loading → skeleton
 * - not_provisioned / needs_setup → setup empty-state + configure modal CTA
 * - paused → amber banner + Resume over the (stale) children
 * - ready → children
 */
export function BuiltInAgentGate({ agentKey, companyId, featureLabel, children }: BuiltInAgentGateProps) {
  useInterfaceLanguage();
  const queryClient = useQueryClient();
  const [configureOpen, setConfigureOpen] = useState(false);

  const experimentalQuery = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });
  const builtInAgentsEnabled = experimentalQuery.data?.enableBuiltInAgents === true;
  const { data: states, isLoading: statesLoading } = useQuery({
    queryKey: queryKeys.builtInAgents.list(companyId ?? "__none__"),
    queryFn: () => builtInAgentsApi.list(companyId!),
    enabled: Boolean(companyId && builtInAgentsEnabled),
  });

  const state: BuiltInAgentState | undefined = states?.find((entry) => entry.definition.key === agentKey);

  const resume = useMutation({
    mutationFn: (agentId: string) => agentsApi.resume(agentId, companyId ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.builtInAgents.list(companyId ?? "__none__") });
      if (companyId) queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  // Unknown key or still resolving the company — fail open to the feature.
  if (!companyId) return <>{children}</>;
  if ((experimentalQuery.isLoading || statesLoading) && !states) return <PageSkeleton variant="detail" />;
  if (!state) return <>{children}</>;

  const label = featureLabel ?? state.definition.displayName;

  if (state.status === "not_provisioned" || state.status === "needs_setup") {
    return (
      <>
        <EmptyState
          icon={Bot}
          title={interfaceText("m_cf32217fa6d1ee", { value0: (state.definition.displayName) })}
          message={interfaceText("m_e9d062f586d796", { value0: (label) })}
          action={interfaceText("m_96790963838a94", { value0: (state.definition.displayName) })}
          onAction={() => setConfigureOpen(true)}
          hideActionIcon
        />
        <ConfigureBuiltInAgentModal
          companyId={companyId}
          state={state}
          open={configureOpen}
          onOpenChange={setConfigureOpen}
        />
      </>
    );
  }

  if (state.status === "pending_approval") {
    return (
      <EmptyState
        icon={Clock3}
        title={interfaceText("m_947206d9418c9a", { value0: (state.definition.displayName) })}
        message={interfaceText("m_3f56ebe864357b", { value0: (label) })}
      />
    );
  }

  if (state.status === "paused" && state.agent) {
    const pausedAt = state.agent.pausedAt ? relativeTime(state.agent.pausedAt) : null;
    return (
      <div className="space-y-4">
        <InlineBanner
          tone="warning"
          title={interfaceText("m_8b157084c70478", { value0: (label) })}
          actions={
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to={agentUrl(state.agent)}>{interfaceText("m_7ce7832e35e85d")}</Link>
              </Button>
              <Button
                size="sm"
                onClick={() => state.agent && resume.mutate(state.agent.id)}
                disabled={resume.isPending}
              >
                {resume.isPending ? interfaceText("m_c494e3ca3e3b04") : interfaceText("m_0bb60c4501919e")}
              </Button>
            </>
          }
        >{interfaceText("m_9a918f59d2d5c5")}{pausedAt ? ` ${pausedAt}` : ""}{interfaceText("m_f8cb1f9a10a145")}{" "}
          {label.toLowerCase()}{interfaceText("m_724670ca7f8aa2")}</InlineBanner>
        {/* Paused ≠ hidden: keep existing content readable, marked stale. */}
        <div className="opacity-70">{children}</div>
      </div>
    );
  }

  return <>{children}</>;
}
