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
Não

### Aceite do regulamento
- [x] Li e aceito o regulamento vigente.`;

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
        rules_accepted: true,
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
