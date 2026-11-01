import { interfaceText } from "@/i18n/interface-copy";
import { auditSectionHref, type AuditSection } from "./audit/audit-navigation";

export type AgentDetailView =
  | "overview"
  | "instructions"
  | "skills"
  | "runtime"
  | "secrets"
  | "tools"
  | "channels"
  | "permissions"
  | "api-keys"
  | "revisions"
  | "advanced"
  | "run-detail";

export type AgentLocalDetailView = Exclude<AgentDetailView, "run-detail">;

export const AGENT_DETAIL_NAVIGATION: ReadonlyArray<{
  label: string;
  items: ReadonlyArray<{ value: AgentLocalDetailView; label: string }>;
}> = [
  {
    label: "Agent",
    items: [
      { value: "overview", get label() { return interfaceText("m_d4b1ea5708dd53"); } },
      { value: "instructions", get label() { return interfaceText("m_934652dce41d62"); } },
      { value: "skills", get label() { return interfaceText("m_66d0f523a379b2"); } },
    ],
  },
  {
    get label() { return interfaceText("m_1093115897879a"); },
    items: [
      { value: "runtime", get label() { return interfaceText("m_6711e546a022db"); } },
      { value: "secrets", get label() { return interfaceText("m_d8707d411d9976"); } },
      { value: "tools", get label() { return interfaceText("m_ea93d6a262ecb8"); } },
      { value: "channels", get label() { return interfaceText("m_4c8906cf76f574"); } },
    ],
  },
  {
    get label() { return interfaceText("m_86f8a694159b71"); },
    items: [
      { value: "permissions", get label() { return interfaceText("m_183c6ae80610fd"); } },
      { value: "api-keys", get label() { return interfaceText("m_c08f17eb9e11a3"); } },
      { value: "revisions", get label() { return interfaceText("m_da80b1d5740caa"); } },
      { value: "advanced", get label() { return interfaceText("m_9f088dbebd6c3c"); } },
    ],
  },
] as const;

export function parseAgentDetailView(value: string | null): AgentLocalDetailView {
  if (value === "instructions" || value === "prompts") return "instructions";
  if (value === "skills") return "skills";
  if (value === "runtime" || value === "configure" || value === "configuration") return "runtime";
  if (value === "secrets") return "secrets";
  if (value === "tools") return "tools";
  if (value === "channels") return "channels";
  if (value === "permissions" || value === "trust") return "permissions";
  if (value === "api-keys" || value === "keys") return "api-keys";
  if (value === "revisions" || value === "history") return "revisions";
  if (value === "advanced") return "advanced";
  return "overview";
}

export function agentDetailHref(agentRef: string, view: AgentLocalDetailView = "overview") {
  return `/agents/${agentRef}/${view}`;
}

export function agentLegacyAuditSection(value: string | null): AuditSection | null {
  if (value === "runs") return "runs";
  if (value === "audit" || value === "activity") return "activity";
  if (value === "cost" || value === "costs") return "costs";
  if (value === "budget" || value === "budgets") return "budgets";
  return null;
}

export function agentScopedAuditHref(agentId: string, section: AuditSection) {
  return auditSectionHref(section, {
    mode: section === "activity" ? "agents" : undefined,
    agentId,
  });
}
