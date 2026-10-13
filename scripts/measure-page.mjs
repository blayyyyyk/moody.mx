import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const mobile = process.env.PERF_MOBILE === "1";
const page = await browser.newPage({ viewport: { width: mobile ? 390 : 1280, height: 800 }, deviceScaleFactor: 1 });
if (process.env.PERF_CPU_RATE) {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.PERF_CPU_RATE) });
}
page.setDefaultTimeout(120000);
await page.addInitScript(() => {
    window.__measurements = { tasks: [], lcp: 0, cls: 0 };
    new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__measurements.tasks.push({ start: entry.startTime, duration: entry.duration });
    }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__measurements.lcp = entry.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__measurements.cls += entry.value; }).observe({ type: "layout-shift", buffered: true });
});
try {
    await page.goto(process.env.PERF_URL ?? "http://localhost:3002", { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(15000);
    const initial = await page.evaluate(() => {
        const navigation = performance.getEntriesByType("navigation")[0];
        const resources = performance.getEntriesByType("resource");
        return { ttfb: navigation.responseStart, fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime, lcp: window.__measurements.lcp, cls: window.__measurements.cls, maxTask: Math.max(0, ...window.__measurements.tasks.map((t) => t.duration)), blockingMs: window.__measurements.tasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0), modelBytes: resources.filter((r) => /\.(stl|glb|bin)/.test(r.name)).reduce((sum, r) => sum + r.decodedBodySize, 0), jsBytes: resources.filter((r) => r.name.includes('.js')).reduce((sum, r) => sum + r.decodedBodySize, 0), heapBytes: performance.memory?.usedJSHeapSize };
    });
    console.log("INITIAL", JSON.stringify(initial));
    await page.evaluate(() => { window.__measurements.tasks = []; });
    for (const id of ["publications", "timeline"]) {
        await page.locator(`#${id}`).first().scrollIntoViewIfNeeded();
        await page.evaluate((id) => {
            const name = id === "publications" ? "simplify_Enchiridion_" : "RTX_3080_FE";
            const heading = document.getElementById(id);
            const root = id === "publications" ? heading?.parentElement : heading?.parentElement?.nextElementSibling;
            const model = document.querySelector(`[data-model="${name}"]`) ?? root?.querySelector("canvas");
            model?.scrollIntoView({ block: "center" });
        }, id);
        await page.waitForTimeout(7000);
    }
    const scroll = await page.evaluate(() => ({ maxTask: Math.max(0, ...window.__measurements.tasks.map((t) => t.duration)), blockingMs: window.__measurements.tasks.reduce((sum, t) => sum + Math.max(0, t.duration - 50), 0), heapBytes: performance.memory?.usedJSHeapSize, readyModels: document.querySelectorAll('[data-model-ready]').length, modelBytes: performance.getEntriesByType('resource').filter((r) => /\.(stl|glb|bin)/.test(r.name)).reduce((sum, r) => sum + r.decodedBodySize, 0) }));
    console.log("SCROLL", JSON.stringify(scroll));
    if (process.env.PERF_ASSERT !== "0") {
        const failures = [];
        const maximum = (label, value, budget) => {
            if (!Number.isFinite(value) || value > budget) failures.push(`${label}: ${value} > ${budget}`);
        };
        maximum("initial LCP", initial.lcp, 2000);
        maximum("initial CLS", initial.cls, 0.05);
        maximum("initial longest task", initial.maxTask, 300);
        maximum("initial blocking time", initial.blockingMs, 1000);
        maximum("initial JavaScript", initial.jsBytes, 2000000);
        maximum("initial model bytes", initial.modelBytes, 0);
        maximum("scroll longest task", scroll.maxTask, 500);
        maximum("scroll blocking time", scroll.blockingMs, 1500);
        maximum("scroll model bytes", scroll.modelBytes, 1200000);
        if (scroll.readyModels < 2) failures.push(`ready models: ${scroll.readyModels} < 2`);
        if (failures.length) throw new Error(`Performance budgets failed:\n${failures.join("\n")}`);
    }
} finally { await browser.close(); }
