import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, FileImage, AlertTriangle } from 'lucide-react';
import type { SkillSourceDiscoveryRequest, SkillRepositoryPackage } from '@paperclipai/shared';
import { skillSourcesApi } from '@/api/skillSources';
import { queryKeys } from '@/lib/queryKeys';
import { FileTree, buildFileTree, collectAllPaths } from '@/components/FileTree';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/router';
import type { SkillTreeCandidate } from './SkillSourceTree';

export function SkillPackagePreview({ companyId, repository, commitSha, skill, initialFile, repositoryPackage, onClose }: {
  companyId: string; repository: SkillSourceDiscoveryRequest; commitSha: string | null;
  repositoryPackage?: SkillRepositoryPackage; skill: SkillTreeCandidate; initialFile?: string; onClose: () => void;
}) {
  useInterfaceLanguage();
  const inspection = repositoryPackage ? { ...repositoryPackage, references: [] } : skill.inspection;
  const [filePath, setFilePath] = useState(initialFile ?? (repositoryPackage ? skill.path : 'SKILL.md'));
  const nodes = buildFileTree(Object.fromEntries((inspection?.files ?? []).map(file => [file.path, null]))).sort((a, b) => Number(b.name === 'SKILL.md') - Number(a.name === 'SKILL.md'));
  const [collapsed, setCollapsed] = useState(new Set<string>());
  const expanded = new Set([...collectAllPaths(nodes, 'dir')].filter(path => !collapsed.has(path)));
  const file = inspection?.files.find(file => file.path === filePath);
  const root = skill.path.includes('/') ? skill.path.slice(0, skill.path.lastIndexOf('/')) : '';
  const repositoryFilePath = repositoryPackage ? filePath : filePath === 'SKILL.md' ? skill.path : [root, filePath].filter(Boolean).join('/');
  const preview = useQuery({
    queryKey: [...queryKeys.skillSources.preview(companyId, repository.repositoryUrl, repository.connectionId ?? null, commitSha, skill.path, filePath), repository.packageMode ?? 'skills'],
    queryFn: () => skillSourcesApi.preview(companyId, { ...repository, commitSha: commitSha!, skillPath: skill.path, filePath: repository.packageMode === 'repository' ? repositoryFilePath : filePath }),
    enabled: Boolean(commitSha && file), retry: false, staleTime: 5 * 60_000, refetchOnWindowFocus: false,
  });
  const githubPath = repositoryPackage ? filePath : filePath === 'SKILL.md' ? skill.path : [root, filePath].filter(Boolean).join('/');
  const githubUrl = commitSha ? `${repository.repositoryUrl}/blob/${commitSha}/${githubPath.split('/').map(encodeURIComponent).join('/')}` : repository.repositoryUrl;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex max-h-(--sz-calc-18) flex-col overflow-y-auto p-4 sm:max-w-4xl sm:p-6">
      <DialogHeader>
        <DialogTitle>{repositoryPackage ? interfaceText("m_82ab7e4ac5801c") : skill.name}</DialogTitle>
        <DialogDescription className="break-all font-mono text-xs">{repositoryPackage ? interfaceText("m_f315d745132539") : root || interfaceText("m_f315d745132539")}/ · {inspection?.files.length ?? skill.fileCount ?? '?'}{interfaceText("m_b7a283ad3fd688")}{commitSha ? ` · ${commitSha.slice(0, 8)}` : ''}</DialogDescription>
      </DialogHeader>
      {!inspection && <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_dae4b823e9f6f5")}</p>}
      {skill.error && <p className="text-sm text-muted-foreground">{interfaceText("m_c41871af986334")}{skill.error}</p>}
      {inspection?.requirements && <section className="rounded-md border border-border bg-muted/30 p-3 text-sm">
        <h3 className="font-medium">{interfaceText("m_e543e80b09cb91")}</h3>
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{inspection.requirements}</p>
      </section>}
      {Boolean(inspection?.references.length) && <section className="rounded-md border border-border p-3 text-sm" aria-label={interfaceText("m_0993412a25c06b")}>
        <h3 className="flex items-center gap-2 font-medium"><AlertTriangle className="size-4" />{interfaceText("m_8c0ed17939277b")}</h3>
        <ul className="mt-2 space-y-2">
          {inspection!.references.map(reference => <li key={`${reference.fromPath}:${reference.resolvedPath}`} className="break-all text-xs">
            <span className="font-mono">{reference.target}</span> · {reference.kind === 'outside_package' ? interfaceText("m_8e6abf834b9eb3") : interfaceText("m_e3ebaa16dd9d9b")}
            <span className="text-muted-foreground">{interfaceText("m_a9812b01f6ad0b")}{reference.fromPath}</span>
          </li>)}
        </ul>
      </section>}
      {Boolean(inspection?.warnings.length) && <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">{interfaceText("m_98ec35a5d92f6c")}{inspection!.warnings.length} {inspection!.warnings.length === 1 ? interfaceText("m_9368a7d21e018f") : interfaceText("m_7367ab9a454559")}</summary>
        <ul className="mt-2 space-y-1">{inspection!.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
      </details>}
      {inspection && <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border md:flex-row">
        <div className="max-h-48 shrink-0 overflow-auto border-b border-border py-1 md:max-h-(--sz-480px) md:w-56 md:border-b-0 md:border-r">
          <FileTree nodes={nodes} selectedFile={filePath} expandedDirs={expanded} showCheckboxes={false} wrapLabels={false}
            ariaLabel="Included package files" onSelectFile={setFilePath} onToggleDir={path => setCollapsed(previous => { const next = new Set(previous); if (next.has(path)) next.delete(path); else next.add(path); return next; })} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs">
            <span className="break-all font-mono">{filePath}</span>
            {file && <span className="text-muted-foreground">{file.sizeBytes.toLocaleString()}{interfaceText("m_ec46749a1af43e")}{file.executable ? interfaceText("m_da6c5dcfec0ead") : ''}</span>}
          </div>
          <div className="max-h-(--sz-480px) min-h-40 overflow-auto p-3">
            {preview.isFetching && <p role="status" className="text-sm text-muted-foreground">{interfaceText("m_c4cf2b2ccb5d8d")}</p>}
            {preview.error && <div role="alert" className="space-y-2 text-sm"><p className="text-destructive">{preview.error.message}</p><Button variant="outline" size="sm" onClick={() => void preview.refetch()}>{interfaceText("m_d8b8392e2c5429")}</Button> <Link to="/apps" className="underline">{interfaceText("m_7874aa288d9713")}</Link></div>}
            {preview.data?.file.encoding === 'base64' && <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground"><FileImage className="size-6" /><p>{interfaceText("m_17dcc223d82cab")}</p><p className="text-xs">{interfaceText("m_54f0bb55c23066")}</p></div>}
            {preview.data?.content !== null && preview.data?.content !== undefined && <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">{preview.data.content}</pre>}
            {preview.data?.truncated && <p className="mt-3 text-xs text-muted-foreground">{interfaceText("m_c2a5bddad63c47")}</p>}
          </div>
        </div>
      </div>}
      <div className="flex items-center justify-between gap-3"><Button type="button" variant="outline" onClick={onClose}>{interfaceText("m_3dadc4096c93fa")}</Button><Button asChild variant="ghost" size="sm"><a href={githubUrl} target="_blank" rel="noreferrer">{interfaceText("m_03f69885814b5b")}<ExternalLink className="size-3.5" /></a></Button></div>
    </DialogContent>
  </Dialog>;
}
