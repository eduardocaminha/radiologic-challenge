import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Locale } from "@/lib/i18n";

export type LegalKind = "rules" | "privacy";

export type LegalBlock =
  | { type: "heading"; id: string; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export interface LegalDocument {
  title: string;
  version: string;
  blocks: LegalBlock[];
}

const FILES: Record<LegalKind, Record<Locale, string>> = {
  rules: { pt: "regulamento.pt.md", en: "rules.en.md", es: "reglamento.es.md" },
  privacy: { pt: "privacidade.pt.md", en: "privacy.en.md", es: "privacidad.es.md" },
};

const VERSION_LINE = /^(?:Versão|Version|Versión) (\d{4}-\d{2}-\d{2})\.$/;

export function legalFilePath(kind: LegalKind, locale: Locale): string {
  return join(process.cwd(), "docs", "drafts", FILES[kind][locale]);
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseLegal(markdown: string): LegalDocument {
  const lines = markdown.split("\n");
  let title = "";
  let version = "";
  const blocks: LegalBlock[] = [];
  let list: string[] | null = null;

  const closeList = () => {
    if (list) blocks.push({ type: "list", items: list });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      closeList();
      continue;
    }
    if (line.startsWith("# ")) {
      title = line.slice(2);
      continue;
    }
    const versionMatch = VERSION_LINE.exec(line);
    if (!version && versionMatch) {
      version = versionMatch[1];
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      const text = line.slice(3);
      blocks.push({ type: "heading", id: slugify(text), text });
      continue;
    }
    if (line.startsWith("- ")) {
      list ??= [];
      list.push(line.slice(2));
      continue;
    }
    closeList();
    blocks.push({ type: "paragraph", text: line });
  }
  closeList();

  if (!title || !version) throw new Error("legal document is missing title or version line");
  return { title, version, blocks };
}

export function getLegalDocument(kind: LegalKind, locale: Locale): LegalDocument {
  return parseLegal(readFileSync(legalFilePath(kind, locale), "utf8"));
}
