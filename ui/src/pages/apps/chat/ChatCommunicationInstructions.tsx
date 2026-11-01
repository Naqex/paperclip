import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatCommunicationInstructions({ value, onSave }: {
  value: string;
  onSave: (instructions: string) => Promise<void>;
}) {
  useInterfaceLanguage();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const text = draft ?? value;
  const dirty = text.trim() !== value;
  return (
    <form className="space-y-3" aria-labelledby={`${id}-label`} onSubmit={async (event) => {
      event.preventDefault();
      if (pending || !dirty) return;
      setPending(true);
      setError(null);
      setSaved(false);
      try {
        await onSave(text.trim());
        setDraft(null);
        setSaved(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn’t save instructions. Try again.");
      } finally {
        setPending(false);
      }
    }}>
      <div className="space-y-1">
        <label id={`${id}-label`} htmlFor={id} className="text-sm font-semibold">{interfaceText("m_8bff4980cd59a6")}</label>
        <p id={`${id}-help`} className="text-sm text-muted-foreground">{interfaceText("m_939ff8dff6f3d8")}</p>
      </div>
      <Textarea
        id={id}
        aria-describedby={`${id}-help`}
        value={text}
        disabled={pending}
        maxLength={4000}
        rows={4}
        placeholder={interfaceText("m_e192ab65aa916d")}
        onChange={(event) => { setDraft(event.target.value); setSaved(false); setError(null); }}
      />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <div>
          {dirty ? <Button type="button" variant="ghost" disabled={pending} onClick={() => { setDraft(null); setError(null); setSaved(false); }}>{interfaceText("m_19766ed6ccb2f4")}</Button>
            : saved ? <span role="status" className="text-sm text-muted-foreground">{interfaceText("m_9550c32c323215")}</span> : null}
        </div>
        <Button type="submit" disabled={!dirty || pending}>{pending ? interfaceText("m_23e39291d61358") : interfaceText("m_792ce42eac02de")}</Button>
      </div>
    </form>
  );
}
