import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { AgentRunner, AgentRunnerChoice } from "@paperclipai/shared";
import { Field } from "./agent-config-primitives";
import { SelectPopover } from "./ui/select";
import { Button } from "./ui/button";

export function AgentRunnerSelect({
  value,
  onChange,
  defaultRunner,
  supportedRunners = ["legacy"],
  disabled,
  pending,
  error,
  onRetry,
}: {
  value: AgentRunnerChoice;
  onChange: (value: AgentRunnerChoice) => void;
  defaultRunner?: AgentRunner;
  supportedRunners?: readonly AgentRunner[];
  disabled?: boolean;
  pending?: boolean;
  error?: string;
  onRetry?: () => void;
}) {
  useInterfaceLanguage();
  return (
    <Field label={interfaceText("m_2184a4e3f4ce0f")}>
      <SelectPopover
        aria-label={interfaceText("m_2184a4e3f4ce0f")}
        disabled={disabled}
        value={value}
        displayValue={value === "auto" ? (defaultRunner ? `${defaultRunner === "paperclip" ? "Paperclip Runner" : "Legacy runner"} (default)` : pending ? "Checking runner availability…" : "Automatic selection unavailable") : undefined}
        onValueChange={next => onChange(next as AgentRunnerChoice)}
        options={[
          { value: "paperclip", label: `Paperclip Runner${defaultRunner === "paperclip" ? " (default)" : ""}`, disabled: !supportedRunners.includes("paperclip") && value !== "paperclip" },
          { value: "legacy", label: `Legacy runner${defaultRunner === "legacy" ? " (default)" : ""}`, disabled: !supportedRunners.includes("legacy") && value !== "legacy" },
        ]}
      />
      {error && <div className="mt-2 space-y-2">
        <p role="alert" className="text-sm text-destructive">{error}</p>
        {onRetry && <Button type="button" variant="outline" size="sm" disabled={pending || disabled} onClick={onRetry}>{interfaceText("m_a222a6c27245ef")}</Button>}
      </div>}
    </Field>
  );
}
