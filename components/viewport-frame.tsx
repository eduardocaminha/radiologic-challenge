import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Moldura de viewer: texto nos quatro cantos, como o overlay de um PACS. Os cantos
// só mostram dado verdadeiro, nunca metadado inventado.
export function ViewportFrame({ topLeft, topRight, bottomLeft, bottomRight, className, children }: { topLeft?: ReactNode; topRight?: ReactNode; bottomLeft?: ReactNode; bottomRight?: ReactNode; className?: string; children: ReactNode }) {
  const corner = "pointer-events-none absolute z-10 text-xs tabular-nums text-muted-foreground";
  return (
    <div className={cn("relative", className)}>
      {children}
      {topLeft ? <span className={cn(corner, "left-3 top-3")}>{topLeft}</span> : null}
      {topRight ? <span className={cn(corner, "right-3 top-3")}>{topRight}</span> : null}
      {bottomLeft ? <span className={cn(corner, "bottom-3 left-3")}>{bottomLeft}</span> : null}
      {bottomRight ? <span className={cn(corner, "bottom-3 right-3")}>{bottomRight}</span> : null}
    </div>
  );
}
