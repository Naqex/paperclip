import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useState } from "react";
import { Check, FolderOpen, Loader2, Plus, X } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export interface AllowedProjectsEditorProps {
  projects: Array<{ id: string; name: string }>;
  projectIds: string[];
  canManage: boolean;
  agentName: string;
  onSave: (projectIds: string[]) => Promise<unknown>;
}

export function AllowedProjectsEditor({ projects, projectIds, canManage, agentName, onSave }: AllowedProjectsEditorProps) {
  useInterfaceLanguage();
  const [added, setAdded] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = added.filter(id => !projectIds.includes(id));
  const visibleIds = [...new Set([...projectIds, ...pending])];
  const name = (id: string) => projects.find(project => project.id === id)?.name ?? "Unavailable project";
  const matches = projects.filter(project => project.name.toLowerCase().includes(query.toLowerCase()));

  async function save() {
    if (!canManage || saving || !pending.length) return;
    setSaving(true); setError(null); setSaved(false);
    try { await onSave(pending); setAdded([]); setSaved(true); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t save project access."); }
    finally { setSaving(false); }
  }

  return <section aria-label={interfaceText("m_230edefbecbad5")} className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1"><h3 className="text-sm font-semibold">{interfaceText("m_230edefbecbad5")}</h3>
        <p className="text-sm text-muted-foreground">{interfaceText("m_ddc99f3636bedd")}</p></div>
      {canManage && <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={saving}><Plus className="size-4" aria-hidden />{interfaceText("m_5ebd1527b617f3")}</Button>
      </PopoverTrigger><PopoverContent align="end" className="w-72 space-y-3">
        <Input aria-label={interfaceText("m_9e079c7df9f105")} placeholder={interfaceText("m_b0c5facf521794")} value={query} onChange={event => setQuery(event.target.value)} />
        <div className="max-h-64 space-y-1 overflow-y-auto">{matches.map(project => <label key={project.id} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-accent">
          <Checkbox aria-label={project.name} checked={projectIds.includes(project.id) || pending.includes(project.id)} disabled={projectIds.includes(project.id)} className="mt-0.5"
            onCheckedChange={checked => { setAdded(current => checked ? [...new Set([...current, project.id])] : current.filter(id => id !== project.id)); setSaved(false); }} />
          <span className="min-w-0 text-sm">{project.name}{projectIds.includes(project.id) && <span className="block text-xs text-muted-foreground">{interfaceText("m_1761b7cb504454")}</span>}</span>
        </label>)}</div>
        {!matches.length && <p className="text-sm text-muted-foreground">{interfaceText("m_26e92309ba5b0c")}</p>}
        <Button variant="secondary" size="sm" className="w-full" onClick={() => setOpen(false)}>{interfaceText("m_11a6767d5674c7")}</Button>
      </PopoverContent></Popover>}
    </div>
    {visibleIds.length ? <ul aria-label={interfaceText("m_230edefbecbad5")} className="divide-y divide-border rounded-lg border">
      {visibleIds.map(id => <li key={id} className="flex items-center gap-3 p-4">
        <FolderOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden /><span className="min-w-0 flex-1 break-words text-sm font-medium">{name(id)}</span>
        {projectIds.includes(id) ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3.5" aria-hidden />{interfaceText("m_1bb201d188352e")}</span>
          : <><span className="text-xs text-muted-foreground">{interfaceText("m_0546c1c662bcdd")}</span><Button variant="ghost" size="icon-sm" disabled={saving} aria-label={interfaceText("m_7f7073bca5eb7c", { value0: (name(id)) })} onClick={() => setAdded(current => current.filter(value => value !== id))}><X className="size-4" aria-hidden /></Button></>}
      </li>)}
    </ul> : <p className="text-sm text-muted-foreground">{interfaceText("m_1369b8b0fee4cf")}</p>}
    {!canManage && <p className="text-sm text-muted-foreground">{interfaceText("m_d4e0efa0e0f0b4")}</p>}
    {pending.length > 0 && <div className="space-y-2 rounded-md bg-muted p-4 text-sm">
      <p className="font-medium">{interfaceText("m_d1620b12d10465")}{pending.map(name).join(", ")}</p>
      <p className="text-muted-foreground">{agentName}{interfaceText("m_897ad9146c72c8")}{pending.length === 1 ? interfaceText("m_11453073e0025b") : interfaceText("m_73e95304422982")}{interfaceText("m_600b7f45dd2d65")}</p>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{interfaceText("m_26b369b7e99c81")}{error}</p>}
    {saved && <p role="status" className="inline-flex items-center gap-2 text-sm"><Check className="size-4" aria-hidden />{interfaceText("m_33e0428e0c95f5")}</p>}
    {canManage && <div className="flex items-center justify-between gap-3 border-t pt-4">
      <Button variant="ghost" disabled={saving || !pending.length} onClick={() => { setAdded([]); setError(null); setSaved(false); }}>{interfaceText("m_19766ed6ccb2f4")}</Button>
      <Button disabled={saving || !pending.length} onClick={() => void save()}>{saving && <Loader2 className="size-4 animate-spin" aria-hidden />}{saving ? interfaceText("m_49299db6a7515c") : error ? interfaceText("m_b04cf46c3abbf8") : interfaceText("m_6d52d1e037b5df")}</Button>
    </div>}
  </section>;
}
