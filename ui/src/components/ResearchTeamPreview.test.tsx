// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n";
import { ResearchTeamPreview } from "./ResearchTeamPreview";

let root: Root | undefined;
afterEach(async () => {
  await act(async () => { root?.unmount(); await i18n.changeLanguage("en"); });
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("research team review", () => {
  it("keeps the open preview mounted while changing language without creating work", async () => {
    const fetch = vi.spyOn(globalThis, "fetch");
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => { await i18n.changeLanguage("en"); root!.render(<ResearchTeamPreview />); });
    await act(async () => { container.querySelector("button")!.click(); });
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Independent reviewer");
    await act(async () => { await i18n.changeLanguage("vi"); });
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(dialog?.textContent).toContain("Kiểm chứng độc lập");
    expect(dialog?.textContent).toContain("Chưa chạy");
    expect(fetch).not.toHaveBeenCalled();
  });

});
