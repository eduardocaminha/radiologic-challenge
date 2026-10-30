import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Moldura de viewer: texto nos quatro cantos, como o overlay de um PACS. Os cantos
// só mostram dado verdadeiro, nunca metadado inventado.
export function ViewportFrame({ topLeft, topRight, bottomLeft, bottomRight, flush = false, className, children }: { topLeft?: ReactNode; topRight?: ReactNode; bottomLeft?: ReactNode; bottomRight?: ReactNode; flush?: boolean; className?: string; children: ReactNode }) {
  const corner = "pointer-events-none absolute z-10 text-xs tabular-nums text-muted-foreground";
  const left = flush ? "left-0 bg-page-bg pe-2" : "left-3";
  const right = flush ? "right-0 bg-page-bg ps-2" : "right-3";
  return (
    <div className={cn("relative", className)}>
      {children}
      {topLeft ? <span className={cn(corner, left, "top-3")}>{topLeft}</span> : null}
      {topRight ? <span className={cn(corner, right, "top-3")}>{topRight}</span> : null}
      {bottomLeft ? <span className={cn(corner, left, "bottom-3")}>{bottomLeft}</span> : null}
      {bottomRight ? <span className={cn(corner, right, "bottom-3")}>{bottomRight}</span> : null}
    </div>
  );
}
