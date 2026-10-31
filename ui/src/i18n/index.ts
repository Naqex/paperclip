import i18n, { type InitOptions, type TOptions } from "i18next";
import { initReactI18next, useTranslation as useReactI18nextTranslation } from "react-i18next";

import { DEFAULT_LOCALE, i18nextResources, supportedLocales } from "./locales";
import { connectWorkspacePreferences, readWorkspaceLanguage } from "./workspace-preferences";

const i18nextOptions: InitOptions = {
  resources: i18nextResources,
  lng: typeof window === "undefined" ? DEFAULT_LOCALE : readWorkspaceLanguage(window) ?? DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: supportedLocales,
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  returnObjects: false,
  initAsync: false,
};

void i18n.use(initReactI18next).init(i18nextOptions).catch((error: unknown) => {
  console.error("Failed to initialize i18next", error);
});

if (typeof window !== "undefined") {
  const updateDocumentLanguage = () => { document.documentElement.lang = i18n.language; };
  updateDocumentLanguage();
  i18n.on("languageChanged", updateDocumentLanguage);
  const disconnect = connectWorkspacePreferences(window, import.meta.env.VITE_NAQEX_WORKSPACE_ORIGIN,
    (language) => { void i18n.changeLanguage(language); });
  import.meta.hot?.dispose(() => {
    disconnect();
    i18n.off("languageChanged", updateDocumentLanguage);
  });
}

export function t(key: string, options: TOptions = {}) {
  return i18n.t(key, options);
}

export const useTranslation = useReactI18nextTranslation;
export { i18n };
