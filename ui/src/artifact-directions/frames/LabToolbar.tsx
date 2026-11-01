import { interfaceText, useInterfaceLanguage } from "@/i18n/interface-copy";
import { cn } from "@/lib/utils";
import { DIRECTION_IDS, KIT_KEYS, KIT_META, type DirectionId } from "../kit";
import { LAB_VIEWS, type LabState, type LabTheme, type LabView } from "../lab-state";

/**
 * The lab's own chrome (`chrome=1`). Deliberately not the product's look —
 * monospace, one line — so it never reads as part of a frame.
 */

interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-0.5 rounded-md bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          data-size="xs"
          aria-checked={option.value === value}
          title={option.hint}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-sm px-2 py-1 leading-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            option.value === value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// The kit set has no "All": the every-kit contact sheet is URL-only (`?d=all`).
const KIT_OPTIONS: Option<DirectionId | "all">[] = DIRECTION_IDS.map((id) => ({
  value: id,
  label: KIT_META[id].name,
  hint: `${KIT_META[id].tagline} (${KIT_KEYS[id]})`,
}));
// Overview first; the vocabulary sheet (`s=kinds`) is URL-only.
const VIEW_OPTIONS: Option<LabView>[] = [
  { value: "board", get label() { return interfaceText("m_d4b1ea5708dd53"); }, hint: "The kit's four surfaces on one sheet" },
  { value: "thread", get label() { return interfaceText("m_62e4ede297f5c9"); } },
  { value: "panel", get label() { return interfaceText("m_8709e848e0fb96"); } },
  { value: "gallery", get label() { return interfaceText("m_e447c20afa7959"); } },
  { value: "stack", get label() { return interfaceText("m_f2676bfa027b15"); } },
];
const THEME_OPTIONS: Option<LabTheme>[] = [
  { value: "dark", get label() { return interfaceText("m_e6bb5689beec52"); }, hint: "Toggle with t" },
  { value: "light", get label() { return interfaceText("m_99a7026172d427"); }, hint: "Toggle with t" },
];
const ANIM_OPTIONS: Option<"off" | "on">[] = [
  { value: "off", get label() { return interfaceText("m_b4dc66dde80626"); }, hint: "Hover animations off (toggle with a)" },
  { value: "on", get label() { return interfaceText("m_b8d31e852725af"); }, hint: "Hover animations on: MVP V1 artwork rises, stack pages turn (toggle with a)" },
];

const TITLE = "font-medium uppercase tracking-(--tracking-label) text-foreground";

/**
 * Two labelled rows on one grid — "Artifact directions" over "Artifact
 * surfaces" — so the labels sit flush left and the two sets start on the same
 * column. Theme and animation keep to the first row's right edge.
 */
export function LabToolbar({ state, onChange }: { state: LabState; onChange: (patch: Partial<LabState>) => void }) {
  useInterfaceLanguage();
  return (
    <div
      className="sticky top-0 z-50 grid items-center gap-x-4 gap-y-2 border-b border-border bg-background px-4 py-2 font-mono text-(length:--text-micro) text-muted-foreground"
      style={{ gridTemplateColumns: "max-content 1fr" }}
    >
      <span className={TITLE}>{interfaceText("m_0c94112da02a59")}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented label={interfaceText("m_875d60ed20f4b9")} options={KIT_OPTIONS} value={state.direction} onChange={(direction) => onChange({ direction })} />
        <div className="ml-auto flex items-center gap-4">
          <Segmented label={interfaceText("m_efb52e7172b777")} options={THEME_OPTIONS} value={state.theme} onChange={(theme) => onChange({ theme })} />
          <span className="flex items-center gap-1.5">
            <span>{interfaceText("m_ec23cef03131da")}</span>
            <Segmented label={interfaceText("m_1dd10f244a6277")} options={ANIM_OPTIONS} value={state.anim ? "on" : "off"} onChange={(value) => onChange({ anim: value === "on" })} />
          </span>
        </div>
      </div>
      <span className={TITLE}>{interfaceText("m_9872629d2951bb")}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented label={interfaceText("m_0905f7f59021c2")} options={VIEW_OPTIONS} value={state.view} onChange={(view) => onChange({ view })} />
        <span className="ml-auto hidden lg:inline">{interfaceText("m_190b2c8baa0aaf")}</span>
      </div>
    </div>
  );
}
