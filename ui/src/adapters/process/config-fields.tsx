import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { configFieldsForSection } from "../config-sections";
import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  DraftInput,
  help,
} from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

function formatArgList(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .join(", ");
  }
  return typeof value === "string" ? value : "";
}

function parseCommaArgs(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProcessConfigFields({
  section,
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  useInterfaceLanguage();
  return configFieldsForSection(section, (
    <>
      <Field configSection="advanced" label={interfaceText("m_713166971d730f")} hint={help.command}>
        <DraftInput
          value={
            isCreate
              ? values!.command
              : eff("adapterConfig", "command", String(config.command ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ command: v })
              : mark("adapterConfig", "command", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder={interfaceText("m_546f689829e8be")}
        />
      </Field>
      <Field configSection="advanced" label={interfaceText("m_2515de2e5e19a9")} hint={help.args}>
        <DraftInput
          value={
            isCreate
              ? values!.args
              : eff("adapterConfig", "args", formatArgList(config.args))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ args: v })
              : mark(
                  "adapterConfig",
                  "args",
                  v ? parseCommaArgs(v) : undefined,
                )
          }
          immediate
          className={inputClass}
          placeholder={interfaceText("m_577a1413911d84")}
        />
      </Field>
    </>
  ));
}
