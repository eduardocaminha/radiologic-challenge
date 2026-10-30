import type { FullConfig } from "@playwright/test";

// O next dev compila cada rota no primeiro acesso e reescreve manifestos em disco.
// Com workers em paralelo, uma rota pode ler um manifesto vazio enquanto outra compila
// ("Unexpected end of JSON input" em loadManifest). Compilar tudo em sequência antes
// dos testes elimina a corrida.
const routes = [
  "/pt",
  "/pt/highlights",
  "/pt/kit",
  "/pt/privacy",
  "/pt/rules",
  "/pt/login",
  "/pt/submit",
  "/pt/me",
  "/pt/v/aquecimento",
  "/pt/v/aquecimento/opengraph-image",
  "/pt/opengraph-image",
  "/admin",
  "/auth/callback?locale=pt&error=access_denied",
  "/api/screenshots/aquecimento",
  "/xx",
];

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) throw new Error("baseURL is required to warm up the dev server");
  for (const route of routes) {
    await fetch(new URL(route, baseURL), { redirect: "manual" });
  }
}
