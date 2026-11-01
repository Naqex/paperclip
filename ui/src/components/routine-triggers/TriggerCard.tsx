import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useId, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RoutineTriggerCard({
  kind,
  icon,
  title,
  summary,
  expanded,
  onEdit,
  onRemove,
  editLabel,
  children,
}: {
  kind: "schedule" | "webhook" | "api";
  icon: ReactNode;
  title: string;
  summary: string;
  expanded: boolean;
  onEdit: () => void;
  editLabel?: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  useInterfaceLanguage();
  const editorId = useId();
  return (
    <section
      aria-label={interfaceText("m_d2369a51a66896", { value0: (kind === "schedule" ? "Schedule" : kind === "api" ? "API" : "Webhook") })}
      className="rounded-md border border-border"
    >
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            aria-controls={editorId}
            onClick={onEdit}
          >
            {editLabel ?? (expanded ? interfaceText("m_7d9eb7acb13e24") : interfaceText("m_6ec4b47d02bf66", { value0: (kind) }))}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={interfaceText("m_e224cf245aada5", { value0: (kind) })}
            title={interfaceText("m_e224cf245aada5", { value0: (kind) })}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div id={editorId} className="space-y-5 border-t border-border p-4">
          {children}
        </div>
      )}
    </section>
  );
}
