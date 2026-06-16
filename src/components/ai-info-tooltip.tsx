import { Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AIInfoTooltip() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Ethical AI use guidelines"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
          <p className="font-semibold mb-1">Responsible AI use</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Review every generation for accuracy before sharing externally.</li>
            <li>Do not paste confidential or personal data into prompts.</li>
            <li>Disclose AI assistance when required by policy or law.</li>
            <li>You are accountable for the final published content.</li>
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
