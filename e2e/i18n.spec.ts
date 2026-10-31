import { expect, test } from "@playwright/test";

test("redireciona / para /pt quando o Accept-Language não indica um idioma suportado", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();

  await page.goto("/");

  await expect(page).toHaveURL(/\/pt$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");

  await context.close();
});

test("redireciona / para /en conforme Accept-Language", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();

  await page.goto("/");

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await context.close();
});

test("locale desconhecido responde 404", async ({ page }) => {
  const response = await page.goto("/xx");

  expect(response?.status()).toBe(404);
});

test("seletor de idioma troca o locale preservando o caminho", async ({ page }) => {
  await page.goto("/pt");

  await page.getByRole("combobox", { name: "Idioma" }).click();
  await page.getByRole("option", { name: "Español" }).click();

  await expect(page).toHaveURL(/\/es$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});

test("no celular o idioma fica no menu, que fecha ao navegar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/pt/kit?x=1");
  await expect(page.getByRole("combobox", { name: "Idioma" })).toBeHidden();
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/kit\?x=1$/);
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Rules" }).click();
  await expect(page).toHaveURL(/\/en\/rules$/);
  await expect(page.getByRole("navigation", { name: "Menu" })).toBeHidden();
});
