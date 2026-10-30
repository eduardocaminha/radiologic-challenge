"use client";

import { useEffect, useRef, useState } from "react";
import { ViewportFrame } from "@/components/viewport-frame";

const WORD = "Radiologic";
const RAMP = " .:-=+*#%@";
const REST = { window: 2000, level: 0 };
const REVEAL_MS = 800;

interface Cell {
  x: number;
  y: number;
  row: number;
  value: number;
}

// Rasteriza a palavra em cinza e reduz a uma matriz de células, como uma imagem de baixa resolução.
function buildCells(width: number, height: number) {
  const mobile = width < 500;
  const cellWidth = mobile ? 5 : 6;
  const cellHeight = cellWidth * 1.6;
  const fontSize = width / 4.22;
  const mask = document.createElement("canvas");
  mask.width = Math.ceil(width);
  mask.height = Math.ceil(height);
  const context = mask.getContext("2d", { willReadFrequently: true });
  if (!context) return { cells: [] as Cell[], cellHeight };
  context.font = `600 ${fontSize}px Inter, sans-serif`;
  context.letterSpacing = `${-0.04 * fontSize}px`;
  context.fillStyle = "#fff";
  context.textBaseline = "alphabetic";
  context.fillText(WORD, -0.07 * fontSize, mobile ? height - 0.24 * fontSize : 0.78 * fontSize);
  const { data } = context.getImageData(0, 0, mask.width, mask.height);

  const cells: Cell[] = [];
  for (let row = 0; row * cellHeight < height; row += 1) {
    for (let column = 0; column * cellWidth < width; column += 1) {
      const x = Math.floor(column * cellWidth);
      const y = Math.floor(row * cellHeight);
      let total = 0;
      let samples = 0;
      for (let sy = y; sy < Math.min(y + cellHeight, mask.height); sy += 2) {
        for (let sx = x; sx < Math.min(x + cellWidth, mask.width); sx += 2) {
          total += data[(sy * mask.width + sx) * 4 + 3] ?? 0;
          samples += 1;
        }
      }
      const coverage = samples ? total / samples / 255 : 0;
      if (coverage < 0.08) continue;
      const shade = 0.6 + 0.4 * (1 - y / height);
      const grain = 0.92 + (((column * 7 + row * 13) % 11) / 11) * 0.16;
      cells.push({ x, y, row, value: Math.min(1, coverage * shade * grain) });
    }
  }
  return { cells, cellHeight };
}

function paint(canvas: HTMLCanvasElement, cells: Cell[], cellHeight: number, windowWidth: number, level: number, reveal: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ratio = window.devicePixelRatio || 1;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  context.font = `500 ${cellHeight}px ui-monospace, Menlo, monospace`;
  context.textBaseline = "top";

  const span = windowWidth / 2000;
  const center = 0.5 - level / 400;
  const narrowing = 1 - (windowWidth - 400) / 1600;
  const lastRow = Math.ceil(reveal * (canvas.clientHeight / cellHeight));
  const restAlpha = canvas.clientWidth < 500 ? 0.34 : 0.18;
  const buckets = new Map<number, Cell[]>();
  for (const cell of cells) {
    if (cell.row > lastRow) continue;
    const output = Math.max(0, Math.min(1, (cell.value - (center - span / 2)) / span));
    const index = Math.round(output * (RAMP.length - 1));
    if (index === 0) continue;
    const bucket = buckets.get(index);
    if (bucket) bucket.push(cell);
    else buckets.set(index, [cell]);
  }
  for (const [index, bucket] of buckets) {
    const alpha = (index / (RAMP.length - 1)) * (restAlpha + narrowing * 0.5);
    context.fillStyle = `oklch(1 0 0 / ${alpha})`;
    const glyph = RAMP[index] ?? " ";
    for (const cell of bucket) context.fillText(glyph, cell.x, cell.y);
  }
}

// O wordmark é a imagem do viewport: arrastar o ponteiro muda janela e nível, como em
// qualquer viewer, a rampa de caracteres responde, e o canto mostra os valores aplicados.
export function FooterWordmark({ copyright, month, nonClinical }: { copyright: string; month: string; nonClinical: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef({ ...REST });
  const scene = useRef({ cells: [] as Cell[], cellHeight: 10, current: { ...REST }, reveal: 0, startedAt: 0, frame: 0 });
  const wake = useRef<() => void>(() => undefined);
  const [values, setValues] = useState(REST);

  useEffect(() => {
    const element = canvas.current;
    const container = frame.current;
    if (!element || !container) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const state = scene.current;

    function tick(now: number) {
      if (!element) return;
      const { current } = state;
      current.window += (target.current.window - current.window) * 0.2;
      current.level += (target.current.level - current.level) * 0.2;
      state.reveal = state.startedAt ? Math.min(1, (now - state.startedAt) / REVEAL_MS) : 0;
      paint(element, state.cells, state.cellHeight, current.window, current.level, state.reveal);
      const settled = Math.abs(target.current.window - current.window) < 2 && Math.abs(target.current.level - current.level) < 2;
      state.frame = settled && state.reveal >= 1 ? 0 : requestAnimationFrame(tick);
    }

    function schedule() {
      if (!state.frame) state.frame = requestAnimationFrame(tick);
    }

    function layout() {
      if (!element) return;
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = window.devicePixelRatio || 1;
      element.width = width * ratio;
      element.height = height * ratio;
      Object.assign(state, buildCells(width, height));
      schedule();
    }

    const resize = new ResizeObserver(layout);
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      state.startedAt = reduced.matches ? 1 : performance.now();
      if (reduced.matches) state.reveal = 1;
      seen.disconnect();
      schedule();
    }, { threshold: 0.2 });

    void document.fonts.load("600 100px Inter").then(() => {
      resize.observe(element);
      seen.observe(container);
    });
    wake.current = schedule;
    return () => {
      resize.disconnect();
      seen.disconnect();
      cancelAnimationFrame(state.frame);
    };
  }, []);

  function moveTo(next: typeof REST) {
    target.current = next;
    setValues(next);
    wake.current();
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    moveTo({ window: Math.round(2000 - x * 1600), level: Math.round(200 - y * 400) });
  }

  return (
    <div ref={frame} onPointerMove={onPointerMove} onPointerLeave={() => moveTo(REST)}>
      <ViewportFrame
        flush
        topLeft={copyright}
        topRight={month}
        bottomLeft={<span className="hidden sm:inline">W {values.window} L {values.level}</span>}
        bottomRight={<span className="hidden sm:inline">{nonClinical}</span>}
        className="aspect-wordmark-full overflow-clip sm:aspect-wordmark"
      >
        <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 size-full" />
      </ViewportFrame>
    </div>
  );
}
