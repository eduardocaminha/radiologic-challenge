"use client";

import { motion } from "motion/react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";

// Abas em texto: inativa em muted, ativa em foreground com sublinhado na largura da palavra.
// Todo seletor de visão do site usa este componente.
export function LineTabs<T extends string>({ id, label, options, value, onChange, className }: { id: string; label: string; options: [T, string][]; value: T; onChange: (value: T) => void; className?: string }) {
  return (
    <ToggleGroup aria-label={label} value={[value]} onValueChange={(next) => next[0] && onChange(next[0] as T)} className={cn("gap-6", className)}>
      {options.map(([option, text]) => (
        <ToggleGroupItem key={option} value={option} className="relative h-auto min-w-0 rounded-none border-0 px-0 pb-3 pt-1 text-label-lg text-muted-foreground sm:text-label-lg transition-colors hover:bg-transparent hover:text-foreground data-pressed:bg-transparent data-pressed:text-foreground sm:h-auto sm:min-w-0">
          {text}
          {option === value ? <motion.span layoutId={`${id}-underline`} transition={spring.moderate} className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" /> : null}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
