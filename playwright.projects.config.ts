import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/projects",
  use: { baseURL: process.env.PROJECTS_TEST_URL ?? "http://localhost:3102", browserName: "chromium" },
  webServer: process.env.PROJECTS_TEST_URL ? undefined : {
    command: "node --require ./tests/projects/github-fixture.cjs ./node_modules/next/dist/bin/next dev --port 3102",
    url: "http://localhost:3102",
    timeout: 120000,
    reuseExistingServer: false,
  },
  timeout: 180000,
  expect: { timeout: 20000 },
  workers: 1,
});
