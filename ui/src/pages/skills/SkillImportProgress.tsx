import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { AlertCircle, Check, FileText, LoaderCircle } from 'lucide-react';
import type { SkillSourceCandidate, SkillSourceScanProgress } from '@paperclipai/shared';
import { formatBytes } from '@/lib/issue-output';
import { GithubIcon } from '@/components/icons/github-icon';

export type FoundSkill = Pick<SkillSourceCandidate, 'path' | 'name' | 'description' | 'fileCount' | 'error'>;
export function SkillImportProgress({ repository, progress, found = [], importing = false, count = 0 }: {
  repository: string;
  progress?: SkillSourceScanProgress | null;
  found?: FoundSkill[];
  importing?: boolean;
  count?: number;
}) {
  useInterfaceLanguage();
  const phase = progress?.phase ?? 'connecting';
  const step = phase === 'connecting' || phase === 'downloading' ? 0 : phase === 'listing' ? 1 : 2;
  const download = phase === 'downloading' ? progress?.download : undefined;
  const total = progress?.totalSkills;
  const checking = !importing && phase === 'checking' && total != null;
  const title = importing ? interfaceText("m_a43acbd863e421", { value0: (count), value1: (count === 1 ? 'skill' : 'skills') })
    : checking ? interfaceText("m_19910ee6e98cf5", { value0: (total), value1: (total === 1 ? 'skill' : 'skills') })
    : phase === 'downloading' ? download?.stage === 'resolving' ? interfaceText("m_eaf921ec2e0dfc") : interfaceText("m_0451b9310e9616")
    : phase === 'listing' ? interfaceText("m_350fcd49654694") : interfaceText("m_eb0083e36668ce");
  const detail = importing ? 'Checking package files and saving local copies…'
    : checking ? `${progress?.checkedSkills ?? 0} of ${total} checked`
    : phase === 'downloading' ? download ? `${download.percent}% ${download.stage === 'resolving' ? 'prepared' : 'received'}${download.receivedBytes ? ` · ${formatBytes(download.receivedBytes)}` : ''}` : 'Receiving the repository from GitHub…'
    : phase === 'listing' ? 'Searching every folder for SKILL.md…' : 'Connecting to GitHub and resolving the branch…';
  const recent = found.slice(-5);
  return <section className="skill-import-enter flex min-w-0 flex-col gap-5" aria-label={importing ? interfaceText("m_d3d5b27efc6d23") : interfaceText("m_8964cb59ee864b")}>
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <GithubIcon className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium" title={repository}>{repository}</span>
    </div>
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted"><LoaderCircle className="size-5 motion-safe:animate-spin text-muted-foreground" aria-hidden /></span>
        <div className="min-w-0 flex-1" role="status" aria-live="polite" aria-atomic="true">
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      {!importing && download ? <progress className="skill-import-progress h-1 w-full" value={download.percent} max={100} aria-label={download.stage === 'resolving' ? interfaceText("m_eaf921ec2e0dfc") : interfaceText("m_db17c5fcdbd2b5")} /> : checking && total > 0
        ? <progress className="skill-import-progress h-1 w-full" value={progress?.checkedSkills ?? 0} max={total} aria-label={interfaceText("m_9f93f0b1e35581")} />
        : <div className="h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={importing ? interfaceText("m_f7d7650d89f79b") : interfaceText("m_5ef69067a16b3f")}><div className="skill-import-sweep h-full rounded-full bg-foreground/30" /></div>}
      {!importing && <ol className="flex items-center justify-between gap-2 text-xs text-muted-foreground" aria-label={interfaceText("m_8ddd9be27f46a1")}>
        {['Download', 'Find skills', 'Check files'].map((label, index) => <li key={label} className={`flex items-center gap-1.5 ${index === step ? 'text-foreground' : ''}`} aria-current={index === step ? 'step' : undefined}>
          {index < step ? <Check className="size-3" aria-hidden /> : <span className={`size-1.5 rounded-full ${index === step ? 'bg-foreground motion-safe:animate-pulse' : 'bg-muted-foreground/40'}`} />}{label}
        </li>)}
      </ol>}
    </div>
    <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
        <span>{importing ? interfaceText("m_a4b2c46ce29b13") : interfaceText("m_16d1edd5563c8d")}</span>
        {recent.length > 0 && <span className="tabular-nums">{importing ? interfaceText("m_a81a1ef645f4df", { value0: (count) }) : interfaceText("m_219aeb56b4422c", { value0: (progress?.checkedSkills ?? found.length) })}</span>}
      </div>
      {recent.length > 0 ? <ul className="divide-y divide-border" aria-label={importing ? interfaceText("m_21d3108099abcc") : interfaceText("m_30b4649e3575b7")}>
        {recent.map(skill => <li key={skill.path} className="skill-import-enter flex min-w-0 items-center gap-2.5 px-3 py-2.5">
          {skill.error ? <AlertCircle className="size-4 shrink-0 text-destructive" aria-label={interfaceText("m_93e835f589e56f")} />
            : importing ? <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : <Check className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-2"><span className="truncate text-sm font-medium">{skill.name}</span><span className="shrink-0 text-xs text-muted-foreground">{skill.fileCount} {skill.fileCount === 1 ? interfaceText("m_3b9c358f36f0a3") : interfaceText("m_3d7db37d08f914")}</span></div>
            <p className={`truncate text-xs ${skill.error ? 'text-destructive' : 'text-muted-foreground'}`} title={skill.error ?? skill.path}>{skill.error ?? skill.path}</p>
          </div>
        </li>)}
      </ul> : <div className="flex flex-col gap-3 px-3 py-4" aria-hidden="true">
        {["w-2/3", "w-1/2", "w-3/4"].map(width => <div key={width} className="flex items-center gap-3 motion-safe:animate-pulse"><FileText className="size-4 text-muted-foreground/40" /><span className={`${width} h-2 rounded-full bg-muted`} /></div>)}
      </div>}
      <div className="flex min-w-0 items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <LoaderCircle className="size-3 shrink-0 motion-safe:animate-spin" aria-hidden />
        <span className="min-w-0 flex-1 truncate" title={progress?.currentPath ?? undefined}>{importing ? interfaceText("m_da8e8079fb755c") : progress?.currentPath ?? interfaceText("m_9897bc7932c830")}</span>
        {checking && progress?.totalFiles != null && <span className="shrink-0 tabular-nums">{progress.checkedFiles}/{progress.totalFiles}{interfaceText("m_b7a283ad3fd688")}</span>}
      </div>
    </div>
    <p className="text-xs text-muted-foreground">{importing ? interfaceText("m_380739f2ad5afe") : interfaceText("m_7483ffff51408e")}</p>
  </section>;
}
