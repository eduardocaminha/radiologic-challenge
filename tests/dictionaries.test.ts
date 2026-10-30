import { describe, expect, it } from "vitest";
import pt from "../dictionaries/pt";
import en from "../dictionaries/en";
import es from "../dictionaries/es";

function collectKeyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];

  return Object.entries(value).flatMap(([key, nested]) =>
    collectKeyPaths(nested, prefix ? `${prefix}.${key}` : key),
  );
}

describe("paridade de chaves dos dicionários", () => {
  it("pt, en e es expõem exatamente as mesmas chaves", () => {
    expect(collectKeyPaths(en).sort()).toEqual(collectKeyPaths(pt).sort());
    expect(collectKeyPaths(es).sort()).toEqual(collectKeyPaths(pt).sort());
  });
});
