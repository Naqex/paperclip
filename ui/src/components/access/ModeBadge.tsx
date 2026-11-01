import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { DeploymentExposure, DeploymentMode } from "@paperclipai/shared";
import { Badge } from "@/components/ui/badge";

export function ModeBadge({
  deploymentMode,
  deploymentExposure,
}: {
  deploymentMode?: DeploymentMode;
  deploymentExposure?: DeploymentExposure;
}) {
  useInterfaceLanguage();
  if (!deploymentMode) return null;

  const label =
    deploymentMode === "local_trusted"
      ? interfaceText("m_dd3af0b2b0aeb5")
      : interfaceText("m_b56026cc483eec", { value0: (deploymentExposure ?? "private") });

  return <Badge variant="outline">{label}</Badge>;
}
