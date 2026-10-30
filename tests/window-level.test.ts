import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ctWindowLevelFromPointer } from "@/lib/window-level";

function pointer(box: { left: number; top: number; width: number; height: number }, clientX: number, clientY: number) {
  return {
    pointerType: "mouse",
    clientX,
    clientY,
    currentTarget: { getBoundingClientRect: () => box },
  } as unknown as React.PointerEvent<HTMLElement>;
}

describe("janela e nível pelo ponteiro", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mapeia o ponteiro para valores finitos", () => {
    expect(ctWindowLevelFromPointer(pointer({ left: 0, top: 0, width: 100, height: 100 }, 50, 50))).toEqual({ window: 1050, level: -300 });
  });

  it("ignora elemento sem tamanho em vez de gerar infinito", () => {
    expect(ctWindowLevelFromPointer(pointer({ left: 0, top: 0, width: 0, height: 0 }, 50, 50))).toBeNull();
  });
});
