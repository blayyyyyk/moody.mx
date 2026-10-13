import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "tests/browser", testMatch: "photos.spec.ts", workers: 1, timeout: 90000, expect: { timeout: 15000 },
    use: { baseURL: process.env.PHOTOS_TEST_URL ?? "http://localhost:3003", viewport: { width: 1440, height: 900 } },
    webServer: process.env.PHOTOS_TEST_URL ? undefined : {
        command: "NEXT_DIST_DIR=.next-photos NODE_OPTIONS='--require=./tests/photos/data-fixture.cjs' npm run dev -- --port 3003",
        url: "http://localhost:3003", reuseExistingServer: false, timeout: 180000,
    },
});
