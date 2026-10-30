import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const WATCHED_DIRS = ["app", "components", "lib", "dictionaries"];

const EMOJI_PATTERN =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/u;
const EM_DASH = "—";
const FORBIDDEN_WORDS = [/\bhype\b/i, /\bcomunidade\b/i, /\bcomunidad\b/i];

function listFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return listFiles(fullPath);
    return [fullPath];
  });
}

const files = WATCHED_DIRS.flatMap((dir) => listFiles(dir));

describe("convenções de escrita", () => {
  it.each(files)("%s não contém emoji, travessão, hype ou comunidade", (file) => {
    const content = readFileSync(file, "utf8");

    expect(EMOJI_PATTERN.test(content)).toBe(false);
    expect(content.includes(EM_DASH)).toBe(false);
    for (const pattern of FORBIDDEN_WORDS) {
      expect(pattern.test(content)).toBe(false);
    }
  });

  it("encontrou arquivos para verificar", () => {
    expect(files.length).toBeGreaterThan(0);
  });
});
