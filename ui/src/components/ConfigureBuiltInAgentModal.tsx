import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useMemo, useState } from "react";
import { agentHarnessType, agentRunner, type AgentRunnerChoice } from "@paperclipai/shared";
import { adaptersApi } from "@/api/adapters";
import { AgentRunnerSelect } from "./AgentRunnerSelect";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/agent-config-primitives";
import { AdapterTypeDropdown, ModelDropdown } from "@/components/AgentConfigForm";
import { InlineBanner } from "@/components/InlineBanner";
import { listAdapterOptions } from "@/adapters/metadata";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import { ApiError } from "@/api/client";
import {
  builtInAgentsApi,
  type BuiltInAgentState,
} from "@/api/builtInAgents";
import { adapterCuratesModelOrder } from "../lib/model-utils";

/** Adapters whose config completeness is keyed on a non-empty `model`. */
function isModelBasedAdapter(adapterType: string): boolean {
  return !["process", "command", "http", "openclaw_gateway", "hermes_gateway"].includes(adapterType);
}

function defaultAdapterType(state: BuiltInAgentState): string {
  return state.definition.defaultAdapterType ?? state.definition.allowedAdapterTypes?.[0] ?? "codex_local";
}

function parseBudgetMonthlyCents(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const cents = Math.round(Number(trimmed) * 100);
  return Number.isFinite(cents) && cents >= 0 ? cents : undefined;
}

export interface ConfigureBuiltInAgentModalProps {
  companyId: string;
  state: BuiltInAgentState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful provision (e.g. to navigate to the agent). */
  onConfigured?: (result: BuiltInAgentState) => void;
}

/**
 * Configure-on-first-use modal for a built-in agent. Reuses the shared
 * `AdapterTypeDropdown` + `ModelDropdown` (ux-spec D6 — no second model picker),
 * plus an optional monthly budget, and submits to the provision endpoint.
 */
export function ConfigureBuiltInAgentModal({
  companyId,
  state,
  open,
  onOpenChange,
  onConfigured,
}: ConfigureBuiltInAgentModalProps) {
  useInterfaceLanguage();
  const queryClient = useQueryClient();
  const { definition } = state;

  const [adapterType, setAdapterType] = useState<string>(
    () => state.agent && ["codex_local", "claude_local", "opencode_local", "pi_local"].includes(agentHarnessType(state.agent.adapterType, state.agent.adapterConfig)) ? agentHarnessType(state.agent.adapterType, state.agent.adapterConfig) : state.agent?.adapterType ?? defaultAdapterType(state),
  );
  const [runner, setRunner] = useState<AgentRunnerChoice | undefined>();
  const environmentId = state.agent?.defaultEnvironmentId ?? null;
  const adapters = useQuery({ queryKey: queryKeys.adapters.availability(companyId, environmentId), queryFn: () => adaptersApi.list({ companyId, environmentId }), enabled: open });
  const runnerAvailability = adapters.data?.find(item => item.type === adapterType);
  const [model, setModel] = useState<string>(() => {
    const config = state.agent?.adapterConfig;
    const configuredModel = typeof config === "object" && config !== null
      ? (config as Record<string, unknown>).model
      : null;
    if (typeof configuredModel === "string") return configuredModel;
    const defaultModel = state.definition.defaultAdapterConfig?.model;
    return typeof defaultModel === "string" ? defaultModel : "";
  });
  const [modelOpen, setModelOpen] = useState(false);
  const [budgetDollars, setBudgetDollars] = useState<string>(() => {
    const cents = definition.defaultBudgetMonthlyCents ?? 0;
    return cents > 0 ? String(cents / 100) : "";
  });
  const [error, setError] = useState<string | null>(null);

  // Restrict adapter choices to the registry's allow-list. Non-model adapters
  // are still selectable: provisioning creates the row, then full agent config
  // collects command/endpoint fields while the built-in remains `needs_setup`.
  const disabledTypes = useMemo(() => {
    const allowed = new Set(definition.allowedAdapterTypes ?? []);
    return new Set(
      listAdapterOptions()
        .map((option) => option.value)
        .filter((value) => allowed.size > 0 && !allowed.has(value)),
    );
  }, [definition.allowedAdapterTypes]);

  const setupSupportedInModal = isModelBasedAdapter(adapterType);

  const { data: fetchedModels } = useQuery({
    queryKey: queryKeys.agents.adapterModels(companyId, adapterType, null),
    queryFn: () => agentsApi.adapterModels(companyId, adapterType, {}),
    enabled: open && Boolean(companyId) && setupSupportedInModal,
  });
  const models = fetchedModels ?? [];

  const modelRequired = setupSupportedInModal;
  const normalizedModel = model.trim();
  const modelKnown =
    !normalizedModel ||
    models.length === 0 ||
    models.some((candidate) => candidate.id === normalizedModel);
  const modelError = modelKnown
    ? null
    : `Model “${normalizedModel}” is not available for ${adapterType}. Choose a known model.`;
  const budgetMonthlyCents = parseBudgetMonthlyCents(budgetDollars);
  const budgetValid = !budgetDollars.trim() || budgetMonthlyCents !== undefined;
  const canSubmit =
    budgetValid &&
    modelKnown &&
    (setupSupportedInModal ? !modelRequired || normalizedModel.length > 0 : true);
  const submitLabel = setupSupportedInModal
    ? interfaceText("m_7a69aa02730c71", { value0: (definition.displayName) })
    : interfaceText("m_25ef40c9e0c741", { value0: (definition.displayName) });

  const provision = useMutation({
    mutationFn: async () => {
      const adapterConfig: Record<string, unknown> = {};
      if (model.trim()) adapterConfig.model = model.trim();
      const existing = state.agent;
      const sameHarness = existing && agentHarnessType(existing.adapterType, existing.adapterConfig) === adapterType;
      const savedModel = typeof existing?.adapterConfig.model === "string" ? existing.adapterConfig.model.trim() : "";
      const alreadyConfigured = state.status === "ready" || state.status === "paused";
      const adapterInput = alreadyConfigured && sameHarness && normalizedModel === savedModel ? {}
        : sameHarness ? { adapterType: existing.adapterType, adapterConfig: { ...existing.adapterConfig, ...adapterConfig } }
        : { adapterType, adapterConfig };
      const result = await builtInAgentsApi.provision(companyId, definition.key, {
        ...adapterInput,
        ...(["codex_local", "claude_local", "opencode_local", "pi_local"].includes(adapterType) && runner !== undefined ? { runner } : {}),
        ...(budgetMonthlyCents !== undefined ? { budgetMonthlyCents } : {}),
      });
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.builtInAgents.list(companyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
      if (result.agentId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(result.agentId) });
      }
      onConfigured?.(result);
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to configure the built-in agent.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => (provision.isPending ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{interfaceText("m_7e2db3ca75c551")}{definition.displayName}</DialogTitle>
          <DialogDescription>{definition.shortPurpose}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <InlineBanner tone="info" compact>{interfaceText("m_21c951ef83fbc5")}<strong>{definition.displayName}</strong>{interfaceText("m_18258ce82a6ecd")}{" "}
            <strong>{interfaceText("m_1f43948106d1d4")}</strong>{interfaceText("m_879d69665aac07")}</InlineBanner>

          <Field label={interfaceText("m_e3b5b45953d79a")}>
            <AdapterTypeDropdown
              value={adapterType}
              onChange={(next) => {
                setAdapterType(next);
                setModel("");
                setRunner(undefined);
              }}
              disabledTypes={disabledTypes}
            />
          </Field>

          {["codex_local", "claude_local", "opencode_local", "pi_local"].includes(adapterType) && <details className="space-y-3">
            <summary className="cursor-pointer text-sm text-muted-foreground">{interfaceText("m_9f088dbebd6c3c")}</summary>
            <AgentRunnerSelect value={runner ?? (state.agent ? agentRunner(state.agent.adapterType) : "auto")}
              pending={adapters.isFetching} error={adapters.error?.message} onRetry={() => { void adapters.refetch(); }}
              defaultRunner={runnerAvailability?.defaultRunner} supportedRunners={runnerAvailability?.supportedRunners}
              onChange={setRunner} />
          </details>}

          {modelRequired && (
            // ModelDropdown supplies its own "Model" Field label + hint.
            <ModelDropdown
              models={models}
              value={model}
              onChange={setModel}
              open={modelOpen}
              onOpenChange={setModelOpen}
              allowDefault={adapterType !== "opencode_local"}
              required
              groupByProvider={false}
              preserveOrder={adapterCuratesModelOrder(adapterType)}
              creatable
            />
          )}

          {modelError && (
            <p className="text-sm text-destructive" role="alert">
              {modelError}
            </p>
          )}

          {!setupSupportedInModal && (
            <InlineBanner tone="warning" compact>{interfaceText("m_a9f99369f0203e")}</InlineBanner>
          )}

          <Field label={interfaceText("m_4e4490135805f0")} hint={interfaceText("m_819c7fa8019f3a")}>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                placeholder="0"
                value={budgetDollars}
                onChange={(event) => setBudgetDollars(event.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">{interfaceText("m_57cbd84fd6e049")}</span>
            </div>
          </Field>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={provision.isPending}
          >{interfaceText("m_a0e63d7c7125d2")}</Button>
          <Button
            onClick={() => {
              setError(null);
              provision.mutate();
            }}
            disabled={!canSubmit || provision.isPending}
          >
            {provision.isPending ? interfaceText("m_b66afe5b6cff33") : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
