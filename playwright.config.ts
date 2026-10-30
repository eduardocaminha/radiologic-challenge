import { defineConfig, devices } from "@playwright/test";

const PORT = 4310;
const ogVerification = process.argv.slice(2).includes("og");

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  reporter: "list",
  grep: ogVerification ? /gera imagens OG/ : undefined,
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  webServer: {
    command: `node e2e/start-server.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
