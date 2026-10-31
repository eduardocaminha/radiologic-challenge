import { execFileSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

function getLocalSupabaseEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  const status = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" }),
  ) as Record<string, unknown>;
  const url = typeof status.API_URL === "string" ? status.API_URL : null;
  const publishableKey =
    typeof status.PUBLISHABLE_KEY === "string"
      ? status.PUBLISHABLE_KEY
      : typeof status.ANON_KEY === "string"
        ? status.ANON_KEY
        : null;

  if (!url || !publishableKey) throw new Error("Supabase local status is missing API credentials");
  return { url, publishableKey };
}

const { url: supabaseUrl, publishableKey } = getLocalSupabaseEnv();
const password = process.env.SUPABASE_E2E_PASSWORD ?? "local-password";

test("rotas privadas redirecionam ao login e preservam o destino", async ({ page }) => {
  await page.goto("/pt/submit");

  await expect(page).toHaveURL(/\/pt\/login\?next=%2Fpt%2Fsubmit$/);
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar com GitHub" })).toBeVisible();
});

test("erro do provedor aparece localizado sem detalhe técnico", async ({ page }) => {
  await page.goto("/auth/callback?locale=en&error=access_denied&error_description=provider-secret");

  await expect(page).toHaveURL(/\/en\/login\?error=oauth$/);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("We could not sign you in. Please try again.");
  await expect(page.getByText("provider-secret")).toHaveCount(0);
});

test("usuário local com identidade github consegue usar uma rota privada", async ({ browser }) => {
  const auth = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await auth.auth.signInWithPassword({
    email: "e2e@example.test",
    password,
  });

  expect(error).toBeNull();
  expect(data.session).not.toBeNull();
  expect(data.user?.identities?.some((identity) => identity.provider === "github")).toBe(true);

  const cookies: Array<{ name: string; value: string }> = [];
  const serverClient = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (newCookies) => {
        cookies.splice(0, cookies.length, ...newCookies.map(({ name, value }) => ({ name, value })));
      },
    },
  });
  await serverClient.auth.setSession({
    access_token: data.session!.access_token,
    refresh_token: data.session!.refresh_token,
  });

  const context = await browser.newContext();
  await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: "http://localhost:4310" })));
  const page = await context.newPage();
  await page.goto("/en/me");

  await expect(page.getByRole("heading", { name: "My submissions" })).toBeVisible();
  await page.getByRole("banner").getByRole("button", { name: "My account" }).click();
  await expect(page.getByRole("menu")).toContainText("@example.test");
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await context.close();
});

async function canvasChanges(page: Page) {
  await page.goto("/pt/login");
  const canvas = page.getByRole("main").locator("canvas");
  await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL().length)).toBeGreaterThan(5000);
  await page.waitForTimeout(1000);
  const before = await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  await page.waitForTimeout(1500);
  return before !== await canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
}

test("login anima o corte só no celular", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  expect(await canvasChanges(page)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(await canvasChanges(page)).toBe(false);
});

test("login respeita movimento reduzido no celular", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 800 });
  expect(await canvasChanges(page)).toBe(false);
});
