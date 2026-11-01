import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, Loader2, Wrench } from "lucide-react";
import { companySkillsApi } from "@/api/companySkills";
import { MarkdownBody } from "@/components/MarkdownBody";
import { QueryErrorState, useQueryView } from "@/components/QueryView";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/queryKeys";
import { useNavigate } from "@/lib/router";
import { parseFrontmatterMarkdown } from "@paperclipai/shared";

export function TaskSkillPanel({ companyId, skillId }: { companyId: string; skillId: string }) {
  useInterfaceLanguage();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: queryKeys.companySkills.detail(companyId, skillId),
    queryFn: () => companySkillsApi.detail(companyId, skillId),
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
  const view = useQueryView(query);
  if (query.isLoading || view.kind === "reconnecting") {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden />{interfaceText("m_5c57e60fe4ca90")}</div>
    );
  }
  if (view.kind === "error") {
    if (view.errorKind === "not_found") {
      return <div className="py-8 text-sm text-muted-foreground" role="status">{interfaceText("m_f266c3fde7c5a4")}</div>;
    }
    if (view.errorKind === "forbidden") {
      return <div className="py-8 text-sm text-muted-foreground" role="alert">{interfaceText("m_cc90e7ec78bd1a")}</div>;
    }
    return (
      <div className="py-6">
        <QueryErrorState error={query.error} action={interfaceText("m_af68592494e97c")} onRetry={view.retry} retrying={view.isFetching} />
      </div>
    );
  }
  if (!query.data) {
    return <div className="py-8 text-sm text-muted-foreground" role="status">{interfaceText("m_f266c3fde7c5a4")}</div>;
  }
  const skill = query.data;
  const previewMarkdown = parseFrontmatterMarkdown(skill.markdown).body;
  return (
    <article className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-muted-foreground" aria-hidden />
            <h2 className="text-lg font-semibold">{skill.name}</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/skills/studio/${encodeURIComponent(skill.id)}`)}
          >
            <ExternalLink className="mr-1.5 size-3.5" aria-hidden />{interfaceText("m_90ec3b0d0d07e6")}</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {skill.slug} · {skill.currentVersion ? interfaceText("m_86873588d0db54", { value0: (skill.currentVersion.revisionNumber) }) : interfaceText("m_a74487de8969b1")}
        </p>
      </header>
      {skill.description ? <p className="text-sm text-muted-foreground">{skill.description}</p> : null}
      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <FileText className="size-3.5" aria-hidden />{interfaceText("m_f9f4685609f87a")}</h3>
        <MarkdownBody>{previewMarkdown || interfaceText("m_427e00bb362aaa")}</MarkdownBody>
      </section>
    </article>
  );
}
