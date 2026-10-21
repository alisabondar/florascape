import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
// Set E2E_BASE_URL to test an already-running server (started with `bun run dev:e2e`).
const externalServer = process.env.E2E_BASE_URL;

// End-to-end tests run fully offline: AI providers and climate lookups are switched off,
// so every plan is the deterministic starter plan.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 60_000,
  fullyParallel: false,
  use: {
    baseURL: externalServer || `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalServer
    ? undefined
    : {
        command: `bun run dev:e2e`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
