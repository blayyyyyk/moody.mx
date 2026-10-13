import { expect, test } from "@playwright/test";

test("projects fit every responsive boundary in both themes", async ({ browser, baseURL }) => {
  for (const theme of ["light", "dark"]) {
    for (const width of [320, 390, 639, 640, 767, 768, 1023, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme: theme === "dark" ? "dark" : "light", baseURL });
      await page.addInitScript(theme => localStorage.setItem("theme", theme), theme);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const section = page.getByRole("region", { name: "Projects", exact: true });
      await expect(section.getByRole("button", { name: /^Read README for/ }).first()).toBeVisible();
      if (theme === "dark") await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(section.locator("[class*=explorer]")).toHaveCSS("background-color", theme === "dark" ? "rgb(31, 31, 31)" : "rgb(245, 245, 245)");
      await expect(section.locator("button[data-date][tabindex='0']")).toHaveCount(1);
      await section.evaluate(element => element.scrollIntoView({ block: "start" }));
      const overflow = await section.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return Array.from(element.querySelectorAll("h2,h3,p,a,button")).filter(item => {
          if (item.closest('[aria-label^="Contribution calendar"]')) return false;
          const rect = item.getBoundingClientRect();
          return rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
        }).map(item => item.textContent);
      });
      expect(overflow, `${theme} at ${width}px`).toEqual([]);
      if (width === 390 || width === 1440) {
        await section.evaluate(element => element.scrollIntoView({ block: "start" }));
        await page.screenshot({ path: `test-results/projects-${theme}-${width}.png`, animations: "disabled" });
      }
      await page.close();
    }
  }
});

for (const width of [320, 390, 768, 1440]) test(`README supports markdown, retry and keyboard at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: /^Read README for/ }).first();
  let fail = true;
  await page.route("**/api/projects/*/readme", route => route.fulfill({
    status: fail ? 502 : 200,
    json: fail ? { error: "Unavailable" } : {
      path: "docs/README.md", branch: "main",
      text: "# Example README\n\nA **rendered** readme with [relative link](guide.md), ![sample](images/example.png), and [unsafe](javascript:alert(1)).\n\n```typescript\nconst longLine = '" + "x".repeat(200) + "';\n```\n\n| Column | Other |\n| --- | --- |\n| " + "long".repeat(50) + " | Value |\n\n- [x] Task complete\n\n" + "Paragraph of repository documentation.\n\n".repeat(40),
    },
  }));
  await page.route("https://raw.githubusercontent.com/**", route => route.abort());
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCSS("background-color", "rgb(31, 31, 31)");
  await expect(dialog.getByText("The README couldn’t be loaded.")).toBeVisible();
  fail = false;
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByRole("heading", { name: "Example README" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "relative link" })).toHaveAttribute("href", /\/blob\/main\/docs\/guide.md$/);
  await expect(dialog.locator("img")).toHaveAttribute("src", /raw.githubusercontent.com\/.*\/main\/docs\/images\/example.png$/);
  await expect(dialog.getByText("unsafe", { exact: true })).toHaveAttribute("href", "");
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(dialog.getByRole("button", { name: "Close README" })).toBeInViewport();
    if (width === 390 || width === 1440) await page.screenshot({ path: `test-results/readme-${width}.png`, animations: "disabled" });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("selected repository README is served by the real API", async ({ page, request }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: /^Read README for/ }).first();
  const name = (await trigger.getAttribute("aria-label"))!.replace("Read README for ", "");
  const response = await request.get(`/api/projects/${encodeURIComponent(name)}/readme`);
  expect(response.ok()).toBe(true);
  expect((await response.json()).text.length).toBeGreaterThan(0);
  const invalid = await request.get("/api/projects/not-a-selected-project/readme");
  expect(invalid.status()).toBe(404);
});
