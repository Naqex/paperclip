# Naqex workspace localization

The fork reuses native i18next/react-i18next. Downstream English and Vietnamese
messages live in `ui/src/i18n/workspace/` under the `workspace` namespace. The
native `translation` namespace and its locale validation stay unchanged; other
native locales fall back to English for downstream strings. The existing locale
validator checks key/interpolation parity and message safety for the new catalogs.

Translate at the owning component with `useTranslation("workspace")`. Never
translate route/status values, company/project/agent names or user-authored text.
Do not translate arbitrary incoming props in generic navigation components.

## Embedding preferences

The launcher supplies `VITE_NAQEX_WORKSPACE_ORIGIN` from the host's port registry.
An embedded document announces `{ type: "paperclip:ready", version: 1 }` to that
exact origin. The parent sends `{ type: "naqex:preferences", version: 1,
language: "vi" | "en" }` on readiness, load and host language changes.

The child checks both origin and parent-window identity. This presentation-only
contract grants no job/provider/account authority. No wildcard target origin,
query-controlled trust, navigation or reload is needed. In-memory form state is
preserved. Language is remembered in optional localStorage and `html.lang` follows
i18next. Storage denial does not block language changes. Without the configured
parent origin, a standalone window uses its saved language or native English.

## Current coverage

First slice: classic and production navigation labels, mobile navigation, account
menu actions, task breadcrumb/search/empty/create controls, and basic fields in
the new-task dialog. Specialized filter menus, composer settings, other pages,
runtime errors and experimental coordinator surfaces remain upstream English.
This is partial localization, not a complete Vietnamese release.

For an upstream update, retain this namespace/bridge, reconcile translated call
sites, run locale and affected component tests, UI typecheck/build, token gates,
then verify VI/EN switching with an open draft and search in the real embedding.
Native token-gate debt must be reported separately from newly added violations.
