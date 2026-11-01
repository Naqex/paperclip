import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Button } from "@/components/ui/button";
import { InlineBanner } from "@/components/InlineBanner";
import { ConnectionChoiceList } from "../ConnectionChoiceList";

/** Shared presentation for account reuse, including the requested external app. */
export function RemoteMcpAccountChoice({
  providerName,
  upstreamServiceName,
  connections,
  pendingId,
  error,
  onSelect,
  onCancel,
  onConnectNew,
}: {
  providerName: string;
  upstreamServiceName?: string;
  connections: { id: string; name: string }[];
  pendingId?: string | null;
  error?: string | null;
  onSelect: (id: string) => void;
  onCancel?: () => void;
  onConnectNew: () => void;
}) {
  useInterfaceLanguage();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">
          {upstreamServiceName
            ? interfaceText("m_8db1053f06b168", { value0: (upstreamServiceName), value1: (providerName) })
            : interfaceText("m_aeb7ebc7447ae0", { value0: (providerName) })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{interfaceText("m_a6155ab1377665")}</p>
      </div>
      {upstreamServiceName && (
        <InlineBanner compact>
          {providerName}{interfaceText("m_b026810705e461")}{upstreamServiceName}{interfaceText("m_eab284612b447e")}</InlineBanner>
      )}
      <ConnectionChoiceList
        choices={connections.map((connection) => ({
          ...connection,
          description: "Provider account available",
        }))}
        pendingId={pendingId}
        onSelect={onSelect}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={Boolean(pendingId)}
          onClick={onCancel}
        >{interfaceText("m_19766ed6ccb2f4")}</Button>
        <Button disabled={Boolean(pendingId)} onClick={onConnectNew}>{interfaceText("m_99ecd0a950e7ea")}</Button>
      </div>
    </div>
  );
}
