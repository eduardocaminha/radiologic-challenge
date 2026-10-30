"use client";

import { useEffect, useRef } from "react";
import { ASCII_RAMP, type WindowLevel } from "@/lib/window-level";

const SOURCE = "/ct/lidc-idri-0957.bin";
const GRID = 160;
const REVEAL_MS = 800;
const WIDE_FROM = 640;
// A grade grava -1024 fora do corpo; só a borda chega perto disso por causa da redução.
const OUTSIDE_BODY = -1000;

function draw(canvas: HTMLCanvasElement, pixels: Int16Array, { window: width, level }: WindowLevel, reveal: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const ratio = globalThis.devicePixelRatio || 1;
  const { clientWidth, clientHeight } = canvas;
  const cellWidth = clientWidth < 500 ? 5 : 6;
  const cellHeight = cellWidth * 1.6;
  const side = Math.min(clientWidth, clientHeight);
  const columns = Math.floor(side / cellWidth);
  const rows = Math.floor(side / cellHeight);
  const wide = clientWidth >= WIDE_FROM;
  const left = wide ? clientWidth - columns * cellWidth : (clientWidth - columns * cellWidth) / 2;
  const top = wide ? (clientHeight - rows * cellHeight) / 2 : 0;
  const low = level - width / 2;
  const lastRow = Math.ceil(reveal * rows);
  const buckets = new Map<number, [number, number][]>();

  for (let row = 0; row < rows && row <= lastRow; row += 1) {
    const sourceRow = Math.floor(((row + 0.5) / rows) * GRID);
    for (let column = 0; column < columns; column += 1) {
      const sourceColumn = Math.floor(((column + 0.5) / columns) * GRID);
      const value = pixels[sourceRow * GRID + sourceColumn] ?? OUTSIDE_BODY;
      if (value <= OUTSIDE_BODY) continue;
      const output = Math.min(1, Math.max(0, (value - low) / width));
      const index = Math.round(output * (ASCII_RAMP.length - 1));
      if (index === 0) continue;
      const bucket = buckets.get(index);
      const cell: [number, number] = [left + column * cellWidth, top + row * cellHeight];
      if (bucket) bucket.push(cell);
      else buckets.set(index, [cell]);
    }
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, clientWidth, clientHeight);
  context.font = `500 ${cellHeight}px ui-monospace, Menlo, monospace`;
  context.textBaseline = "top";
  for (const [index, bucket] of buckets) {
    context.fillStyle = `oklch(1 0 0 / ${0.08 + (index / (ASCII_RAMP.length - 1)) * 0.5})`;
    const glyph = ASCII_RAMP[index] ?? " ";
    for (const [x, y] of bucket) context.fillText(glyph, x, y);
  }
}

// Corte de tomografia desenhado em caracteres: os valores são Hounsfield reais, então janela e nível fazem o que fazem num viewer.
export function CtCanvas({ windowLevel }: { windowLevel: WindowLevel }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef(windowLevel);
  const wake = useRef<() => void>(() => undefined);

  useEffect(() => {
    target.current = windowLevel;
    wake.current();
  }, [windowLevel]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const current = { ...target.current };
    let pixels: Int16Array | null = null;
    let startedAt = 0;
    let frame = 0;
    let alive = true;

    function tick(now: number) {
      frame = 0;
      if (!element || !pixels) return;
      current.window += (target.current.window - current.window) * 0.2;
      current.level += (target.current.level - current.level) * 0.2;
      const reveal = reduced.matches ? 1 : Math.min(1, (now - startedAt) / REVEAL_MS);
      draw(element, pixels, current, reveal);
      const settled = Math.abs(target.current.window - current.window) < 2 && Math.abs(target.current.level - current.level) < 2;
      if (!settled || reveal < 1) frame = requestAnimationFrame(tick);
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(tick);
    }

    const resize = new ResizeObserver(() => {
      if (!element) return;
      const ratio = window.devicePixelRatio || 1;
      element.width = element.clientWidth * ratio;
      element.height = element.clientHeight * ratio;
      schedule();
    });
    resize.observe(element);
    wake.current = schedule;

    void fetch(SOURCE).then((response) => response.arrayBuffer()).then((buffer) => {
      if (!alive) return;
      pixels = new Int16Array(buffer);
      startedAt = performance.now();
      schedule();
    });

    return () => {
      alive = false;
      resize.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 size-full" />;
}
