import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/browser",
    fullyParallel: false,
    workers: 1,
    timeout: 120000,
    expect: { timeout: 20000 },
    use: { baseURL: "http://localhost:3000", headless: true },
    webServer: { command: "npm run dev -- --port 3000", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120000 },
});
