"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type { Dictionary } from "@/dictionaries";
import { copyText } from "@/lib/clipboard";

// Instrução pronta para colar no agente de código. O agente prepara o rascunho, e a pessoa envia pelo site.
export function AgentSubmit({ copy, ...button }: { copy: Dictionary["home"]["agent"] } & Pick<ComponentProps<typeof Button>, "variant" | "size" | "className">) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await copyText(copy.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button type="button" {...button} />}>{copy.label}</PopoverTrigger>
      <PopoverPopup align="start" sideOffset={8} className="w-sm max-w-(--available-width)">
        <div className="flex flex-col gap-3">
          <PopoverTitle className="text-title-sm">{copy.title}</PopoverTitle>
          <p className="font-mono text-sm wrap-anywhere text-muted-foreground">{copy.prompt}</p>
          <Button type="button" size="sm" className="w-fit" onClick={() => void copyPrompt()}>
            {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
            {copied ? copy.copied : copy.copy}
          </Button>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
