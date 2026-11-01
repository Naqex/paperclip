import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import type { VoiceTranscriptEntry } from "@/lib/voice-transcript";

export interface VoiceTranscriptProps {
  entries: readonly VoiceTranscriptEntry[];
  agentName: string;
  unavailable?: boolean;
}

/** Announcements belong to the session controller, once per final segment. */
export function VoiceTranscript({ entries, agentName, unavailable = false }: VoiceTranscriptProps) {
  useInterfaceLanguage();
  if (unavailable) return <p className="text-sm text-muted-foreground">{interfaceText("m_257b5de2045604")}</p>;
  if (!entries.length) return <p className="text-sm text-muted-foreground">{interfaceText("m_4ff74b180ce627")}</p>;
  return (
    <ol aria-label={interfaceText("m_12ed94f936dfba")} aria-live="off" className="flex min-w-0 flex-col gap-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground break-words">
            {entry.source === "user" ? interfaceText("m_08b041935798fb") : entry.source === "application" ? "Paperclip" : agentName}
            {!entry.final && !entry.interrupted && <span>{interfaceText("m_fbdd63bff05c40")}</span>}
            {entry.interrupted && <span>{interfaceText("m_9855ead03f9a1d")}</span>}
          </span>
          <p className="whitespace-pre-wrap break-words text-sm">{entry.text}</p>
        </li>
      ))}
    </ol>
  );
}
