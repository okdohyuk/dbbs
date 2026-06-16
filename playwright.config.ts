import { defineConfig, devices } from "@playwright/test";

// E2E runs against the dockerized app (docker compose up). The flow builds up
// state across steps (project → connections → snapshot → restore), so tests run
// serially in a single worker. A `setup` project signs in once (when the gate is
// enabled) and saves the session so the main tests run authenticated.
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.DBBS_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /login\.setup\.ts/ },
    {
      name: "chromium",
      testIgnore: /login\.setup\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "tests/.auth/state.json" },
    },
  ],
});
