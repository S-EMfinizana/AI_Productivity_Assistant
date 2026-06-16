import { createFileRoute } from "@tanstack/react-router";
import { Download, Eye, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWorkspace, type ProjectType, type SavedProject } from "@/lib/workspace";

export const Route = createFileRoute("/_app/saved-projects")({
  head: () => ({ meta: [{ title: "Saved Projects · OmniWork AI" }] }),
  component: SavedProjects,
});

const typeLabel: Record<ProjectType, string> = {
  email: "Email",
  summary: "Summary",
  tasks: "Plan",
  research: "Research",
  chat: "Chat",
};

function SavedProjects() {
  const { projects, deleteProject } = useWorkspace();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ProjectType | "all">("all");
  const [sort, setSort] = useState<"new" | "old" | "title">("new");
  const [view, setView] = useState<SavedProject | null>(null);

  const filtered = useMemo(() => {
    let list = projects;
    if (type !== "all") list = list.filter((p) => p.type === type);
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(
        (p) => p.title.toLowerCase().includes(t) || p.content.toLowerCase().includes(t),
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      const cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sort === "new" ? cmp : -cmp;
    });
    return list;
  }, [projects, q, type, sort]);

  const exportProject = (p: SavedProject) => {
    const blob = new Blob([p.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.title.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Saved Projects</h1>
        <p className="text-sm text-muted-foreground">Everything you've generated, in one place.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Library</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_160px_160px]">
            <Input placeholder="Search title or content…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={type} onValueChange={(v) => setType(v as ProjectType | "all")}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {(Object.keys(typeLabel) as ProjectType[]).map((k) => (
                  <SelectItem key={k} value={k}>{typeLabel[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Newest first</SelectItem>
                <SelectItem value="old">Oldest first</SelectItem>
                <SelectItem value="title">Title A→Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Saved</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Nothing saved yet. Generate something and click Save.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-xs truncate font-medium">{p.title}</TableCell>
                      <TableCell><Badge variant="secondary">{typeLabel[p.type]}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(p.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" aria-label="View" onClick={() => setView(p)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Export" onClick={() => exportProject(p)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => { deleteProject(p.id); toast.success("Deleted."); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{view?.title}</DialogTitle></DialogHeader>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
            {view?.content}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
