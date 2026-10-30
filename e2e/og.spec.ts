import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const viewerId = "77777777-7777-4777-8777-777777777777";
const viewerSlug = `og-viewer-${Date.now().toString(36)}`;

function localEnv() {
  const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" })) as Record<string, unknown>;
  const url = status.API_URL;
  const secretKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  if (typeof url !== "string" || typeof secretKey !== "string") throw new Error("Supabase local status is missing service credentials");
  return { url, secretKey };
}

test.beforeAll(async () => {
  const { url, secretKey } = localEnv();
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await admin.from("submissions").delete().eq("id", viewerId);
  const { error } = await admin.from("submissions").insert({
    id: viewerId,
    slug: viewerSlug,
    status: "approved",
    source: "form",
    name: "OG Viewer",
    tagline: "Uma frase curta para compartilhar",
    description: "Descrição do viewer para a imagem Open Graph.",
    differential: "Uma diferença clara.",
    lang: "pt",
    platforms: ["web"],
    requires_install: false,
    repo_url: "https://example.test/og-repo",
    license: "MIT",
    base_tech: "scratch",
    data_source: "Dados sintéticos",
    data_license: "CC0",
    external_api: false,
    demo_url: "https://example.test/og-demo",
    approved_at: new Date().toISOString(),
  });
  if (error) throw error;
});

test.afterAll(async () => {
  const { url, secretKey } = localEnv();
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await admin.from("submissions").delete().eq("id", viewerId);
});

test("gera imagens OG localizadas e retorna 404 para viewer não aprovado", async ({ request }) => {
  for (const locale of ["pt", "en"]) {
    const response = await request.get(`/${locale}/opengraph-image`);
    await expect(response).toBeOK();
    expectPng(await response.body());
  }

  const approved = await request.get(`/pt/v/${viewerSlug}/opengraph-image`);
  await expect(approved).toBeOK();
  expectPng(await approved.body());

  const notApproved = await request.get("/pt/v/nao-aprovado-og/opengraph-image");
  expect(notApproved.status()).toBe(404);
});

function expectPng(body: Buffer) {
  expect(body.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(body.readUInt32BE(16)).toBe(1200);
  expect(body.readUInt32BE(20)).toBe(630);
}
