import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { copyTextToClipboard } from "@/lib/clipboard";
import { AgentSetupPrompt } from "@/components/AgentSetupPrompt";

export function CopyField({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help?: string;
}) {
  useInterfaceLanguage();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
        <code title={value} className="min-w-0 flex-1 truncate text-xs">
          {value}
        </code>
        <Button
          variant="ghost"
          size="sm"
          aria-label={interfaceText("m_a9a564b7e7e852", { value0: (label) })}
          onClick={async () => {
            try {
              await copyTextToClipboard(value);
              setCopied(true);
              setError(false);
            } catch {
              setError(true);
            }
          }}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? interfaceText("m_8d525e5f158b9a") : interfaceText("m_e21f935f11d7e9")}
        </Button>
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {error && (
        <div className="space-y-2">
          <p role="alert" className="text-xs text-destructive">{interfaceText("m_7a8581437b38ba")}</p>
          <textarea
            readOnly
            aria-label={interfaceText("m_f7baaf181f4d7d", { value0: (label) })}
            value={value}
            rows={5}
            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}

export function AgentInstructions({ value }: { value: string }) {
  useInterfaceLanguage();
  return (
    <section
      aria-label={interfaceText("m_dc390e1824d455")}
      className="space-y-3 rounded-md bg-muted/40 p-4"
    >
      <div className="space-y-1">
        <h2 className="text-sm font-medium">{interfaceText("m_dc390e1824d455")}</h2>
        <p className="text-sm text-muted-foreground">{interfaceText("m_ea90b46a82b362")}</p>
      </div>
      <AgentSetupPrompt
        prompt={value}
        label={interfaceText("m_64d2d48d463cb4")}
        title={interfaceText("m_25f5e2b7a32670")}
        description={interfaceText("m_9c0e1f1b08d16c")}
      />
    </section>
  );
}
