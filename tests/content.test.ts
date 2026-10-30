import type { Locale } from "@/lib/i18n";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import kit from "../content/kit.json";
import { getLegalDocument, legalFilePath, parseLegal, type LegalKind } from "../lib/legal";
import { RULES_VERSION } from "../lib/submissions/constants";

const KINDS: LegalKind[] = ["rules", "privacy"];

function headings(kind: LegalKind, locale: Locale) {
  return getLegalDocument(kind, locale).blocks.filter((block) => block.type === "heading");
}

describe("textos legais", () => {
  it.each(KINDS.flatMap((kind) => (["en", "es"] as const).map((locale) => [kind, locale] as const)))("%s tem as mesmas seções em pt e %s", (kind, locale) => {
    const pt = headings(kind, "pt");
    const en = headings(kind, locale);
    expect(en.length).toBe(pt.length);
    const numbers = (list: typeof pt) => list.map((block) => (block.type === "heading" ? block.text.match(/^\d+\./)?.[0] ?? "" : ""));
    expect(numbers(en)).toEqual(numbers(pt));
  });

  it.each(KINDS.flatMap((kind) => (["pt", "en", "es"] as const).map((locale) => [kind, locale] as const)))(
    "%s %s não tem colchete de item a preencher",
    (kind, locale) => {
      expect(readFileSync(legalFilePath(kind, locale), "utf8")).not.toMatch(/\[[^\]]*\](?!\()/);
    },
  );

  it("todas as versões têm a mesma data e ela é o rules_version", () => {
    const versions = KINDS.flatMap((kind) => (["pt", "en", "es"] as const).map((locale) => getLegalDocument(kind, locale).version));
    expect(new Set(versions)).toEqual(new Set([RULES_VERSION]));
  });

  it("o intake do GitHub grava o mesmo rules_version", () => {
    const dir = join(process.cwd(), "supabase", "migrations");
    const latest = readdirSync(dir)
      .sort()
      .map((file) => readFileSync(join(dir, file), "utf8"))
      .filter((sql) => sql.includes("v_rules_version :="))
      .at(-1);
    expect(latest).toContain(`v_rules_version := '${RULES_VERSION}'`);
  });

  it("rejeita documento sem linha de versão", () => {
    expect(() => parseLegal("# Título\n\nTexto.")).toThrow();
  });
});

describe("kit de dados", () => {
  it("lista estudos com os campos exigidos", () => {
    expect(kit.studies.length).toBeGreaterThan(0);
    for (const study of kit.studies) {
      expect(study.study_instance_uid).toMatch(/^[0-9]+(\.[0-9]+)+$/);
      expect(study.collection).not.toBe("");
      expect(study.modality.length).toBeGreaterThan(0);
      expect(study.license).toMatch(/^CC /);
      expect(study.citation.length).toBeGreaterThan(0);
      expect(study.download).toBe(`idc download ${study.study_instance_uid}`);
    }
  });

  it("não repete estudo", () => {
    const uids = kit.studies.map((study) => study.study_instance_uid);
    expect(new Set(uids).size).toBe(uids.length);
  });
});
