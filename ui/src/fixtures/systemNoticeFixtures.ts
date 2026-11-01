import { interfaceText } from "@/i18n/interface-copy";
import type {
  SystemNoticeMetadataSection,
  SystemNoticeProps,
} from "../components/SystemNotice";

export type SystemNoticeFixture = {
  id: string;
  caption: string;
} & SystemNoticeProps;

const HANDOFF_METADATA: SystemNoticeMetadataSection[] = [
  {
    title: "Recovery owner",
    rows: [
      {
        kind: "issue",
        get label() { return interfaceText("m_52e3934387e325"); },
        identifier: "PAP-3440",
        href: "/PAP/issues/PAP-3440",
        title: "Successful run handoff missing disposition",
      },
      {
        kind: "agent",
        get label() { return interfaceText("m_4b1b8aa3608a26"); },
        name: "CTO",
        href: "/PAP/agents/cto",
      },
      {
        kind: "text",
        get label() { return interfaceText("m_96662cd1ccdd5c"); },
        value: "Reassign to a recovery agent and pick a disposition.",
      },
    ],
  },
  {
    title: "Run evidence",
    rows: [
      {
        kind: "run",
        get label() { return interfaceText("m_bb84312ee41d3e"); },
        runId: "9cdba892-c7ca-4d93-8604-4843873b127c",
        href: "/PAP/agents/codexcoder/runs/9cdba892-c7ca-4d93-8604-4843873b127c",
        status: "succeeded",
      },
      {
        kind: "run",
        get label() { return interfaceText("m_f6f107313733d2"); },
        runId: "61fdb79b-8012-4676-ac71-2971830e126a",
        href: "/PAP/agents/codexcoder/runs/61fdb79b-8012-4676-ac71-2971830e126a",
        status: "failed",
      },
      {
        kind: "text",
        get label() { return interfaceText("m_e7c585b00c10ab"); },
        value: "Run completed without issuing a disposition for an in_progress task.",
      },
    ],
  },
];

const REQUIRED_METADATA: SystemNoticeMetadataSection[] = [
  {
    title: "Required action",
    rows: [
      {
        kind: "issue",
        get label() { return interfaceText("m_bc23e41adf441f"); },
        identifier: "PAP-3440",
        href: "/PAP/issues/PAP-3440",
        title: "Successful run handoff missing disposition",
      },
      {
        kind: "agent",
        get label() { return interfaceText("m_bc110a6d072209"); },
        name: "CodexCoder",
        href: "/PAP/agents/codexcoder",
      },
      {
        kind: "text",
        get label() { return interfaceText("m_298a9207a732a1"); },
        value: "Pick done, blocked, or in_review and post a one-line rationale.",
      },
    ],
  },
  {
    title: "Run context",
    rows: [
      {
        kind: "run",
        get label() { return interfaceText("m_f029c8013ba6a7"); },
        runId: "9cdba892-c7ca-4d93-8604-4843873b127c",
        href: "/PAP/agents/codexcoder/runs/9cdba892-c7ca-4d93-8604-4843873b127c",
        status: "succeeded",
      },
      {
        kind: "code",
        get label() { return interfaceText("m_bf55accae7107e"); },
        value: "in_progress",
      },
    ],
  },
];

const NEUTRAL_METADATA: SystemNoticeMetadataSection[] = [
  {
    rows: [
      {
        kind: "agent",
        get label() { return interfaceText("m_36ce9ea79376c7"); },
        name: "ClaudeFixer",
        href: "/PAP/agents/claudefixer",
      },
      {
        kind: "agent",
        get label() { return interfaceText("m_218197693424e0"); },
        name: "CodexCoder",
        href: "/PAP/agents/codexcoder",
      },
      {
        kind: "text",
        get label() { return interfaceText("m_f81ab834de5f84"); },
        value: "Manual reassignment requested by Board.",
      },
    ],
  },
];

export const systemNoticeFixtures: readonly SystemNoticeFixture[] = [
  {
    id: "warning-collapsed",
    caption: "Warning · collapsed (default)",
    tone: "warning",
    get label() { return interfaceText("m_5398b157325f20"); },
    source: { label: "Paperclip", href: "/PAP/agents" },
    timestamp: "2026-05-04T16:32:00.000Z",
    body: "Paperclip needs a disposition before this issue can continue.",
    metadata: REQUIRED_METADATA,
    detailsDefaultOpen: false,
  },
  {
    id: "warning-expanded",
    caption: "Warning · expanded",
    tone: "warning",
    get label() { return interfaceText("m_5398b157325f20"); },
    source: { label: "Paperclip", href: "/PAP/agents" },
    timestamp: "2026-05-04T16:32:00.000Z",
    body: "Paperclip needs a disposition before this issue can continue.",
    metadata: REQUIRED_METADATA,
    detailsDefaultOpen: true,
  },
  {
    id: "danger-collapsed",
    caption: "Danger · collapsed (default)",
    tone: "danger",
    get label() { return interfaceText("m_2b1c663ea2e661"); },
    source: { label: "Paperclip", href: "/PAP/agents" },
    timestamp: "2026-05-04T16:48:00.000Z",
    body: "Paperclip could not resolve this issue's missing disposition automatically. The source assignment is unchanged and a board decision is required.",
    metadata: HANDOFF_METADATA,
    detailsDefaultOpen: false,
  },
  {
    id: "danger-expanded",
    caption: "Danger · expanded",
    tone: "danger",
    get label() { return interfaceText("m_2b1c663ea2e661"); },
    source: { label: "Paperclip", href: "/PAP/agents" },
    timestamp: "2026-05-04T16:48:00.000Z",
    body: "Paperclip could not resolve this issue's missing disposition automatically. The source assignment is unchanged and a board decision is required.",
    metadata: HANDOFF_METADATA,
    detailsDefaultOpen: true,
  },
  {
    id: "neutral-collapsed",
    caption: "Neutral · collapsed (default)",
    tone: "neutral",
    get label() { return interfaceText("m_e37cedd7319f32"); },
    source: { label: "Paperclip" },
    timestamp: "2026-05-04T15:10:00.000Z",
    body: "Reassigned to ClaudeFixer.",
    metadata: NEUTRAL_METADATA,
    detailsDefaultOpen: false,
  },
  {
    id: "neutral-expanded",
    caption: "Neutral · expanded",
    tone: "neutral",
    get label() { return interfaceText("m_e37cedd7319f32"); },
    source: { label: "Paperclip" },
    timestamp: "2026-05-04T15:10:00.000Z",
    body: "Reassigned to ClaudeFixer.",
    metadata: NEUTRAL_METADATA,
    detailsDefaultOpen: true,
  },
  {
    id: "warning-no-details",
    caption: "Warning · no metadata (Details affordance hidden)",
    tone: "warning",
    get label() { return interfaceText("m_5398b157325f20"); },
    source: { label: "Paperclip" },
    timestamp: "2026-05-04T17:02:00.000Z",
    body: "This run paused while waiting on board approval.",
  },
];
