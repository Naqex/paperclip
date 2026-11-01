import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Code2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FilePreviewMode = "rendered" | "raw";

export function FilePreviewModeToggle({ mode, onChange, label }: {
  mode: FilePreviewMode;
  onChange: (mode: FilePreviewMode) => void;
  label: string;
}) {
  useInterfaceLanguage();
  return (
    <div className="flex gap-1" role="group" aria-label={label}>
      <Button type="button" size="icon-sm" variant={mode === "rendered" ? "secondary" : "ghost"} aria-label={interfaceText("m_331e25aab7ff4d")} title={interfaceText("m_331e25aab7ff4d")} aria-pressed={mode === "rendered"} onClick={() => onChange("rendered")}>
        <Eye aria-hidden />
      </Button>
      <Button type="button" size="icon-sm" variant={mode === "raw" ? "secondary" : "ghost"} aria-label={interfaceText("m_848123d14f84fa")} title={interfaceText("m_848123d14f84fa")} aria-pressed={mode === "raw"} onClick={() => onChange("raw")}>
        <Code2 aria-hidden />
      </Button>
    </div>
  );
}
