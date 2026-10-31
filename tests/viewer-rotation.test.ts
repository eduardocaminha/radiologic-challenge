import { describe, expect, it } from "vitest";
import { rotationDay, rotationKey } from "../lib/viewers/rotation";

const ids = Array.from({ length: 20 }, (_, index) => `viewer-${index}`);
const order = (day: string) => [...ids].sort((a, b) => rotationKey(a, day) - rotationKey(b, day));

describe("rotação diária dos empatados", () => {
  it("repete a mesma ordem no mesmo dia", () => {
    expect(order("2026-10-30")).toEqual(order("2026-10-30"));
  });

  it("muda quem fica na frente de um dia para o outro", () => {
    const firsts = new Set(Array.from({ length: 30 }, (_, index) => order(`2026-11-${String(index + 1).padStart(2, "0")}`)[0]));
    expect(firsts.size).toBeGreaterThan(5);
  });

  it("vira o dia no horário de Brasília", () => {
    expect(rotationDay(new Date("2026-10-31T02:59:00Z"))).toBe("2026-10-30");
    expect(rotationDay(new Date("2026-10-31T03:00:00Z"))).toBe("2026-10-31");
  });
});
