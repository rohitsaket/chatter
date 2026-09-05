import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    // Use the environment's preinstalled Chromium when the pinned Playwright
    // version has not downloaded its own browser build.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // Spike runs unauthenticated and in isolation: no auth dependency, and it
    // must not perturb the existing desktop/mobile suites.
    {
      name: "crypto-spike",
      testMatch: /crypto-spike\.spec\.ts|storage-probe\.spec\.ts/,
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 900 }, storageState: "e2e/.auth/state.json" },
      testIgnore: /mobile\.spec\.ts|auth\.setup\.ts|crypto-spike\.spec\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, storageState: "e2e/.auth/state.json" },
      testMatch: /mobile\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],
});
