import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AIInfoTooltip } from "@/components/ai-info-tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspace, type PlannerTask } from "@/lib/workspace";

export const Route = createFileRoute("/_app/task-planner")({
  head: () => ({ meta: [{ title: "Task Planner · OmniWork AI" }] }),
  component: TaskPlanner,
});

const priorities: PlannerTask["priority"][] = ["Low", "Medium", "High", "Urgent"];

function TaskPlanner() {
  const { tasks, addTasks, updateTask, deleteTask, saveProject } = useWorkspace();
  const [bulk, setBulk] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<PlannerTask["priority"]>("Medium");
  const [hours, setHours] = useState(1);

  const ingest = () => {
    const lines = bulk
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) {
      toast.error("Add at least one task line.");
      return;
    }
    addTasks(
      lines.map((title) => ({
        title,
        priority,
        due: due || undefined,
        status: "todo",
        durationHrs: hours,
        importance: priority === "Urgent" || priority === "High" ? "important" : "not_important",
        urgency: priority === "Urgent" || priority === "High" ? "urgent" : "not_urgent",
      })),
    );
    setBulk("");
    toast.success(`Added ${lines.length} task${lines.length === 1 ? "" : "s"}.`);
  };

  const exportPlan = () => {
    if (!tasks.length) return toast.error("No tasks to save.");
    const content = tasks
      .map((t) => `- [${t.status}] ${t.title} (${t.priority}${t.due ? ", due " + t.due : ""})`)
      .join("\n");
    saveProject({ type: "tasks", title: `Plan · ${new Date().toLocaleDateString()}`, content });
    toast.success("Plan saved to projects.");
  };

  const move = (id: string, status: PlannerTask["status"]) => updateTask(id, { status });

  const quadrant = (imp: PlannerTask["importance"], urg: PlannerTask["urgency"]) =>
    tasks.filter((t) => (t.importance ?? "not_important") === imp && (t.urgency ?? "not_urgent") === urg);

  const cols: { key: PlannerTask["status"]; label: string }[] = [
    { key: "todo", label: "To Do" },
    { key: "in_progress", label: "In Progress" },
    { key: "done", label: "Done" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Task Planner</h1>
          <p className="text-sm text-muted-foreground">
            Capture work, prioritize, and visualize your day.
          </p>
        </div>
        <AIInfoTooltip />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk">Tasks (one per line)</Label>
              <Textarea
                id="bulk"
                rows={6}
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder={"Write project brief\nReview design feedback\nSend client update"}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="due">Deadline</Label>
                <Input id="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v: PlannerTask["priority"]) => setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estimated hours · {hours}h</Label>
              <Slider min={0.25} max={8} step={0.25} value={[hours]} onValueChange={(v) => setHours(v[0])} />
            </div>
            <div className="flex gap-2">
              <Button onClick={ingest} className="flex-1">
                <Plus className="mr-2 h-4 w-4" /> Add to plan
              </Button>
              <Button variant="outline" onClick={exportPlan}>Save plan</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule views</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="matrix">
              <TabsList className="w-full">
                <TabsTrigger value="matrix" className="flex-1">Priority Matrix</TabsTrigger>
                <TabsTrigger value="kanban" className="flex-1">Kanban</TabsTrigger>
                <TabsTrigger value="cal" className="flex-1">Calendar</TabsTrigger>
              </TabsList>

              <TabsContent value="matrix" className="pt-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { imp: "important" as const, urg: "urgent" as const, label: "Do first", tone: "bg-red-500/10" },
                    { imp: "important" as const, urg: "not_urgent" as const, label: "Schedule", tone: "bg-blue-500/10" },
                    { imp: "not_important" as const, urg: "urgent" as const, label: "Delegate", tone: "bg-amber-500/10" },
                    { imp: "not_important" as const, urg: "not_urgent" as const, label: "Eliminate", tone: "bg-muted" },
                  ].map((q) => (
                    <div key={q.label} className={`rounded-md border border-border p-3 ${q.tone}`}>
                      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{q.label}</div>
                      <ul className="space-y-1 text-sm">
                        {quadrant(q.imp, q.urg).map((t) => (
                          <li key={t.id} className="flex items-center justify-between gap-2">
                            <span className="truncate">{t.title}</span>
                            <Badge variant="secondary" className="shrink-0">{t.priority}</Badge>
                          </li>
                        ))}
                        {quadrant(q.imp, q.urg).length === 0 && (
                          <li className="text-xs text-muted-foreground">Nothing here.</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="kanban" className="pt-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {cols.map((c) => (
                    <div
                      key={c.key}
                      className="rounded-md border border-border bg-muted/30 p-3"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const id = e.dataTransfer.getData("text/plain");
                        if (id) move(id, c.key);
                      }}
                    >
                      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        {c.label} · {tasks.filter((t) => t.status === c.key).length}
                      </div>
                      <div className="space-y-2">
                        {tasks
                          .filter((t) => t.status === c.key)
                          .map((t) => (
                            <div
                              key={t.id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                              className="cursor-grab rounded-md border border-border bg-card p-2 text-sm shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="min-w-0 flex-1">{t.title}</span>
                                <button
                                  aria-label="Delete task"
                                  onClick={() => deleteTask(t.id)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                                {t.due && <span>{t.due}</span>}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="cal" className="pt-4">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks scheduled yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {[...tasks]
                      .sort((a, b) => (a.due || "").localeCompare(b.due || ""))
                      .map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{t.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {t.due ? `Due ${t.due}` : "No date"} · {t.durationHrs ?? 1}h
                            </div>
                          </div>
                          <Badge variant="secondary">{t.priority}</Badge>
                        </li>
                      ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
