import { useSyncExternalStore } from "react";
import type { TOptions } from "i18next";
import { i18n } from "./index";

const subscribe = (notify: () => void) => {
  i18n.on("languageChanged", notify);
  return () => { i18n.off("languageChanged", notify); };
};
const snapshot = () => i18n.resolvedLanguage ?? i18n.language;

/** Keep existing component state while refreshing display copy on locale changes. */
export function useInterfaceLanguage() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function interfaceText(key: string, values?: TOptions): string {
  return i18n.t(key, { ...values, ns: "interface" });
}
