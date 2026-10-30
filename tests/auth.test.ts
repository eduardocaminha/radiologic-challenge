import { describe, expect, it } from "vitest";
import { localeFromPath, loginPath, safeRedirectPath } from "@/lib/auth/redirects";

describe("destinos da autenticação", () => {
  it("aceita caminhos locais e rejeita destinos externos", () => {
    expect(safeRedirectPath("/pt/submit?step=1")).toBe("/pt/submit?step=1");
    expect(safeRedirectPath("https://example.com")).toBeNull();
    expect(safeRedirectPath("//example.com")).toBeNull();
    expect(safeRedirectPath("/%2F%2Fexample.com")).toBeNull();
  });

  it("usa o locale do destino e cria o login com erro localizado", () => {
    expect(localeFromPath("/en/me")).toBe("en");
    expect(localeFromPath("/admin")).toBeNull();
    expect(loginPath("pt", "/pt/submit", true)).toBe("/pt/login?next=%2Fpt%2Fsubmit&error=oauth");
  });
});
