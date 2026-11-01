import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Button } from "@/components/ui/button";

export function AiConnectionLegacyNotice({
  onAdopt,
  readOnly = false,
}: {
  onAdopt: () => void;
  readOnly?: boolean;
}) {
  useInterfaceLanguage();
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">{interfaceText("m_c836e59bd188e0")}</h3>
      <p className="text-sm text-muted-foreground">{interfaceText("m_c88eb326a567ba")}</p>
      {!readOnly && (
        <Button variant="outline" className="self-start" onClick={onAdopt}>{interfaceText("m_7efd0256f59b48")}</Button>
      )}
    </div>
  );
}
