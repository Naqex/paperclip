import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ExecutionBlocker } from "@paperclipai/shared";
import { issuesApi } from "../api/issues";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { NativeSelect } from "./ui/select";

export function WorkspaceReconstructionRecovery({ issueId, blocker, canManage, onRecorded }: {
  issueId: string; blocker: ExecutionBlocker; canManage: boolean; onRecorded: () => void;
}) {
  useInterfaceLanguage();
  const id = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const [missingWork, setMissingWork] = useState("");
  const [outcomeEvidence, setOutcomeEvidence] = useState("");
  const [actionOutcome, setActionOutcome] = useState<"completed" | "not_performed" | "mixed">("mixed");
  const [acknowledged, setAcknowledged] = useState(false);
  const files = useQuery({ queryKey: queryKeys.issues.attachments(issueId),
    queryFn: () => issuesApi.listAttachments(issueId), enabled: canManage });
  const currentSelection = selected.filter(id => files.data?.some(file => file.id === id));
  const submit = useMutation({
    mutationFn: () => issuesApi.reconstructWorkspace(issueId, {
      actionId: blocker.recoveryActionId!, runId: blocker.runId!, expectedStatusVersion: blocker.workspaceRecoveryStatusVersion!,
      attachmentIds: currentSelection, missingWork: missingWork.trim(), actionOutcome, outcomeEvidence: outcomeEvidence.trim(), acknowledgeLostWork: true,
    }), onSuccess: onRecorded,
  });
  return <details className="w-full">
    <summary className="cursor-pointer">{interfaceText("m_8e121d5d6af548")}</summary>
    <p>{interfaceText("m_4eb3a16c32f7c2")}</p>
    {canManage ? <div className="flex flex-col gap-2">
      <p>{interfaceText("m_81eba32bc4607f")}</p>
      <fieldset disabled={submit.isPending} className="flex flex-col gap-2">
        <legend>{interfaceText("m_905d6825e5bbd1")}</legend>
        {files.data?.map(file => <div key={file.id} className="flex items-center gap-2">
          <Checkbox id={`${id}-${file.id}`} checked={selected.includes(file.id)} onCheckedChange={checked =>
            setSelected(current => checked === true ? [...current, file.id] : current.filter(value => value !== file.id))} />
          <Label htmlFor={`${id}-${file.id}`}>{file.originalFilename ?? interfaceText("m_040d2b3689dd1d")} ({file.byteSize}{interfaceText("m_119d9a5ec8d8a7")}</Label>
        </div>)}
        {files.isPending && <p>{interfaceText("m_32fa1e469fe1f6")}</p>}
        {files.data?.length === 0 && <p>{interfaceText("m_40213a4193673e")}</p>}
        <Label htmlFor={`${id}-missing`}>{interfaceText("m_72180f1447c371")}</Label>
        <Textarea id={`${id}-missing`} maxLength={12000} value={missingWork} onChange={event => setMissingWork(event.target.value)} />
        <Label htmlFor={`${id}-outcome`}>{interfaceText("m_9929947aafb37f")}</Label>
        <NativeSelect id={`${id}-outcome`} value={actionOutcome} onChange={event => setActionOutcome(event.target.value as typeof actionOutcome)}>
          <option value="mixed">{interfaceText("m_ce9ef19dece0f1")}</option>
          <option value="not_performed">{interfaceText("m_380c78975e7c35")}</option>
          <option value="completed">{interfaceText("m_1c935e34e6a9ea")}</option>
        </NativeSelect>
        <Label htmlFor={`${id}-evidence`}>{interfaceText("m_9f1e6f665387fb")}</Label>
        <Textarea id={`${id}-evidence`} maxLength={12000} value={outcomeEvidence} onChange={event => setOutcomeEvidence(event.target.value)} />
        <div className="flex items-center gap-2">
          <Checkbox id={`${id}-ack`} checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} />
          <Label htmlFor={`${id}-ack`}>{interfaceText("m_d3b054448d341b")}</Label>
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button disabled={submit.isPending || !acknowledged || currentSelection.length === 0 || missingWork.trim().length < 20 || outcomeEvidence.trim().length < 20}
          onClick={() => submit.mutate()}>{submit.isPending ? interfaceText("m_37255b74c579d3") : interfaceText("m_f95a0b774045d6")}</Button>
      </div>
      {files.isError && <p role="alert" className="text-destructive">{files.error.message}</p>}
      {submit.isError && <p role="alert" className="text-destructive">{submit.error.message}</p>}
    </div> : <p>{interfaceText("m_bff7d5a9947fab")}</p>}
  </details>;
}
