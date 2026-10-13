import { test, expect } from "@playwright/test";

const track = {
    id: "1234567890123456789012", uri: "spotify:track:1234567890123456789012", name: "A test song with a long title",
    artist: "Test artist", album: "Test album", image: "/test-art.svg", url: "https://open.spotify.com/track/1234567890123456789012", durationMs: 213000,
};
const snapshot = { recent: Array.from({ length: 20 }, (_, i) => ({ ...track, playedAt: `2026-10-12T10:${String(59 - i).padStart(2, "0")}:00Z` })), topTrack: track, topArtist: { name: "Test artist", image: "/test-art.svg", url: "https://open.spotify.com/artist/test" }, nowPlaying: track, updatedAt: "2026-10-12T11:00:00Z" };

test.beforeEach(async ({ page }) => {
    await page.route("**/test-art.svg", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#397f8c"/><text x="200" y="200" fill="white" text-anchor="middle" font-family="monospace" font-size="30">TEST ARTWORK</text></svg>' }));
});

test("disconnected state is explicit and queue search is unavailable", async ({ page }) => {
    await page.route("**/api/spotify", (route) => route.fulfill({ status: 503, json: { configured: false, error: "Spotify isn't connected yet." } }));
    await page.goto("/#music");
    await expect(page.getByText("The listening feed is waiting for Blake to connect Spotify.")).toBeVisible();
    await expect(page.getByRole("searchbox")).toBeDisabled();
});

test("search replaces history, queue feedback works, and clearing restores history", async ({ page }) => {
    await page.route("**/api/spotify", (route) => route.fulfill({ json: snapshot }));
    await page.route("**/api/spotify/search?*", (route) => route.fulfill({ json: { tracks: [track] } }));
    let queued = false;
    await page.route("**/api/spotify/queue", async (route) => {
        expect(route.request().postDataJSON()).toEqual({ uri: track.uri });
        queued = true;
        await route.fulfill({ json: { queued: true } });
    });
    await page.goto("/#music");
    const section = page.getByRole("region", { name: "Music", exact: true });
    await expect(section.getByRole("listitem")).toHaveCount(20);
    await page.getByRole("searchbox").fill("test");
    const add = page.getByRole("button", { name: `Add ${track.name} by ${track.artist} to Blake’s queue` });
    await add.click();
    expect(queued).toBe(true);
    await expect(section.getByText(/Added “A test song/)).toBeVisible();
    await expect(add).toBeDisabled();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(section.getByRole("listitem")).toHaveCount(20);
    await expect(section.getByText("Queue added. Please wait a minute before adding another song.")).toBeVisible();
});

for (const width of [1440, 1024, 390]) {
    for (const theme of ["light", "dark"]) {
        test(`responsive music at ${width}px in ${theme} theme`, async ({ page }) => {
            test.setTimeout(90000);
            await page.route("**/api/spotify", (route) => route.fulfill({ json: snapshot }));
            await page.setViewportSize({ width, height: 900 });
            await page.emulateMedia({ colorScheme: theme as "light" | "dark", reducedMotion: "reduce" });
            await page.goto("/#music");
            const section = page.getByRole("region", { name: "Music", exact: true });
            await expect(section.getByRole("listitem")).toHaveCount(20);
            await expect(section.locator("canvas")).toBeVisible();
            await expect(page.locator("html")).toHaveClass(theme);
            const geometry = await section.evaluate((el) => {
                const grid = el.children[1];
                return { height: el.getBoundingClientRect().height, overflow: el.scrollWidth > el.clientWidth, columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length };
            });
            expect(geometry.overflow).toBe(false);
            expect(geometry.columns).toBe(width >= 1024 ? 3 : 1);
            if (width >= 1024) expect(geometry.height).toBeLessThanOrEqual(900);
            else expect(geometry.height).toBeGreaterThan(900);
            await page.getByRole("link", { name: "Music", exact: true }).click();
            const headingBox = await section.getByRole("heading", { name: "Music", exact: true }).boundingBox();
            const navBox = await page.locator(".sticky.top-0").boundingBox();
            expect(headingBox!.y).toBeGreaterThanOrEqual(navBox!.y + navBox!.height);
            if (width === 390) await page.screenshot({ path: `.impeccable/review/music-mobile-anchor-${theme}.png`, style: "nextjs-portal { display: none; }" });
            await section.screenshot({ path: `.impeccable/review/music-${width}-${theme}.png`, animations: "disabled", style: ".sticky { visibility: hidden; } nextjs-portal { display: none; }" });
        });
    }
}
