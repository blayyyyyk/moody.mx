import { expect, test, type Page } from "@playwright/test";
import type { MalEntry, MalSnapshot } from "../../src/lib/mal-types";

function entries(kind: "manga" | "anime"): MalEntry[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: index + 1, title: `${index === 0 ? "Alpha" : "Title"} ${kind} ${index + 1}`,
    url: `https://myanimelist.net/${kind}/${index + 1}`, coverUrl: `https://cdn.myanimelist.net/images/${kind}/${index + 1}.jpg`,
    score: index > 8 ? null : 10 - Math.floor(index / 2), status: index === 0 ? kind === "manga" ? "reading" : "watching" : "completed",
    completed: index === 0 ? 42 : 12, total: index === 0 ? null : 12, revisiting: false,
    updatedAt: "2026-10-01T00:00:00Z", synopsis: "A synthetic synopsis for the reading and watching spotlight. This is a browser fixture, not live account data.", genres: ["Adventure", "Fantasy"],
  }));
}
const snapshot: MalSnapshot = { username: "TheSwiginator", manga: { state: "ready", entries: entries("manga") }, anime: { state: "ready", entries: entries("anime") } };
const searchEntry: MalEntry = { ...entries("anime")[0], id: 500, title: "A new recommendation", score: null, completed: 0, total: 12, status: "plan_to_watch" };

async function fixtures(page: Page, data: MalSnapshot = snapshot, configured = true) {
  await page.route("**/api/spotify**", route => route.fulfill({ status: 503, json: { configured: false, error: "Synthetic disconnected Spotify fixture" } }));
  await page.route("**/api/mal", route => route.fulfill({ json: data }));
  await page.route("**/api/mal/recommend", route => route.fulfill({ json: { configured, allowance: { limit: 3, remaining: 3, resetsAt: null } } }));
  await page.route("**/api/mal/search?**", route => {
    const kind = new URL(route.request().url()).searchParams.get("kind") === "manga" ? "manga" : "anime";
    return route.fulfill({ json: { entries: [{ ...searchEntry, status: kind === "manga" ? "plan_to_read" : "plan_to_watch" }, data[kind].entries[0]].filter(Boolean) } });
  });
  await page.route("https://cdn.myanimelist.net/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120"><rect width="80" height="120" fill="#718293"/></svg>' }));
}

test("three columns fit desktop, reflow on mobile, and match both themes", async ({ browser, baseURL }) => {
  for (const theme of ["light", "dark"] as const) for (const width of [320, 390, 640, 768, 1024, 1440]) {
    const page = await browser.newPage({ baseURL, viewport: { width, height: 1000 }, colorScheme: theme, reducedMotion: "reduce" });
    await fixtures(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const section = page.getByRole("region", { name: "Manga / Anime", exact: true });
    await expect(section.getByRole("region", { name: "Manga list", exact: true }).getByText("Alpha manga 1")).toBeVisible();
    await section.evaluate(element => element.scrollIntoView({ block: "start" }));
    const geometry = await section.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const columns = Array.from(element.querySelectorAll("[class*=grid] > *")).map(node => node.getBoundingClientRect());
      const overflow = Array.from(element.querySelectorAll("h2,h3,input,a,button")).filter(node => {
        const rect = node.getBoundingClientRect();
        return rect.left < bounds.left - 1 || rect.right > bounds.right + 1;
      }).map(node => node.textContent);
      return { overflow, tops: columns.map(rect => rect.top), bottoms: columns.map(rect => rect.bottom), height: bounds.height };
    });
    expect(geometry.overflow, `${width}px ${theme}`).toEqual([]);
    if (width >= 1024) {
      expect(new Set(geometry.tops).size).toBe(1);
      expect(new Set(geometry.bottoms).size).toBe(1);
      expect(geometry.height).toBeLessThanOrEqual(1000 - 48);
    }
    await expect(section.locator("[class*=panel]").first()).toHaveCSS("border-top-color", theme === "dark" ? "rgb(204, 204, 204)" : "rgb(23, 23, 23)");
    const list = section.getByRole("region", { name: "Manga list", exact: true });
    await expect(list).toHaveCSS("scrollbar-width", "none");
    await expect(list.getByText("42 / ? chapters")).toBeVisible();
    if (width === 390 || width === 1440) await page.screenshot({ path: `test-results/mal-${theme}-${width}.png`, animations: "disabled" });
    await page.close();
  }
});

test("search recommendations update the correct plan list and share one allowance", async ({ page }) => {
  await fixtures(page);
  let remaining = 3;
  const writes: { kind: string; id: number }[] = [];
  await page.route("**/api/mal/recommend", async route => {
    if (route.request().method() === "POST") { writes.push(route.request().postDataJSON()); remaining--; }
    await route.fulfill({ json: { added: true, configured: true, allowance: { limit: 3, remaining, resetsAt: null } } });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("searchbox", { name: "Search anime to recommend" }).fill("new");
  const button = page.getByRole("button", { name: "Add A new recommendation to plan to watch" });
  await expect(button).toBeEnabled();
  await expect(page.getByRole("button", { name: "Add Alpha anime 1 to plan to watch" })).toBeDisabled();
  await button.click();
  await expect(page.getByRole("status").filter({ hasText: "Added “A new recommendation”" })).toBeVisible();
  expect(writes).toEqual([{ kind: "anime", id: 500 }]);
  await page.getByRole("button", { name: "Clear anime search" }).click();
  await expect(page.getByRole("region", { name: "Anime list", exact: true }).getByText("A new recommendation")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search manga to recommend" }).fill("new");
  await page.getByRole("button", { name: "Add A new recommendation to plan to read" }).click();
  expect(writes[1]).toEqual({ kind: "manga", id: 500 });
});

test("scroll controls track boundaries and private/unavailable lists remain independent", async ({ page }) => {
  await fixtures(page, { ...snapshot, anime: { state: "unavailable", entries: [] } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const section = page.getByRole("region", { name: "Manga / Anime", exact: true });
  await expect(section.getByText("The anime list is unavailable.", { exact: false })).toBeVisible();
  const list = section.getByRole("region", { name: "Manga list", exact: true });
  const down = page.getByRole("button", { name: "Scroll manga list down", includeHidden: true });
  const up = page.getByRole("button", { name: "Scroll manga list up", includeHidden: true });
  await expect(down).toBeEnabled();
  await expect(up).toBeDisabled();
  await down.click();
  await expect(up).toBeEnabled();
  await list.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(down).toBeDisabled();
});

test("unconnected recommendations explain the blocker without enabling writes", async ({ page }) => {
  await fixtures(page, snapshot, false);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Browse my lists now. Recommendations open once I connect my MAL account.")).toBeVisible();
  await page.getByRole("searchbox", { name: "Search anime to recommend" }).fill("new");
  await expect(page.getByRole("button", { name: "Add A new recommendation to plan to watch" })).toBeDisabled();
});

test("a background tab loads its lists immediately when it becomes visible", async ({ page }) => {
  await fixtures(page);
  await page.addInitScript(() => Object.defineProperty(document, "hidden", { configurable: true, value: true }));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Recommend three titles.", { exact: false })).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("region", { name: "Manga list", exact: true }).getByText("Alpha manga 1")).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search manga to recommend" })).toBeEnabled();
});
