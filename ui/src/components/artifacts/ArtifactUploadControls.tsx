import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useRef, type ReactNode } from "react";
import { FileUp, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ArtifactUploadEntry {
  id: string;
  filename: string;
  status: "uploading" | "error";
  error?: string;
}

export function ArtifactUploadButton({ onUpload }: { onUpload: (files: File[]) => void }) {
  useInterfaceLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  return <>
    <input ref={inputRef} type="file" multiple aria-label={interfaceText("m_42c7edf0968dd7")} className="hidden" onChange={(event) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (files.length) onUpload(files);
    }} />
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={interfaceText("m_4118deee6e13aa")} className="size-(--sz-44px) bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent sm:size-9" onClick={() => inputRef.current?.click()}>
          <Upload aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{interfaceText("m_4118deee6e13aa")}</TooltipContent>
    </Tooltip>
  </>;
}

export function ArtifactUploadContent({ children, empty = false, entries = [], onRetry, onDismiss }: {
  children?: ReactNode;
  empty?: boolean;
  entries?: ArtifactUploadEntry[];
  onRetry?: (id: string) => void;
  onDismiss?: (id: string) => void;
}) {
  useInterfaceLanguage();
  return <div className="flex min-h-full flex-col gap-3">
    {entries.length > 0 ? <ul className="flex flex-col gap-2" aria-label={interfaceText("m_d084236cbcc7f7")}>
      {entries.map((entry) => <li key={entry.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
        {entry.status === "uploading"
          ? <Loader2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />
          : <FileUp aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="break-words text-sm font-medium">{entry.filename}</span>
          <span role={entry.status === "error" ? "alert" : "status"} className={cn("text-xs", entry.status === "error" ? "text-destructive" : "text-muted-foreground")}>
            {entry.status === "uploading" ? interfaceText("m_5ce44dd77dae78") : entry.error ?? interfaceText("m_d42fb51e78b578")}
          </span>
        </div>
        {entry.status === "error" ? <div className="flex shrink-0 items-center gap-1">
          {onRetry ? <Button variant="ghost" size="sm" onClick={() => onRetry(entry.id)}>{interfaceText("m_942087cc2d41e0")}</Button> : null}
          {onDismiss ? <Button variant="ghost" size="icon-sm" aria-label={interfaceText("m_7f932616831976", { value0: (entry.filename) })} onClick={() => onDismiss(entry.id)}><X aria-hidden="true" /></Button> : null}
        </div> : null}
      </li>)}
    </ul> : null}
    {empty ? <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <FileUp aria-hidden="true" className="size-6 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{interfaceText("m_43c37b57c033c3")}</p>
        <p className="text-sm text-muted-foreground">{interfaceText("m_d7a590371d5fa9")}</p>
      </div>
    </div> : children}
  </div>;
}
