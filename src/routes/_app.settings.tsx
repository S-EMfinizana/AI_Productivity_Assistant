import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useVoices } from "@/lib/tts";
import { useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings · OmniWork AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme, tts, setTTS, chats, clearChats } = useWorkspace();
  const voices = useVoices();
  const totalMessages = chats.reduce((sum, c) => sum + c.messages.length, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Customize your workspace and accessibility.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose your preferred theme. Saved to this browser.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">☀️ Light</SelectItem>
                <SelectItem value="dark">🌙 Dark</SelectItem>
                <SelectItem value="system">🖥️ System default</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Speech & Accessibility</CardTitle>
          <CardDescription>Configure the built-in text-to-speech toolbar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Voice</Label>
              <Select
                value={tts.voiceURI ?? "default"}
                onValueChange={(v) => setTTS({ voiceURI: v === "default" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">System default</SelectItem>
                  {voices.map((v) => (
                    <SelectItem key={v.voiceURI} value={v.voiceURI}>
                      {v.name} · {v.lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label className="text-sm">Auto-read responses</Label>
                <p className="text-xs text-muted-foreground">Speak AI replies automatically.</p>
              </div>
              <Switch checked={tts.autoRead} onCheckedChange={(v) => setTTS({ autoRead: v })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rate · {tts.rate.toFixed(1)}x</Label>
              <Slider min={0.5} max={2} step={0.1} value={[tts.rate]} onValueChange={(v) => setTTS({ rate: v[0] })} />
            </div>
            <div className="space-y-1.5">
              <Label>Pitch · {tts.pitch.toFixed(1)}</Label>
              <Slider min={0} max={2} step={0.1} value={[tts.pitch]} onValueChange={(v) => setTTS({ pitch: v[0] })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete your workplace chat history from this browser. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {chats.length} conversation{chats.length === 1 ? "" : "s"} · {totalMessages} message{totalMessages === 1 ? "" : "s"}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={chats.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete chat history
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  User data will be irrecoverable. All workplace chatbot conversations and messages stored in this browser will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    clearChats();
                    toast.success("Chat history deleted.");
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Responsible AI</CardTitle>
          <CardDescription>
            OmniWork AI generations are illustrative. Always review for accuracy, avoid pasting
            confidential data, and disclose AI assistance when required.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
