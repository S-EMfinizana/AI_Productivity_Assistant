import { Pause, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useWorkspace } from "@/lib/workspace";
import { pauseSpeech, resumeSpeech, speak, stopSpeech } from "@/lib/tts";

export function SpeechToolbar({ text }: { text: string }) {
  const { tts, setTTS } = useWorkspace();
  const [status, setStatus] = useState<"idle" | "playing" | "paused">("idle");
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => stopSpeech(), []);

  const onPlay = () => {
    if (status === "paused") {
      resumeSpeech();
      setStatus("playing");
      return;
    }
    const u = speak(text, { rate: tts.rate, pitch: tts.pitch, voiceURI: tts.voiceURI });
    if (!u) return;
    utterRef.current = u;
    u.onend = () => setStatus("idle");
    setStatus("playing");
  };

  const onPause = () => {
    pauseSpeech();
    setStatus("paused");
  };
  const onStop = () => {
    stopSpeech();
    setStatus("idle");
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/40 p-2">
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          aria-label={status === "paused" ? "Resume speech" : "Play speech"}
          onClick={onPlay}
          disabled={status === "playing"}
        >
          <Play className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Pause speech"
          onClick={onPause}
          disabled={status !== "playing"}
        >
          <Pause className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Stop speech"
          onClick={onStop}
          disabled={status === "idle"}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex min-w-[140px] flex-1 items-center gap-2">
        <Label className="text-xs text-muted-foreground">Rate {tts.rate.toFixed(1)}x</Label>
        <Slider
          min={0.5}
          max={2}
          step={0.1}
          value={[tts.rate]}
          onValueChange={(v) => setTTS({ rate: v[0] })}
          aria-label="Speech rate"
        />
      </div>
      <div className="flex min-w-[140px] flex-1 items-center gap-2">
        <Label className="text-xs text-muted-foreground">Pitch {tts.pitch.toFixed(1)}</Label>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={[tts.pitch]}
          onValueChange={(v) => setTTS({ pitch: v[0] })}
          aria-label="Speech pitch"
        />
      </div>
    </div>
  );
}
