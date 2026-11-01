// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { i18n } from "@/i18n";
import { ProviderTraceStatusBadge } from "./ProviderTraceStatusBadge";

let root: Root | undefined;
afterEach(async () => {
  await act(async () => { root?.unmount(); await i18n.changeLanguage("en"); });
  document.body.innerHTML = "";
});

it("keeps the off icon and neutral tone when its display label changes language", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { await i18n.changeLanguage("en"); root!.render(<ProviderTraceStatusBadge showOff />); });
  const badge = host.querySelector("span")!;
  const classes = badge.className;
  expect(host.querySelector(".lucide-circle-off")).not.toBeNull();
  expect(badge.textContent).toBe("Trace off");
  await act(async () => { await i18n.changeLanguage("vi"); });
  expect(host.querySelector("span")).toBe(badge);
  expect(badge.textContent).not.toBe("Trace off");
  expect(badge.className).toBe(classes);
  expect(host.querySelector(".lucide-circle-off")).not.toBeNull();
});
