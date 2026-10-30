"use client";

import { useEffect, useRef, useState } from "react";

const REST = { window: 2000, level: 0 };

function alphaFor(window: number, level: number) {
  const narrow = 1 - (window - 400) / 1600;
  return Math.min(0.35, Math.max(0.04, 0.05 + narrow * 0.25 + (level / 200) * 0.05));
}

// O wordmark é a imagem do viewport: arrastar o ponteiro muda janela e nível, como em
// qualquer viewer, e o texto do canto mostra os valores aplicados.
export function FooterWordmark({ siteName, month, nonClinical }: { siteName: string; month: string; nonClinical: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState(REST);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setSeen(true);
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    setValues({ window: Math.round(2000 - x * 1600), level: Math.round(200 - y * 400) });
  }

  return (
    <div ref={frame} onPointerMove={onPointerMove} onPointerLeave={() => setValues(REST)} className="flex flex-col gap-3">
      <div className="flex justify-between gap-4 text-xs tabular-nums text-muted-foreground">
        <p className="flex gap-4">
          <span>{siteName}</span>
          <span className="hidden sm:inline">W {values.window} L {values.level}</span>
        </p>
        <p className="flex gap-4">
          <span>{nonClinical}</span>
          <span>{month}</span>
        </p>
      </div>
      <div className="@container relative aspect-wordmark-full overflow-clip sm:aspect-wordmark">
        <span
          aria-hidden="true"
          data-seen={seen || undefined}
          style={{ "--wordmark-alpha": alphaFor(values.window, values.level) } as React.CSSProperties}
          className="footer-wordmark absolute left-0 top-0 block select-none whitespace-nowrap"
        >
          Radiologic
        </span>
      </div>
    </div>
  );
}
