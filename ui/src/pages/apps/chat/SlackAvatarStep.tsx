import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { useId, useState } from "react";
import {
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SlackAvatarProps {
  agentName: string;
  appName: string;
  avatarUrl: string;
}

/** Manual fallback shared by Slack onboarding and its Settings page. */
export function SlackAvatarContent({
  agentName,
  appName,
  avatarUrl,
  compact = false,
}: SlackAvatarProps & { compact?: boolean }) {
  useInterfaceLanguage();
  const id = useId();
  const filename = `${appName.replace(/[^a-zA-Z0-9_-]+/g, "-") || "agent"}-avatar.png`;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const response = await fetch(avatarUrl);
      if (
        !response.ok ||
        !response.headers.get("content-type")?.startsWith("image/png")
      )
        throw new Error("Avatar unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <div className="space-y-8">
      <section
        aria-labelledby={`${id}-download`}
        className="flex flex-col items-start gap-6 sm:flex-row sm:items-center"
      >
        <img
          src={avatarUrl}
          width={512}
          height={512}
          alt={interfaceText("m_1c0c1b0eea413c", { value0: (agentName) })}
          className="size-40 shrink-0 rounded-lg bg-muted object-contain"
        />
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 id={`${id}-download`} className="text-sm font-semibold">
              {compact
                ? interfaceText("m_ce5bdd090305e6")
                : interfaceText("m_fc5927ad100ff7")}
            </h2>
            <p className="text-xs text-muted-foreground">{interfaceText("m_1439257c77a50a")}</p>
          </div>
          <Button variant="outline" asChild>
            <a
              href={avatarUrl}
              download={filename}
              aria-disabled={downloading}
              onClick={(event) => {
                event.preventDefault();
                void download();
              }}
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}{interfaceText("m_e7dc2a1ba0c633")}</a>
          </Button>
          {downloadError && (
            <p role="alert" className="text-sm text-destructive">{interfaceText("m_f77ab7e7bc1e7d")}</p>
          )}
        </div>
      </section>

      <details open={compact ? undefined : true} className="space-y-4">
        <summary
          className={
            compact
              ? "cursor-pointer text-sm underline underline-offset-4"
              : "hidden"
          }
        >{interfaceText("m_68a7030b41af82")}</summary>
        <section aria-labelledby={`${id}-upload`} className="space-y-4">
          <div className="space-y-1">
            <h2 id={`${id}-upload`} className="text-sm font-semibold">
              {compact ? interfaceText("m_9ef6fd056f3b98") : interfaceText("m_733c836bb93e61")}
            </h2>
            <p className="text-sm text-muted-foreground">{interfaceText("m_19c451a3eeadd9")}</p>
          </div>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            <li>
              <a
                href="https://api.slack.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >{interfaceText("m_30cfde1ec067cc")}{" "}
                <ExternalLink className="inline size-3" />
              </a>{" "}{interfaceText("m_96f710213c7149")}<strong>{appName}</strong>.
            </li>
            <li>{interfaceText("m_86a9b212c3cf7b")}<strong>{interfaceText("m_d094b334d8099b")}</strong>{interfaceText("m_9a9402254014ce")}{" "}
              <strong>{interfaceText("m_6ad97855804aa5")}</strong>.
            </li>
            <li>{interfaceText("m_ae6042950e90d0")}<strong>{interfaceText("m_22ef051d0b8431")}</strong>{interfaceText("m_ac8049f4e43eb4")}{" "}
              <span className="break-all font-mono text-xs">{filename}</span>.
            </li>
            <li>{interfaceText("m_44af0f2972bd24")}<strong>{interfaceText("m_35322b5bb5a218")}</strong>{interfaceText("m_aedf73f9799091")}</li>
          </ol>
        </section>
      </details>
    </div>
  );
}


export function SlackAvatarSettings(props: SlackAvatarProps) {
  useInterfaceLanguage();
  return (
    <section className="space-y-4" aria-label={interfaceText("m_761226caa94edc")}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{interfaceText("m_fb65e8cf15fa45")}</h2>
        <p className="text-sm text-muted-foreground">{interfaceText("m_bb33dbdb2f216a")}{props.agentName}{interfaceText("m_001b345bd19c9a")}</p>
      </div>
      <SlackAvatarContent {...props} compact />
    </section>
  );
}
