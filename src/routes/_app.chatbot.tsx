import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, RefreshCw, Send, Sparkles, Square, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AIInfoTooltip } from "@/components/ai-info-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { speak } from "@/lib/tts";
import { useWorkspace, type ChatConversation as Conversation, type ChatMessage as Message } from "@/lib/workspace";

export const Route = createFileRoute("/_app/chatbot")({
  head: () => ({ meta: [{ title: "Workplace Chatbot · OmniWork AI" }] }),
  component: Chatbot,
});

function Chatbot() {
  const { tts, chats: convos, setChats: setConvos, tasks, projects } = useWorkspace();
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (convos.length === 0) {
      const c: Conversation = { id: crypto.randomUUID(), title: "New chat", messages: [] };
      setConvos(() => [c]);
      setActiveId(c.id);
    } else if (!convos.find((c) => c.id === activeId)) {
      setActiveId(convos[0].id);
    }
  }, [convos, activeId, setConvos]);

  const active = convos.find((c) => c.id === activeId) ?? convos[0];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length, streaming]);

  const updateActive = (patch: (c: Conversation) => Conversation) =>
    setConvos((prev) => prev.map((c) => (c.id === activeId ? patch(c) : c)));

  const updateMessage = (msgId: string, patch: (m: Message) => Message) =>
    setConvos((prev) =>
      prev.map((c) =>
        c.id === activeId ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? patch(m) : m)) } : c,
      ),
    );

  const buildContext = () => {
    const openTasks = tasks
      .filter((t) => t.status !== "done")
      .slice(0, 5)
      .map((t) => `${t.title} (${t.priority})`);
    return {
      now: new Date().toLocaleString(),
      taskCount: tasks.length,
      activeTasks: openTasks,
      recentProjects: projects.slice(0, 5).map((p) => `${p.title} [${p.type}]`),
    };
  };

  const streamReply = async (history: Message[], replaceId?: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);

    const assistantId = replaceId ?? crypto.randomUUID();
    if (!replaceId) {
      const placeholder: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        at: new Date().toISOString(),
      };
      updateActive((c) => ({ ...c, messages: [...c.messages, placeholder] }));
    } else {
      updateMessage(assistantId, (m) => ({ ...m, content: "", at: new Date().toISOString() }));
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          context: buildContext(),
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        if (res.status === 429) toast.error("Rate limit reached. Please retry in a moment.");
        else if (res.status === 402) toast.error("AI credits exhausted. Add credits to continue.");
        else toast.error(text || "AI request failed.");
        updateMessage(assistantId, (m) => ({ ...m, content: "_Sorry, I couldn't respond just now._" }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        updateMessage(assistantId, (m) => ({ ...m, content: acc }));
      }
      if (tts.autoRead && acc) speak(acc, tts);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Connection error. Please try again.");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content) return toast.error("Type a message first.");
    if (streaming) return;
    const user: Message = { id: crypto.randomUUID(), role: "user", content, at: new Date().toISOString() };
    const nextMessages = [...(active?.messages ?? []), user];
    updateActive((c) => ({
      ...c,
      title: c.messages.length ? c.title : content.slice(0, 32),
      messages: nextMessages,
    }));
    setInput("");
    await streamReply(nextMessages);
  };

  const regenerate = async (msgId: string) => {
    if (streaming || !active) return;
    const idx = active.messages.findIndex((m) => m.id === msgId);
    if (idx <= 0) return;
    const history = active.messages.slice(0, idx);
    await streamReply(history, msgId);
  };

  const stop = () => abortRef.current?.abort();

  const newChat = () => {
    const c: Conversation = { id: crypto.randomUUID(), title: "New chat", messages: [] };
    setConvos((p) => [c, ...p]);
    setActiveId(c.id);
  };

  const suggestions = useMemo(() => {
    const out: string[] = [];
    const openTasks = tasks.filter((t) => t.status !== "done");
    if (openTasks.length > 0) {
      out.push(`Prioritize my ${openTasks.length} open task${openTasks.length === 1 ? "" : "s"} for today`);
      const first = openTasks[0];
      if (first) out.push(`Break "${first.title}" into smaller steps`);
    } else {
      out.push("Plan three focus blocks for tomorrow");
    }
    if (projects.some((p) => p.type === "email")) {
      out.push("Suggest a follow-up to my last email draft");
    } else {
      out.push("Draft a polite client follow-up email");
    }
    if (projects.some((p) => p.type === "summary")) {
      out.push("Pull action items from my latest meeting summary");
    } else {
      out.push("Summarize key trends in remote work for 2026");
    }
    return out.slice(0, 4);
  }, [tasks, projects]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workplace Chatbot</h1>
          <p className="text-sm text-muted-foreground">
            Your always-on AI copilot — aware of your tasks, projects, and recent work.
          </p>
        </div>
        <AIInfoTooltip />
      </header>

      <div className="grid h-[70vh] gap-4 md:grid-cols-[260px_1fr]">
        <Card className="hidden md:block">
          <CardContent className="flex h-full flex-col gap-2 p-3">
            <Button onClick={newChat} variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> New chat
            </Button>
            <div className="mt-2 flex-1 space-y-1 overflow-auto">
              {convos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`block w-full truncate rounded-md px-2 py-2 text-left text-sm transition-colors ${
                    c.id === activeId ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  }`}
                >
                  {c.title || "New chat"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardContent className="flex h-full flex-col gap-3 p-3">
            <div className="flex-1 space-y-3 overflow-auto rounded-md bg-muted/20 p-3">
              {active?.messages.length === 0 && !streaming && (
                <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">
                  <div className="space-y-2">
                    <Sparkles className="mx-auto h-6 w-6 text-primary" />
                    <p>Start a conversation. I have context on your tasks and saved projects.</p>
                  </div>
                </div>
              )}
              {active?.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border border-border"
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {m.content || (m.role === "assistant" && streaming ? "…" : "")}
                    </div>
                    <div className={`mt-1 text-[10px] ${m.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {m.role === "assistant" && m.content && (
                      <div className="mt-1 flex gap-1">
                        <IconBtn label="Copy" onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied."); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn label="Regenerate" onClick={() => regenerate(m.id)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </IconBtn>
                        <IconBtn label="Listen" onClick={() => speak(m.content, tts)}>
                          <Volume2 className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {active?.messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={streaming}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); void send(input); }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything…"
                aria-label="Chat message"
                disabled={streaming}
              />
              {streaming ? (
                <Button type="button" variant="outline" onClick={stop} aria-label="Stop">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}
