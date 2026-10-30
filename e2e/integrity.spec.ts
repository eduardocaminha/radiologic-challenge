import { execFileSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Browser } from "@playwright/test";

const viewerId = "66666666-6666-4666-8666-666666666661";
const voterIds: string[] = [];

function localEnv() {
  const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, unknown>;
  const url = status.API_URL;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (typeof url !== "string" || typeof publishableKey !== "string" || typeof secretKey !== "string") throw new Error("Supabase local status is missing credentials");
  return { url, publishableKey, secretKey };
}

async function signInAdmin(browser: Browser) {
  const { url, publishableKey } = localEnv();
  const auth = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await auth.auth.signInWithPassword({ email: "admin-e2e@example.test", password: "local-admin-password" });
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
  for (const id of voterIds) await admin.auth.admin.deleteUser(id);

  const { error: submissionError } = await admin.from("submissions").insert({
    id: viewerId,
    slug: "integridade-viewer",
    status: "approved",
    source: "form",
    name: "Viewer de integridade",
    tagline: "Relatório de votos",
    description: "Descrição do viewer.",
    differential: "Um diferencial.",
    lang: "pt",
    platforms: ["web"],
    requires_install: false,
    repo_url: "https://example.test/integrity-repo",
    license: "MIT",
    base_tech: "scratch",
    data_source: "Dados sintéticos",
    data_license: "CC0",
    external_api: false,
    demo_url: "https://example.test/integrity-demo",
    approved_at: new Date().toISOString(),
  });
  if (submissionError) throw submissionError;

  for (const index of [0, 1]) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `integrity-${index}@example.test`,
      password: "local-integrity-password",
      email_confirm: true,
    });
    if (error) throw error;
    const id = data.user?.id;
    if (!id) throw new Error("Could not find the integrity test user");
    voterIds.push(id);
    const { error: voteError } = await admin.from("votes").insert({ user_id: id, submission_id: viewerId });
    if (voteError) throw voteError;
  }
});

test.afterAll(async () => {
  const { url, secretKey } = localEnv();
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await admin.from("submissions").delete().eq("id", viewerId);
  for (const id of voterIds) await admin.auth.admin.deleteUser(id);
});

test("exibe o relatório e permite anular votos com motivo", async ({ browser }) => {
  const context = await signInAdmin(browser);
  const page = await context.newPage();
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Integridade do voto" })).toBeVisible();
  const integritySection = page.locator("section[aria-labelledby='integrity-heading']");
  const report = integritySection.getByRole("article").filter({ has: page.getByRole("heading", { name: "Viewer de integridade" }) });
  await expect(report).toContainText("Total de votos");
  await expect(report).toContainText("100%");
  await report.getByText("Contas sinalizadas (2)").click();
  await expect(report.getByText("i***@example.test").first()).toBeVisible();

  const firstAccount = report.locator("li").filter({ has: page.getByText("i***@example.test") }).first();
  await firstAccount.getByLabel("Motivo").first().fill("Votos concentrados no mesmo viewer.");
  await firstAccount.getByRole("button", { name: "Anular votos" }).click();
  const { url, secretKey } = localEnv();
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await expect.poll(async () => {
    const { data } = await admin.from("votes").select("voided_at").eq("user_id", voterIds[0]).single();
    return data?.voided_at ?? null;
  }).not.toBeNull();
  await context.close();
});
