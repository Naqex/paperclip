import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { ProjectSkillRepository } from '@paperclipai/shared';
import { GithubIcon } from '@/components/icons/github-icon';
import { Button } from '@/components/ui/button';
import { LoaderCircle } from 'lucide-react';

export function ProjectSkillRepositoryRow({ repository, pending, backgroundPending, disabled, onImport }: {
  repository: ProjectSkillRepository;
  pending?: boolean;
  backgroundPending?: boolean;
  disabled?: boolean;
  onImport: () => void;
}) {
  useInterfaceLanguage();
  const actionPending = pending || repository.status === 'pending';
  const importing = actionPending || backgroundPending;
  return <section className="flex flex-col gap-2 py-3" aria-label={interfaceText("m_70b0b28d92001a", { value0: (repository.projectName) })} aria-busy={Boolean(importing)}>
    <div className="flex items-center gap-3">
      <GithubIcon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <a href={repository.repositoryUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium hover:underline">
          {repository.repositoryUrl.replace('https://github.com/', '')}
        </a>
        <p className="truncate text-xs text-muted-foreground">{repository.projectName} · {repository.trackingRef === 'HEAD' ? interfaceText("m_411aa61aea55ac") : repository.trackingRef}{repository.projectVisibility === 'private' ? interfaceText("m_b0066ed48367e6") : ''}</p>
      </div>
      <Button size="sm" variant="outline" disabled={actionPending || disabled} onClick={onImport}>
        {importing && <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />}
        {actionPending ? interfaceText("m_c01c4324f1fa14") : repository.status === 'error' ? interfaceText("m_0bc65fbb23dc7c") : backgroundPending ? interfaceText("m_72600ba580de03") : interfaceText("m_8206b47584beb6")}
      </Button>
    </div>
    {importing && <p role="status" className="ml-8 text-xs text-muted-foreground">{pending ? interfaceText("m_d4840ced34ff37") : repository.importState === 'importing'
      ? interfaceText("m_aa7487e64de0e0") : interfaceText("m_82e6c8db794ca7")}</p>}
    {repository.lastError && <p role="alert" className="text-sm text-destructive">{repository.lastError}</p>}
  </section>;
}
