import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, Download, Send, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AIInfoTooltip } from "@/components/ai-info-tooltip";
import { SpeechToolbar } from "@/components/speech-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { MeetingSummary } from "@/routes/api/meeting";
import { useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/_app/meeting-summarizer")({
  head: () => ({ meta: [{ title: "Meeting Summarizer · OmniWork AI" }] }),
  component: MeetingSummarizer,
});

function MeetingSummarizer() {
  const { saveProject, addTasks } = useWorkspace();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<MeetingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!/\.(txt|pdf)$/i.test(file.name)) {
      toast.error("Please upload a .txt or .pdf file.");
      return;
    }
    const text = await file.text();
    setTranscript((prev) => (prev ? prev + "\n" + text : text));
    toast.success(`Loaded ${file.name}`);
  };

  const run = async () => {
    if (!transcript.trim()) {
      toast.error("Paste a transcript or upload a file first.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, transcript }),
      });
      if (!res.ok) {
        const msg = await res.text();
        if (res.status === 429) toast.error("Rate limit hit — please try again shortly.");
        else if (res.status === 402) toast.error("AI credits exhausted. Add credits to continue.");
        else toast.error(msg || "Failed to summarize meeting.");
        return;
      }
      const data = (await res.json()) as MeetingSummary;
      setResult(data);
    } catch {
      toast.error("Network error while summarizing.");
    } finally {
      setLoading(false);
    }
  };

  const fullText = result
    ? `Executive summary:\n${result.executive}\n\nKey decisions:\n${result.decisions.map((d) => "• " + d).join("\n")}\n\nAction items:\n${result.actions.map((a) => `- ${a.task} (${a.owner}, ${a.priority}, due ${a.due})`).join("\n")}`
    : "";

  const copy = async () => {
    await navigator.clipboard.writeText(fullText);
    toast.success("Summary copied.");
  };

  const downloadPdf = () => {
    const blob = new Blob([fullText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "meeting-summary"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download started.");
  };

  const pushToPlanner = () => {
    if (!result) return;
    addTasks(
      result.actions.map((a) => ({
        title: a.task,
        owner: a.owner,
        priority: a.priority,
        due: a.due,
        status: "todo" as const,
        importance: "important" as const,
        urgency: a.priority === "High" ? ("urgent" as const) : ("not_urgent" as const),
      })),
    );
    toast.success("Pushed to Task Planner.");
    navigate({ to: "/task-planner" });
  };

  const onSave = () => {
    if (!result) return;
    saveProject({ type: "summary", title: title || "Meeting summary", content: fullText });
    toast.success("Saved to your projects.");
  };

  const priorityVariant = (p: string) =>
    p === "High" ? "destructive" : p === "Medium" ? "default" : "secondary";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meeting Notes Summarizer</h1>
          <p className="text-sm text-muted-foreground">
            Turn raw notes or transcripts into structured outcomes.
          </p>
        </div>
        <AIInfoTooltip />
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Meeting title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 Roadmap Sync"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transcript">Raw transcript or notes</Label>
              <Textarea
                id="transcript"
                rows={10}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your meeting transcript here…"
              />
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center text-sm transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
              }`}
            >
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
              <span className="text-muted-foreground">
                Drag & drop a .txt or .pdf file, or click to browse
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.pdf,text/plain,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </div>
            <Button onClick={run} disabled={loading} className="w-full">
              {loading ? "Summarizing…" : "Generate summary"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Output</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : result ? (
              <>
                <SpeechToolbar text={fullText} />
                <Tabs defaultValue="exec">
                  <TabsList className="w-full">
                    <TabsTrigger value="exec" className="flex-1">Executive</TabsTrigger>
                    <TabsTrigger value="dec" className="flex-1">Decisions</TabsTrigger>
                    <TabsTrigger value="act" className="flex-1">Actions</TabsTrigger>
                    <TabsTrigger value="ins" className="flex-1">Insights</TabsTrigger>
                  </TabsList>
                  <TabsContent value="exec" className="pt-4 text-sm leading-relaxed">
                    {result.executive}
                  </TabsContent>
                  <TabsContent value="dec" className="pt-4">
                    {result.decisions.length ? (
                      <ul className="list-disc space-y-2 pl-5 text-sm">
                        {result.decisions.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No explicit decisions detected.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="act" className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Task</TableHead>
                            <TableHead>Owner</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Due</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.actions.map((a, i) => (
                            <TableRow key={i}>
                              <TableCell className="max-w-xs">{a.task}</TableCell>
                              <TableCell>{a.owner}</TableCell>
                              <TableCell>
                                <Badge variant={priorityVariant(a.priority)}>{a.priority}</Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{a.due}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  <TabsContent value="ins" className="space-y-4 pt-4 text-sm">
                    <div>
                      <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Sentiment</div>
                      <Badge variant="secondary" className="capitalize">{result.sentiment ?? "neutral"}</Badge>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Topics</div>
                      {result.topics && result.topics.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {result.topics.map((t, i) => (
                            <Badge key={i} variant="outline">{t}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No topics detected.</p>
                      )}
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">Risks & open questions</div>
                      {result.risks && result.risks.length ? (
                        <ul className="list-disc space-y-1.5 pl-5">
                          {result.risks.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">None flagged.</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={copy}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                  <Button variant="outline" onClick={downloadPdf}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                  <Button variant="outline" onClick={pushToPlanner}>
                    <Send className="mr-2 h-4 w-4" /> Push to Task Planner
                  </Button>
                  <Button onClick={onSave}>Save project</Button>
                </div>
              </>
            ) : (
              <div className="grid place-items-center rounded-md border border-dashed p-10 text-sm text-muted-foreground">
                Your structured summary will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
