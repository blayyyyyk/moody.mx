import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "tests/browser",
    workers: 1,
    timeout: 60000,
    expect: { timeout: 15000 },
    snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
    use: { baseURL: process.env.PERF_URL ?? "http://localhost:3002", viewport: { width: 1280, height: 800 } },
    webServer: process.env.PERF_URL ? undefined : {
        command: "NEXT_DIST_DIR=.next-performance NODE_OPTIONS='--require=./tests/performance/data-fixture.cjs' npm run build && NEXT_DIST_DIR=.next-performance NODE_OPTIONS='--require=./tests/performance/data-fixture.cjs' npm run start -- --port 3002",
        url: "http://localhost:3002",
        reuseExistingServer: false,
        timeout: 240000,
    },
});
