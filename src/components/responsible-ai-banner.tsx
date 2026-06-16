import { AlertTriangle } from "lucide-react";

export function ResponsibleAIBanner() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 text-xs text-muted-foreground sm:items-center">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 sm:mt-0" />
        <p>
          AI-generated content may contain inaccuracies. Please verify important information before
          business use.
        </p>
      </div>
    </footer>
  );
}
