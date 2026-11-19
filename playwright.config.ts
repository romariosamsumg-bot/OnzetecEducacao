import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgres://onzetec:onzetec_local_dev@localhost:5432/onzetec_e2e";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    { name: "android", use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } } },
  ],
  webServer: {
    // Build de produção com login de desenvolvimento liberado SOMENTE para este teste local.
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_URL: E2E_DB,
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      AUTH_MODE: "dev",
      DEV_AUTH_ALLOW_PRODUCTION_BUILD: "true",
      SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123456789",
      DEMO_MEDIA_ENABLED: "true",
      STORAGE_PROVIDER: "local",
      BILLING_PROVIDER: "none",
    },
  },
});
