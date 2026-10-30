"use client";

import { useEffect, useRef, useState } from "react";
import { ViewportFrame } from "@/components/viewport-frame";

const REST = { window: 2000, level: 0 };

function alphaFor(window: number, level: number) {
  const narrow = 1 - (window - 400) / 1600;
  return Math.min(0.35, Math.max(0.04, 0.05 + narrow * 0.25 + (level / 200) * 0.05));
}

// O wordmark é a imagem do viewport: arrastar o ponteiro muda janela e nível, como em
// qualquer viewer, e o texto do canto mostra os valores aplicados.
export function FooterWordmark({ copyright, month, nonClinical }: { copyright: string; month: string; nonClinical: string }) {
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
    <div ref={frame} onPointerMove={onPointerMove} onPointerLeave={() => setValues(REST)} className="@container">
      <ViewportFrame
        flush
        topLeft={copyright}
        topRight={month}
        bottomLeft={<span className="hidden sm:inline">W {values.window} L {values.level}</span>}
        bottomRight={<span className="hidden sm:inline">{nonClinical}</span>}
        className="aspect-wordmark-full overflow-clip sm:aspect-wordmark"
      >
        <span
          aria-hidden="true"
          data-seen={seen || undefined}
          style={{ "--wordmark-alpha": alphaFor(values.window, values.level) } as React.CSSProperties}
          className="footer-wordmark absolute bottom-0 left-0 block select-none whitespace-nowrap sm:bottom-auto sm:top-0"
        >
          Radiologic
        </span>
      </ViewportFrame>
    </div>
  );
}
