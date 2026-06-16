import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  FolderOpen,
  Mail,
  NotebookText,
  Search,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · OmniWork AI" },
      { name: "description", content: "Your AI-powered productivity command center." },
    ],
  }),
  component: Dashboard,
});

const quickActions = [
  { to: "/email-generator", label: "Draft an email", icon: Mail, hint: "Compose a polished message" },
  { to: "/meeting-summarizer", label: "Summarize meeting", icon: NotebookText, hint: "Turn notes into actions" },
  { to: "/task-planner", label: "Plan your day", icon: CalendarClock, hint: "Prioritize and schedule" },
  { to: "/research-assistant", label: "Run research", icon: Search, hint: "Structured insights & sources" },
  { to: "/chatbot", label: "Ask the assistant", icon: Bot, hint: "Workplace chat copilot" },
  { to: "/saved-projects", label: "Saved projects", icon: FolderOpen, hint: "Revisit past work" },
] as const;

function Dashboard() {
  const { projects, tasks } = useWorkspace();
  const completed = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;
  const completion = totalTasks ? Math.round((completed / totalTasks) * 100) : 0;
  const productivity = Math.min(100, 55 + projects.length * 4 + completed * 3);

  const recent = [
    ...projects.slice(0, 4).map((p) => ({
      id: p.id,
      title: p.title,
      kind: p.type,
      at: p.createdAt,
    })),
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{greeting}, welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Here's a snapshot of your workspace activity and quick ways to keep moving.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Productivity Score
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">{productivity}</div>
            <Progress value={productivity} />
            <p className="text-xs text-muted-foreground">
              Based on saved work and completed tasks this week.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasks Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">
              {completed}
              <span className="text-lg text-muted-foreground"> / {totalTasks || 0}</span>
            </div>
            <Progress value={completion} />
            <p className="text-xs text-muted-foreground">{completion}% of your queue done.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saved Projects
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold">{projects.length}</div>
            <Progress value={Math.min(100, projects.length * 8)} />
            <p className="text-xs text-muted-foreground">Emails, summaries, plans & research.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <a.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{a.label}</div>
                <div className="truncate text-xs text-muted-foreground">{a.hint}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Recent activity</h2>
        <Card>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">
                Nothing yet — generate or save something to see it here.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.at).toLocaleString()}
                      </div>
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs capitalize text-secondary-foreground">
                      {r.kind}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Tip</CardTitle>
          <CardDescription>
            Use the sidebar to jump between tools. Anything you save lands in Saved Projects for
            quick recall.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
