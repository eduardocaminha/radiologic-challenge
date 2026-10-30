import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { negotiateLocale, proxy } from "../proxy";

function requestWithAcceptLanguage(acceptLanguage?: string) {
  const headers = new Headers();
  if (acceptLanguage !== undefined) headers.set("accept-language", acceptLanguage);
  return new NextRequest(new Request("https://example.com/", { headers }));
}

describe("negotiateLocale", () => {
  it("cai para pt quando o header está ausente", () => {
    expect(negotiateLocale(null)).toBe("pt");
  });

  it("cai para pt quando o header é malformado", () => {
    expect(negotiateLocale("???,;q=,q=abc")).toBe("pt");
  });

  it("escolhe en quando en tem prioridade maior", () => {
    expect(negotiateLocale("en-US,en;q=0.9,pt;q=0.8")).toBe("en");
  });

  it("escolhe pt quando pt tem prioridade maior", () => {
    expect(negotiateLocale("pt-BR,pt;q=0.9,en;q=0.5")).toBe("pt");
  });

  it("cai para pt quando nenhum idioma suportado aparece", () => {
    expect(negotiateLocale("fr-FR,de;q=0.8")).toBe("pt");
  });
});

describe("proxy", () => {
  it("redireciona / para /pt por padrão", async () => {
    const response = await proxy(requestWithAcceptLanguage());

    expect(response.headers.get("location")).toBe("https://example.com/pt");
  });

  it("redireciona / para /en conforme Accept-Language", async () => {
    const response = await proxy(requestWithAcceptLanguage("en-US,en;q=0.9"));

    expect(response.headers.get("location")).toBe("https://example.com/en");
  });

  it("redireciona / para /pt quando o header é malformado", async () => {
    const response = await proxy(requestWithAcceptLanguage("???"));

    expect(response.headers.get("location")).toBe("https://example.com/pt");
  });
});
