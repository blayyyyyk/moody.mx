"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "../../../styles/Ribbons.module.css";
import { arcTable, cardsAbove, drawChunks, hashString, planRibbons, type Band, type Rect } from "@/lib/ribbon-geometry";

type Layout = { width: number; height: number; cards: Rect[]; visuals: Rect[]; under: Rect[] };

/**
 * Obstruction-reducing behaviours, combinable via `?ribbons=a,b` while comparing them:
 * - weave: ribbons pass over alternating cards (the original treatment)
 * - visuals: ribbons pass over only `[data-ribbon-visual]` elements and under every card; text inside a visual that
 *   is marked `[data-ribbon-under]` (titles, captions, metadata bars) stays on top
 * - fade: ribbons above the content fade out near the viewport's vertical centre
 * - settle: ribbons above the content fade out while the page is not scrolling
 * - clear: ribbons above the content clear away from whatever is hovered or focused
 */
const DEFAULT_MODES = ["settle"];
function readModes() {
    const requested = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("ribbons");
    return new Set((requested ?? DEFAULT_MODES.join(",")).split(","));
}

const sameRects = (a: Rect[], b: Rect[]) => a.length === b.length
    && a.every((r, i) => Math.abs(r.x - b[i].x) < 0.5 && Math.abs(r.y - b[i].y) < 0.5 && Math.abs(r.w - b[i].w) < 0.5 && Math.abs(r.h - b[i].h) < 0.5);

const SPEED = 36; // px per second along the ribbon
const GENTLE_SPEED = 12; // reduced motion: a slow drift, like the ASCII hero
const MIN_CARD = { w: 96, h: 40 };
// Canvases are split into tiles that scroll natively with the section; only tiles near the viewport hold pixels.
const TILE = 512;
const OPAQUE_LEAVES = new Set(["svg", "canvas", "img", "picture", "video", "iframe"]);

function intersect(a: Rect, b: Rect): Rect | null {
    const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
    const w = Math.min(a.x + a.w, b.x + b.w) - x, h = Math.min(a.y + a.h, b.y + b.h) - y;
    return w > 0 && h > 0 ? { x, y, w, h } : null;
}

function bordered(style: CSSStyleDeclaration) {
    return (["Top", "Right", "Bottom", "Left"] as const).every(side =>
        parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0
        && !["none", "hidden"].includes(style.getPropertyValue(`border-${side.toLowerCase()}-style`)));
}

/** Outermost bordered panels inside `content`, clipped by any scrolling or overflow-hidden ancestors. */
function measureCards(content: HTMLElement, origin: DOMRect): Rect[] {
    const cards: Rect[] = [];
    const visit = (element: Element, clip: Rect) => {
        for (const child of Array.from(element.children)) {
            if (OPAQUE_LEAVES.has(child.localName)) continue;
            const style = getComputedStyle(child);
            if (style.display === "none" || style.visibility === "hidden") continue;
            const box = child.getBoundingClientRect();
            const rect = { x: box.left - origin.left, y: box.top - origin.top, w: box.width, h: box.height };
            if (box.width >= MIN_CARD.w && box.height >= MIN_CARD.h && bordered(style)) {
                const visible = intersect(rect, clip);
                if (visible) cards.push(visible);
                continue;
            }
            const clips = style.overflowX !== "visible" || style.overflowY !== "visible";
            const next = clips && style.display !== "contents" ? intersect(rect, clip) : clip;
            if (next) visit(child, next);
        }
    };
    visit(content, { x: 0, y: 0, w: origin.width, h: origin.height });
    return cards;
}

/** Corridors through the largest visuals, at most one per ribbon and spaced apart; the rest share the section evenly. */
function visualBands(visuals: Rect[], count: number, ribbonWidth: number): Band[] {
    const chosen: Rect[] = [];
    for (const visual of [...visuals].sort((a, b) => b.w * b.h - a.w * a.h)) {
        if (chosen.length === count) break;
        const centre = visual.y + visual.h / 2;
        if (chosen.every(other => Math.abs(other.y + other.h / 2 - centre) > ribbonWidth * 2)) chosen.push(visual);
    }
    return chosen.sort((a, b) => a.y - b.y).map(visual => ({
        center: Math.round(visual.y + visual.h / 2),
        amplitude: Math.round(Math.min(Math.max(visual.h * 0.35, ribbonWidth * 0.5), 200)),
    }));
}

/**
 * Wraps a page section with marquee ribbons that weave over and under its bordered cards.
 * The back layer sits behind the content with every card cut out; the front layer sits above it,
 * showing each ribbon only over the cards it passes on top of. Both are canvas tiles: glyphs are placed from a
 * precomputed arc-length table, so animating the marquee never asks the browser to lay out text.
 */
export default function RibbonSection({ title, children }: { title: string; children: ReactNode }) {
    const rootRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const backTiles = useRef<(HTMLCanvasElement | null)[]>([]);
    const frontTiles = useRef<(HTMLCanvasElement | null)[]>([]);
    const frontRef = useRef<HTMLDivElement>(null);
    const phaseRef = useRef(0);
    const [modes] = useState(readModes);
    const [near, setNear] = useState(false);
    const [layout, setLayout] = useState<Layout | null>(null);

    const compact = (layout?.width ?? 1024) < 640;
    const ribbonWidth = compact ? 32 : 52;
    const fontSize = Math.round(ribbonWidth * 0.66);
    const unit = `${title.toUpperCase()} `;

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setNear(true); observer.disconnect(); }
        }, { rootMargin: "400px" });
        observer.observe(root);
        return () => observer.disconnect();
    }, []);

    // Track the section's size and its cards. Carousels and accordions move cards without resizing the section, so
    // DOM mutations and inner scrolling also trigger a (throttled) re-measure.
    useEffect(() => {
        const root = rootRef.current, content = contentRef.current;
        if (!near || !root || !content) return;
        let frame = 0, last = 0, timer: ReturnType<typeof setTimeout> | undefined;
        const measure = () => {
            frame = 0; last = performance.now();
            const origin = root.getBoundingClientRect();
            const cards = measureCards(content, origin);
            const bounds = { x: 0, y: 0, w: origin.width, h: origin.height };
            const rects = (selector: string, min: number) => Array.from(content.querySelectorAll(selector), element => {
                const box = element.getBoundingClientRect();
                return box.width >= min && box.height >= min
                    ? intersect({ x: box.left - origin.left, y: box.top - origin.top, w: box.width, h: box.height }, bounds)
                    : null;
            }).filter((rect): rect is Rect => rect !== null);
            const visuals = rects("[data-ribbon-visual]", 40), under = rects("[data-ribbon-under]", 1);
            setLayout(previous => {
                const same = previous && previous.width === origin.width && previous.height === origin.height
                    && sameRects(previous.cards, cards) && sameRects(previous.visuals, visuals) && sameRects(previous.under, under);
                return same ? previous : { width: origin.width, height: origin.height, cards, visuals, under };
            });
        };
        const schedule = () => {
            if (frame || timer) return;
            const wait = Math.max(0, 120 - (performance.now() - last));
            timer = setTimeout(() => { timer = undefined; frame = requestAnimationFrame(measure); }, wait);
        };
        const resize = new ResizeObserver(schedule);
        resize.observe(root);
        const mutation = new MutationObserver(schedule);
        mutation.observe(content, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class", "data-state", "open", "hidden"] });
        content.addEventListener("scroll", schedule, { capture: true, passive: true });
        content.addEventListener("transitionend", schedule, true);
        content.addEventListener("load", schedule, true);
        schedule();
        return () => {
            resize.disconnect(); mutation.disconnect();
            content.removeEventListener("scroll", schedule, true);
            content.removeEventListener("transitionend", schedule, true);
            content.removeEventListener("load", schedule, true);
            cancelAnimationFrame(frame); clearTimeout(timer);
        };
    }, [near]);

    const width = layout?.width, height = layout?.height;
    const visualMode = modes.has("visuals");
    // In visuals mode each ribbon is routed through one of the larger visuals, so it has something to wrap.
    // Sections get one ribbon per corridor, so a section with a single visual is not crowded by extra ribbons.
    const bandKey = visualMode && layout ? JSON.stringify(visualBands(layout.visuals, compact ? 2 : 3, ribbonWidth)) : "";
    const plans = useMemo(() => {
        if (!width || !height) return [];
        if (!bandKey) return planRibbons(title, width, height, compact ? 2 : 3, ribbonWidth);
        const bands = JSON.parse(bandKey) as Band[];
        return planRibbons(title, width, height, bands.length, ribbonWidth, bands);
    }, [title, width, height, compact, ribbonWidth, bandKey]);
    const ribbons = useMemo(() => plans.map(plan => {
        const table = arcTable(plan.segments);
        return {
            direction: plan.direction,
            table,
            chunks: drawChunks(plan).map(chunk => ({
                border: new Path2D(chunk.border),
                fill: new Path2D(chunk.fill),
                textFrom: table.segmentStarts[chunk.textStart],
                textTo: table.segmentStarts[chunk.end],
                top: chunk.top - ribbonWidth,
                bottom: chunk.bottom + ribbonWidth,
            })),
        };
    }), [plans, ribbonWidth]);
    const clips = useMemo(() => {
        if (!layout) return null;
        // Weave: over alternating cards. Visuals: over alternating visuals (starting with the first one crossed),
        // and under every card and visual otherwise.
        const targets = visualMode ? layout.visuals : layout.cards;
        const cutouts = visualMode ? [...layout.cards, ...layout.visuals] : layout.cards;
        const above = plans.map((plan, i) => cardsAbove(plan, targets, visualMode ? 0 : hashString(`${title}:${i}`)));
        return { targets, cutouts, above, under: visualMode ? layout.under : [] };
    }, [plans, layout, title, visualMode]);
    const tileCount = height ? Math.ceil(height / TILE) : 0;

    // Draw loop: one clock per section, running only while a tile is near the viewport (rAF also stops in hidden
    // tabs); slower under reduced motion.
    useEffect(() => {
        const root = rootRef.current;
        if (!root || !clips || !width || !height || !tileCount) return;
        let cancelled = false, frame = 0, previous = 0;
        const active = new Set<number>();
        const motion = matchMedia("(prefers-reduced-motion: reduce)");
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const styles = getComputedStyle(root);
        const font = `600 ${fontSize}px ${styles.fontFamily}`;
        let ink = "", surface = "";
        const readColors = () => {
            const theme = getComputedStyle(document.documentElement);
            ink = `hsl(${theme.getPropertyValue("--primary").trim()})`;
            surface = `hsl(${theme.getPropertyValue("--secondary").trim()})`;
        };
        readColors();
        let advance = 0, lift = 0;
        let rootTop = 0, sectionLeft = 0;
        const fade = modes.has("fade"), clearing = modes.has("clear");
        // Per-target opacity for ribbons above the content; "clear" eases a target's ribbons away while it is in use.
        const opacity = clips.targets.map(() => 1);
        let pointer: { x: number; y: number } | null = null;
        const onPointer = (event: PointerEvent) => { pointer = { x: event.clientX, y: event.clientY }; };
        const onLeave = (event: PointerEvent) => { if (!event.relatedTarget) pointer = null; };
        if (clearing) {
            window.addEventListener("pointermove", onPointer, { passive: true });
            window.addEventListener("pointerdown", onPointer, { passive: true });
            document.addEventListener("pointerout", onLeave);
        }
        const updateOpacity = (dt: number) => {
            if (!clearing) return;
            const focused = root.contains(document.activeElement) && document.activeElement !== document.body
                ? document.activeElement!.getBoundingClientRect() : null;
            const inUse = (target: Rect) => {
                const hits = (x: number, y: number) => x >= target.x && x <= target.x + target.w && y >= target.y && y <= target.y + target.h;
                return (pointer && hits(pointer.x - sectionLeft, pointer.y - rootTop))
                    || (focused && hits(focused.left + focused.width / 2 - sectionLeft, focused.top + focused.height / 2 - rootTop));
            };
            clips.targets.forEach((target, t) => {
                const goal = inUse(target) ? 0 : 1;
                opacity[t] += (goal - opacity[t]) * Math.min(1, dt * 10);
            });
        };

        const drawGlyphs = (ctx: CanvasRenderingContext2D, ribbon: typeof ribbons[number], from: number, to: number, top: number, bottom: number) => {
            const { x, y, angle } = ribbon.table;
            const period = advance * unit.length;
            const base = ((phaseRef.current * ribbon.direction) % period + period) % period - period;
            const first = Math.max(0, Math.floor((from - base) / advance) - 1);
            const last = Math.ceil((to - base) / advance);
            for (let k = first; k <= last; k++) {
                const s = base + (k + 0.5) * advance;
                if (s < from || s > to) continue;
                const char = unit[k % unit.length];
                if (char === " ") continue;
                const i = Math.min(x.length - 1, Math.round(s));
                if (y[i] < top - fontSize || y[i] > bottom + fontSize) continue;
                const cos = Math.cos(angle[i]) * dpr, sin = Math.sin(angle[i]) * dpr;
                ctx.setTransform(cos, sin, -sin, cos, x[i] * dpr, (y[i] - top) * dpr);
                ctx.fillText(char, 0, lift);
            }
        };

        const drawTile = (canvas: HTMLCanvasElement, index: number, layer: "back" | "front") => {
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const top = index * TILE, bottom = Math.min(height, top + TILE);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = font;
            ctx.textAlign = "center";
            ctx.lineCap = "butt";
            ctx.lineJoin = "round";
            ctx.fillStyle = ink;
            const drawRibbon = (ribbon: typeof ribbons[number], from: number, to: number) => {
                for (const chunk of ribbon.chunks) {
                    if (chunk.bottom < from || chunk.top > to) continue;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
                    ctx.lineWidth = ribbonWidth;
                    ctx.strokeStyle = ink;
                    ctx.stroke(chunk.border);
                    ctx.lineWidth = ribbonWidth - 2;
                    ctx.strokeStyle = surface;
                    ctx.stroke(chunk.fill);
                    drawGlyphs(ctx, ribbon, chunk.textFrom, chunk.textTo, top, bottom);
                }
            };
            if (layer === "back") {
                for (const ribbon of ribbons) drawRibbon(ribbon, top, bottom);
                // Erase every card: the back layer only shows in gutters and open space.
                ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
                ctx.globalCompositeOperation = "destination-out";
                for (const cutout of clips.cutouts) if (cutout.y < bottom && cutout.y + cutout.h > top) ctx.fillRect(cutout.x, cutout.y, cutout.w, cutout.h);
                ctx.globalCompositeOperation = "source-over";
                return;
            }
            ribbons.forEach((ribbon, r) => {
                for (const t of clips.above[r]) {
                    const target = clips.targets[t];
                    if (opacity[t] < 0.01 || target.y > bottom || target.y + target.h < top) continue;
                    ctx.save();
                    ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
                    ctx.beginPath();
                    ctx.rect(target.x, target.y, target.w, target.h);
                    ctx.clip();
                    ctx.globalAlpha = opacity[t];
                    drawRibbon(ribbon, Math.max(top, target.y), Math.min(bottom, target.y + target.h));
                    ctx.restore();
                }
            });
            if (clips.under.length) {
                // Titles, captions, and metadata inside visuals sit above the ribbons.
                ctx.setTransform(dpr, 0, 0, dpr, 0, -top * dpr);
                ctx.globalCompositeOperation = "destination-out";
                for (const rect of clips.under) if (rect.y < bottom && rect.y + rect.h > top) ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
                ctx.globalCompositeOperation = "source-over";
            }
            if (fade) {
                // Keep the reading area at the viewport's centre clear; ribbons rise over the content toward its edges.
                const viewport = window.innerHeight, centre = viewport / 2 - rootTop - top;
                const inner = viewport * 0.12, outer = viewport * 0.4;
                const gradient = ctx.createLinearGradient(0, (centre - outer) * dpr, 0, (centre + outer) * dpr);
                gradient.addColorStop(0, "#000");
                gradient.addColorStop((outer - inner) / (2 * outer), "rgba(0,0,0,0)");
                gradient.addColorStop((outer + inner) / (2 * outer), "rgba(0,0,0,0)");
                gradient.addColorStop(1, "#000");
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.globalCompositeOperation = "destination-in";
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = "source-over";
                ctx.fillStyle = ink;
            }
        };

        const draw = () => {
            const box = root.getBoundingClientRect();
            rootTop = box.top; sectionLeft = box.left;
            for (const index of active) {
                const back = backTiles.current[index], front = frontTiles.current[index];
                if (back) drawTile(back, index, "back");
                if (front) drawTile(front, index, "front");
            }
        };
        const tick = (now: number) => {
            const dt = (now - (previous || now)) / 1000;
            phaseRef.current += dt * (motion.matches ? GENTLE_SPEED : SPEED);
            previous = now;
            updateOpacity(dt);
            draw();
            frame = active.size ? requestAnimationFrame(tick) : 0;
        };
        const size = (index: number, on: boolean) => {
            const tileHeight = Math.min(TILE, height - index * TILE);
            for (const canvas of [backTiles.current[index], frontTiles.current[index]]) {
                if (!canvas) continue;
                // Offscreen tiles release their pixel buffers.
                canvas.width = on ? Math.round(width * dpr) : 0;
                canvas.height = on ? Math.round(tileHeight * dpr) : 0;
            }
        };
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const index = Number((entry.target as HTMLElement).dataset.tile);
                if (entry.isIntersecting === active.has(index)) continue;
                if (entry.isIntersecting) active.add(index); else active.delete(index);
                size(index, entry.isIntersecting);
            }
            if (cancelled || !advance) return;
            draw();
            if (active.size && !frame) { previous = 0; frame = requestAnimationFrame(tick); }
        }, { rootMargin: "200px 0px" });
        const theme = new MutationObserver(() => { readColors(); draw(); });
        theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

        document.fonts.load(font).catch(() => undefined).then(() => {
            if (cancelled) return;
            const ctx = document.createElement("canvas").getContext("2d");
            if (!ctx) return;
            ctx.font = font;
            advance = ctx.measureText(unit.repeat(8)).width / (unit.length * 8);
            // Centre capitals on the ribbon's midline.
            lift = ctx.measureText("H").actualBoundingBoxAscent / 2;
            backTiles.current.slice(0, tileCount).forEach(canvas => canvas && observer.observe(canvas));
        });
        return () => {
            cancelled = true;
            observer.disconnect(); theme.disconnect();
            window.removeEventListener("pointermove", onPointer);
            window.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("pointerout", onLeave);
            cancelAnimationFrame(frame);
            for (let index = 0; index < tileCount; index++) size(index, false);
        };
    }, [ribbons, clips, width, height, tileCount, fontSize, ribbonWidth, unit, modes]);

    // Settle: ribbons above the content show while the page scrolls and fade away once it rests.
    useEffect(() => {
        const front = frontRef.current;
        if (!modes.has("settle") || !front) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        front.dataset.settled = "true";
        const onScroll = () => {
            front.dataset.settled = "false";
            clearTimeout(timer);
            timer = setTimeout(() => { front.dataset.settled = "true"; }, 900);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => { window.removeEventListener("scroll", onScroll); clearTimeout(timer); };
    }, [modes, layout]);

    const tiles = (layer: "back" | "front") => Array.from({ length: tileCount }, (_, index) => <canvas
        key={index}
        data-tile={index}
        ref={node => { (layer === "back" ? backTiles : frontTiles).current[index] = node; }}
        className={styles.tile}
        style={{ top: index * TILE, height: Math.min(TILE, (height ?? 0) - index * TILE) }}
    />);

    return (
        <div ref={rootRef} className={styles.root}>
            {layout && <div data-ribbon-layer="back" className={`${styles.layer} ${styles.back}`} aria-hidden="true">{tiles("back")}</div>}
            <div ref={contentRef} className={styles.content}>{children}</div>
            {layout && <div ref={frontRef} data-ribbon-layer="front" className={`${styles.layer} ${styles.front}`} aria-hidden="true">{tiles("front")}</div>}
        </div>
    );
}
