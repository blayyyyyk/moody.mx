import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/mal-browser",
  workers: 1,
  timeout: 120000,
  expect: { timeout: 20000 },
  use: { baseURL: "http://localhost:3103", headless: true },
  webServer: {
    command: "node --require ./tests/projects/github-fixture.cjs ./node_modules/next/dist/bin/next dev --port 3103",
    url: "http://localhost:3103", reuseExistingServer: false, timeout: 120000,
  },
});
