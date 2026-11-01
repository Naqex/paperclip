import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useState, type MouseEvent } from "react";
import type { Issue, IssueLockedStub } from "@paperclipai/shared";
import { Link } from "@/lib/router";
import { LockedIssueChip, isLockedIssueStub } from "../LockedIssueChip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUpRight, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { StatusIcon } from "../StatusIcon";

export function RemovableIssueReferencePill({
  issue,
  onRemove,
  isMobile = false,
}: {
  issue: NonNullable<Issue["blockedBy"]>[number] | IssueLockedStub;
  onRemove: (issueId: string) => void;
  isMobile?: boolean;
}) {
  useInterfaceLanguage();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const locked = isLockedIssueStub(issue);
  const issueLabel = locked
    ? issue.identifier ?? interfaceText("m_8d52cb215e6584")
    : issue.identifier ?? issue.title;
  const confirmLabel = locked
    ? issue.identifier ?? interfaceText("m_f272465f0e386f")
    : issue.identifier
      ? `${issue.identifier}: ${issue.title}`
      : issue.title;
  const chipClassName = cn(
    "paperclip-mention-chip paperclip-mention-chip--issue",
    "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs no-underline",
    !locked && issue.identifier && "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-(length:--rad-3) focus-visible:ring-ring",
  );
  // A private blocker referenced from a task you *can* see: show the locked chip
  // (never a title/link) but keep the detach affordance so you aren't stuck
  // blocked by something invisible.
  const content = locked ? (
    <LockedIssueChip identifier={issue.identifier} />
  ) : (
    <>
      <StatusIcon status={issue.status} className="h-3 w-3 shrink-0" />
      <span className="truncate">{issueLabel}</span>
    </>
  );
  const removeLabel = interfaceText("m_ff55dc7402c675", { value0: (issueLabel) });
  const openRemoveConfirmation = () => setIsConfirmOpen(true);
  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    openRemoveConfirmation();
  };
  const confirmRemove = () => {
    onRemove(issue.id);
    setIsConfirmOpen(false);
  };

  return (
    <>
      <span className="group relative inline-flex">
        {isMobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-mention-kind="issue"
                className={chipClassName}
                title={locked ? interfaceText("m_8d52cb215e6584") : issue.title}
                aria-label={interfaceText("m_e74765a34e09d7", { value0: (issueLabel) })}
              >
                {content}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {!locked && issue.identifier ? (
                <DropdownMenuItem asChild>
                  <Link to={`/issues/${issue.identifier}`}>
                    <ArrowUpRight className="h-4 w-4" />{interfaceText("m_ecacc67b009d5b")}</Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem variant="destructive" onSelect={openRemoveConfirmation}>
                <X className="h-4 w-4" />{interfaceText("m_76792aa60019fa")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <button
              type="button"
              className="absolute -right-1 -top-1 z-10 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-0 shadow-sm transition-colors transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-(length:--rad-2) focus-visible:ring-ring group-hover:opacity-100"
              aria-label={removeLabel}
              title={removeLabel}
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </button>
            {locked ? (
              content
            ) : issue.identifier ? (
              <Link
                to={`/issues/${issue.identifier}`}
                data-mention-kind="issue"
                className={chipClassName}
                title={issue.title}
                aria-label={interfaceText("m_7071c28ac50360", { value0: (issueLabel), value1: (issue.title) })}
              >
                {content}
              </Link>
            ) : (
              <span
                data-mention-kind="issue"
                className={chipClassName}
                title={issue.title}
                aria-label={interfaceText("m_60879ac2258a5e", { value0: (issue.title) })}
              >
                {content}
              </span>
            )}
          </>
        )}
      </span>
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{interfaceText("m_b7d963b0caf9a6")}</DialogTitle>
            <DialogDescription>{interfaceText("m_5948954e3b49be")}{confirmLabel}{interfaceText("m_3b94139c92f099")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">{interfaceText("m_19766ed6ccb2f4")}</Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={confirmRemove}>{interfaceText("m_76792aa60019fa")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ExpandRelationListButton({
  hiddenCount,
  expanded,
  onClick,
}: {
  hiddenCount: number;
  expanded: boolean;
  onClick: () => void;
}) {
  useInterfaceLanguage();
  if (!expanded && hiddenCount <= 0) return null;
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
      onClick={onClick}
      aria-label={expanded ? interfaceText("m_b908f492c1d301") : interfaceText("m_d8ce2dda945f76", { value0: (hiddenCount) })}
    >
      {expanded ? interfaceText("m_94ea9b1d33a029") : interfaceText("m_d0c7127a6d36df", { value0: (hiddenCount) })}
    </button>
  );
}
