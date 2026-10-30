import { expect, test } from "@playwright/test";

test.describe("páginas estáticas", () => {
  for (const [locale, rulesTitle, privacyTitle, versionLabel] of [
    ["pt", "Regulamento", "Privacidade", "Versão"],
    ["en", "Rules", "Privacy", "Version"],
  ] as const) {
    test(`regulamento e privacidade em ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/rules`);
      await expect(page.getByRole("heading", { level: 1, name: rulesTitle })).toBeVisible();
      await expect(page.locator("p", { has: page.locator("time") })).toHaveText(new RegExp(`^${versionLabel} \\d{4}-\\d{2}-\\d{2}$`));
      await expect(page.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
      await expect(page.getByRole("heading", { level: 2, name: /^13\./ })).toBeVisible();

      await page.goto(`/${locale}/privacy`);
      await expect(page.getByRole("heading", { level: 1, name: privacyTitle })).toBeVisible();
      await expect(page.getByRole("link", { name: "caminha@radiologic.io" }).first()).toHaveAttribute("href", "mailto:caminha@radiologic.io");
    });

    test(`kit de dados em ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/kit`);
      const studies = page.getByTestId("kit-study");
      await expect(studies.first()).toBeVisible();
      expect(await studies.count()).toBeGreaterThan(0);
      await expect(studies.first()).toContainText("idc download 1.3.6.1.4.1.");
      await expect(page.getByText("pip install idc-index")).toBeVisible();
      await page.getByRole("link", { name: locale === "pt" ? "Ler a seção de dados no regulamento" : "Read the data section of the rules" }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/rules#4-`));
    });

    test(`navegação do site em ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const nav = page.getByRole("banner").getByRole("navigation", { name: locale === "pt" ? "Navegação do site" : "Site navigation" });
      await expect(nav.getByRole("link", { name: rulesTitle })).toHaveAttribute("href", `/${locale}/rules`);
      await expect(nav.getByRole("link", { name: privacyTitle })).toHaveAttribute("href", `/${locale}/privacy`);
      await expect(nav.getByRole("link", { name: locale === "pt" ? "Kit de dados" : "Data kit" })).toHaveAttribute("href", `/${locale}/kit`);
      await expect(nav.getByRole("link", { name: locale === "pt" ? "Contato" : "Contact" })).toHaveAttribute("href", "mailto:caminha@radiologic.io");
      await expect(nav.getByRole("link", { name: locale === "pt" ? "Código-fonte" : "Source code" })).toHaveAttribute("href", "https://github.com/eduardocaminha/radiologic-viewers");
    });
  }
});
