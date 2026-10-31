export type WorkspaceLanguage = "en" | "vi";
const STORAGE_KEY = "paperclip:workspace-language";

export function readWorkspaceLanguage(target: Window): WorkspaceLanguage | undefined {
  try {
    const saved = target.localStorage.getItem(STORAGE_KEY);
    return saved === "vi" || saved === "en" ? saved : undefined;
  } catch {
    return undefined;
  }
}

/** Only the configured embedding workspace may change presentation preferences. */
export function connectWorkspacePreferences(
  target: Window,
  trustedOrigin: string | undefined,
  changeLanguage: (language: WorkspaceLanguage) => void,
) {
  if (!trustedOrigin || target.parent === target) return () => {};
  let origin: string;
  try {
    const url = new URL(trustedOrigin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== trustedOrigin) return () => {};
    origin = url.origin;
  } catch {
    return () => {};
  }
  const receive = (event: MessageEvent) => {
    if (event.origin !== origin || event.source !== target.parent) return;
    const data: unknown = event.data;
    if (!data || typeof data !== "object") return;
    const preferences = data as Record<string, unknown>;
    if (preferences.type !== "naqex:preferences" || preferences.version !== 1
      || (preferences.language !== "vi" && preferences.language !== "en")) return;
    changeLanguage(preferences.language);
    try { target.localStorage.setItem(STORAGE_KEY, preferences.language); } catch { /* Storage is optional. */ }
  };
  target.addEventListener("message", receive);
  target.parent.postMessage({ type: "paperclip:ready", version: 1 }, origin);
  return () => target.removeEventListener("message", receive);
}
