import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { cn } from "@/lib/utils";

interface OutputVideoPlayerProps {
  src: string;
  poster?: string | null;
  className?: string;
  /** Accessible label, typically the filename. */
  title?: string;
}

/**
 * Thin wrapper around the native HTML5 `<video>` element with sensible
 * defaults for issue outputs. We deliberately rely on the browser's native
 * controls (play/pause/scrub/fullscreen/PiP) rather than building a custom
 * scrubber — the backend serves byte ranges so seeking works.
 *
 * A fixed 16:9 box reserves height before metadata loads to avoid layout jump.
 */
export function OutputVideoPlayer({ src, poster, className, title }: OutputVideoPlayerProps) {
  useInterfaceLanguage();
  return (
    <div className={cn("relative w-full overflow-hidden rounded-md bg-black aspect-video", className)}>
      <video
        src={src}
        poster={poster ?? undefined}
        controls
        preload="metadata"
        playsInline
        aria-label={title ? interfaceText("m_de40be1fd08d99", { value0: (title) }) : interfaceText("m_4dc9f1d0d7a712")}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
