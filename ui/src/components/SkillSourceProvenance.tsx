import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { CompanySkill } from '@paperclipai/shared';
import { Link } from '@/lib/router';
export function SkillSourceProvenance({ skill }: { skill: CompanySkill }) {
  useInterfaceLanguage();
  const id = skill.metadata?.skillSourceId ?? skill.metadata?.legacySkillSourceId;
  if (typeof id !== 'string') return null;
  const state = skill.metadata?.skillSourceState;
  const label = !skill.metadata?.skillSourceId ? interfaceText("m_362ee926822bfd") : state === 'removed' ? interfaceText("m_5244d4a5273dd2")
    : state === 'not_syncing' ? interfaceText("m_97ad0aa076342b")
    : state === 'update_failed' ? interfaceText("m_a83a5fd3769f93") : interfaceText("m_4e73c187232137");
  return <div className="flex flex-col gap-1 py-3 text-xs text-muted-foreground">
    <span>{label}</span>
    <span className="break-all font-mono">{String(skill.metadata?.skillSourcePath ?? '')}{skill.sourceRef ? ` · ${skill.sourceRef.slice(0, 8)}` : ''}</span>
    <Link to={`/skills/sources/${id}`} className="text-foreground underline">{interfaceText("m_d68ebd7c51a191")}</Link>
  </div>;
}
