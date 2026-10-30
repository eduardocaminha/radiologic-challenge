import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseGithubIssueBody } from "@/lib/intake/github";

const validBody = `### Nome do viewer
Viewer Ágil

### Frase de apresentação
Leitura rápida

### Diferencial
Funciona no navegador

### Idioma do viewer
pt

### Partes da workstation
- [x] Viewer
- [x] Agente
- [ ] Laudo

### Plataformas
- [x] web
- [ ] desktop

### Exige instalação
Não

### Repositório público
https://github.com/example/viewer

### Licença SPDX
MIT

### Tecnologia base
cornerstone3d

### Fonte dos dados
Dados sintéticos

### Licença dos dados
CC0

### Usa API externa
Não`;

describe("GitHub issue parser", () => {
  it("extrai os blocos e normaliza opções do Issue Form", () => {
    const parsed = parseGithubIssueBody(validBody);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.fields).toMatchObject({
        name: "Viewer Ágil",
        lang: "pt",
        platforms: ["web"],
        workflow_parts: ["viewer", "agent"],
        requires_install: false,
        base_tech: "cornerstone3d",
      });
    }
  });

  it.each([
    ["Idioma do projeto", "es", "es"],
    ["Idioma do projeto", "Español", "es"],
    ["Idioma do viewer", "en", "en"],
    ["Project language", "pt", "pt"],
  ])("lê %s com valor %s", (label, value, expected) => {
    const parsed = parseGithubIssueBody(validBody.replace("### Idioma do viewer\npt", `### ${label}\n${value}`));

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.fields.lang).toBe(expected);
  });

  it("ignora um aceite do regulamento marcado na issue", () => {
    const parsed = parseGithubIssueBody(`${validBody}

### Aceite do regulamento
- [x] Li e aceito o regulamento vigente.`);

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.fields).not.toHaveProperty("rules_accepted");
  });

  it("lê os campos completos que um agente pode enviar", () => {
    const parsed = parseGithubIssueBody(`${validBody}

### Descrição
Primeira linha.

Segunda linha.

### Limitações
Só CT.

### Stack
Next.js

### Recursos
- [x] mpr
- [x] Hanging protocols
- [ ] 3d

### Modalidades
- [x] CT
- [ ] MR

### Ferramentas de IA
- Claude Code, 2.1
Cursor

### Participação de código de IA
gt75

### URL dos prompts
https://example.test/prompts

### Tempo investido
1to7d

### Custo
10to100`);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.fields).toMatchObject({
        description: "Primeira linha.\n\nSegunda linha.",
        limitations: "Só CT.",
        stack: "Next.js",
        features: ["mpr", "hanging_protocols"],
        modalities: ["ct"],
        ai_tools: [{ name: "Claude Code", version: "2.1" }, { name: "Cursor" }],
        ai_code_share: "gt75",
        prompts_url: "https://example.test/prompts",
        time_spent: "1to7d",
        cost: "10to100",
      });
    }
  });

  it("aceita o exemplo publicado para agentes", () => {
    const guide = readFileSync(join(process.cwd(), "docs", "public-repo", "AGENTS.md"), "utf8");
    const example = guide.split("```markdown\n")[1]?.split("\n```")[0] ?? "";
    const parsed = parseGithubIssueBody(example);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.fields).toMatchObject({ workflow_parts: ["viewer"], base_tech: "cornerstone3d", ai_tools: [{ name: "Claude Code", version: "2.1" }] });
    }
  });

  it("retorna a lista de erros em português e inglês", () => {
    const parsed = parseGithubIssueBody("### Nome do viewer\n");

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.errors.pt).toEqual(expect.arrayContaining([expect.stringContaining("Frase de apresentação")]));
      expect(parsed.errors.en).toEqual(expect.arrayContaining([expect.stringContaining("Tagline")]));
    }
  });

  it("trata campos opcionais sem resposta como vazios", () => {
    const parsed = parseGithubIssueBody(`${validBody}

### Perfil do autor
_No response_

### URL da demonstração
_No response_`);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.fields.author_profile).toBeUndefined();
      expect(parsed.fields.demo_url).toBeUndefined();
    }
  });
});

describe("corpo hostil", () => {
  it("processa espaços repetidos em tempo linear", () => {
    const body = `### ${" ".repeat(19_000)}x\n- [x] ${" ".repeat(900)}`;
    const startedAt = performance.now();
    parseGithubIssueBody(body);
    expect(performance.now() - startedAt).toBeLessThan(100);
  });
});
