import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PauseCircle, PlayCircle, Repeat, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

/** Shared by the task header and its Storybook composition. */
export function TaskTreeControlMenuItems({
  scope,
  canPause,
  canResume,
  canCancel,
  canRestore,
  pending,
  onPause,
  onResume,
  onCancel,
  onRestore,
}: {
  scope: "leaf" | "subtree";
  canPause: boolean;
  canResume: boolean;
  canCancel: boolean;
  canRestore: boolean;
  pending?: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRestore: () => void;
}) {
  useInterfaceLanguage();
  const itemClass =
    "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-accent/50 disabled:opacity-50 disabled:pointer-events-none";
  return (
    <>
      {canPause ? (
        <button disabled={pending} className={itemClass} onClick={onPause}>
          <PauseCircle className="h-3 w-3" />
          {scope === "leaf" ? interfaceText("m_0faaea9a215fb9") : interfaceText("m_d44920538f7072")}
        </button>
      ) : null}
      {canResume ? (
        <button disabled={pending} className={itemClass} onClick={onResume}>
          <PlayCircle className="h-3 w-3" />
          {scope === "leaf" ? interfaceText("m_4c474b94554900") : interfaceText("m_b38209885d3237")}
        </button>
      ) : null}
      {canCancel ? (
        <button
          disabled={pending}
          className={`${itemClass} text-destructive`}
          onClick={onCancel}
        >
          <XCircle className="h-3 w-3" />{interfaceText("m_fccd5115640dc8")}</button>
      ) : null}
      {canRestore ? (
        <button disabled={pending} className={itemClass} onClick={onRestore}>
          <Repeat className="h-3 w-3" />{interfaceText("m_b42c304472894f")}</button>
      ) : null}
    </>
  );
}

export function TaskTreeControlDialog({
  open,
  onOpenChange,
  mode,
  scope,
  affectedCount,
  affectedAgentCount,
  warnings = [],
  loading,
  error,
  pending,
  valid,
  wakeAgents,
  onWakeAgentsChange,
  onRetry,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "resume" | "cancel" | "restore";
  scope: "leaf" | "subtree";
  affectedCount: number;
  affectedAgentCount: number;
  warnings?: string[];
  loading: boolean;
  error?: string | null;
  pending: boolean;
  valid: boolean;
  wakeAgents: boolean;
  onWakeAgentsChange: (wake: boolean) => void;
  onRetry: () => void;
  onApply: () => void;
}) {
  useInterfaceLanguage();
  const cancel = mode === "cancel";
  const tasks = `${affectedCount} task${affectedCount === 1 ? "" : "s"}`;
  const title = cancel
    ? interfaceText("m_b8b708d6da4931")
    : mode === "restore"
      ? interfaceText("m_d824b6aa69a9be")
      : scope === "leaf"
        ? interfaceText("m_4c474b94554900")
        : interfaceText("m_b38209885d3237");
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!pending}
        className="max-h-(--sz-calc-18) overflow-y-auto sm:max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {loading
              ? interfaceText("m_ba3bbbe10d8bef")
              : cancel
                ? interfaceText("m_9439636ff0d6ba", { value0: (tasks) })
                : mode === "restore"
                  ? interfaceText("m_50b75d328af707", { value0: (tasks) })
                  : interfaceText("m_e4fa0cb56d7320", { value0: (tasks) })}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={onRetry}
            >{interfaceText("m_ceba3527286937")}</Button>
          </div>
        ) : null}
        {!cancel ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={wakeAgents && affectedAgentCount > 0}
              disabled={pending || loading || affectedAgentCount === 0}
              onChange={(event) => onWakeAgentsChange(event.target.checked)}
            />{interfaceText("m_ba0ae69712daf3")}{affectedAgentCount})
          </label>
        ) : null}
        {!loading ? warnings.map((warning) => (
          <p key={warning} className="text-sm text-muted-foreground">{warning}</p>
        )) : null}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {cancel ? interfaceText("m_8d7bd1de330023") : interfaceText("m_7d9eb7acb13e24")}
          </Button>
          <Button
            variant={cancel ? "destructive" : "default"}
            disabled={pending || loading || !!error || !valid}
            onClick={onApply}
          >
            {pending
              ? interfaceText("m_3329a9bb48b9c8")
              : cancel
                ? interfaceText("m_262c2e3e8d3c75", { value0: (tasks) })
                : mode === "restore"
                  ? interfaceText("m_f8f5622bf93d80", { value0: (tasks) })
                  : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Quiet, persistent pause feedback shared by the task page and previews. */
export function TaskPauseNotice({
  scope,
  onResume,
  pending,
  className,
  resumeLink,
}: {
  scope: "leaf" | "subtree";
  onResume?: () => void;
  pending?: boolean;
  className?: string;
  resumeLink?: ReactNode;
}) {
  useInterfaceLanguage();
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <span>
        {scope === "subtree" ? interfaceText("m_f9ebf72d55c387") : interfaceText("m_fb9c04c93b5e4f")}
      </span>
      {resumeLink ??
        (onResume ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onResume}
          >
            {scope === "subtree" ? interfaceText("m_b38209885d3237") : interfaceText("m_4c474b94554900")}
          </Button>
        ) : null)}
    </div>
  );
}
