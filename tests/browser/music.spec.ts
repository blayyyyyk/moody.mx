import { test, expect } from "@playwright/test";

const track = {
    id: "1234567890123456789012", uri: "spotify:track:1234567890123456789012", name: "A test song with a long title",
    artist: "Test artist", album: "Test album", image: "/test-art.svg", url: "https://open.spotify.com/track/1234567890123456789012", durationMs: 213000,
};
const snapshot = { recent: Array.from({ length: 20 }, (_, i) => ({ ...track, playedAt: `2026-10-12T10:${String(59 - i).padStart(2, "0")}:00Z` })), topTrack: track, topArtist: { name: "Test artist", image: "/test-art.svg", url: "https://open.spotify.com/artist/test" }, nowPlaying: track, updatedAt: "2026-10-12T11:00:00Z" };

test.beforeEach(async ({ page }) => {
    // Music's procedural model is real. Keep unrelated, high-poly section models
    // lightweight so software-rendered CI browsers can exercise Music reliably.
    await page.route("**/*.stl", (route) => route.fulfill({ contentType: "model/stl", body: "solid fixture\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid fixture" }));
    await page.route("**/test-art.svg", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#397f8c"/><text x="400" y="200" fill="white" text-anchor="middle" font-family="monospace" font-size="30">TEST ARTWORK</text></svg>' }));
    await page.route("**/api/spotify/queue", (route) => route.fulfill({ json: { allowance: { limit: 3, remaining: 3, resetsAt: null } } }));
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
    let queued = 0;
    await page.route("**/api/spotify/queue", async (route) => {
        if (route.request().method() === "GET") {
            await route.fulfill({ json: { allowance: { limit: 3, remaining: 3 - queued, resetsAt: null } } });
            return;
        }
        expect(route.request().postDataJSON()).toEqual({ uri: track.uri });
        queued += 1;
        await route.fulfill({ json: { queued: true, allowance: { limit: 3, remaining: 3 - queued, resetsAt: Date.now() + 3600000 } } });
    });
    await page.goto("/#music");
    const section = page.getByRole("region", { name: "Music", exact: true });
    await expect(section.getByRole("listitem")).toHaveCount(20);
    await page.getByRole("searchbox").fill("test");
    const add = page.getByRole("button", { name: `Add ${track.name} by ${track.artist} to Blake’s queue` });
    await add.click();
    expect(queued).toBe(1);
    await expect(section.getByText(/Added “A test song/)).toBeVisible();
    await expect(add).toBeEnabled();
    await expect(page.locator("#music-queue-allowance")).toContainText("2 left");
    await add.click();
    await expect(page.locator("#music-queue-allowance")).toContainText("1 left");
    await add.click();
    await expect(page.locator("#music-queue-allowance")).toContainText("0 left");
    await expect(add).toBeDisabled();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(section.getByRole("listitem")).toHaveCount(20);
    await expect(page.locator("#music-queue-allowance")).toContainText("3 songs per hour, shared by everyone. 0 left.");
});

test("history arrows follow scroll boundaries and disappear for a short search result", async ({ page }) => {
    test.setTimeout(90000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/spotify", (route) => route.fulfill({ json: snapshot }));
    await page.route("**/api/spotify/search?*", (route) => route.fulfill({ json: { tracks: [track] } }));
    await page.goto("/#music");
    const scroll = page.getByLabel("Recently played tracks", { exact: true });
    const up = page.locator('button[aria-label="Scroll music list up"]');
    const down = page.locator('button[aria-label="Scroll music list down"]');
    await expect(down).toHaveAttribute("data-visible", "true");
    await expect(up).toHaveAttribute("data-visible", "false");
    await expect(scroll).toHaveCSS("scrollbar-width", "none");
    await down.click();
    await expect(up).toHaveAttribute("data-visible", "true");
    await scroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect(down).toHaveAttribute("data-visible", "false");
    await up.click();
    await expect(down).toHaveAttribute("data-visible", "true");
    await page.getByRole("searchbox").fill("test");
    await expect(page.getByRole("region", { name: "Music", exact: true }).getByRole("listitem")).toHaveCount(1);
    await expect(up).toHaveAttribute("data-visible", "false");
    await expect(down).toHaveAttribute("data-visible", "false");
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
            await expect(section.getByRole("img", { name: /Sony PS-LX310BT record player/ })).toBeVisible();
            const art = section.getByRole("img", { name: "Test album album cover" });
            await expect(art).toHaveCSS("object-fit", "cover");
            const imageBox = await art.boundingBox();
            expect(Math.abs(imageBox!.width - imageBox!.height)).toBeLessThan(1);
            const artistArt = section.getByRole("img", { name: "Test artist", exact: true });
            await expect(artistArt).toHaveCSS("object-fit", "cover");
            const artistBox = await artistArt.boundingBox();
            expect(Math.abs(artistBox!.width - artistBox!.height)).toBeLessThan(1);
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
            if (process.env.MUSIC_SCREENSHOTS === "1") {
                if (width === 390) await page.screenshot({ path: `.impeccable/review/music-mobile-anchor-${theme}.png`, style: "nextjs-portal { display: none; }" });
                await section.screenshot({ path: `.impeccable/review/music-${width}-${theme}.png`, animations: "disabled", style: ".sticky { visibility: hidden; } nextjs-portal { display: none; }" });
            }
        });
    }
}

test("turntable follows Spotify playing and idle states", async ({ page }) => {
    test.setTimeout(180000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    let playing = false;
    await page.route("**/api/spotify", (route) => route.fulfill({ json: { ...snapshot, nowPlaying: playing ? track : null } }));
    await page.goto("/#music");
    const turntable = page.getByRole("img", { name: /Sony PS-LX310BT record player/ });
    await expect(turntable).toHaveAttribute("data-playing", "false");
    await expect(turntable.locator('[data-part="vinyl"]')).toHaveCount(0);
    await expect(turntable.locator('[data-position="resting"]')).toHaveCount(1);
    playing = true;
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(turntable).toHaveAttribute("data-playing", "true");
    await expect(turntable.locator('[data-part="record-label"]')).toHaveAttribute("href", track.image);
    await expect(turntable.locator('[data-position="playing"]')).toHaveCount(1);
    await expect(turntable.locator("text")).toHaveCount(0);
    await expect(turntable.locator('[data-part="vinyl"]')).toHaveCSS("animation-name", "none");
    playing = false;
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(turntable).toHaveAttribute("data-playing", "false");
    await expect(turntable.locator('[data-part="vinyl"]')).toHaveCount(0);
    await expect(turntable.locator('[data-position="resting"]')).toHaveCount(1);
});

test("failed queue writes immediately restore a slot consumed by an in-flight poll", async ({ page }) => {
    await page.route("**/api/spotify", (route) => route.fulfill({ json: snapshot }));
    await page.route("**/api/spotify/search?*", (route) => route.fulfill({ json: { tracks: [track] } }));
    let pending = false;
    let release!: () => void;
    const failureReady = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/spotify/queue", async (route) => {
        if (route.request().method() === "GET") {
            await route.fulfill({ json: { allowance: { limit: 3, remaining: pending ? 0 : 1, resetsAt: Date.now() + 3600000 } } });
            return;
        }
        pending = true;
        await failureReady;
        pending = false;
        await route.fulfill({ status: 503, json: { error: "No active Spotify player.", allowance: { limit: 3, remaining: 1, resetsAt: Date.now() + 3600000 } } });
    });
    await page.goto("/#music");
    await page.getByRole("searchbox").fill("test");
    const add = page.getByRole("button", { name: `Add ${track.name} by ${track.artist} to Blake’s queue` });
    await add.click();
    await expect.poll(() => pending).toBe(true);
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(page.locator("#music-queue-allowance")).toContainText("0 left");
    release();
    await expect(page.locator("#music-queue-allowance")).toContainText("1 left");
    await expect(add).toBeEnabled();
});

test("a playback refresh failure parks the arm and identifies unavailable playback", async ({ page }) => {
    let available = true;
    await page.route("**/api/spotify", (route) => available ? route.fulfill({ json: snapshot }) : route.fulfill({ status: 503, json: { error: "Spotify is temporarily unavailable." } }));
    await page.goto("/#music");
    const turntable = page.getByRole("img", { name: /Sony PS-LX310BT record player/ });
    await expect(turntable).toHaveAttribute("data-playing", "true");
    available = false;
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await expect(turntable).toHaveAttribute("data-playing", "false");
    await expect(page.getByText("Playback unavailable", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Music", exact: true }).getByRole("listitem")).toHaveCount(20);
});

test("short desktops contain the player and metadata within the Music viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 600 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/spotify", (route) => route.fulfill({ json: snapshot }));
    await page.goto("/#music");
    const turntable = page.getByRole("img", { name: /Sony PS-LX310BT record player/ });
    await expect(turntable).toHaveAttribute("data-playing", "true");
    const geometry = await turntable.evaluate((svg) => {
        const drawing = svg.getBoundingClientRect();
        const model = svg.parentElement!;
        const panel = model.nextElementSibling!.getBoundingClientRect();
        const section = svg.closest("section")!;
        return { drawingTop: drawing.top, drawingBottom: drawing.bottom, panelTop: panel.top, panelBottom: panel.bottom, sectionBottom: section.getBoundingClientRect().bottom, headingBottom: section.querySelector("h2")!.getBoundingClientRect().bottom, drawingWidth: drawing.width, panelWidth: panel.width };
    });
    expect(geometry.drawingTop).toBeGreaterThanOrEqual(geometry.headingBottom);
    expect(geometry.drawingBottom).toBeLessThanOrEqual(geometry.panelTop + 1);
    expect(geometry.panelBottom).toBeLessThanOrEqual(geometry.sectionBottom + 1);
    expect(Math.abs(geometry.drawingWidth - geometry.panelWidth)).toBeLessThan(1);
});

test("shared headings honor reduced motion and mobile navigation stays in two rows", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/spotify", (route) => route.fulfill({ json: snapshot }));
    await page.goto("/#music");
    const headings = page.locator("h2[id] > span:first-child");
    for (const heading of await headings.all()) await expect(heading).toHaveCSS("animation-name", "none");
    const nav = page.locator(".sticky.top-0");
    const geometry = await nav.evaluate((el) => ({ rows: getComputedStyle(el).gridTemplateRows.split(" ").length, overflow: el.scrollWidth > el.clientWidth }));
    expect(geometry.rows).toBe(2);
    expect(geometry.overflow).toBe(false);
    await expect(nav.getByRole("button", { name: "Toggle theme", exact: true })).toBeVisible();
});

test("playing vinyl rotates clockwise and player edges align with now-playing borders", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.route("**/api/spotify", (route) => route.fulfill({ json: snapshot }));
    await page.goto("/#music");
    const turntable = page.getByRole("img", { name: /Sony PS-LX310BT record player/ });
    const vinyl = turntable.locator('[data-part="vinyl"]');
    await expect(vinyl).toHaveCSS("animation-play-state", "running");
    await expect(vinyl.locator('[data-part="record-label"]')).toHaveCount(1);
    const initialTime = await vinyl.evaluate((el) => Number(el.getAnimations()[0].currentTime));
    await expect.poll(() => vinyl.evaluate((el) => Number(el.getAnimations()[0].currentTime))).toBeGreaterThan(initialTime + 100);
    const quarterTurn = await vinyl.evaluate((el) => {
        const animation = el.getAnimations()[0];
        animation.pause();
        animation.currentTime = 2000;
        const matrix = new DOMMatrix(getComputedStyle(el).transform);
        return { a: matrix.a, b: matrix.b };
    });
    expect(Math.abs(quarterTurn.a)).toBeLessThan(0.001);
    expect(quarterTurn.b).toBeGreaterThan(0.99);

    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        const geometry = await turntable.evaluate((svg) => {
            const model = svg.parentElement!;
            const info = model.nextElementSibling!;
            const plinth = svg.querySelector('[data-part="plinth"]')!.getBoundingClientRect();
            const panel = info.getBoundingClientRect();
            return {
                left: Math.abs(plinth.left - panel.left), right: Math.abs(plinth.right - panel.right),
                outerBorder: getComputedStyle(model.parentElement!).borderLeftWidth,
                infoBorder: getComputedStyle(info).borderLeftWidth,
            };
        });
        expect(geometry.left).toBeLessThan(1);
        expect(geometry.right).toBeLessThan(1);
        expect(geometry.outerBorder).toBe("0px");
        expect(geometry.infoBorder).toBe("1px");
    }
});
