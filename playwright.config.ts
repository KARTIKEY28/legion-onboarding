import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Mobile first: the smoke tests run on a phone-sized viewport.
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    env: { NEXT_DIST_DIR: ".next-e2e", AI_MOCK: "1" },
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
