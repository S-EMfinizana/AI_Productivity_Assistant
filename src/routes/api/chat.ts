import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

interface ChatBody {
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  context?: {
    taskCount?: number;
    activeTasks?: string[];
    recentProjects?: string[];
    now?: string;
  };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const ctx = body.context ?? {};
        const contextLines = [
          ctx.now ? `Current time: ${ctx.now}` : null,
          typeof ctx.taskCount === "number" ? `User has ${ctx.taskCount} task(s) in their planner.` : null,
          ctx.activeTasks?.length ? `Top open tasks: ${ctx.activeTasks.slice(0, 5).join("; ")}` : null,
          ctx.recentProjects?.length ? `Recent saved projects: ${ctx.recentProjects.slice(0, 5).join("; ")}` : null,
        ].filter(Boolean);

        const system = [
          "You are OmniWork AI, a friendly, concise workplace productivity copilot.",
          "Help with drafting emails, summarizing notes, planning tasks, and research.",
          "Use markdown sparingly. Prefer short paragraphs and tight bullet lists.",
          "Reference the user's workspace context when relevant. Never invent specifics.",
          contextLines.length ? `Workspace context:\n${contextLines.join("\n")}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const modelMessages: ModelMessage[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system,
            messages: modelMessages,
          });
          return result.toTextStreamResponse();
        } catch (err) {
          const message = err instanceof Error ? err.message : "AI request failed";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
