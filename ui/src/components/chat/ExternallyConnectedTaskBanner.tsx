import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { TaskVoiceLauncher } from "@/components/voice/TaskVoiceLauncher";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Paperclip, Radio } from "lucide-react";
import type {
  ChatPublicationState,
  ChatFileTransferPhase,
  IssueAttachment,
} from "@paperclipai/shared";
import {
  chatEndpointsApi,
  type ChatProvider,
  type ChatPublicationSummary,
  type ExternalChannelBindingSummary,
} from "@/api/chatEndpoints";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/context/ToastContext";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import { useChatConnectorsEnabled, chatProviderVisible } from "@/hooks/useChatConnectorsEnabled";
import { issuesApi } from "@/api/issues";
import { describeError } from "@/api/errors";
import { classifySendFailure, type SendOutcome } from "@/lib/pending-send";
import { useAutoResend } from "@/hooks/useDurableSubmit";
import { useDraftOwner, useDraftOwnerReader } from "@/hooks/useDraftOwner";
import { useAccountBoundMutation } from "@/hooks/useAccountBoundMutation";
import {
  boardSendDraftKey,
  clearBoardSendDraft,
  canDismissBoardSendBatch,
  readBoardSendDraft,
  readBoardSendRejection,
  writeBoardSendDraft,
  type BoardSendRejection,
  type RetainedBoardSend,
} from "./board-send-draft";

import { LegacyBoardSendNotice } from "./LegacyBoardSendNotice";

const providerNames: Record<ChatProvider, string> = {
  speko: "Speko",
  slack: "Slack",
  github: "GitHub",
  discord: "Discord",
  "microsoft-teams": "Microsoft Teams",
  telegram: "Telegram",
  agentmail: "AgentMail",
  "imessage-photon": "iMessage Photon",
};

type PublicationFeedback = {
  title: string;
  body: string;
  tone: "info" | "success" | "warn" | "error";
};

const publicationFeedback: Record<ChatPublicationState, PublicationFeedback> = {
  awaiting_consent: {
    title: "Waiting for file consent",
    body: "The recipient must accept the file card in Microsoft Teams. The file is not delivered yet; this send identity is kept while Paperclip waits.",
    tone: "info",
  },
  published: {
    title: "Sent to channel",
    body: "The board update was published to the connected conversation.",
    tone: "success",
  },
  pending: {
    title: "Queued for channel",
    body: "Delivery is still pending. Your draft is kept until Paperclip confirms publication.",
    tone: "info",
  },
  streaming: {
    title: "Publishing to channel",
    body: "Delivery is still in progress. Your draft is kept until Paperclip confirms publication.",
    tone: "info",
  },
  retry: {
    title: "Delivery retry scheduled",
    body: "Paperclip will retry this publication. Your draft and retry identity are kept.",
    tone: "warn",
  },
  delivery_unknown: {
    title: "Delivery not confirmed",
    body: "The provider may have accepted this update. Resolve it in Activity before trying again to avoid a duplicate.",
    tone: "warn",
  },
  failed: {
    title: "Channel delivery failed",
    body: "Your draft is kept. Open Activity to retry this same publication safely.",
    tone: "error",
  },
  cancelled: {
    title: "Channel delivery cancelled",
    body: "Your draft is kept. Some parts may already have been published; check Activity before starting a new send.",
    tone: "info",
  },
};

const filePhaseLabels: Record<ChatFileTransferPhase, string> = {
  consent_pending: "Consent card queued",
  consent_sending: "Sending consent card",
  consent_unknown: "Consent card delivery not confirmed",
  awaiting_consent: "Awaiting consent",
  upload_pending: "Upload queued",
  uploading: "Uploading file",
  upload_unknown: "File upload not confirmed",
  file_info_pending: "File notification queued",
  file_info_sending: "Sending file notification",
  file_info_unknown: "File notification not confirmed",
  delivered: "Delivered",
  declined: "Declined",
  expired: "Consent expired",
  cancelled: "Cancelled; remote bytes may remain",
  conflict: "File delivery needs review",
};

export function useIssueChatBinding(companyId: string, issueId: string) {
  const { enabled, githubEnabled } = useChatConnectorsEnabled();
  const queryEnabled = (enabled || githubEnabled) && Boolean(companyId && issueId) && !issueId.startsWith("chat:");
  const query = useQuery({
    queryKey: ["issue-chat-binding", companyId, issueId],
    queryFn: () => chatEndpointsApi.getIssueBinding(issueId),
    enabled: queryEnabled,
  });
  return {
    binding: queryEnabled && chatProviderVisible(query.data?.provider, enabled, githubEnabled) ? (query.data ?? null) : null,
    isLoading: queryEnabled && query.isLoading,
  };
}

type ConnectedTaskProps = {
  className?: string;
  attachments?: IssueAttachment[];
  companyId: string;
  issueId: string;
  issueCacheRefs?: string[];
  assigneeAgentId?: string | null;
};

export function ExternallyConnectedTaskBanner(props: ConnectedTaskProps) {
  const { binding } = useIssueChatBinding(props.companyId, props.issueId);
  const draftOwner = useDraftOwner();
  return <>
    {draftOwner !== undefined && binding && binding.provider !== "speko" && binding.provider !== "agentmail" && <ConnectedTaskComposer
      key={boardSendDraftKey(props.companyId, props.issueId, binding.endpointId, binding.conversationId, draftOwner)}
      {...props}
      binding={binding}
      draftOwner={draftOwner}
    />}
    <TaskVoiceLauncher companyId={props.companyId} issueId={props.issueId} agentId={props.assigneeAgentId} boundEndpointId={binding?.provider === "speko" ? binding.endpointId : undefined} />
  </>;
}

function ConnectedTaskComposer({
  className,
  attachments = [],
  companyId,
  issueId,
  issueCacheRefs,
  binding,
  draftOwner,
}: ConnectedTaskProps & { binding: ExternalChannelBindingSummary; draftOwner: string }) {
  useInterfaceLanguage();
  const readOwner = useDraftOwnerReader();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState("");
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>(
    [],
  );
  const [publication, setPublication] = useState<ChatPublicationSummary | null>(
    null,
  );
  const idempotencyKey = useRef<string | null>(null);
  const retainedSend = useRef<RetainedBoardSend | null>(null);
  const retainedScopeKey = useRef<string | null>(null);
  const [unconfirmedRequest, setUnconfirmedRequest] = useState(false);
  const [rejection, setRejection] = useState<BoardSendRejection | null>(null);
  const [excludedAttachmentIds, setExcludedAttachmentIds] = useState<string[]>(
    [],
  );
  const [selectionNotice, setSelectionNotice] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [unownedRequest, setUnownedRequest] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadInFlight = useRef(false);
  const mounted = useRef(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<
    IssueAttachment[]
  >([]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const storageKey = binding
    ? boardSendDraftKey(
        companyId,
        issueId,
        binding.endpointId,
        binding.conversationId,
        draftOwner,
      )
    : null;
  const legacyStorageKey = boardSendDraftKey(companyId, issueId, binding.endpointId, binding.conversationId);
  const loadedStorageKey = useRef<string | null>(null);
  useEffect(() => {
    if (!storageKey || loadedStorageKey.current === storageKey) return;
    loadedStorageKey.current = storageKey;
    try {
      if (sessionStorage.getItem(legacyStorageKey) !== null) {
        setUnownedRequest(true);
        setStorageError("An earlier update has an unknown sender. Open Activity to check its delivery before starting a new update.");
        setComposing(true);
        return;
      }
      const saved = readBoardSendDraft(storageKey);
      retainedScopeKey.current = storageKey;
      retainedSend.current = saved;
      idempotencyKey.current = saved?.idempotencyKey ?? null;
      setBody(saved?.body ?? "");
      setSelectedAttachmentIds(saved?.attachmentIds ?? []);
      setPublication(saved?.publication ?? null);
      setUnconfirmedRequest(
        Boolean(saved && !saved.publication && !saved.rejection),
      );
      setRejection(saved?.rejection ?? null);
      setComposing(Boolean(saved));
      setStorageError(null);
    } catch {
      setStorageError(
        "Saved delivery identity could not be read. Check Activity and restore browser storage before starting another send.",
      );
      setComposing(true);
    }
  }, [legacyStorageKey, storageKey, unownedRequest]);
  const deliveryScopeReady = Boolean(
    storageKey &&
    loadedStorageKey.current === storageKey &&
    retainedScopeKey.current === storageKey,
  );
  const invalidateTask = useCallback(() => {
    for (const ref of new Set([issueId, ...(issueCacheRefs ?? [])])) {
      for (const queryKey of [
        queryKeys.issues.comments(ref),
        queryKeys.issues.attachments(ref),
        queryKeys.issues.detail(ref),
        queryKeys.issues.activity(ref),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    }
  }, [issueId, issueCacheRefs, queryClient]);
  const finishPublication = useCallback(() => {
    if (storageKey) {
      try {
        clearBoardSendDraft(storageKey);
      } catch {
        /* The retained anchor remains safe to recheck after reload. */
      }
    }
    retainedSend.current = null;
    setUnconfirmedRequest(false);
    setRejection(null);
    setSelectionNotice(false);
    setPublication(null);
    idempotencyKey.current = null;
    setBody("");
    setSelectedAttachmentIds([]);
    setUploadedAttachments([]);
    setUploadError(null);
    setComposing(false);
    invalidateTask();
    pushToast(publicationFeedback.published);
  }, [invalidateTask, pushToast, storageKey]);
  // Keep the first returned ID as the anchor. A batch's blocking row may
  // change as text and files finish; no read is allowed to submit another send.
  const publicationStatus = useQuery({
    queryKey: [
      "chat-publication-batch",
      draftOwner,
      companyId,
      binding?.endpointId,
      binding?.conversationId,
      publication?.id,
    ],
    queryFn: () =>
      chatEndpointsApi.getPublicationBatchStatus(
        binding!.endpointId,
        binding!.conversationId,
        publication!.id,
      ),
    enabled: deliveryScopeReady && Boolean(publication),
    staleTime: 0,
    refetchInterval: 2_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  useEffect(() => {
    const batch = publicationStatus.data;
    if (
      publication &&
      batch &&
      batch.total > 0 &&
      batch.published === batch.total &&
      batch.publication.state === "published"
    ) {
      finishPublication();
    }
  }, [publication, publicationStatus.data, finishPublication]);
  const publish = useAccountBoundMutation({
    mutationFn: (input: {
      attachmentIds: string[];
      body: string;
      idempotencyKey: string;
      endpointId: string;
      conversationId: string;
    }) => {
      if (readOwner() !== draftOwner) throw new DOMException("Your account changed. Reopen this task to send from your current account.", "AbortError");
      return chatEndpointsApi.publishBoardMessage(
        input.endpointId,
        input.conversationId,
        input.body,
        input.idempotencyKey,
        input.attachmentIds,
      );
    },
    onSuccess: (result) => {
      invalidateTask();
      const feedback = publicationFeedback[result.state];
      setPublication(result.state === "published" ? null : result);
      if (result.state === "published") {
        finishPublication();
        return;
      }
      setUnconfirmedRequest(false);
      if (storageKey && retainedSend.current) {
        retainedSend.current = {
          ...retainedSend.current,
          publication: {
            id: result.id,
            state: result.state,
            attempts: result.attempts,
          },
        };
        try {
          writeBoardSendDraft(storageKey, retainedSend.current);
        } catch {
          // The pre-POST payload/key is already persisted. It remains a safe,
          // explicit same-request retry when the publication ID cannot be saved.
        }
      }
      pushToast({
        ...feedback,
        action: {
          label: interfaceText("m_4bf3f8ddd7bf23"),
          href: `/apps/chat/${binding!.endpointId}/activity`,
        },
      });
    },
    onError: (error, request) => {
      const rejected = readBoardSendRejection(error, request);
      if (rejected && retainedSend.current && storageKey) {
        const saved = { ...retainedSend.current, rejection: rejected };
        try {
          // Keep the negative receipt through reload before offering a new key.
          writeBoardSendDraft(storageKey, saved);
        } catch {
          setStorageError(
            "The rejected send could not be saved. Restore browser storage, then retry this same request to recover its receipt.",
          );
          return;
        }
        retainedSend.current = saved;
        setRejection(rejected);
        setUnconfirmedRequest(false);
        invalidateTask();
        pushToast({
          title: interfaceText("m_313813f30237c2"),
          body: interfaceText("m_2c699a370dfb64"),
          tone: "error",
        });
        return;
      }
      // Outages and lost receipts resend on their own with the same request
      // identity; the inline notice covers them.
      if (classifySendFailure(error) === "pending") return;
      pushToast({
        title: interfaceText("m_c3e0510dffa911"),
        body: interfaceText("m_23e1574cd05119", { value0: (describeError(error).body) }),
        tone: "error",
      });
    },
  });
  // A send that failed with an outage or a lost receipt in this session
  // resends with its saved key; the server returns the original publication
  // instead of queueing another message. A send restored after reload has an
  // unknown outcome and waits for an explicit retry.
  const resendWaiting = Boolean(
    deliveryScopeReady &&
    unconfirmedRequest &&
    retainedSend.current &&
    !rejection &&
    !publication &&
    !storageError &&
    publish.status === "error" &&
    classifySendFailure(publish.error) === "pending",
  );
  const autoResend = useAutoResend({
    sourceId: `board-send:${storageKey ?? issueId}`,
    active: resendWaiting,
    resend: async (): Promise<SendOutcome> => {
      const input = retainedSend.current;
      if (!input || readOwner() !== draftOwner) return "rejected";
      try {
        await publish.mutateAsync({
          ...input,
          endpointId: binding.endpointId,
          conversationId: binding.conversationId,
        });
        return "sent";
      } catch (error) {
        return classifySendFailure(error);
      }
    },
  });
  // Automatic resends gave up while online; only Resend now tries again.
  const resendStalled = resendWaiting && autoResend.stalled && !autoResend.resending;
  const uploadDisabled = Boolean(
    retainedSend.current ||
    publication ||
    publish.isPending ||
    publish.isError ||
    unconfirmedRequest ||
    storageError ||
    !deliveryScopeReady ||
    uploading,
  );
  async function uploadFile(file: File) {
    if (uploadDisabled || uploadInFlight.current || retainedSend.current)
      return;
    uploadInFlight.current = true;
    setUploading(true);
    setUploadError(null);
    try {
      const attachment = await issuesApi.uploadAttachment(
        companyId,
        issueId,
        file,
      );
      if (!mounted.current) return;
      setUploadedAttachments((current) => [...current, attachment]);
      setSelectedAttachmentIds((current) => [...current, attachment.id]);
      idempotencyKey.current = null;
    } catch (error) {
      if (mounted.current) {
        setUploadError(
          `${error instanceof Error ? error.message : "Upload could not be confirmed."} No channel message was sent. Check task files before retrying the upload.`,
        );
      }
    } finally {
      uploadInFlight.current = false;
      if (mounted.current) setUploading(false);
      // An interrupted response may still have stored the file on this task.
      invalidateTask();
    }
  }
  // Keep newly uploaded files usable before the task refetch completes. Once
  // present, server metadata wins (especially a file bound to a sent comment).
  const taskAttachments = [
    ...new Map(
      [...uploadedAttachments, ...attachments].map((attachment) => [
        attachment.id,
        attachment,
      ]),
    ).values(),
  ];
  useEffect(() => {
    // Metadata may arrive after this file was selected but before Send. Never
    // silently keep a now-hidden selection, and never rewrite a retained send.
    if (retainedSend.current) return;
    const newlyBound = attachments
      .filter((file) => file.issueCommentId !== null)
      .map((file) => file.id);
    if (!selectedAttachmentIds.some((id) => newlyBound.includes(id))) return;
    setSelectedAttachmentIds((current) =>
      current.filter((id) => !newlyBound.includes(id)),
    );
    setSelectionNotice(true);
    idempotencyKey.current = null;
  }, [attachments, selectedAttachmentIds]);
  const showingRetainedFiles = Boolean(retainedSend.current);
  // Comment binding removes files from new-send eligibility, not from the
  // immutable receipt for the current send. Saved names survive reload while
  // task metadata is loading (or a selected attachment has since been removed).
  const visibleAttachments = retainedSend.current
    ? retainedSend.current.attachmentIds.map((id) => ({
        id,
        originalFilename:
          retainedSend.current?.attachmentNames?.find((file) => file.id === id)
            ?.name ??
          taskAttachments.find((attachment) => attachment.id === id)
            ?.originalFilename ??
          "Selected task file (details unavailable)",
      }))
    : taskAttachments.filter(
        (attachment) =>
          attachment.issueCommentId === null &&
          !excludedAttachmentIds.includes(attachment.id),
      );
  const currentPublication = publicationStatus.data?.publication ?? publication;
  const batch = publicationStatus.data;
  const dismissible =
    !publicationStatus.isError &&
    !publicationStatus.isFetching &&
    canDismissBoardSendBatch(batch);
  const mixedTerminal =
    canDismissBoardSendBatch(batch) && batch!.published < batch!.total;
  const currentFeedback = mixedTerminal
    ? {
        title: "Delivery settled with mixed outcomes",
        body: "Not every part was confirmed delivered. Review the outcomes below; dismissing this receipt does not resend anything.",
        tone: "info" as const,
      }
    : currentPublication?.state === "cancelled" &&
        (batch?.awaitingConsent ?? 0) > 0
      ? {
          title: "Waiting for remaining file consent",
          body: "Some parts have settled. The remaining file cards still need the recipient's response; this send stays locked until the whole batch is resolved.",
          tone: "info" as const,
        }
      : currentPublication
        ? publicationFeedback[currentPublication.state]
        : null;
  const activityPath = `/apps/chat/${binding.endpointId}/activity`;
  return (
    <section
      aria-label={interfaceText("m_051d5bb3be53ec")}
      className={cn("task-context-notice space-y-3", className)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
          <Radio className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{interfaceText("m_2af9ce1701f756")}{providerNames[binding.provider]}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {binding.externalLabel} · {binding.provider === "slack"
                ? interfaceText("m_900b0ca4792400")
                : interfaceText("m_74099745c3c813")}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {binding.externalUrl && (
            <Button asChild size="sm" variant="outline">
              <a href={binding.externalUrl} target="_blank" rel="noreferrer">{interfaceText("m_b8039d1d54bf9e")}{providerNames[binding.provider]} <ExternalLink />
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setComposing((value) => !value)}
          >{interfaceText("m_dface7aaaa742f")}</Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/apps/chat/${binding.endpointId}/conversations`}>{interfaceText("m_639a40e82b9a96")}</Link>
          </Button>
        </div>
      </div>
      {composing && (
        <div className="space-y-2 border-t border-border pt-3">
          <label
            className="text-xs font-medium"
            htmlFor="external-board-update"
          >{interfaceText("m_6e1dcf6a784f03")}</label>
          <Textarea
            id="external-board-update"
            value={body}
            disabled={
              Boolean(publication) ||
              Boolean(rejection) ||
              publish.isError ||
              unconfirmedRequest ||
              Boolean(storageError) ||
              !deliveryScopeReady
            }
            onChange={(event) => {
              setBody(event.target.value);
              idempotencyKey.current = null;
              publish.reset();
            }}
            placeholder={interfaceText("m_c5a8ffd5cb4031")}
          />
          {selectedAttachmentIds.length > 0 && !body.trim() && (
            <p className="text-xs text-muted-foreground">{interfaceText("m_680f3ab6f7a028")}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              aria-label={interfaceText("m_59a735f6957861")}
              disabled={uploadDisabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadFile(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploadDisabled}
              onClick={() => fileInput.current?.click()}
            >
              <Paperclip />
              {uploading ? interfaceText("m_5ce44dd77dae78") : interfaceText("m_87fbe4fb79b1d7")}
            </Button>
            <p className="text-xs text-muted-foreground">{interfaceText("m_c68a82b0335386")}</p>
          </div>
          {uploadError && (
            <p role="alert" className="text-xs text-destructive">
              {uploadError}
            </p>
          )}
          {selectionNotice && (
            <p role="status" className="text-xs text-muted-foreground">{interfaceText("m_15717288157c26")}</p>
          )}
          {visibleAttachments.length > 0 && (
            <fieldset
              className="space-y-2 rounded-md border border-border bg-background p-3"
              disabled={
                showingRetainedFiles ||
                Boolean(publication) ||
                publish.isError ||
                unconfirmedRequest ||
                Boolean(storageError) ||
                !deliveryScopeReady
              }
            >
              <legend className="px-1 text-xs font-medium">
                {showingRetainedFiles
                  ? interfaceText("m_7674c3b4a421fb")
                  : interfaceText("m_47c29c1f594138")}
              </legend>
              <p className="text-xs text-muted-foreground">
                {binding.provider === "github"
                  ? interfaceText("m_82e71ca771cddf")
                  : binding.provider === "microsoft-teams" &&
                      !showingRetainedFiles
                    ? interfaceText("m_53b1a2a804b01d")
                    : showingRetainedFiles
                      ? interfaceText("m_3b09f25686a5cb")
                      : interfaceText("m_53a7b5b74d6e32")}
              </p>
              <div className="space-y-2">
                {visibleAttachments.map((attachment) => {
                  const label =
                    attachment.originalFilename ?? interfaceText("m_a90dd5d8ed3331");
                  return (
                    <label
                      className="flex items-center gap-2 text-xs"
                      key={attachment.id}
                    >
                      <Checkbox
                        disabled={showingRetainedFiles}
                        checked={selectedAttachmentIds.includes(attachment.id)}
                        onCheckedChange={(checked) => {
                          setSelectedAttachmentIds((current) =>
                            checked === true
                              ? [...current, attachment.id]
                              : current.filter((id) => id !== attachment.id),
                          );
                          idempotencyKey.current = null;
                          publish.reset();
                        }}
                      />
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          {storageError && (
            <p role="alert" className="text-xs text-destructive">
              {storageError}{" "}
              <Link className="underline underline-offset-4" to={activityPath}>{interfaceText("m_b2a9770667ad27")}</Link>
            </p>
          )}
          {unownedRequest && <LegacyBoardSendNotice onDiscard={() => {
            if (readOwner() !== draftOwner) return;
            try { clearBoardSendDraft(legacyStorageKey); }
            catch {
              setStorageError("Saved delivery record could not be discarded. Restore browser storage, then try again.");
              return;
            }
            loadedStorageKey.current = null;
            setUnownedRequest(false);
            setStorageError(null);
          }} />}
          {rejection && (
            <div
              role="alert"
              className="space-y-1 rounded-md border border-border bg-background p-3 text-xs"
            >
              <p className="font-medium">{interfaceText("m_313813f30237c2")}</p>
              <p className="text-muted-foreground">{interfaceText("m_c22adf1551ecc3")}</p>
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(storageError)}
                onClick={() => {
                  if (!storageKey || !retainedSend.current?.rejection) return;
                  try {
                    clearBoardSendDraft(storageKey);
                  } catch {
                    setStorageError(
                      "Saved rejection could not be cleared. Restore browser storage before editing this send.",
                    );
                    return;
                  }
                  const invalidIds =
                    retainedSend.current.rejection.attachmentIds;
                  setExcludedAttachmentIds((current) => [
                    ...new Set([...current, ...invalidIds]),
                  ]);
                  setSelectedAttachmentIds((current) =>
                    current.filter((id) => !invalidIds.includes(id)),
                  );
                  setUploadedAttachments((current) =>
                    current.filter((file) => !invalidIds.includes(file.id)),
                  );
                  retainedSend.current = null;
                  idempotencyKey.current = null;
                  setRejection(null);
                  setUnconfirmedRequest(false);
                  setSelectionNotice(true);
                  publish.reset();
                }}
              >{interfaceText("m_c342fb93adc4d2")}</Button>
            </div>
          )}
          {!rejection &&
            (publish.isError || unconfirmedRequest) &&
            // An automatic resend keeps the waiting notice up while it runs.
            (!publish.isPending || autoResend.resending) &&
            !publication && (
              <div
                role="alert"
                className="space-y-1 rounded-md border border-border bg-background p-3 text-xs"
              >
                <p className="font-medium">
                  {resendStalled
                    ? interfaceText("m_0df18df04915cb")
                    : resendWaiting || autoResend.resending
                      ? interfaceText("m_8639e646e6ceb3")
                      : interfaceText("m_68d563e3850fba")}
                </p>
                <p className="text-muted-foreground">
                  {resendStalled
                    ? interfaceText("m_227ee75a0d6397")
                    : resendWaiting || autoResend.resending
                      ? interfaceText("m_debcdc300a272c")
                      : interfaceText("m_876c543e376c9e")}
                </p>
                <Link
                  className="inline-block font-medium underline underline-offset-4"
                  to={activityPath}
                >{interfaceText("m_b2a9770667ad27")}</Link>
              </div>
            )}
          {publication && currentPublication && currentFeedback && (
            <div
              role={
                currentPublication.state === "failed" ||
                currentPublication.state === "delivery_unknown"
                  ? "alert"
                  : "status"
              }
              className="space-y-1 rounded-md border border-border bg-background p-3 text-xs"
            >
              <p className="font-medium">{currentFeedback.title}</p>
              <p className="text-muted-foreground">{currentFeedback.body}</p>
              {batch && (
                <p className="text-muted-foreground">
                  {batch.declined !== undefined &&
                  batch.expired !== undefined &&
                  batch.cancelled !== undefined &&
                  batch.awaitingConsent !== undefined
                    ? [
                        `${batch.published} published`,
                        ...(batch.awaitingConsent
                          ? [`${batch.awaitingConsent} awaiting consent`]
                          : []),
                        ...(batch.declined
                          ? [`${batch.declined} declined`]
                          : []),
                        ...(batch.expired ? [`${batch.expired} expired`] : []),
                        ...(batch.cancelled
                          ? [`${batch.cancelled} cancelled`]
                          : []),
                      ].join(" · ")
                    : interfaceText("m_3d31a51ef4bace", { value0: (batch.published), value1: (batch.total) })}
                </p>
              )}
              {batch?.parts?.some((part) => part.fileTransfer) && (
                <ul
                  className="space-y-1 text-muted-foreground"
                  aria-label={interfaceText("m_e0229aa59efcc9")}
                >
                  {batch.parts
                    .filter((part) => part.fileTransfer)
                    .map((part) => (
                      <li key={part.id}>
                        {part.fileTransfer!.filename} —{" "}
                        {filePhaseLabels[part.fileTransfer!.phase]}
                      </li>
                    ))}
                </ul>
              )}
              {publicationStatus.isError && (
                <p role="alert" className="text-muted-foreground">{interfaceText("m_2c58b83f06c813")}</p>
              )}
              {currentPublication.redactedError && (
                <p className="text-muted-foreground">{interfaceText("m_97b9181a1cb9bd")}{currentPublication.redactedError}
                </p>
              )}
              <Link
                className="inline-block font-medium underline underline-offset-4"
                to={activityPath}
              >{interfaceText("m_b2a9770667ad27")}</Link>
              {dismissible && (
                <Button
                  className="ml-3"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (storageKey) {
                      try {
                        clearBoardSendDraft(storageKey);
                      } catch {
                        setStorageError(
                          "Saved delivery identity could not be cleared. Restore browser storage before starting another send.",
                        );
                        return;
                      }
                    }
                    setStorageError(null);
                    retainedSend.current = null;
                    setUnconfirmedRequest(false);
                    setPublication(null);
                    setBody("");
                    setSelectedAttachmentIds([]);
                    setUploadedAttachments([]);
                    setUploadError(null);
                    idempotencyKey.current = null;
                    publish.reset();
                  }}
                >{interfaceText("m_e6d60fbc843c8d")}</Button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {binding.provider === "slack"
                ? interfaceText("m_fe11e393ae9b35")
                : interfaceText("m_9add383460a6d7")}
            </p>
            <Button
              size="sm"
              disabled={
                !body.trim() ||
                publish.isPending ||
                uploading ||
                Boolean(publication) ||
                Boolean(rejection) ||
                Boolean(storageError) ||
                !deliveryScopeReady
              }
              onClick={() => {
                if (
                  uploadInFlight.current ||
                  readOwner() !== draftOwner ||
                  !storageKey ||
                  loadedStorageKey.current !== storageKey ||
                  retainedScopeKey.current !== storageKey
                )
                  return;
                if (resendWaiting) {
                  // Same saved request; also restarts the automatic resends.
                  autoResend.resendNow();
                  return;
                }
                idempotencyKey.current ??= crypto.randomUUID();
                const input = retainedSend.current ?? {
                  attachmentIds: selectedAttachmentIds,
                  attachmentNames: selectedAttachmentIds.map((id) => ({
                    id,
                    name:
                      taskAttachments.find((attachment) => attachment.id === id)
                        ?.originalFilename ?? "Unnamed attachment",
                  })),
                  body: body.trim(),
                  idempotencyKey: idempotencyKey.current,
                  publication: null,
                };
                try {
                  if (!storageKey) throw new Error("Missing delivery scope");
                  writeBoardSendDraft(storageKey, input);
                } catch {
                  setStorageError(
                    "Browser storage could not preserve this delivery identity. No update was sent. Restore browser storage, then reload to try again.",
                  );
                  return;
                }
                retainedSend.current = input;
                setUnconfirmedRequest(true);
                publish.mutate({
                  ...input,
                  endpointId: binding.endpointId,
                  conversationId: binding.conversationId,
                });
              }}
            >
              {publish.isPending
                ? interfaceText("m_b8ed5279e897be")
                : resendWaiting
                  ? interfaceText("m_a4fab5c81218e5")
                  : !rejection && (publish.isError || unconfirmedRequest)
                  ? interfaceText("m_aea7359da3eb98")
                  : interfaceText("m_dface7aaaa742f")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
