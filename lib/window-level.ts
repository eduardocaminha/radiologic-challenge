export const ASCII_RAMP = " .:-=+*#%@";

export const WINDOW_LEVEL_REST = { window: 2000, level: 0 };

// Janela de mediastino: em caracteres é a que melhor mostra a anatomia do tórax.
export const CT_WINDOW_LEVEL_REST = { window: 400, level: 40 };

export type WindowLevel = typeof WINDOW_LEVEL_REST;

export function pointerFraction(event: React.PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const box = event.currentTarget.getBoundingClientRect();
  return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
}

// Ponteiro no eixo x ajusta a janela e no eixo y o nível, como em qualquer viewer.
export function windowLevelFromPointer(event: React.PointerEvent<HTMLElement>): WindowLevel | null {
  const point = pointerFraction(event);
  return point && { window: Math.round(2000 - point.x * 1600), level: Math.round(200 - point.y * 400) };
}

// Na tomografia a escala é em unidades Hounsfield: do pulmão ao osso.
export function ctWindowLevelFromPointer(event: React.PointerEvent<HTMLElement>): WindowLevel | null {
  const point = pointerFraction(event);
  return point && { window: Math.round(2000 - point.x * 1900), level: Math.round(400 - point.y * 1400) };
}
