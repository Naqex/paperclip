import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { AgentAvatar } from "./AgentAvatar";
import { Identity } from "./Identity";
import { renderAccessIdentity, type AccessSelectOption } from "./AccessSelectIdentity";
import { agentVisibilityFromPermissions, isSharedAgentVisibility } from "@/lib/issuePrivacy";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Trash2, UserPlus } from "lucide-react";
import type { Project } from "@paperclipai/shared";
import { accessApi } from "@/api/access";
import { agentsApi } from "@/api/agents";
import { projectsApi } from "@/api/projects";
import { useToastActions } from "@/context/ToastContext";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect, type SearchableSelectGroup } from "@/components/SearchableSelect";

export function ProjectAccessMembers({ project, canManage }: { project: Project; canManage: boolean }) {
  const interfaceLanguage = useInterfaceLanguage();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState("");
  const queryClient = useQueryClient();
  const { pushToast } = useToastActions();
  const membersKey = queryKeys.projects.accessMembers(project.id);
  const membersQuery = useQuery({
    queryKey: membersKey,
    queryFn: () => projectsApi.listAccessMembers(project.id, project.companyId),
    enabled: open,
  });
  const directoryQuery = useQuery({
    queryKey: queryKeys.access.companyUserDirectory(project.companyId),
    queryFn: () => accessApi.listUserDirectory(project.companyId),
    enabled: open,
  });
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(project.companyId),
    queryFn: () => agentsApi.list(project.companyId),
    enabled: open,
  });
  const activeKeys = useMemo(
    () => new Set((membersQuery.data ?? []).map((member) => `${member.subjectType}:${member.subjectId}`)),
    [membersQuery.data],
  );
  const groups = useMemo<SearchableSelectGroup<string, AccessSelectOption>[]>(() => {
    const people = (directoryQuery.data?.users ?? [])
      .filter((entry) => entry.user && !activeKeys.has(`user:${entry.user.id}`))
      .map((entry) => ({
        key: `user:${entry.user!.id}`,
        value: `user:${entry.user!.id}`,
        label: entry.user!.name ?? entry.user!.email ?? "Unknown user",
        searchText: entry.user!.email ?? "",
        identity: <Identity name={entry.user!.name ?? entry.user!.email ?? "Unknown user"} avatarUrl={entry.user!.image} size="sm" />,
      }));
    const agentOptions = (agentsQuery.data ?? [])
      .filter((agent) => !activeKeys.has(`agent:${agent.id}`))
      .map((agent) => ({ key: `agent:${agent.id}`, value: `agent:${agent.id}`, label: agent.name, identity: <><AgentAvatar agent={agent} size={24} /><span className="truncate">{agent.name}</span></> }));
    return [
      ...(people.length ? [{ id: "people", label: interfaceText("m_7db20897053bb2"), options: people }] : []),
      ...(agentOptions.length ? [{ id: "agents", label: interfaceText("m_279b44d2ab4b40"), options: agentOptions }] : []),
    ];
  }, [activeKeys, agentsQuery.data, directoryQuery.data, interfaceLanguage]);
  const selectedAgent = selection.startsWith("agent:")
    ? agentsQuery.data?.find(agent => agent.id === selection.slice("agent:".length)) : null;
  const sharingWithSharedAgent = selectedAgent
    && isSharedAgentVisibility(agentVisibilityFromPermissions(selectedAgent.permissions));
  const addMember = useMutation({
    mutationFn: async () => {
      const [subjectType, subjectId] = selection.split(/:(.+)/) as ["user" | "agent", string];
      return projectsApi.addAccessMember(project.id, { subjectType, subjectId }, project.companyId);
    },
    onSuccess: () => {
      setSelection("");
      queryClient.invalidateQueries({ queryKey: membersKey });
      // Project membership changes task access, descendants and cached discovery.
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      pushToast({ title: interfaceText("m_c956962c3bead2"), tone: "success" });
    },
    onError: (error) => pushToast({ title: interfaceText("m_a70132bf257549"), body: (error as Error).message, tone: "error" }),
  });
  const removeMember = useMutation({
    mutationFn: (memberId: string) => projectsApi.removeAccessMember(project.id, memberId, project.companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey });
      // Project membership changes task access, descendants and cached discovery.
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      pushToast({ title: interfaceText("m_f5d408d6b99d0e"), tone: "success" });
    },
    onError: (error) => pushToast({ title: interfaceText("m_91d62d34fe5e2c"), body: (error as Error).message, tone: "error" }),
  });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Lock className="h-3.5 w-3.5" aria-hidden="true" /> {canManage ? interfaceText("m_a90527b63530c6") : interfaceText("m_f5462009cf42d4")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{interfaceText("m_ab9cb1a8cc5889")}</DialogTitle>
            <DialogDescription>{interfaceText("m_9ed119967fb94e")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {directoryQuery.isError || agentsQuery.isError ? (
              <p className="text-sm text-destructive">{interfaceText("m_3ee135718a4a30")}</p>
            ) : null}
            <div className="flex items-end gap-2">
              <SearchableSelect
                value={selection}
                groups={groups}
                renderValue={(option) => option ? renderAccessIdentity(option) : "Add a person or agent"}
                renderOption={renderAccessIdentity}
                onValueChange={(value) => setSelection(value)}
                placeholder={interfaceText("m_1ac1ed51298bed")}
                searchPlaceholder={interfaceText("m_cdc7a830bcd7d2")}
                emptyMessage={interfaceText("m_45d47fb9c23f5b")}
                loading={directoryQuery.isLoading || agentsQuery.isLoading}
                className="min-w-0 flex-1"
              />
              <Button size="sm" disabled={!canManage || !selection || addMember.isPending} onClick={() => addMember.mutate()}>
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />{interfaceText("m_0d40dd7fcf7959")}</Button>
            </div>
            {sharingWithSharedAgent ? (
              <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">{interfaceText("m_47560927b83271")}</p>
            ) : null}
            <div className="divide-y divide-border/60">
              {(membersQuery.data ?? []).map((member) => {
                const isPersonalOwner = member.subjectType === "user" && [project.personalOwnerUserId, project.privacyOwnerUserId].includes(member.subjectId);
                return (
                  <div key={member.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{member.subjectDisplayName ?? interfaceText("m_29824c5acaf8e1")}</div>
                      <div className="text-xs text-muted-foreground">
                        {isPersonalOwner ? interfaceText("m_4b1b8aa3608a26") : member.subjectType === "agent" ? "Agent" : interfaceText("m_6007db63e18e53")}
                      </div>
                    </div>
                    {!isPersonalOwner ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={interfaceText("m_e224cf245aada5", { value0: (member.subjectDisplayName ?? "member") })}
                        disabled={!canManage || removeMember.isPending}
                        onClick={() => removeMember.mutate(member.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                );
              })}
              {membersQuery.isLoading ? <p className="py-3 text-sm text-muted-foreground">{interfaceText("m_a55b4d69fcfdff")}</p> : null}
              {membersQuery.isError ? (
                <p className="py-3 text-sm text-destructive">{interfaceText("m_9569287ec54073")}</p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
