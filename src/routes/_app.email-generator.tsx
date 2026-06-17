import { createFileRoute } from "@tanstack/react-router";
import { Copy, RefreshCw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AIInfoTooltip } from "@/components/ai-info-tooltip";
import { SpeechToolbar } from "@/components/speech-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { emailToText, type EmailInputs } from "@/lib/mock-ai";
import { useWorkspace } from "@/lib/workspace";

type EmailDraft = {
  subject: string;
  greeting: string;
  body: string;
  closing: string;
  signature: string;
};

export const Route = createFileRoute("/_app/email-generator")({
  head: () => ({
    meta: [{ title: "Email Generator · OmniWork AI" }],
  }),
  component: EmailGenerator,
});

const tones = ["Formal", "Professional", "Friendly", "Persuasive", "Apologetic", "Follow-up", "Thank-you"];

function EmailGenerator() {
  const { saveProject, projects, tasks } = useWorkspace();
  const [inputs, setInputs] = useState<EmailInputs>({
    recipient: "",
    sender: "",
    purpose: "",
    keyPoints: "",
    tone: "Professional",
    length: 2,
  });
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [editable, setEditable] = useState("");

  const run = async () => {
    if (!inputs.purpose.trim() && !inputs.keyPoints.trim()) {
      toast.error("Add an email purpose or some key points first.");
      return;
    }
    setLoading(true);
    setDraft(null);
    try {
      const recentProjects = projects.slice(0, 5).map((p) => ({ title: p.title, type: p.type }));
      const openTasks = tasks
        .filter((t) => t.status !== "done")
        .slice(0, 5)
        .map((t) => ({ title: t.title, priority: t.priority }));
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inputs, context: { recentProjects, openTasks } }),
      });
      if (!res.ok) {
        const msg = await res.text();
        if (res.status === 429) toast.error("Rate limit reached. Please try again shortly.");
        else if (res.status === 402) toast.error("AI credits exhausted. Add credits to continue.");
        else toast.error(msg || "Failed to generate email.");
        return;
      }
      const result = (await res.json()) as EmailDraft;
      setDraft(result);
      setEditable(emailToText(result));
    } catch {
      toast.error("Network error while contacting the AI.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(editable);
    toast.success("Email copied to clipboard.");
  };

  const onSave = () => {
    if (!draft) return;
    saveProject({
      type: "email",
      title: draft.subject || "Untitled email",
      content: editable,
      meta: { tone: inputs.tone, recipient: inputs.recipient },
    });
    toast.success("Saved to your projects.");
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Smart Email Generator</h1>
          <p className="text-sm text-muted-foreground">
            Draft polished, on-brand emails in seconds.
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="recipient">Recipient name</Label>
                <Input
                  id="recipient"
                  value={inputs.recipient}
                  onChange={(e) => setInputs({ ...inputs, recipient: e.target.value })}
                  placeholder="e.g. Maria"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sender">Sender name</Label>
                <Input
                  id="sender"
                  value={inputs.sender}
                  onChange={(e) => setInputs({ ...inputs, sender: e.target.value })}
                  placeholder="Your name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purpose">Email purpose</Label>
              <Input
                id="purpose"
                value={inputs.purpose}
                onChange={(e) => setInputs({ ...inputs, purpose: e.target.value })}
                placeholder="e.g. Follow up on Q3 proposal"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="keypoints">Key points (one per line)</Label>
              <Textarea
                id="keypoints"
                value={inputs.keyPoints}
                onChange={(e) => setInputs({ ...inputs, keyPoints: e.target.value })}
                rows={5}
                placeholder={"Highlight Q3 wins\nPropose next steps\nConfirm timeline"}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tone</Label>
                <Select value={inputs.tone} onValueChange={(v) => setInputs({ ...inputs, tone: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tones.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Length · {["Short", "Standard", "Detailed"][inputs.length - 1]}</Label>
                <Slider
                  min={1}
                  max={3}
                  step={1}
                  value={[inputs.length]}
                  onValueChange={(v) => setInputs({ ...inputs, length: v[0] })}
                />
              </div>
            </div>
            <Button onClick={run} disabled={loading} className="w-full">
              {loading ? "Generating…" : "Generate email"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Generated email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ) : draft ? (
              <>
                <SpeechToolbar text={editable} />
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <div className="font-semibold">Subject: {draft.subject}</div>
                </div>
                <Textarea
                  value={editable}
                  onChange={(e) => setEditable(e.target.value)}
                  rows={14}
                  className="font-mono text-sm"
                  aria-label="Editable email draft"
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={run} disabled={loading}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                  </Button>
                  <Button variant="outline" onClick={copy}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                  <Button onClick={onSave}>
                    <Save className="mr-2 h-4 w-4" /> Save project
                  </Button>
                </div>
              </>
            ) : (
              <div className="grid place-items-center rounded-md border border-dashed border-border p-10 text-sm text-muted-foreground">
                Your draft will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
