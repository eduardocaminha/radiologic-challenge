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

const email = `screenshots-${Date.now()}@example.test`;
const password = "local-screenshots-password";
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

test("envia, reordena e exclui capturas de tela do rascunho", async ({ browser }) => {
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
  await page.locator("#name").fill("Viewer Screenshots");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page).toHaveURL(/\/pt\/me$/);
  await page.getByRole("link", { name: "Editar workstation" }).click();

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: tinyPng },
    { name: "two.png", mimeType: "image/png", buffer: tinyPng },
  ]);
  await expect(page.getByText("Imagem enviada.")).toBeVisible();
  await expect(page.locator('img[alt^="Capturas de tela"]')).toHaveCount(2);
  await page.getByRole("button", { name: "Mover para cima" }).nth(1).click();
  await page.getByRole("button", { name: "Excluir imagem" }).nth(0).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir imagem" }).click();
  await expect(page.locator('img[alt^="Capturas de tela"]')).toHaveCount(1);

  // Print de tela cheia: sobe como WebP com no máximo 1600 px de largura.
  const largePng = Buffer.from(
    (await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 2400;
      canvas.height = 1500;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, 2400, 1500);
      gradient.addColorStop(0, "#111");
      gradient.addColorStop(1, "#ddd");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2400, 1500);
      ctx.fillStyle = "#fff";
      ctx.font = "48px sans-serif";
      for (let y = 80; y < 1500; y += 120) ctx.fillText("Axial CT 1/65 · Lung", 80, y);
      return canvas.toDataURL("image/png").split(",")[1];
    })),
    "base64",
  );
  await fileInput.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: largePng });
  const uploaded = page.locator('img[alt^="Capturas de tela"]').nth(1);
  await expect(uploaded).toHaveAttribute("src", /\.webp/);
  await expect.poll(() => uploaded.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1600);
  await context.close();
});
