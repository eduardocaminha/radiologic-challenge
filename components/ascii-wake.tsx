"use client";

/* Adapted from "ASCII wake" by Bencho (bencho.dev/blocks/ascii-wake).

   MIT License

   Copyright (c) 2026 Lorenzo Cabra

   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in all
   copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   SOFTWARE. */

import { useEffect, useRef } from "react";

/* ══ ASCII wake ═══════════════════════════════════════════
   The wordmark drawn in ink dots, the dots shrinking toward
   its edge like a halftone. The pointer drags a wake through it:
   right under the hand the characters thicken to their densest
   and stay that way while the hand rests, and
   along the path it came from they thin back out, @ to # to + to
   a dot, as the wake cools. The glyphs lean toward the hand while
   it is near. Press and a ring goes out from the press.

   ── A GRID OF NUMBERS, THEN A RAMP ──────────────────────
   Every cell holds one number. The hand adds to it along the
   line it moved,
   so a fast stroke leaves no gaps; every frame the whole grid
   cools by the same fraction. The number picks a character off
   a ramp of glyphs, lightest to densest. That is the whole
   effect: the same field-then-palette idea as a heat map,
   with characters where the heat map has colours.

   ── THE SHIMMER ─────────────────────────────────────────
   A cell that is in the wake picks its glyph with a little
   noise, re-dealt every few frames, so the warm part of the wake
   flickers between neighbouring characters the way a terminal
   redraw does. The cold field never flickers. */

const WORD = "Radiologic";
const MEASURE_SIZE = 200;
const DISSOLVE_SHARE = 0.45;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* lightest to densest; the first is always a blank */
const RAMP = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];

/* the face is the system's own monospace, nothing downloaded */
const MONO = `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace`;

/* below this much heat a cell is the field: a dot */
const COLD = 0.04;
/* how long a press's ring takes to spread and fade, s */
const RING_S = 2.2;

/* ── the shape: the word ────────────────────────────────────
   Rasterises the word and returns how much of it sits under one
   cell, so the halftone is dense right to the outline. The word
   is cut at the bottom: the dots shrink away over the last
   stretch instead of ending in a straight line. */
function wordCoverage(width: number, height: number) {
  const mask = document.createElement("canvas");
  mask.width = Math.ceil(width);
  mask.height = Math.ceil(height);
  const context = mask.getContext("2d", { willReadFrequently: true });
  if (!context) return () => 0;
  context.fillStyle = "#fff";
  context.textBaseline = "alphabetic";
  // Mede a palavra no navegador em uso: nem todo canvas aplica letterSpacing, e a largura muda.
  const setFont = (size: number) => {
    context.font = `600 ${size}px Inter, sans-serif`;
    context.letterSpacing = `${-0.04 * size}px`;
  };
  setFont(MEASURE_SIZE);
  const measured = context.measureText(WORD);
  const fontSize = MEASURE_SIZE * width / (measured.actualBoundingBoxLeft + measured.actualBoundingBoxRight);
  setFont(fontSize);
  const left = measured.actualBoundingBoxLeft * fontSize / MEASURE_SIZE;
  context.fillText(WORD, left, 0.78 * fontSize);
  const { data } = context.getImageData(0, 0, mask.width, mask.height);

  return (x: number, y: number, cellWidth: number, cellHeight: number) => {
    let total = 0;
    let samples = 0;
    const startY = Math.max(0, Math.floor(y - cellHeight / 2));
    const startX = Math.max(0, Math.floor(x - cellWidth / 2));
    for (let sy = startY; sy < Math.min(startY + cellHeight, mask.height); sy += 2) {
      for (let sx = startX; sx < Math.min(startX + cellWidth, mask.width); sx += 2) {
        total += data[(sy * mask.width + sx) * 4 + 3] ?? 0;
        samples += 1;
      }
    }
    const coverage = samples ? total / samples / 255 : 0;
    if (coverage < 0.08) return 0;
    const dissolve = Math.min(1, (height - y) / (height * DISSOLVE_SHARE));
    return Math.min(1, coverage * dissolve);
  };
}

export function AsciiWake({
  /* how wide the wake is, 0..100 */
  reach = 50,
  /* seconds for the wake to cool */
  trail = 1.2,
  /* how far the glyphs lean toward the hand, 0..100 */
  pull = 40,
}: {
  reach?: number;
  trail?: number;
  pull?: number;
} = {}) {
  const cv = useRef<HTMLCanvasElement>(null);
  const st = useRef({
    w: 0, h: 0,
    cols: 0, rows: 0, cw: 0, ch: 0, ox: 0, oy: 0, font: "",
    /* the wake, one number per cell */
    heat: new Float32Array(0),
    /* how far inside the shape each cell is, 0 outside to 1 */
    mask: new Float32Array(0),
    /* the hand: where it is, where it was last stamped, and how
       present it is (for the lean, which follows it out) */
    hx: -999, hy: -999, lx: NaN, ly: NaN, near: 0, inside: false,
    /* rings going out from presses */
    rings: [] as { x: number; y: number; t: number }[],
    deal: 0, tick: 0,
    raf: 0, ratio: 1,
  });
  const motion = useRef({ wake: () => undefined as void, reduced: false });

  /* the wake's width: one cell's worth at 0, a broad swathe at 100 */
  const radius = () => 12 + (clamp(reach, 0, 100) / 100) * 58;

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const s = st.current;
    const g = c.getContext("2d");
    if (!g) return;
    const context = g;
    const canvas = c;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    motion.current.reduced = reduced.matches;

    /* the grid for a character size, cut to the shape */
    function build() {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const r = Math.min(2, window.devicePixelRatio || 1);
      s.ratio = r;
      s.w = width;
      s.h = height;
      canvas.width = Math.round(width * r);
      canvas.height = Math.round(height * r);
      const size = width < 500 ? 5 : 10;
      /* rows a little tighter than the face's own leading, so the
         resting dots sit on an even grid rather than in stripes */
      s.ch = size * 0.82;
      s.cw = size * 0.62;
      s.cols = Math.floor(width / s.cw - 0.5);
      s.rows = Math.floor(height / s.ch);
      s.font = `500 ${size}px ${MONO}`;
      s.heat = new Float32Array(s.cols * s.rows);
      s.mask = new Float32Array(s.cols * s.rows);
      /* the grid centred in the block, whatever is left over split */
      const ox = (s.ox = (width - s.cols * s.cw) / 2), oy = (s.oy = (height - s.rows * s.ch) / 2);
      const coverage = wordCoverage(width, height);
      for (let j = 0; j < s.rows; j++) {
        for (let i = 0; i < s.cols; i++) {
          const x = ox + (i + 0.5 + (j & 1) * 0.5) * s.cw, y = oy + (j + 0.5) * s.ch;
          s.mask[j * s.cols + i] = coverage(x, y, s.cw, s.ch);
        }
      }
    }

    function paint() {
      if (!s.cols) return;
      context.setTransform(s.ratio, 0, 0, s.ratio, 0, 0);
      context.clearRect(0, 0, s.w, s.h);
      /* one ink for everything, the theme's own */
      context.fillStyle = getComputedStyle(canvas).color;
      /* the resting dot: a real circle rather than a full stop, so
         it can be bigger than the face draws one */
      /* a halftone: the dot's AREA follows the density, up to nearly
         touching its neighbours where the shape is fullest */
      const dot = Math.min(s.cw, s.ch) * 0.44;
      context.font = s.font;
      context.textAlign = "center";
      context.textBaseline = "middle";
      const top = RAMP.length - 1;
      /* the lean: up to most of a cell toward the hand, fading with
         distance over twice the wake's width */
      const lean = (clamp(pull, 0, 100) / 100) * s.near;
      const rad = radius();
      const far = rad * 2;
      const far2 = far * far;
      /* the hand's own heat, worked out fresh each frame rather than
         stored, so it never cools: a hand at rest keeps its patch */
      const R2 = rad * rad;
      /* the rings, as a band that passes rather than heat that stays:
         a press leaves nothing behind it, only the wave going out */
      const rings = s.rings.map((r) => {
        /* slow and smooth: it eases out as it spreads, a soft wide band
           that fades over its whole life rather than snapping off */
        const p = r.t / RING_S;
        const e = 1 - Math.pow(1 - p, 3);
        return { x: r.x, y: r.y, R: 8 + e * 260, amp: 0.6 * (1 - p) * (1 - p) * Math.min(1, p * 6) };
      });
      for (let j = 0; j < s.rows; j++) {
        const y = s.oy + (j + 0.5) * s.ch;
        for (let i = 0; i < s.cols; i++) {
          const k = j * s.cols + i;
          const m = s.mask[k] ?? 0;
          if (m <= 0) continue;
          /* odd rows sit half a cell over: a halftone screen */
          const cx = s.ox + (i + 0.5 + (j & 1) * 0.5) * s.cw;
          let h = s.heat[k] ?? 0;
          if (s.near > 0.002) {
            const q = ((cx - s.hx) ** 2 + (y - s.hy) ** 2) / R2;
            if (q < 1) h = Math.max(h, 0.95 * s.near * (1 - q) * (1 - q));
          }
          for (const r of rings) {
            /* a wide band, so the ring is a soft swell rather than a line */
            const d = (Math.hypot(cx - r.x, y - r.y) - r.R) / 24;
            if (d > -2.5 && d < 2.5) h += r.amp * Math.exp(-d * d);
          }
          /* the faint cells take a little less of the wake, but only a
             little: scaled by the density outright, the lightest cell
             never got warm enough to show a glyph at all */
          h *= 0.55 + 0.45 * m;
          const v = Math.min(1, h);
          /* the warm part shimmers, the cold field holds still */
          let u = v * top + 0.5;
          if (h > COLD) u += (hash(k, s.deal) - 0.5) * 1.6 * Math.min(1, h * 2);
          const idx = clamp(Math.floor(u), 1, top);
          let x = cx;
          let yy = y;
          if (lean > 0.002) {
            const dx = s.hx - x, dy = s.hy - yy;
            const d2 = dx * dx + dy * dy;
            if (d2 < far2) {
              const f = 1 - d2 / far2;
              const d = Math.sqrt(d2) || 1;
              /* toward the hand by a share of the gap, never past it */
              const shift = Math.min(d * 0.6, 14 * lean * f * f);
              x += (dx / d) * shift;
              yy += (dy / d) * shift;
            }
          }
          /* cold, or the lightest step: the dot, smaller toward the
             shape's edge, so the wake fades back into the field
             without a glyph popping in or out */
          if (h <= COLD || idx === 1) {
            context.beginPath();
            context.arc(x, yy, Math.max(0.45, dot * Math.sqrt(m)), 0, Math.PI * 2);
            context.fill();
            continue;
          }
          context.fillText(RAMP[idx] ?? " ", x, yy);
        }
      }
    }

    /* the loop runs only while the wake is warm or the hand is moving */
    function run() {
      if (s.raf) return;
      let prev = performance.now();
      const step = (t: number) => {
        const dt = Math.min(0.05, (t - prev) / 1000);
        prev = t;
        /* the cooling: the same fraction off every cell, so a trail
           of seconds T is down to a twentieth after T */
        const keep = Math.exp((-dt * 3) / Math.max(0.1, trail));
        let warm = 0;
        for (let k = 0; k < s.heat.length; k++) {
          const h = (s.heat[k] ?? 0) * keep;
          s.heat[k] = h < 0.003 ? 0 : h;
          if (h > warm) warm = h;
        }
        /* the rings run outward for RING_S and are gone */
        s.rings = s.rings.filter((r) => (r.t += dt) < RING_S);
        /* the lean follows the hand in and out */
        s.near += ((s.inside ? 1 : 0) - s.near) * (1 - Math.pow(0.004, dt));
        s.tick += dt;
        if (s.tick > 0.07) { s.tick = 0; s.deal++; }
        paint();
        const still = warm === 0 && !s.rings.length && Math.abs((s.inside ? 1 : 0) - s.near) < 0.004;
        s.raf = still ? 0 : requestAnimationFrame(step);
      };
      s.raf = requestAnimationFrame(step);
    }

    function layout() {
      build();
      paint();
    }

    motion.current.wake = run;
    const resize = new ResizeObserver(layout);
    void document.fonts.load("600 100px Inter").then(() => resize.observe(canvas));
    return () => {
      resize.disconnect();
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* the pointer in the block's own units */
  const where = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = r.width / st.current.w;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };

  /* heat dropped on the grid in a soft round at a point */
  const stamp = (x: number, y: number, rad: number, amt: number) => {
    const s = st.current;
    x -= s.ox; y -= s.oy;
    const c0 = Math.max(0, Math.floor((x - rad) / s.cw));
    const c1 = Math.min(s.cols - 1, Math.ceil((x + rad) / s.cw));
    const r0 = Math.max(0, Math.floor((y - rad) / s.ch));
    const r1 = Math.min(s.rows - 1, Math.ceil((y + rad) / s.ch));
    const R2 = rad * rad;
    for (let j = r0; j <= r1; j++) {
      const dy = (j + 0.5) * s.ch - y;
      for (let i = c0; i <= c1; i++) {
        const dx = (i + 0.5) * s.cw - x;
        const q = (dx * dx + dy * dy) / R2;
        if (q >= 1) continue;
        const t = 1 - q;
        const k = j * s.cols + i;
        s.heat[k] = Math.min(1, (s.heat[k] ?? 0) + amt * t * t);
      }
    }
  };

  /* the hand stamps along the whole line since its last frame, a
     stamp every third of a radius, so a flick is one stroke */
  const move = (e: React.PointerEvent) => {
    const s = st.current;
    if (motion.current.reduced || !s.cols) return;
    const { x, y } = where(e);
    const rad = radius();
    if (Number.isNaN(s.lx)) { s.lx = x; s.ly = y; }
    const d = Math.hypot(x - s.lx, y - s.ly);
    const n = Math.max(1, Math.ceil(d / (rad / 3)));
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      stamp(s.lx + (x - s.lx) * f, s.ly + (y - s.ly) * f, rad, 0.5);
    }
    s.lx = x; s.ly = y; s.hx = x; s.hy = y;
    s.inside = true;
    motion.current.wake();
  };

  return (
    <div
      className="asc aspect-wordmark overflow-clip"
      onPointerEnter={(e) => { st.current.lx = NaN; move(e); }}
      onPointerMove={move}
      onPointerLeave={() => { const s = st.current; s.inside = false; s.lx = NaN; motion.current.wake(); }}
      onPointerDown={(e) => {
        if (motion.current.reduced) return;
        const { x, y } = where(e);
        st.current.rings.push({ x, y, t: 0 });
        motion.current.wake();
      }}
    >
      <canvas ref={cv} className="asc-canvas" aria-hidden="true" />
    </div>
  );
}

/* a stable 0..1 per cell per deal, so the shimmer is noise that
   holds for a few frames rather than flicker every frame */
function hash(k: number, n: number) {
  let h = (k * 374761393 + n * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
