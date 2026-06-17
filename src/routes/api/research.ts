import { createFileRoute } from "@tanstack/react-router";
import { generateText, Output, type ModelMessage } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

interface ResearchBody {
  topic?: string;
  urls?: string;
  article?: string;
  questions?: string;
}

const ReportSchema = z.object({
  summary: z.string(),
  findings: z.array(z.string()),
  insights: z.array(z.string()),
  recommendations: z.array(z.string()),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
});

export const Route = createFileRoute("/api/research")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ResearchBody;
        try {
          body = (await request.json()) as ResearchBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const topic = (body.topic ?? "").trim();
        if (!topic) return new Response("topic required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const urls = (body.urls ?? "")
          .split(/\s+/)
          .map((u) => u.trim())
          .filter((u) => /^https?:\/\//i.test(u));

        const userParts = [
          `Research topic: ${topic}`,
          urls.length ? `Reference URLs:\n${urls.map((u) => `- ${u}`).join("\n")}` : "",
          body.article?.trim() ? `Supplied article excerpt:\n"""\n${body.article.trim().slice(0, 8000)}\n"""` : "",
          body.questions?.trim() ? `Specific questions to address:\n${body.questions.trim()}` : "",
          "Produce a structured research report. Findings should be evidence-based statements. Insights should synthesize patterns. Recommendations should be actionable. Sources must include the reference URLs above when provided, plus other credible sources you reference; never invent URLs you are not confident about.",
        ].filter(Boolean);

        const messages: ModelMessage[] = [{ role: "user", content: userParts.join("\n\n") }];

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const { experimental_output } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system:
              "You are OmniWork AI's research analyst. Generate concise, well-structured, factual research reports. Avoid speculation. Cite reference URLs the user provided.",
            messages,
            experimental_output: Output.object({ schema: ReportSchema }),
          });

          return Response.json(experimental_output);
        } catch (err) {
          const message = err instanceof Error ? err.message : "AI request failed";
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
