import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { AgentAvatar } from "@/components/AgentAvatar";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Fingerprint, KeyRound, Link2, ShieldAlert, Variable, ServerCog } from "lucide-react";
import type {
  CompanySecretProviderConfig,
  SecretProposalAgentRef,
  SecretProposalView,
} from "@paperclipai/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToastActions } from "../../context/ToastContext";
import { secretsApi } from "../../api/secrets";
import { ApiError } from "../../api/client";
import { queryKeys } from "../../lib/queryKeys";
import {
  aliasFromConfigPath,
  deliveryModeForConfigPath,
  deliveryModeLabel,
} from "../../lib/secret-delivery";
import { cn } from "../../lib/utils";
import { copyTextToClipboard } from "../../lib/clipboard";
import { SecretPathName } from "./SecretPathName";

/* -------------------------------------------------------------------------- */
/* Presentation helpers (shared by the tab + agent-settings surfaces)         */
/* -------------------------------------------------------------------------- */

/** Short, non-reversible fingerprint label. Never renders the value. */
export function fingerprintLabel(fingerprint: string | null, length: number | null): string {
  const digest = fingerprint ? `sha256:${fingerprint.slice(0, 10)}…` : "no fingerprint";
  const size = typeof length === "number" ? `${length} ${length === 1 ? "byte" : "bytes"}` : null;
  return size ? `${digest} · ${size}` : digest;
}

/**
 * Fingerprint + length label. When a full digest is present the truncated form
 * is click-to-copy so an approver can verify a rotation against a known SHA-256
 * (10 hex chars isn't enough entropy to compare on sight). Never the value.
 */
export function FingerprintChip({
  fingerprint,
  length,
  className,
}: {
  fingerprint: string | null;
  length: number | null;
  className?: string;
}) {
  useInterfaceLanguage();
  const { pushToast } = useToastActions();
  const label = fingerprintLabel(fingerprint, length);
  if (!fingerprint) {
    return (
      <span className={cn("inline-flex items-center gap-1 font-mono", className)}>
        <Fingerprint className="size-3 shrink-0" />
        {label}
      </span>
    );
  }
  const full = `sha256:${fingerprint}`;
  return (
    <button
      type="button"
      onClick={() => {
        copyTextToClipboard(full)
          .then(() => pushToast({ title: interfaceText("m_8c837ec1bc2f0d"), tone: "success" }))
          .catch(() => pushToast({ title: interfaceText("m_bed9690f69f662"), tone: "error" }));
      }}
      title={interfaceText("m_59bcf067e3a44c", { value0: (full) })}
      className={cn(
        "inline-flex items-center gap-1 font-mono hover:text-foreground",
        className,
      )}
    >
      <Fingerprint className="size-3 shrink-0" />
      {label}
      <Copy className="size-3 shrink-0 opacity-60" />
    </button>
  );
}

/**
 * An agent-authored justification, framed as an *untrusted claim* rather than
 * trusted UI copy. The muted "Reason given by the agent" caption primes the
 * approver to read it skeptically — the Q0 social-engineering concern: an agent
 * can write "Pre-approved by the CEO" and otherwise inherit the interface's
 * credibility.
 */
export function ProposalJustification({
  justification,
  className,
}: {
  justification: string;
  className?: string;
}) {
  useInterfaceLanguage();
  return (
    <div className={cn("space-y-0.5", className)}>
      <p className="text-(length:--text-micro) text-muted-foreground">{interfaceText("m_39273c7e097b1c")}</p>
      <p className="whitespace-pre-wrap break-words text-xs text-foreground/80">
        “{justification}”
      </p>
    </div>
  );
}

/** Compact agent chip: icon + name. */
export function AgentRefChip({
  agent,
  className,
}: {
  agent: SecretProposalAgentRef;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <AgentAvatar agent={agent} size={16} className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>
      <span className="min-w-0 truncate">{agent.name}</span>
    </span>
  );
}

/** Env-var vs API-access delivery badge for a binding `configPath`. */
export function DeliveryBadge({ configPath }: { configPath: string | null }) {
  const mode = deliveryModeForConfigPath(configPath);
  const isEnv = mode === "env";
  const isApi = mode === "api";
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 gap-1 px-1.5 text-(length:--text-nano) font-normal",
        isEnv && "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        isApi && "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        !isEnv && !isApi && "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {isEnv ? <Variable className="size-3" /> : isApi ? <ServerCog className="size-3" /> : null}
      {deliveryModeLabel(mode)}
    </Badge>
  );
}

/** Distinct "Proposed" pill used wherever a proposal is inlined among live rows. */
export function ProposedBadge({ className }: { className?: string }) {
  useInterfaceLanguage();
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 gap-1 px-1.5 text-(length:--text-nano) font-medium",
        "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      <ShieldAlert className="size-3" />{interfaceText("m_7875ecf92914bf")}</Badge>
  );
}

/** The env KEY / access ALIAS a binding proposal delivers under, e.g. `GITHUB_TOKEN`. */
export function bindingEnvKey(proposal: SecretProposalView): string {
  return aliasFromConfigPath(proposal.configPath);
}

/** Human label for the secret a binding proposal references (live or cascade). */
export function bindingSecretLabel(proposal: SecretProposalView): {
  name: string;
  pending: boolean;
} {
  if (proposal.secretProposalId) {
    return { name: proposal.secretProposalName ?? "proposed secret", pending: true };
  }
  return { name: proposal.secretName ?? "secret", pending: false };
}

function readableError(error: unknown): string {
  if (error instanceof ApiError) return error.message || `Request failed: ${error.status}`;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Try again.";
}

/* -------------------------------------------------------------------------- */
/* Review hook: approve/reject dialogs + mutations, shared across surfaces    */
/* -------------------------------------------------------------------------- */

interface ApproveDraft {
  proposal: SecretProposalView;
  // secret-kind editable fields (re-folder / rename before landing)
  folder: string;
  leaf: string;
  description: string;
  providerConfigId: string;
  // binding-kind: approve the pending dependency secret in the same transaction
  cascade: boolean;
}

export interface UseProposalReview {
  /** Open the approve confirm dialog for a proposal. */
  requestApprove: (proposal: SecretProposalView) => void;
  /** Open the reject (reason required) dialog for a proposal. */
  requestReject: (proposal: SecretProposalView) => void;
  /** True while an approve/reject request is in flight. */
  isBusy: boolean;
  /** Render once inside the surface — hosts both dialogs. */
  dialogs: React.ReactNode;
}

/**
 * Shared approve/reject workflow for secret & binding proposals. Both the
 * board Proposals tab and the agent-settings "Proposed" rows use this so the
 * confirm/reject affordances behave identically everywhere.
 */
export function useProposalReview(
  companyId: string | null,
  providerConfigs: CompanySecretProviderConfig[] = [],
): UseProposalReview {
  useInterfaceLanguage();
  const queryClient = useQueryClient();
  const { pushToast } = useToastActions();

  const [approveDraft, setApproveDraft] = useState<ApproveDraft | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SecretProposalView | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const invalidate = useCallback(() => {
    if (!companyId) return;
    queryClient.invalidateQueries({ queryKey: ["secret-proposals", companyId] });
    queryClient.invalidateQueries({ queryKey: queryKeys.secrets.list(companyId) });
  }, [companyId, queryClient]);

  const approveMutation = useMutation({
    mutationFn: (draft: ApproveDraft) => {
      const { proposal } = draft;
      if (proposal.kind === "secret") {
        const name = draft.folder.trim()
          ? `${draft.folder.trim().replace(/\/+$/, "")}/${draft.leaf.trim()}`
          : draft.leaf.trim();
        return secretsApi.approveProposal(companyId!, proposal.id, {
          overrides: {
            name,
            description: draft.description.trim() || null,
            providerConfigId: draft.providerConfigId || null,
          },
        });
      }
      return secretsApi.approveProposal(companyId!, proposal.id, {
        cascade: draft.cascade || undefined,
      });
    },
    onSuccess: (result) => {
      pushToast({
        title: result.kind === "secret" ? interfaceText("m_65d8abdd5e6749") : interfaceText("m_98ffc80d0d30dd"),
        body:
          result.kind === "secret"
            ? (result.proposedName ?? interfaceText("m_e4a1e1fdf9d48b"))
            : `${result.target?.name ?? "Agent"} · ${bindingEnvKey(result) || "binding"}`,
        tone: "success",
      });
      setApproveDraft(null);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(readableError(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ proposal, reason }: { proposal: SecretProposalView; reason: string }) =>
      secretsApi.rejectProposal(companyId!, proposal.id, { reason: reason.trim() }),
    onSuccess: (result) => {
      pushToast({
        title: interfaceText("m_ad35cb885cad67"),
        body: result.kind === "secret" ? (result.proposedName ?? undefined) : undefined,
        tone: "info",
      });
      setRejectTarget(null);
      setRejectReason("");
      setError(null);
      invalidate();
    },
    onError: (err) => setError(readableError(err)),
  });

  const requestApprove = useCallback(
    (proposal: SecretProposalView) => {
      setError(null);
      const segments = (proposal.proposedName ?? "").split("/");
      const leaf = segments.pop() ?? "";
      setApproveDraft({
        proposal,
        folder: segments.join("/"),
        leaf,
        description: proposal.proposedDescription ?? "",
        // "" = deployment default vault; the dialog dropdown lets the approver pick one.
        providerConfigId:
          providerConfigs.find(
            (config) => config.provider === "local_encrypted" && config.isDefault,
          )?.id ?? "",
        // A binding on a still-pending secret proposal REQUIRES cascade to land.
        cascade: Boolean(proposal.secretProposalId),
      });
    },
    [providerConfigs],
  );

  const requestReject = useCallback((proposal: SecretProposalView) => {
    setError(null);
    setRejectReason("");
    setRejectTarget(proposal);
  }, []);

  const dialogs = (
    <>
      <ApproveDialog
        draft={approveDraft}
        error={error}
        pending={approveMutation.isPending}
        providerConfigs={providerConfigs}
        onChange={setApproveDraft}
        onCancel={() => {
          setApproveDraft(null);
          setError(null);
        }}
        onConfirm={() => approveDraft && approveMutation.mutate(approveDraft)}
      />
      <RejectDialog
        proposal={rejectTarget}
        reason={rejectReason}
        error={error}
        pending={rejectMutation.isPending}
        onReasonChange={setRejectReason}
        onCancel={() => {
          setRejectTarget(null);
          setRejectReason("");
          setError(null);
        }}
        onConfirm={() =>
          rejectTarget && rejectMutation.mutate({ proposal: rejectTarget, reason: rejectReason })
        }
      />
    </>
  );

  return {
    requestApprove,
    requestReject,
    isBusy: approveMutation.isPending || rejectMutation.isPending,
    dialogs,
  };
}

/* -------------------------------------------------------------------------- */
/* Approve dialog                                                             */
/* -------------------------------------------------------------------------- */

function ApproveDialog({
  draft,
  error,
  pending,
  providerConfigs,
  onChange,
  onCancel,
  onConfirm,
}: {
  draft: ApproveDraft | null;
  error: string | null;
  pending: boolean;
  providerConfigs: CompanySecretProviderConfig[];
  onChange: (next: ApproveDraft) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useInterfaceLanguage();
  const isSecret = draft?.proposal.kind === "secret";
  const previewName = draft
    ? draft.folder.trim()
      ? `${draft.folder.trim().replace(/\/+$/, "")}/${draft.leaf.trim()}`
      : draft.leaf.trim()
    : "";
  const localConfigs = providerConfigs.filter((config) => config.provider === "local_encrypted");
  const canConfirm = isSecret ? Boolean(draft && draft.leaf.trim()) : true;

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        {draft ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {isSecret ? interfaceText("m_66d7b3b983b436") : interfaceText("m_32170370d4fdaf")}
              </DialogTitle>
              <DialogDescription>
                {isSecret
                  ? interfaceText("m_3350abf81d2527")
                  : interfaceText("m_cded16e8ba035e")}
              </DialogDescription>
            </DialogHeader>

            {/* Provenance recap — keeps the social-engineering surface visible. */}
            <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2.5 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>{interfaceText("m_3b48f0b6ae209d")}</span>
                <AgentRefChip agent={draft.proposal.proposedBy} className="font-medium text-foreground" />
              </div>
              <ProposalJustification justification={draft.proposal.justification} />
            </div>

            {isSecret ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="approve-folder">{interfaceText("m_74ccd43303847f")}</Label>
                    <Input
                      id="approve-folder"
                      value={draft.folder}
                      onChange={(event) => onChange({ ...draft, folder: event.target.value })}
                      placeholder="dev/github"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="approve-name">{interfaceText("m_dcd1d5223f73b3")}</Label>
                    <Input
                      id="approve-name"
                      value={draft.leaf}
                      onChange={(event) => onChange({ ...draft, leaf: event.target.value })}
                      placeholder="client-secret"
                      autoFocus
                      aria-invalid={!draft.leaf.trim()}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <p className="text-(length:--text-micro) text-muted-foreground">{interfaceText("m_91a5715f701479")}{" "}
                  {previewName ? (
                    <SecretPathName name={previewName} className="font-mono" />
                  ) : (
                    <span className="italic">{interfaceText("m_46b4826df4e3bb")}</span>
                  )}
                </p>

                <div className="space-y-1">
                  <Label htmlFor="approve-description">{interfaceText("m_526e0087cc3f25")}</Label>
                  <Input
                    id="approve-description"
                    value={draft.description}
                    onChange={(event) => onChange({ ...draft, description: event.target.value })}
                    placeholder={interfaceText("m_59be71333c960f")}
                  />
                </div>

                {localConfigs.length > 0 ? (
                  <div className="space-y-1">
                    <Label htmlFor="approve-provider-config">{interfaceText("m_8bb8c5d18a3159")}</Label>
                    <select
                      id="approve-provider-config"
                      value={draft.providerConfigId}
                      onChange={(event) =>
                        onChange({ ...draft, providerConfigId: event.target.value })
                      }
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="">{interfaceText("m_d9bdc394a15e55")}</option>
                      {localConfigs.map((config) => (
                        <option key={config.id} value={config.id}>
                          {config.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
                  <FingerprintChip
                    fingerprint={draft.proposal.valueFingerprintSha256}
                    length={draft.proposal.valueLength}
                  />
                </div>
              </div>
            ) : (
              <BindingApproveBody draft={draft} onChange={onChange} />
            )}

            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button variant="ghost" onClick={onCancel} disabled={pending}>{interfaceText("m_19766ed6ccb2f4")}</Button>
              <Button onClick={onConfirm} disabled={pending || !canConfirm}>
                {pending
                  ? interfaceText("m_e99dcb0a97a232")
                  : isSecret
                    ? interfaceText("m_fe48e1dadb01c3")
                    : draft.cascade
                      ? interfaceText("m_25953f7517166b")
                      : interfaceText("m_32170370d4fdaf")}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BindingApproveBody({
  draft,
  onChange,
}: {
  draft: ApproveDraft;
  onChange: (next: ApproveDraft) => void;
}) {
  useInterfaceLanguage();
  const { proposal } = draft;
  const secret = bindingSecretLabel(proposal);
  const envKey = bindingEnvKey(proposal);
  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-2 rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{interfaceText("m_d539091489783f")}</span>
          {proposal.target ? (
            <AgentRefChip agent={proposal.target} className="text-sm font-medium" />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{interfaceText("m_7ee7eb4eb457c7")}</span>
          <span className="flex items-center gap-1.5">
            <DeliveryBadge configPath={proposal.configPath} />
            <code className="font-mono text-xs">{envKey || proposal.configPath}</code>
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{interfaceText("m_7e32a729b1226e")}</span>
          <span className="flex items-center gap-1.5">
            <KeyRound className="size-3.5 text-muted-foreground" />
            <span className="font-medium">{secret.name}</span>
            {secret.pending ? <ProposedBadge /> : null}
          </span>
        </div>
      </div>

      {/* Cascade pairing: the secret is itself still a pending proposal. */}
      {proposal.secretProposalId ? (
        <label className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs">
          <Checkbox
            checked={draft.cascade}
            onCheckedChange={(checked) => onChange({ ...draft, cascade: checked === true })}
            className="mt-0.5"
            aria-label={interfaceText("m_1ef5afe2320aba")}
          />
          <span className="text-foreground/90">{interfaceText("m_1ef5afe2320aba")}{" "}
            <span className="font-medium">{secret.name}</span>{interfaceText("m_cfc41a0e8b437f")}</span>
        </label>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reject dialog                                                              */
/* -------------------------------------------------------------------------- */

function RejectDialog({
  proposal,
  reason,
  error,
  pending,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  proposal: SecretProposalView | null;
  reason: string;
  error: string | null;
  pending: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useInterfaceLanguage();
  const canConfirm = reason.trim().length > 0;
  return (
    <Dialog open={Boolean(proposal)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        {proposal ? (
          <>
            <DialogHeader>
              <DialogTitle>{interfaceText("m_8c3acdbb3b99d6")}</DialogTitle>
              <DialogDescription>{interfaceText("m_c796ab349f0b8f")}{" "}
                <AgentRefChip agent={proposal.proposedBy} className="text-foreground" />{interfaceText("m_d5e74d5f152a2a")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
              <Label htmlFor="reject-reason">{interfaceText("m_f81ab834de5f84")}</Label>
              <Textarea
                id="reject-reason"
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                rows={3}
                autoFocus
                placeholder={interfaceText("m_1fa2a42938c567")}
              />
            </div>
            {error ? (
              <p className="text-xs text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="ghost" onClick={onCancel} disabled={pending}>{interfaceText("m_19766ed6ccb2f4")}</Button>
              <Button variant="destructive" onClick={onConfirm} disabled={pending || !canConfirm}>
                {pending ? interfaceText("m_09868524d9262e") : interfaceText("m_ab604a36077773")}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared approve/reject action buttons (with permission preflight)           */
/* -------------------------------------------------------------------------- */

export function ProposalActions({
  proposal,
  onApprove,
  onReject,
  disabled,
  size = "sm",
}: {
  proposal: SecretProposalView;
  onApprove: (proposal: SecretProposalView) => void;
  onReject: (proposal: SecretProposalView) => void;
  disabled?: boolean;
  size?: "sm" | "xs";
}) {
  useInterfaceLanguage();
  const blocked = !proposal.viewerCanApprove;
  const heightClass = size === "xs" ? "h-7 px-2 text-xs" : "";
  const approveButton = (
    <Button
      size="sm"
      className={heightClass}
      disabled={disabled || blocked}
      onClick={() => onApprove(proposal)}
    >{interfaceText("m_6007acbe30b2cd")}</Button>
  );
  return (
    <div className="flex items-center gap-1.5">
      {blocked ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>{approveButton}</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-72">
              {proposal.approveBlockReason ?? interfaceText("m_40091fa5916b3f")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        approveButton
      )}
      <Button
        size="sm"
        variant="outline"
        className={heightClass}
        disabled={disabled}
        onClick={() => onReject(proposal)}
      >{interfaceText("m_ab604a36077773")}</Button>
    </div>
  );
}
