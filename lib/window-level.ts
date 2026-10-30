export const WINDOW_LEVEL_REST = { window: 2000, level: 0 };

export type WindowLevel = typeof WINDOW_LEVEL_REST;

// Ponteiro no eixo x ajusta a janela e no eixo y o nível, como em qualquer viewer.
export function windowLevelFromPointer(event: React.PointerEvent<HTMLElement>): WindowLevel | null {
  if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const box = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width;
  const y = (event.clientY - box.top) / box.height;
  return { window: Math.round(2000 - x * 1600), level: Math.round(200 - y * 400) };
}

// Janela estreita aumenta o contraste das linhas, e nível alto as clareia.
export function lineOpacity({ window, level }: WindowLevel) {
  return Math.min(0.32, Math.max(0.04, 0.08 + ((2000 - window) / 1600) * 0.18 + (level / 200) * 0.06));
}
