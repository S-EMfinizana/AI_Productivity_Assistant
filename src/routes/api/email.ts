import { createFileRoute } from "@tanstack/react-router";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

interface EmailBody {
  recipient?: string;
  sender?: string;
  purpose?: string;
  keyPoints?: string;
  tone?: string;
  length?: number;
  context?: {
    recentProjects?: { title: string; type: string }[];
    openTasks?: { title: string; priority?: string }[];
  };
}

const EmailSchema = z.object({
  subject: z.string(),
  greeting: z.string(),
  body: z.string(),
  closing: z.string(),
  signature: z.string(),
});

export type EmailDraft = z.infer<typeof EmailSchema>;

export const Route = createFileRoute("/api/email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: EmailBody;
        try {
          body = (await request.json()) as EmailBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const purpose = (body.purpose ?? "").trim();
        const keyPoints = (body.keyPoints ?? "").trim();
        if (!purpose && !keyPoints) {
          return new Response("purpose or keyPoints required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const tone = body.tone || "Professional";
        const length = body.length ?? 2;
        const lengthLabel = ["short (2-3 sentences total)", "standard (1-2 short paragraphs)", "detailed (2-4 paragraphs with structure)"][Math.min(Math.max(length, 1), 3) - 1];

        const recentProjects = body.context?.recentProjects ?? [];
        const openTasks = body.context?.openTasks ?? [];

        const contextBlock = [
          recentProjects.length
            ? `Recent workspace projects (for situational awareness only — reference only if directly relevant):\n${recentProjects.slice(0, 5).map((p) => `- [${p.type}] ${p.title}`).join("\n")}`
            : "",
          openTasks.length
            ? `Open tasks the sender is tracking:\n${openTasks.slice(0, 5).map((t) => `- ${t.title}${t.priority ? ` (${t.priority})` : ""}`).join("\n")}`
            : "",
        ].filter(Boolean).join("\n\n");

        const userParts = [
          `Recipient: ${body.recipient?.trim() || "(unspecified)"}`,
          `Sender: ${body.sender?.trim() || "(unspecified)"}`,
          `Tone: ${tone}`,
          `Length: ${lengthLabel}`,
          `Purpose: ${purpose || "(not specified)"}`,
          keyPoints ? `Key points to cover:\n${keyPoints}` : "",
          contextBlock ? `Workspace context:\n${contextBlock}` : "",
          'Respond with ONLY valid JSON (no markdown fences, no prose) in this exact shape: {"subject": string, "greeting": string, "body": string, "closing": string, "signature": string}. The body MUST be plain text with \\n line breaks, no markdown. Greeting is the salutation line only (e.g. "Hi Maria,"). Closing is the sign-off line only (e.g. "Best regards,"). Signature is just the sender name.',
        ].filter(Boolean);

        const messages: ModelMessage[] = [{ role: "user", content: userParts.join("\n\n") }];

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const { text } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system:
              "You are OmniWork AI's email writing assistant. Write clear, concise, well-structured emails that respect the requested tone and length. Stay on-topic, avoid filler, and never invent facts about the recipient or sender. Use any provided workspace context only when it is clearly relevant to the email's purpose; do not mention it otherwise. Always reply with valid JSON only.",
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
          const result = EmailSchema.parse(parsed);
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "AI request failed";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
