import { interfaceText } from "@/i18n/interface-copy";
import { Activity, LayoutGrid, KeyRound, Wrench, Boxes } from "lucide-react";

/**
 * Gateway detail tabs (PAP-11200). Terminology is locked by the approved
 * PAP-11178 design of record: Overview · Apps & tools · Tokens · Activity ·
 * Advanced. Raw protocol / JSON / transport details live under Advanced.
 */
export const GATEWAY_TABS = [
  { key: "overview", get label() { return interfaceText("m_d4b1ea5708dd53"); }, icon: LayoutGrid },
  { key: "apps", get label() { return interfaceText("m_b10a5c4456cf1c"); }, icon: Boxes },
  { key: "tokens", get label() { return interfaceText("m_a039dfb9628b53"); }, icon: KeyRound },
  { key: "activity", get label() { return interfaceText("m_38da1505ca8373"); }, icon: Activity },
  { key: "advanced", get label() { return interfaceText("m_9f088dbebd6c3c"); }, icon: Wrench },
] as const;

export type GatewayTabKey = (typeof GATEWAY_TABS)[number]["key"];

export function gatewayTabHref(gatewayId: string, tab: GatewayTabKey): string {
  return `/apps/gateways/${gatewayId}/${tab}`;
}

export function isGatewayTabKey(value: string | undefined): value is GatewayTabKey {
  return GATEWAY_TABS.some((tab) => tab.key === value);
}

export function gatewayTabLabel(tabKey: GatewayTabKey): string {
  return GATEWAY_TABS.find((tab) => tab.key === tabKey)?.label ?? interfaceText("m_d4b1ea5708dd53");
}
