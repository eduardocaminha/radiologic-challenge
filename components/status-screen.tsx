import type { ReactNode } from "react";
import { ViewportFrame } from "@/components/viewport-frame";

export function StatusScreen({ code, title, nonClinical, children }: { code: string; title: string; nonClinical?: string; children?: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <ViewportFrame
        topLeft="Radiologic Workstation"
        topRight={code}
        bottomRight={nonClinical}
        className="flex min-h-96 items-center justify-center overflow-hidden rounded-2xl border border-border px-6 py-16 sm:aspect-video sm:min-h-0"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-foreground/8" />
        <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-foreground/8" />
        <div className="relative flex flex-col items-center gap-6 bg-page-bg px-6 py-4 text-center">
          <h1 className="max-w-md text-title-lg text-balance">{title}</h1>
          {children}
        </div>
      </ViewportFrame>
    </main>
  );
}
