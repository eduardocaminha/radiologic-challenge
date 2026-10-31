export const ASCII_RAMP = " .:-=+*#%@";

// O maior ponto tem a cor da logo (`--foreground`).
export const ASCII_INK = "0.985 0 0";

// Janela de mediastino: em pontos é a que melhor mostra a anatomia do tórax.
export const CT_WINDOW_LEVEL_REST = { window: 400, level: 40 };

export type WindowLevel = typeof CT_WINDOW_LEVEL_REST;

// Varredura sem mouse: sai da janela de repouso e oscila devagar sem perder a anatomia.
export function ctWindowLevelAt(seconds: number): WindowLevel {
  return {
    window: Math.round(CT_WINDOW_LEVEL_REST.window + 300 * (1 - Math.cos(seconds * 0.7))),
    level: Math.round(CT_WINDOW_LEVEL_REST.level + 90 * Math.sin(seconds * 0.45)),
  };
}

export function pointerFraction(event: React.PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const box = event.currentTarget.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
}

// Na tomografia a escala é em unidades Hounsfield: do pulmão ao osso.
export function ctWindowLevelFromPointer(event: React.PointerEvent<HTMLElement>): WindowLevel | null {
  const point = pointerFraction(event);
  return point && { window: Math.round(2000 - point.x * 1900), level: Math.round(400 - point.y * 1400) };
}
