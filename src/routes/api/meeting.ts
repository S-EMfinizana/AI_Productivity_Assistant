import { createFileRoute } from "@tanstack/react-router";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

interface MeetingBody {
  title?: string;
  transcript?: string;
}

const SummarySchema = z.object({
  executive: z.string(),
  decisions: z.array(z.string()),
  actions: z.array(
    z.object({
      task: z.string(),
      owner: z.string(),
      priority: z.enum(["Low", "Medium", "High"]),
      due: z.string(),
    }),
  ),
  risks: z.array(z.string()).optional().default([]),
  topics: z.array(z.string()).optional().default([]),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]).optional().default("neutral"),
});

export type MeetingSummary = z.infer<typeof SummarySchema>;

export const Route = createFileRoute("/api/meeting")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: MeetingBody;
        try {
          body = (await request.json()) as MeetingBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const transcript = (body.transcript ?? "").trim();
        if (!transcript) return new Response("transcript required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const title = (body.title ?? "").trim() || "(untitled meeting)";
        const today = new Date().toISOString().slice(0, 10);

        const userPrompt = [
          `Meeting title: ${title}`,
          `Today's date (use as reference for relative due dates like "next Friday"): ${today}`,
          `Raw transcript or notes:\n"""\n${transcript.slice(0, 20000)}\n"""`,
          'Analyze the meeting and respond with ONLY valid JSON (no markdown fences, no prose) in this exact shape:',
          '{"executive": string, "decisions": string[], "actions": [{"task": string, "owner": string, "priority": "Low"|"Medium"|"High", "due": string}], "risks": string[], "topics": string[], "sentiment": "positive"|"neutral"|"negative"|"mixed"}',
          'Rules: executive = 2-4 sentence narrative summary covering purpose, outcomes, and next steps. decisions = concrete agreements made (not discussion points). actions = clear tasks; owner = the named person if mentioned else "Unassigned"; priority based on stated urgency/impact; due = ISO date (YYYY-MM-DD) if a date or relative timeframe is given, else "TBD". risks = blockers, concerns, or open questions. topics = 3-6 short topic tags. sentiment = overall tone. Never invent owners or dates that were not implied.',
        ].join("\n\n");

        const messages: ModelMessage[] = [{ role: "user", content: userPrompt }];

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const { text } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system:
              "You are OmniWork AI's meeting analyst. You turn raw meeting notes and transcripts into precise, structured summaries. Be faithful to the source — do not invent facts, owners, dates, or decisions that were not stated or clearly implied. Always reply with valid JSON only.",
            messages,
          });

          const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
          let parsed: unknown;
          try {
            parsed = JSON.parse(cleaned);
          } catch {
            const match = cleaned.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("Model did not return JSON");
            parsed = JSON.parse(match[0]);
          }
          const result = SummarySchema.parse(parsed);
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "AI request failed";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
