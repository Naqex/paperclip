import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ShortcutEntry {
  keys: string[];
  label: string;
  /** Render keys as a simultaneous chord (joined with "+") rather than a
   *  "then" sequence. */
  combo?: boolean;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutEntry[];
}

const sections: ShortcutSection[] = [
  {
    title: "Inbox",
    shortcuts: [
      { keys: ["j"], get label() { return interfaceText("m_40bb50da160cdc"); } },
      { keys: ["↓"], get label() { return interfaceText("m_40bb50da160cdc"); } },
      { keys: ["k"], get label() { return interfaceText("m_c66feb5eb8f217"); } },
      { keys: ["↑"], get label() { return interfaceText("m_c66feb5eb8f217"); } },
      { keys: ["←"], get label() { return interfaceText("m_933a60afce8a6b"); } },
      { keys: ["→"], get label() { return interfaceText("m_6ecae6bf37bf05"); } },
      { keys: ["Enter"], get label() { return interfaceText("m_948dbc15b31394"); } },
      { keys: ["a"], get label() { return interfaceText("m_0fd57cea79115d"); } },
      { keys: ["y"], get label() { return interfaceText("m_0fd57cea79115d"); } },
      { keys: ["r"], get label() { return interfaceText("m_50c8b81faf51e7"); } },
      { keys: ["U"], get label() { return interfaceText("m_2c19d584bf8ad5"); } },
    ],
  },
  {
    title: "Task detail",
    shortcuts: [
      { keys: ["y"], get label() { return interfaceText("m_630428a4c87f5f"); } },
      { keys: ["g", "i"], get label() { return interfaceText("m_cde5bedaa1cc43"); } },
      { keys: ["g", "c"], get label() { return interfaceText("m_a0f6da743c0710"); } },
    ],
  },
  {
    title: "Decisions",
    shortcuts: [
      { keys: ["j"], get label() { return interfaceText("m_40bb50da160cdc"); } },
      { keys: ["↓"], get label() { return interfaceText("m_40bb50da160cdc"); } },
      { keys: ["k"], get label() { return interfaceText("m_c66feb5eb8f217"); } },
      { keys: ["↑"], get label() { return interfaceText("m_c66feb5eb8f217"); } },
      { keys: ["Enter"], get label() { return interfaceText("m_54d2aedada1f0c"); } },
      { keys: ["x"], get label() { return interfaceText("m_371158fa81c251"); } },
    ],
  },
  {
    title: "Global",
    shortcuts: [
      { keys: ["/"], get label() { return interfaceText("m_4dac6ee7d1ea34"); } },
      { keys: ["c"], get label() { return interfaceText("m_3e992276b2298a"); } },
      { keys: ["["], get label() { return interfaceText("m_041aefc44394f5"); } },
      { keys: ["]"], get label() { return interfaceText("m_ed98852805c905"); } },
      { keys: ["?"], get label() { return interfaceText("m_3d0ced5dc621bc"); } },
    ],
  },
];

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-foreground shadow-(--shadow-extract-10)">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsCheatsheetContent() {
  useInterfaceLanguage();
  return (
    <>
      <div className="divide-y divide-border border-t border-border">
        {sections.map((section) => (
          <div key={section.title} className="px-5 py-3">
            <h3 className="mb-2 text-(length:--text-micro) font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h3>
            <div className="space-y-1.5">
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.label + shortcut.keys.join()}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-foreground/90">{shortcut.label}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {shortcut.combo ? "+" : interfaceText("m_21af6f1260f927")}
                          </span>
                        )}
                        <KeyCap>{key}</KeyCap>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">{interfaceText("m_5b9f51465222a8")}<KeyCap>Esc</KeyCap>{interfaceText("m_2a95fa288e7744")}</p>
      </div>
    </>
  );
}

export function KeyboardShortcutsCheatsheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useInterfaceLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{interfaceText("m_e9bef0b0f3c25e")}</DialogTitle>
        </DialogHeader>
        <KeyboardShortcutsCheatsheetContent />
      </DialogContent>
    </Dialog>
  );
}
