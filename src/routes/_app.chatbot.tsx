import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, RefreshCw, Send, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AIInfoTooltip } from "@/components/ai-info-tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { chatReply, delay } from "@/lib/mock-ai";
import { speak } from "@/lib/tts";
import { useWorkspace, type ChatConversation as Conversation, type ChatMessage as Message } from "@/lib/workspace";

export const Route = createFileRoute("/_app/chatbot")({
  head: () => ({ meta: [{ title: "Workplace Chatbot · OmniWork AI" }] }),
  component: Chatbot,
});

const quickPrompts = [
  "Draft client follow-up",
  "Summarize my notes",
  "Plan tomorrow's tasks",
  "Brainstorm research angles",
];

function Chatbot() {
  const { tts, chats: convos, setChats: setConvos } = useWorkspace();
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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
  }, [active?.messages.length, typing]);

  const updateActive = (patch: (c: Conversation) => Conversation) =>
    setConvos((prev) => prev.map((c) => (c.id === activeId ? patch(c) : c)));

  const send = async (text: string) => {
    const content = text.trim();
    if (!content) return toast.error("Type a message first.");
    const user: Message = { id: crypto.randomUUID(), role: "user", content, at: new Date().toISOString() };
    updateActive((c) => ({
      ...c,
      title: c.messages.length ? c.title : content.slice(0, 32),
      messages: [...c.messages, user],
    }));
    setInput("");
    setTyping(true);
    await delay(700);
    const reply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: chatReply(content),
      at: new Date().toISOString(),
    };
    updateActive((c) => ({ ...c, messages: [...c.messages, reply] }));
    setTyping(false);
    if (tts.autoRead) speak(reply.content, tts);
  };

  const regenerate = async (msgId: string) => {
    const idx = active.messages.findIndex((m) => m.id === msgId);
    if (idx <= 0) return;
    const prevUser = [...active.messages].slice(0, idx).reverse().find((m) => m.role === "user");
    if (!prevUser) return;
    setTyping(true);
    await delay(600);
    updateActive((c) => ({
      ...c,
      messages: c.messages.map((m) =>
        m.id === msgId ? { ...m, content: chatReply(prevUser.content + " (rewrite)"), at: new Date().toISOString() } : m,
      ),
    }));
    setTyping(false);
  };

  const newChat = () => {
    const c: Conversation = { id: crypto.randomUUID(), title: "New chat", messages: [] };
    setConvos((p) => [c, ...p]);
    setActiveId(c.id);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workplace Chatbot</h1>
          <p className="text-sm text-muted-foreground">Your always-on AI copilot for everyday work.</p>
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
              {active?.messages.length === 0 && !typing && (
                <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                  Start a conversation with your assistant.
                </div>
              )}
              {active?.messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border border-border"
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    <div className={`mt-1 text-[10px] ${m.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    {m.role === "assistant" && (
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
              {typing && (
                <div className="flex justify-start">
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                    <span className="inline-flex gap-1">
                      <Dot /><Dot delay={150} /><Dot delay={300} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {q}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); void send(input); }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything…"
                aria-label="Chat message"
              />
              <Button type="submit" disabled={typing}>
                <Send className="h-4 w-4" />
              </Button>
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

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
