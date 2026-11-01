import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Providers supply only credentials the current user is authorized to use.
 * Values are opaque connection references, never secret values. */
export function ApiKeyCredentialField({ options, connectionId, onConnectionChange, value, onChange,
  disabled, loading, error, providerName, keysUrl, label = interfaceText("m_16f0ee47f993d6") }: {
  options: { id: string; label: string; disabled?: boolean }[];
  connectionId: string | null;
  onConnectionChange(id: string): void;
  value: string;
  onChange(value: string): void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  providerName: string;
  keysUrl: string;
  label?: string;
}) {
  useInterfaceLanguage();
  const id = useId();
  const choices = connectionId && !options.some(option => option.id === connectionId)
    ? [{ id: connectionId, label: loading ? "Checking saved API key…" : "Previously selected key · unavailable", disabled: true }, ...options] : options;
  return <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    {choices.length > 0 && <select id={id} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      value={connectionId ?? ""} disabled={disabled} onChange={event => onConnectionChange(event.target.value)}>
      {choices.map(option => <option key={option.id} value={option.id} disabled={option.disabled}>{option.label}</option>)}
      <option value="">{interfaceText("m_9b6cc5e19d07df")}</option>
    </select>}
    {!connectionId && <Input id={choices.length ? `${id}-new` : id} aria-label={choices.length ? interfaceText("m_e520a082286bb1") : undefined}
      type="password" autoComplete="off" value={value} disabled={disabled}
      onChange={event => { onConnectionChange(""); onChange(event.target.value); }} placeholder={interfaceText("m_a042e394202467", { value0: (providerName) })} />}
    {loading && <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_b34650f622971b")}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{interfaceText("m_68b8b14ecab771")}{error}</p>}
    <a href={keysUrl} target="_blank" rel="noreferrer" className="text-sm underline">{interfaceText("m_14bf65f0f26ecf")}{providerName}{interfaceText("m_23f088149e183e")}</a>
  </div>;
}
