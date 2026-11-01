# Naqex workspace localization

The fork reuses native i18next/react-i18next. Downstream English and Vietnamese
messages live in `ui/src/i18n/workspace/` under the `workspace` and `interface` namespaces. The
native `translation` namespace and its locale validation stay unchanged; other
native locales fall back to English for downstream strings. The existing locale
validator checks key/interpolation parity and message safety for the new catalogs.

Translate at the owning component with `useTranslation("workspace")`. Never
translate route/status values, company/project/agent names or user-authored text.
Do not translate arbitrary incoming props in generic navigation components.

The wider interface catalog uses `interfaceText(key, values)` with stable
`m_<14 hex SHA256 of English message>` keys. Existing call sites retain their
keys when copy changes; new messages get new keys. `useInterfaceLanguage()`
subscribes React components without remounting their forms. Include its returned
locale in memo/effect dependencies when they produce display copy. Static label
registries use getters so importing a module does not freeze the initial locale.
Do not use localized labels as enum values, ownership checks or persisted names.
Preserve the raw policy/status and translate only when rendering it.

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

The expanded catalog covers source-owned display copy in classic/production
pages, account and instance settings, agents, tasks and composers, apps and
connections, skills, costs, projects, routines, audit views, specialized menus,
dialogs, tooltips and accessibility labels. Both catalogs are validated for
matching keys and interpolation placeholders at startup and in focused tests.

Company/agent/project names, user content, skill instruction bodies, model and
provider identifiers, code/config examples and original server/provider error
details remain unchanged. Translation extraction is not proof that every
data-dependent page, experimental surface or external plugin has been accepted
in Vietnamese. Review new upstream copy and translated prose during upgrades.

The Agents page includes a workspace-only research-team preview behind
`VITE_NAQEX_WORKSPACE_ORIGIN`. Its native dialog shows three proposed roles and
one sample task; it has local open/close state and no provisioning API. Reviewing
this proposal neither creates agents nor starts a job or automation.

For an upstream update, retain these namespaces/bridge, reconcile translated call
sites and new hardcoded display copy. Keep source changes in the fork rather
than runtime DOM replacement. Catalog separation reduces translation churn;
upstream component changes still need a normal merge and conflict review.
Run locale and affected component tests, UI typecheck/build, token gates,
then verify VI/EN switching with an open draft and search in the real embedding.
Native token-gate debt must be reported separately from newly added violations.
