import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Project } from "@paperclipai/shared";
import { projectsApi } from "@/api/projects";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function ProjectGitAuthorization({ project }: { project: Project }) {
  useInterfaceLanguage();
  const client = useQueryClient();
  const key = ["project-git-authorization", project.companyId, project.id];
  const authorization = useQuery({
    queryKey: key,
    queryFn: () => projectsApi.gitAuthorization(project.id),
  });
  const [selected, setSelected] = useState<string>("");
  const save = useMutation({
    mutationFn: (grantId: string | null) => projectsApi.setGitAuthorization(project.id, grantId),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      setSelected("");
    },
  });
  const data = authorization.data;
  return (
    <section aria-label={interfaceText("m_6ac61feb1ea7e2")} className="flex flex-col gap-3 py-4">
      <h3 className="text-sm font-medium">{interfaceText("m_6ac61feb1ea7e2")}</h3>
      <p className="text-sm text-muted-foreground">{interfaceText("m_de40d6c989f07c")}</p>
      {data?.grantId && (
        <p role="status" className="text-sm">{interfaceText("m_05108851417d53")}{" "}
          {data.options.find((option) => option.grantId === data.grantId)?.login ??
            interfaceText("m_f1a68b7e2a0b06")}
        </p>
      )}
      {data && (
        <div className="flex flex-wrap gap-2">
          <Select value={selected} onValueChange={setSelected} disabled={save.isPending}>
            <SelectTrigger aria-label={interfaceText("m_5f7ee3ca4a488c")}>
              <SelectValue placeholder={interfaceText("m_050221ab6b6cc4")} />
            </SelectTrigger>
            <SelectContent>
              {data.options.map((option) => (
                <SelectItem key={option.grantId} value={option.grantId}>
                  {option.login} · {option.connectionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!selected || save.isPending} onClick={() => save.mutate(selected)}>{interfaceText("m_af3b7f80b6b6c8")}</Button>
          {data.grantId && (
            <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate(null)}>{interfaceText("m_4205f49073dcb3")}</Button>
          )}
        </div>
      )}
      {data && !data.options.length && (
        <p className="text-sm text-muted-foreground">{interfaceText("m_8016048927d009")}</p>
      )}
      {(authorization.error || save.error) && (
        <p role="alert" className="text-sm text-destructive">
          {(authorization.error || save.error)?.message}
        </p>
      )}
    </section>
  );
}
