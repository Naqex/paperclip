import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Component, Suspense, useState, type ReactNode } from "react";
import { captureBrowserException } from "../lib/sentry";
import { PaperclipLoading } from "./AnimatedPaperclipIcon";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

interface DeferredOverlayProps {
  requested: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

function OverlayNotice({ title, onClose, failed = false }: Pick<DeferredOverlayProps, "title" | "onClose"> & { failed?: boolean }) {
  useInterfaceLanguage();
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent showCloseButton={false} aria-describedby={undefined}>
      <DialogTitle>{failed ? interfaceText("m_69b42728b8cb90", { value0: (title.toLowerCase()) }) : interfaceText("m_2493f3817ec983", { value0: (title.toLowerCase()) })}</DialogTitle>
      {failed
        ? <p className="text-sm text-muted-foreground">{interfaceText("m_acc29aeaecb8ea")}</p>
        : <PaperclipLoading className="min-h-0" />}
      <div className="flex justify-end"><Button variant="outline" onClick={onClose}>{failed ? interfaceText("m_7d9eb7acb13e24") : interfaceText("m_19766ed6ccb2f4")}</Button></div>
    </DialogContent>
  </Dialog>;
}

class OverlayErrorBoundary extends Component<DeferredOverlayProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { captureBrowserException(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return this.props.requested ? <OverlayNotice title={this.props.title} onClose={this.props.onClose} failed /> : null;
  }
}

export function DeferredOverlay({ requested, title, onClose, children }: DeferredOverlayProps) {
  const [activated, setActivated] = useState(requested);
  if (requested && !activated) setActivated(true);
  if (!requested && !activated) return null;
  return <OverlayErrorBoundary requested={requested} title={title} onClose={onClose}>
    <Suspense fallback={requested ? <OverlayNotice title={title} onClose={onClose} /> : null}>{children}</Suspense>
  </OverlayErrorBoundary>;
}
