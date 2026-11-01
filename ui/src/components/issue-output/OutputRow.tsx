import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, relativeTime } from "@/lib/utils";
import { formatBytes, outputFilename, type IssueOutputItem } from "@/lib/issue-output";
import { OutputFileTile } from "./OutputFileTile";
import { Card } from "@/components/ui/card";

interface OutputRowProps {
  item: IssueOutputItem;
  creatorName?: string | null;
}

/** Compact row for a non-primary output ("ALSO PRODUCED"). */
export function OutputRow({ item, creatorName }: OutputRowProps) {
  useInterfaceLanguage();
  const filename = outputFilename(item);
  const meta = item.metadata;

  const metaBits: string[] = [];
  if (meta) {
    metaBits.push(meta.contentType);
    metaBits.push(formatBytes(meta.byteSize));
  }
  if (creatorName) metaBits.push(creatorName);
  metaBits.push(relativeTime(item.createdAt));

  return (
    <Card className="flex-row items-center gap-2.5 p-2">
      <OutputFileTile contentType={meta?.contentType} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={filename}>
          {filename}
        </p>
        <p
          className={cn(
            "truncate text-(length:--text-micro)",
            item.degraded ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {item.degraded ? interfaceText("m_d0c2f23107baea") : metaBits.join(" · ")}
        </p>
      </div>
      {meta ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button asChild variant="ghost" size="icon-sm" title={interfaceText("m_e0af5c0bc24574")}>
            <a href={meta.openPath} target="_blank" rel="noreferrer" aria-label={interfaceText("m_b50808ac499900", { value0: (filename) })}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" title={interfaceText("m_d6eafe82359100")}>
            <a href={meta.downloadPath} aria-label={interfaceText("m_a4924ba426cf55", { value0: (filename) })}>
              <Download className="h-4 w-4" />
            </a>
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
