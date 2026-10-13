import { test, expect } from "@playwright/test";

test("ASCII stays alive in normal and gentle motion and resumes after scrolling", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const hero = page.locator("[data-hero-animated]");
    const art = hero.locator("pre");
    await expect(art).not.toHaveText("");
    await expect(art).toHaveCSS("font-family", /JetBrains Mono/);
    await expect(art).toHaveCSS("letter-spacing", "3px");
    await expect(page.locator(".font-mono").first()).toHaveCSS("font-family", /JetBrains Mono/);
    await expect(hero).toHaveAttribute("data-hero-motion", "full");
    const initial = await art.textContent();
    await expect.poll(() => art.textContent()).not.toBe(initial);
    await page.locator("#music").scrollIntoViewIfNeeded();
    await expect(hero).toHaveAttribute("data-hero-animated", "false");
    await page.waitForTimeout(150);
    const paused = await art.textContent();
    await page.waitForTimeout(300);
    expect(await art.textContent()).toBe(paused);
    await page.evaluate(() => scrollTo(0, 0));
    await expect(hero).toHaveAttribute("data-hero-animated", "true");
    await expect.poll(() => art.textContent()).not.toBe(paused);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(hero).toHaveAttribute("data-hero-motion", "gentle");
    const gentle = await art.textContent();
    await expect.poll(() => art.textContent()).not.toBe(gentle);
});

test("heavy models stay off the initial path and pause offscreen", async ({ page }) => {
    const models: string[] = [];
    page.on("request", (request) => { if (/\.(stl|glb|bin)(\?|$)/.test(request.url())) models.push(request.url()); });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("blake", { exact: true }).first()).toBeVisible();
    await expect(page.locator("[data-hero-animated=true]")).toBeVisible();
    await page.waitForTimeout(1000);
    expect(models).toHaveLength(0);
    await page.locator("#publications").first().scrollIntoViewIfNeeded();
    const book = page.locator('[data-model="simplify_Enchiridion_"]');
    await expect(book.locator("[data-model-ready]")).toBeVisible();
    await expect(book).toHaveAttribute("data-animated", "true");
    await expect(page.locator("[data-hero-animated]")).toHaveAttribute("data-hero-animated", "false");
    const gpu = page.locator('[data-model="RTX_3080_FE"]');
    await gpu.scrollIntoViewIfNeeded();
    await expect(gpu.locator("[data-model-ready]")).toBeVisible();
    expect(models.some((url) => url.endsWith(".stl"))).toBe(false);
    expect(models.filter((url) => url.endsWith(".wire.bin"))).toHaveLength(2);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(gpu).toHaveAttribute("data-animated", "false");
    await expect(book).toHaveAttribute("data-animated", "false");
    await page.locator("#publications").first().scrollIntoViewIfNeeded();
    await expect(book).toHaveAttribute("data-animated", "true");
    expect(models.filter((url) => url.includes("simplify_Enchiridion_"))).toHaveLength(1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(book).toHaveAttribute("data-animated", "false");
});

test("model download failures can be retried", async ({ page }) => {
    let fail = true;
    await page.route("**/simplify_Enchiridion_.wire.bin", (route) => fail ? route.fulfill({ status: 503 }) : route.continue());
    await page.goto("/#publications");
    const book = page.locator('[data-model="simplify_Enchiridion_"]');
    await expect(book.getByRole("button", { name: "Retry 3D model" })).toBeVisible();
    fail = false;
    await book.getByRole("button", { name: "Retry 3D model" }).click();
    await expect(book.locator("[data-model-ready]")).toBeVisible();
});

test("photo camera stays deferred until its drawer opens", async ({ page }) => {
    const glbs: string[] = [];
    page.on("request", (request) => { if (request.url().endsWith(".glb")) glbs.push(request.url()); });
    await page.goto("/");
    expect(glbs).toHaveLength(0);
    await page.getByText("view photo details", { exact: true }).first().click();
    const photo = page.getByRole("dialog");
    await expect(photo).toBeVisible();
    await expect(photo.locator("canvas")).toBeVisible();
    await expect.poll(() => glbs.length).toBe(1);
    await page.keyboard.press("Escape");
    await expect(photo).toHaveCount(0);
});

for (const width of [1280, 390]) {
    for (const theme of ["light", "dark"] as const) {
        test(`models and ASCII landscape at ${width}px, ${theme}`, async ({ page }) => {
            await page.setViewportSize({ width, height: 844 });
            await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
            await page.goto("/");
            await expect(page.locator("[data-hero-animated] pre")).not.toHaveText("");
            await page.screenshot({ path: `test-results/hero-${width}-${theme}.png` });
            for (const [section, model] of [["publications", "simplify_Enchiridion_"], ["timeline", "RTX_3080_FE"]]) {
                await page.locator(`#${section}`).first().scrollIntoViewIfNeeded();
                const node = page.locator(`[data-model="${model}"]`);
                await node.scrollIntoViewIfNeeded();
                await expect(node.locator("[data-model-ready]")).toBeVisible();
                await expect(node).toHaveAttribute("data-animated", "false");
                await expect(node).toHaveScreenshot(`${model}-${width}-${theme}.png`, { animations: "disabled", maxDiffPixelRatio: 0.01 });
            }
            expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
        });
    }
}
