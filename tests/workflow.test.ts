import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../docs/public-repo/.github/workflows/intake.yml", import.meta.url), "utf8");

function actionReferencesIn(source: string) {
  return source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(?:-\s*)?uses\s*:\s*(.*)$/i);
    if (!match) return [];
    return [match[1].replace(/\s+#.*$/, "").trim().replace(/^['"]|['"]$/g, "")];
  });
}

function runContents(source: string) {
  const lines = source.split(/\r?\n/);
  const contents: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)run\s*:\s*(.*)$/i);
    if (!match) continue;
    const value = match[2].trim();
    if (value && !/^[|>][-+]?\s*$/.test(value)) {
      contents.push(value);
      continue;
    }
    const indentation = match[1].length;
    for (let next = index + 1; next < lines.length; next += 1) {
      const line = lines[next];
      if (line.trim() && line.search(/\S/) <= indentation) break;
      contents.push(line);
      index = next;
    }
  }
  return contents.join("\n");
}

const actionReferences = actionReferencesIn(workflow);
const runText = runContents(workflow);

function isShaPinned(reference: string) {
  return /^[^@\s]+@[0-9a-f]{40}$/i.test(reference);
}

describe("workflow de intake do repo público", () => {
  it("escuta abertura e edição sem action não fixada", () => {
    expect(workflow).toContain("types: [opened, edited]");
    expect(actionReferences.every(isShaPinned)).toBe(true);
    expect(actionReferencesIn("  - uses: owner/action@main # comentário")).toEqual(["owner/action@main"]);
    expect(isShaPinned("owner/action@main")).toBe(false);
    expect(isShaPinned("owner/action@latest")).toBe(false);
    expect(isShaPinned("owner/action@0123456789abcdef0123456789abcdef01234567")).toBe(true);
  });

  it("não interpola dados da issue dentro do shell", () => {
    expect(runText).not.toContain("github.event.issue");
    expect(runContents("  run: echo ${{ github.event.issue.body }}")).toContain("github.event.issue");
    expect(runContents("    run: |\n      echo ${{ github.event.issue.body }}")).toContain("github.event.issue");
    expect(workflow).toContain("ISSUE_BODY: ${{ github.event.issue.body }}");
    expect(workflow).toContain("ISSUE_NUMBER: ${{ github.event.issue.number }}");
  });
});
