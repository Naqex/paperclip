import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useState } from "react";
import { AiConnectionPicker } from "./AiConnectionPicker";
import { LocalProviderLoginInstructions, ProviderApiKeyCard } from "@/components/AdapterLoginChrome";
import type {
  AiConnectionBinding,
  AiConnectionRequirement,
  AiConnectionSummary,
} from "./model";

const requirement: AiConnectionRequirement = {
  companyId: "design-example",
  provider: "anthropic",
  method: "subscription",
};
const account: AiConnectionSummary = {
  ...requirement,
  method: "subscription",
  id: "example",
  grantId: "example-grant",
  name: "My Claude subscription",
  ownership: "personal",
  ownerUserId: "example-user",
  ownerName: "You",
  status: "connected",
  isDefault: true,
};

export function AiConnectionDesignExamples() {
  useInterfaceLanguage();
  const [binding, setBinding] = useState<AiConnectionBinding>({
    provider: "anthropic",
    method: "subscription",
    mode: "responsible_user",
  });
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <p className="text-sm text-muted-foreground">{interfaceText("m_9b2eec40bfabd6")}</p>
      <p className="text-sm text-muted-foreground">{interfaceText("m_14339f7b811490")}</p>
      <AiConnectionPicker
        requirement={requirement}
        connections={[account]}
        value={binding}
        currentUserId="example-user"
        agentId="example-agent"
        agentName="Nova"
        onChange={setBinding}
        readOnly
        onConnect={() => {}}
      />
      <ProviderApiKeyCard
        providerName="OpenAI"
        value=""
        disabled
        onChange={() => {}}
        onSubmit={() => {}}
        placeholder={interfaceText("m_c80c3ac9799dc1")}
      />
      <LocalProviderLoginInstructions
        adapterType="claude_local"
        login={{ isolated: true, preparing: false, status: "sign_in_required", error: null,
          command: "CLAUDE_CONFIG_DIR='/example/connection-login' claude auth login", retry: () => {} }}
      />
    </div>
  );
}
