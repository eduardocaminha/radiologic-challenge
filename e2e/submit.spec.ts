import { execFileSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function localEnv() {
  const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, unknown>;
  const url = status.API_URL;
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (typeof url !== "string" || typeof key !== "string" || typeof secretKey !== "string") throw new Error("Supabase local status is missing API credentials");
  return { url, key, secretKey };
}

const email = `submit-${Date.now()}@example.test`;
const password = "local-submit-password";
let userId: string | undefined;

function adminClient() {
  const { url, secretKey } = localEnv();
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

test.beforeAll(async () => {
  const { data, error } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  userId = data.user?.id;
});

test.afterAll(async () => {
  if (userId) await adminClient().auth.admin.deleteUser(userId);
});

test("salva rascunho, permite edição e envia para moderação", async ({ browser }) => {
  const { url, key } = localEnv();
  const auth = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  expect(data.session).not.toBeNull();

  const cookies: Array<{ name: string; value: string }> = [];
  const serverClient = createServerClient(url, key, {
    cookies: {
      getAll: () => cookies,
      setAll: (nextCookies) => {
        cookies.splice(0, cookies.length, ...nextCookies.map(({ name, value }) => ({ name, value })));
      },
    },
  });
  await serverClient.auth.setSession({ access_token: data.session!.access_token, refresh_token: data.session!.refresh_token });

  const context = await browser.newContext();
  await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: "http://localhost:4310" })));
  const page = await context.newPage();

  await page.goto("/pt/submit");
  await expect(page.getByRole("contentinfo")).toBeHidden();
  const currentSection = page.locator('a[aria-current="true"]');
  await expect(currentSection).toHaveText("Ficha");
  await page.locator("#demo-heading").evaluate((heading) => window.scrollTo({ top: heading.getBoundingClientRect().top + window.scrollY - 150, behavior: "instant" }));
  await expect(currentSection).toHaveAttribute("href", "#demo-heading");
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect(currentSection).toHaveAttribute("href", "#rules-heading");
  await page.evaluate(() => window.scrollBy({ top: -80, behavior: "instant" }));
  await expect(currentSection).not.toHaveAttribute("href", "#rules-heading");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.locator("#name").fill("Viewer E2E");
  await page.getByRole("button", { name: "Salvar rascunho" }).dblclick();
  await expect(page).toHaveURL(/\/pt\/me$/);
  await expect(page.getByRole("heading", { name: "Viewer E2E" })).toBeVisible();
  await expect(page.getByText("Rascunho", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Editar workstation" }).click();
  await page.locator("#tagline").fill("Viewer para testes");
  await page.locator("#description").fill("Descrição do viewer para testes.");
  await page.locator("#differential").fill("Funciona no navegador.");
  await page.locator("#lang").click();
  await page.getByRole("option", { name: "Português" }).click();
  await page.getByRole("checkbox", { name: "Agente", exact: true }).check();
  await page.getByRole("checkbox", { name: "Web", exact: true }).check();
  await page.locator("#repo_url").fill("https://example.test/viewer");
  await page.locator("#license").fill("MIT");
  await page.locator("#base_tech").click();
  await page.getByRole("option", { name: "Do zero" }).click();
  await page.locator("#data_source").fill("Dados sintéticos");
  await page.locator("#data_license").fill("CC0");
  await page.locator("#demo_url").fill("https://example.test/demo");
  await page.getByRole("checkbox", { name: /Li e aceito o regulamento vigente/ }).check();
  await page.locator('input[type="file"]').setInputFiles({ name: "viewer.png", mimeType: "image/png", buffer: tinyPng });
  await expect(page.getByText("Imagem enviada.")).toBeVisible();
  await page.getByRole("button", { name: "Enviar para moderação" }).click();

  await expect(page).toHaveURL(/\/pt\/me$/);
  await expect(page.getByText("Em moderação")).toBeVisible();
  await context.close();
});
