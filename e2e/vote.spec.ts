import { execFileSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser } from "@playwright/test";

const viewerId = "77777777-7777-4777-8777-777777777777";
const slug = "voto-viewer";

function localEnv() {
  const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, unknown>;
  const url = status.API_URL;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (typeof url !== "string" || typeof publishableKey !== "string" || typeof secretKey !== "string") throw new Error("Supabase local status is missing credentials");
  return { url, publishableKey, secretKey };
}

async function signedInContext(browser: Browser) {
  const { url, publishableKey } = localEnv();
  const auth = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email: "e2e@example.test", password: "local-password" });
  expect(error).toBeNull();
  expect(data.session).not.toBeNull();
  const cookies: Array<{ name: string; value: string }> = [];
  const serverClient = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (nextCookies) => { cookies.splice(0, cookies.length, ...nextCookies.map(({ name, value }) => ({ name, value }))); },
    },
  });
  await serverClient.auth.setSession({ access_token: data.session!.access_token, refresh_token: data.session!.refresh_token });
  const context = await browser.newContext();
  await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: "http://localhost:4310" })));
  return context;
}

test.beforeAll(async () => {
  const { url, secretKey } = localEnv();
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await admin.from("submissions").delete().eq("id", viewerId);
  const { error } = await admin.from("submissions").insert({
    id: viewerId,
    slug,
    status: "approved",
    source: "form",
    name: "Viewer de voto",
    tagline: "Vote nesta ficha",
    description: "Descrição do viewer votável.",
    differential: "Um diferencial.",
    lang: "pt",
    platforms: ["web"],
    requires_install: false,
    repo_url: "https://example.test/voto-repo",
    license: "MIT",
    base_tech: "scratch",
    data_source: "Dados sintéticos",
    data_license: "CC0",
    external_api: false,
    demo_url: "https://example.test/voto-demo",
    approved_at: new Date().toISOString(),
  });
  if (error) throw error;
});

test.afterAll(async () => {
  const { url, secretKey } = localEnv();
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await admin.from("submissions").delete().eq("id", viewerId);
});

test("vote redireciona visitante e permite votar e desvotar", async ({ browser, page }) => {
  await page.goto(`/pt/v/${slug}`);
  await page.getByRole("button", { name: "Votar" }).click();
  await expect(page).toHaveURL(new RegExp(`/pt/login\\?next=%2Fpt%2Fv%2F${slug}$`));

  const context = await signedInContext(browser);
  const signedInPage = await context.newPage();
  await signedInPage.goto(`/pt/v/${slug}`);
  const vote = signedInPage.getByRole("button", { name: "Votar" });
  await expect(vote).toBeVisible();
  await vote.click();
  await expect(signedInPage.getByRole("button", { name: "Votado" })).toContainText("1");
  await signedInPage.getByRole("button", { name: "Votado" }).click();
  await expect(signedInPage.getByRole("button", { name: "Votar" })).toContainText("0");
  await context.close();
});
