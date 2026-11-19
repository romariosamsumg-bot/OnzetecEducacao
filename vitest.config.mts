import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgres://onzetec:onzetec_local_dev@localhost:5432/onzetec_test";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" lança erro fora do ambiente React Server; nos testes é neutro.
      "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DB,
      TEST_DATABASE_URL: TEST_DB,
      SESSION_SECRET: "test-secret-test-secret-test-secret-0123456789",
      AUTH_MODE: "dev",
      STORAGE_PROVIDER: "local",
      BILLING_PROVIDER: "none",
      DEMO_MEDIA_ENABLED: "true",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
  },
});
