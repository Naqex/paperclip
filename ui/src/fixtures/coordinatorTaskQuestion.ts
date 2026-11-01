import { interfaceText } from "@/i18n/interface-copy";
import type { AttentionItem } from "@paperclipai/shared";
import { pendingAskUserQuestionsInteraction } from "./issueThreadInteractionFixtures";

export const coordinatorTaskQuestion = {
  ...pendingAskUserQuestionsInteraction,
  id: "task-audience-question", issueId: "task-launch", title: "Who should the launch post help?",
  summary: "The draft needs an audience before its examples and success criteria can be chosen.",
  payload: { version: 1 as const, title: "Who should the launch post help?", submitLabel: "Confirm audience", questions: [{
    id: "audience", prompt: "Who is the primary reader?", selectionMode: "single" as const, required: true,
    options: [{ id: "operators", get label() { return interfaceText("m_70f8dfb6caeb45"); }, description: "Explain how to choose access for their team." },
      { id: "teammates", get label() { return interfaceText("m_0c3125b750d45c"); }, description: "Explain what they can do with the connected tools." }],
  }] },
};

export const coordinatorTaskQuestionAttention: AttentionItem = {
  id: `issue_thread_interaction:${coordinatorTaskQuestion.id}`, companyId: coordinatorTaskQuestion.companyId,
  sourceKind: "issue_thread_interaction", subject: { kind: "interaction", id: coordinatorTaskQuestion.id,
    companyId: coordinatorTaskQuestion.companyId, title: coordinatorTaskQuestion.title, identifier: null, status: "pending",
    href: `/issues/PAPER-102#interaction-${coordinatorTaskQuestion.id}` },
  relatedIssue: { kind: "issue", id: coordinatorTaskQuestion.issueId, companyId: coordinatorTaskQuestion.companyId,
    title: "Write the launch post", identifier: "PAPER-102", status: "blocked", href: "/issues/PAPER-102" },
  whyNow: "The task needs an audience.", decisionVerbs: [], inlineResolvable: true, entryRule: "pending", exitRule: "answered",
  dedupKey: coordinatorTaskQuestion.id, dismissalKey: coordinatorTaskQuestion.id, dismissal: null, severity: "medium", rank: 1,
  activityAt: new Date(coordinatorTaskQuestion.createdAt).toISOString(), createdAt: new Date(coordinatorTaskQuestion.createdAt).toISOString(), updatedAt: new Date(coordinatorTaskQuestion.updatedAt).toISOString(),
  project: null, workspace: null, expiresAt: null, ruleKey: null, originAgentName: "Mira", queues: [], shelf: false,
  retentionDays: 0, keep: false, archivedAt: null, retentionVersion: 1, decideBy: null, decideByAttribution: null,
  snoozedUntil: null, detail: { kind: "questions", questionCount: 1, firstQuestionText: "Who is the primary reader?", images: [] }, trainingExampleId: null,
};
