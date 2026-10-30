"use client";

import { useState, type ReactNode } from "react";
import { CtCanvas } from "@/components/ct-canvas";
import { ViewportFrame } from "@/components/viewport-frame";
import { cn } from "@/lib/utils";
import { CT_WINDOW_LEVEL_REST, ctWindowLevelFromPointer } from "@/lib/window-level";

const STUDIES = {
  chest: { source: "/ct/lidc-idri-0957.bin", credit: "LIDC-IDRI, CC BY 3.0" },
  abdomen: { source: "/ct/stageii-colorectal-ct-091.bin", credit: "StageII-Colorectal-CT, CC BY 4.0" },
};

// Moldura de viewer com um corte de tomografia do kit. `canvasClassName` define em que parte do quadro a imagem fica.
export function CtViewport({ study, title, month, className, canvasClassName, children }: { study: keyof typeof STUDIES; title: string; month: string; className?: string; canvasClassName: string; children: ReactNode }) {
  const { source, credit } = STUDIES[study];
  const [windowLevel, setWindowLevel] = useState(CT_WINDOW_LEVEL_REST);
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
