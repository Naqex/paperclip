import type { Resource } from "i18next";

import { assertValidLocaleMessages } from "./locale-validation";
import workspaceEn from "./workspace/en.json";
import workspaceVi from "./workspace/vi.json";
import interfaceEn from "./workspace/interface-en.json";
import interfaceVi from "./workspace/interface-vi.json";

export const DEFAULT_LOCALE = "en" as const;

const localeModules = import.meta.glob("./locales/*.json", {
  eager: true,
  import: "default",
}) as Record<string, unknown>;

export const localeMessages = Object.fromEntries(
  Object.entries(localeModules).map(([path, messages]) => {
    const locale = path.match(/\/([A-Za-z0-9_-]+)\.json$/)?.[1];
    if (!locale) {
      throw new Error(`Invalid locale file path: ${path}`);
    }
    return [locale, messages];
  }),
);

if (!(DEFAULT_LOCALE in localeMessages)) {
  throw new Error(`Missing default locale messages for ${DEFAULT_LOCALE}`);
}

for (const [locale, messages] of Object.entries(localeMessages)) {
  try {
    assertValidLocaleMessages(messages);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${locale} locale messages: ${message}`);
  }
}

export const supportedLocales = Object.keys(localeMessages);
assertValidLocaleMessages(workspaceVi, workspaceEn);
assertValidLocaleMessages(interfaceVi, interfaceEn);

export const i18nextResources: Resource = Object.fromEntries(
  Object.entries(localeMessages).map(([locale, messages]) => [locale, {
    translation: messages,
    ...(locale === "en" ? { workspace: workspaceEn, interface: interfaceEn } : locale === "vi" ? { workspace: workspaceVi, interface: interfaceVi } : {}),
  }]),
) as Resource;

export type SupportedLocale = keyof typeof localeMessages;
