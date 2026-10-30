import { describe, expect, it } from "vitest";
import { viewerRecency } from "@/lib/viewers/recency";

const now = Date.parse("2026-10-30T12:00:00Z");
const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

describe("selo de recência", () => {
  it("marca como novo até 14 dias depois da aprovação", () => {
    expect(viewerRecency(daysAgo(14), daysAgo(14), now)).toBe("new");
    expect(viewerRecency(daysAgo(15), daysAgo(15), now)).toBeNull();
  });

  it("novo vence atualizado", () => {
    expect(viewerRecency(daysAgo(5), daysAgo(1), now)).toBe("new");
  });

  it("marca como atualizado por 14 dias depois da edição", () => {
    expect(viewerRecency(daysAgo(40), daysAgo(14), now)).toBe("updated");
    expect(viewerRecency(daysAgo(40), daysAgo(15), now)).toBeNull();
  });

  it("não conta a própria aprovação como atualização", () => {
    expect(viewerRecency(daysAgo(40), daysAgo(40), now)).toBeNull();
  });

  it("ignora projeto sem data de aprovação", () => {
    expect(viewerRecency(null, daysAgo(1), now)).toBeNull();
  });
});
