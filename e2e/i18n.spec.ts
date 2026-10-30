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

  await page.getByRole("link", { name: "English" }).click();

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
