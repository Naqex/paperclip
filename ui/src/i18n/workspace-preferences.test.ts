// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInstance } from "i18next";
import { connectWorkspacePreferences, readWorkspaceLanguage } from "./workspace-preferences";
import { i18nextResources } from "./locales";
import { validateLocaleMessages } from "./locale-validation";
import en from "./workspace/en.json";
import vietnamese from "./workspace/vi.json";

const origin = "http://127.0.0.1:5218";
const payload = { type: "naqex:preferences", version: 1, language: "vi" };
const originalParent = window.parent;
let disconnect = () => {};
afterEach(() => {
  disconnect();
  Object.defineProperty(window, "parent", { configurable: true, value: originalParent });
  vi.restoreAllMocks();
  localStorage.clear();
});

function setup() {
  const parent = { postMessage: vi.fn() };
  Object.defineProperty(window, "parent", { configurable: true, value: parent });
  const change = vi.fn();
  disconnect = connectWorkspacePreferences(window, origin, change);
  const send = (data: unknown = payload, source: unknown = parent, from = origin) => {
    window.dispatchEvent(new MessageEvent("message", { data, source: source as Window, origin: from }));
  };
  return { change, parent, send };
}

describe("workspace localization", () => {
  it("validates catalogs and falls back to English for other native locales", async () => {
    expect(validateLocaleMessages(vietnamese, en)).toEqual([]);
    const i18n = createInstance();
    await i18n.init({ resources: i18nextResources, lng: "vi", fallbackLng: "en", defaultNS: "workspace", interpolation: { escapeValue: false } });
    expect(i18n.t("tasks.create")).toBe("Tạo công việc");
    await i18n.changeLanguage("fr");
    expect(i18n.t("tasks.create")).toBe("Create Task");
    expect(i18n.t("tasks.createNamed", { name: "Owner's project" })).toBe("Create Owner's project");
  });

  it("announces readiness to the configured parent and accepts both languages", () => {
    const { change, parent, send } = setup();
    expect(parent.postMessage).toHaveBeenCalledWith({ type: "paperclip:ready", version: 1 }, origin);
    send();
    expect(change).toHaveBeenLastCalledWith("vi");
    expect(readWorkspaceLanguage(window)).toBe("vi");
    send({ ...payload, language: "en" });
    expect(change).toHaveBeenLastCalledWith("en");
    expect(readWorkspaceLanguage(window)).toBe("en");
  });

  it("ignores foreign windows, origins, unsupported versions and malformed messages", () => {
    const { change, send } = setup();
    send(payload, window);
    send(payload, undefined, "https://example.com");
    for (const data of [null, "vi", {}, { ...payload, version: 2 }, { ...payload, language: "zh" }, { ...payload, type: "execute" }]) send(data);
    expect(change).not.toHaveBeenCalled();
    expect(readWorkspaceLanguage(window)).toBeUndefined();
  });

  it("works with denied storage and removes its listener on disposal", () => {
    const { change, send } = setup();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    expect(readWorkspaceLanguage(window)).toBeUndefined();
    send();
    expect(change).toHaveBeenCalledTimes(1);
    disconnect();
    send();
    expect(change).toHaveBeenCalledTimes(1);
  });

  it("stays disconnected when standalone or without an exact configured origin", () => {
    const change = vi.fn();
    disconnect = connectWorkspacePreferences(window, origin, change);
    window.dispatchEvent(new MessageEvent("message", { data: payload, source: window, origin }));
    expect(change).not.toHaveBeenCalled();
    const parent = { postMessage: vi.fn() };
    Object.defineProperty(window, "parent", { configurable: true, value: parent });
    for (const invalid of [undefined, "*", "javascript:alert(1)", `${origin}/path`]) {
      connectWorkspacePreferences(window, invalid, change)();
    }
    expect(parent.postMessage).not.toHaveBeenCalled();
  });
});
