// Mock AI generation utilities — synchronous templates with simulated latency.

export function delay(ms = 900) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export interface EmailInputs {
  recipient: string;
  sender: string;
  purpose: string;
  keyPoints: string;
  tone: string;
  length: number; // 1-3
}

export function generateEmail(i: EmailInputs) {
  const points = i.keyPoints
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const bulleted = points.length
    ? points.map((p) => `• ${p}`).join("\n")
    : "• (Add a few key points to enrich this draft.)";

  const openings: Record<string, string> = {
    Formal: `Dear ${i.recipient || "Recipient"},`,
    Professional: `Hi ${i.recipient || "there"},`,
    Friendly: `Hey ${i.recipient || "there"}!`,
    Persuasive: `Hello ${i.recipient || "there"},`,
    Apologetic: `Dear ${i.recipient || "Recipient"},`,
    "Follow-up": `Hi ${i.recipient || "there"},`,
    "Thank-you": `Dear ${i.recipient || "Recipient"},`,
  };
  const closings: Record<string, string> = {
    Formal: "Kind regards,",
    Professional: "Best regards,",
    Friendly: "Cheers,",
    Persuasive: "Looking forward to your thoughts,",
    Apologetic: "With sincere apologies,",
    "Follow-up": "Thanks again,",
    "Thank-you": "With gratitude,",
  };

  const intro = `I hope this message finds you well. I'm reaching out regarding ${
    i.purpose || "an important matter"
  }.`;
  const body =
    i.length >= 2
      ? `${intro}\n\nBelow is a quick summary of the key items I'd like to share:\n\n${bulleted}\n\nPlease let me know if any of these points need additional context or if you'd like to schedule a quick sync.`
      : `${intro}\n\n${bulleted}`;
  const subject = `${i.purpose || "Quick note"}${
    i.tone === "Follow-up" ? " — follow-up" : ""
  }`;

  return {
    subject,
    greeting: openings[i.tone] ?? openings.Professional,
    body,
    closing: closings[i.tone] ?? closings.Professional,
    signature: i.sender || "Your Name",
  };
}

export function emailToText(e: ReturnType<typeof generateEmail>) {
  return `Subject: ${e.subject}\n\n${e.greeting}\n\n${e.body}\n\n${e.closing}\n${e.signature}`;
}

export interface SummaryResult {
  executive: string;
  decisions: string[];
  actions: { task: string; owner: string; priority: "Low" | "Medium" | "High"; due: string }[];
}

export function summarizeMeeting(transcript: string, title: string): SummaryResult {
  const sentences = transcript
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  const top = sentences.slice(0, 4).join(". ");
  const exec =
    top ||
    `${title || "The meeting"} covered the main objectives, current blockers, and next steps the team will execute over the coming sprint.`;

  const decisions =
    sentences
      .filter((s) => /decid|agree|approv|will|going to/i.test(s))
      .slice(0, 4)
      .map((s) => s.replace(/^[^a-zA-Z]+/, "")) ||
    [];

  const fallbackDecisions = [
    "Proceed with the proposed roadmap for the next two weeks",
    "Assign clear ownership for each open workstream",
    "Reconvene next week to review progress and unblock risks",
  ];

  const owners = ["Alex", "Priya", "Jordan", "Sam", "Taylor"];
  const priorities: SummaryResult["actions"][number]["priority"][] = ["High", "Medium", "Low"];
  const baseActions = (sentences.length ? sentences.slice(0, 5) : [
    "Draft project brief",
    "Share kickoff notes with stakeholders",
    "Set up tracking dashboard",
    "Schedule weekly review",
  ]).map((s, idx) => ({
    task: s.length > 80 ? s.slice(0, 80) + "…" : s,
    owner: owners[idx % owners.length],
    priority: priorities[idx % priorities.length],
    due: new Date(Date.now() + (idx + 2) * 86400000).toISOString().slice(0, 10),
  }));

  return {
    executive: exec,
    decisions: decisions.length ? decisions : fallbackDecisions,
    actions: baseActions,
  };
}

export interface ResearchReport {
  summary: string;
  findings: string[];
  insights: string[];
  recommendations: string[];
  sources: { title: string; url: string }[];
}

export function generateResearch(topic: string, urls: string, article: string, questions: string): ResearchReport {
  const t = topic || "the chosen topic";
  return {
    summary: `This report explores ${t}, examining current trends, key stakeholders, and emerging opportunities. The analysis is based on the provided sources and synthesized into actionable guidance.`,
    findings: [
      `${t} is experiencing accelerated adoption across mid-market organizations.`,
      "Leading practitioners emphasize iteration speed over upfront perfection.",
      "Cost of inaction continues to grow as competitors invest aggressively.",
      article ? "Provided article highlights the operational complexity of execution." : "Operational complexity remains the most cited blocker.",
    ],
    insights: [
      "Cross-functional alignment is the single largest predictor of success.",
      "Tooling investments pay back fastest when paired with workflow redesign.",
      questions ? `Your question — "${questions.split("\n")[0]}" — points to a measurement gap that should be addressed early.` : "Measurement frameworks are typically underinvested.",
    ],
    recommendations: [
      `Pilot a focused initiative around ${t} within the next 30 days.`,
      "Establish a lightweight measurement baseline before scaling.",
      "Document learnings publicly to compound institutional knowledge.",
    ],
    sources: (urls
      .split(/\s+/)
      .map((u) => u.trim())
      .filter(Boolean)
      .map((u, i) => ({ title: `Source ${i + 1}`, url: u })) || []
    ).concat([
      { title: "Industry benchmark report (2025)", url: "https://example.com/benchmark" },
      { title: "Practitioner interview notes", url: "https://example.com/interviews" },
    ]),
  };
}

export function chatReply(prompt: string): string {
  const p = prompt.toLowerCase();
  if (/email|draft/.test(p))
    return "Here's a draft outline you can adapt: open with context, list 2–3 key points, propose a clear next step, and close with a warm sign-off. Want me to tailor a specific tone?";
  if (/summar/.test(p))
    return "I can summarize that into an executive overview, key decisions, and action items. Paste the transcript into the Meeting Summarizer for a structured output, or share the text here.";
  if (/task|plan|schedul/.test(p))
    return "Try breaking the work into 25–45 minute focus blocks. Tag each task with priority and an estimated duration — the Task Planner will lay them out on a Kanban and Eisenhower matrix automatically.";
  if (/research|find|sources/.test(p))
    return "I'd start by framing 2–3 sharp questions, then pull from primary sources where possible. The Research Assistant produces a structured report with findings, insights, recommendations, and citations.";
  return `Great question. Here's a quick take on "${prompt}": start by clarifying the desired outcome, then identify the smallest next step that moves the work forward. Want me to expand into a checklist?`;
}
