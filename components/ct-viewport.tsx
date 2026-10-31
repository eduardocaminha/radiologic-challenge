"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CtCanvas } from "@/components/ct-canvas";
import { ViewportFrame } from "@/components/viewport-frame";
import { cn } from "@/lib/utils";
import { CT_WINDOW_LEVEL_REST, ctWindowLevelAt, ctWindowLevelFromPointer } from "@/lib/window-level";

const STUDIES = {
  chest: { source: "/ct/lidc-idri-0957.bin", credit: "LIDC-IDRI, CC BY 3.0" },
  abdomen: { source: "/ct/stageii-colorectal-ct-091.bin", credit: "StageII-Colorectal-CT, CC BY 4.0" },
};

// Moldura de viewer com um corte de tomografia do kit. `canvasClassName` define em que parte do quadro a imagem fica.
export function CtViewport({ study, title, month, sweepOnPhone = false, className, canvasClassName, children }: { study: keyof typeof STUDIES; title: string; month: string; sweepOnPhone?: boolean; className?: string; canvasClassName: string; children: ReactNode }) {
  const { source, credit } = STUDIES[study];
  const [windowLevel, setWindowLevel] = useState(CT_WINDOW_LEVEL_REST);

  // No celular não há mouse para mexer na janela, então ela anda sozinha. Abaixo do breakpoint `sm`.
  useEffect(() => {
    if (!sweepOnPhone) return;
    const phone = window.matchMedia("(max-width: 39.98rem)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      if (!phone.matches || reduced.matches || document.hidden) return;
      setWindowLevel(ctWindowLevelAt((performance.now() - startedAt) / 1000));
    }, 100);
    return () => window.clearInterval(timer);
  }, [sweepOnPhone]);

  return (
    <div
      className="size-full"
      onPointerMove={(event) => {
        const next = ctWindowLevelFromPointer(event);
        if (next) setWindowLevel(next);
      }}
    >
      <ViewportFrame
        topLeft={title}
        topRight={month}
        bottomLeft={<span className="hidden sm:inline">W {windowLevel.window} L {windowLevel.level}</span>}
        bottomRight={credit}
        className={cn("overflow-hidden rounded-2xl border border-border", className)}
      >
        {children}
        <div className={canvasClassName}>
          <CtCanvas source={source} windowLevel={windowLevel} />
        </div>
      </ViewportFrame>
    </div>
  );
}
