import { createFileRoute } from "@tanstack/react-router";
import { Download, ExternalLink, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AIInfoTooltip } from "@/components/ai-info-tooltip";
import { SpeechToolbar } from "@/components/speech-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { ResearchReport } from "@/lib/mock-ai";
import { useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/_app/research-assistant")({
  head: () => ({ meta: [{ title: "Research Assistant · OmniWork AI" }] }),
  component: ResearchAssistant,
});

function ResearchAssistant() {
  const { saveProject } = useWorkspace();
  const [topic, setTopic] = useState("");
  const [urls, setUrls] = useState("");
  const [article, setArticle] = useState("");
  const [questions, setQuestions] = useState("");
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!topic.trim()) {
      toast.error("Add a topic to research.");
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, urls, article, questions }),
      });
      if (!res.ok) {
        const msg = await res.text();
        if (res.status === 429) toast.error("Rate limit reached. Try again shortly.");
        else if (res.status === 402) toast.error("AI credits exhausted. Add credits to continue.");
        else toast.error(msg || "Research failed.");
        return;
      }
      const data = (await res.json()) as ResearchReport;
      setReport(data);
    } catch {
      toast.error("Network error generating report.");
    } finally {
      setLoading(false);
    }
  };

  const text = report
    ? `Summary: ${report.summary}\n\nFindings:\n${report.findings.map((f) => "• " + f).join("\n")}\n\nInsights:\n${report.insights.map((i) => "• " + i).join("\n")}\n\nRecommendations:\n${report.recommendations.map((r) => "• " + r).join("\n")}\n\nSources:\n${report.sources.map((s) => `- ${s.title} (${s.url})`).join("\n")}`
    : "";

  const exportReport = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic || "research"}-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSave = () => {
    if (!report) return;
    saveProject({ type: "research", title: topic || "Research report", content: text });
    toast.success("Report saved.");
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Research Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Build structured reports with findings, insights, and citations.
          </p>
        </div>
        <AIInfoTooltip />
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Inputs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="topic">Topic query</Label>
              <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. AI adoption in healthcare" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="urls">Reference URLs (space separated)</Label>
              <Textarea id="urls" rows={2} value={urls} onChange={(e) => setUrls(e.target.value)} placeholder="https://example.com/source-1 https://example.com/source-2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="article">Paste an article (optional)</Label>
              <Textarea id="article" rows={5} value={article} onChange={(e) => setArticle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q">Specific questions</Label>
              <Textarea id="q" rows={3} value={questions} onChange={(e) => setQuestions(e.target.value)} placeholder={"What are the leading risks?\nWho are the top vendors?"} />
            </div>
            <Button onClick={run} disabled={loading} className="w-full">
              {loading ? "Researching…" : "Run research"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Structured report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : report ? (
              <>
                <SpeechToolbar text={text} />
                <Section title="Summary"><p className="text-sm leading-relaxed">{report.summary}</p></Section>
                <Section title="Key findings"><BulletList items={report.findings} /></Section>
                <Section title="Insights"><BulletList items={report.insights} /></Section>
                <Section title="Recommendations"><BulletList items={report.recommendations} /></Section>
                <Section title="Sources & references">
                  <ul className="space-y-1.5 text-sm">
                    {report.sources.map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">[{i + 1}]</span>
                        <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          {s.title} <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </Section>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" onClick={exportReport}>
                    <Download className="mr-2 h-4 w-4" /> Export report
                  </Button>
                  <Button onClick={onSave}>
                    <Save className="mr-2 h-4 w-4" /> Save project
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid place-items-center rounded-md border border-dashed p-10 text-sm text-muted-foreground">
                Your report will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
      {items.map((i, k) => <li key={k}>{i}</li>)}
    </ul>
  );
}
