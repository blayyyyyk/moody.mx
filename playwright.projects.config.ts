import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/projects",
  use: { baseURL: process.env.PROJECTS_TEST_URL ?? "http://localhost:3101", browserName: "chromium" },
  timeout: 180000,
  workers: 1,
});
