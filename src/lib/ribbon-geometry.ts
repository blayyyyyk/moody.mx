export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
/** Cubic Bézier: start, two controls, end. */
export type Segment = [Point, Point, Point, Point];

export type RibbonPlan = {
    segments: Segment[];
    /** Segment indices where a later draw chunk begins, so a loop's exit passes over its entry. */
    splits: number[];
    /** Text travel direction along the path. */
    direction: 1 | -1;
};

export function hashString(value: string) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return hash >>> 0;
}

export function seededRandom(seed: number) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Centripetal Catmull-Rom through the knots, converted to cubic Béziers (no cusps or overshoot on uneven spacing). */
export function catmullRom(knots: Point[]): Segment[] {
    const at = (i: number): Point => {
        if (i < 0) return { x: 2 * knots[0].x - knots[1].x, y: 2 * knots[0].y - knots[1].y };
        if (i >= knots.length) {
            const a = knots[knots.length - 1], b = knots[knots.length - 2];
            return { x: 2 * a.x - b.x, y: 2 * a.y - b.y };
        }
        return knots[i];
    };
    const segments: Segment[] = [];
    for (let i = 0; i < knots.length - 1; i++) {
        const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
        const d1 = Math.max(Math.hypot(p1.x - p0.x, p1.y - p0.y) ** 0.5, 1e-3);
        const d2 = Math.max(Math.hypot(p2.x - p1.x, p2.y - p1.y) ** 0.5, 1e-3);
        const d3 = Math.max(Math.hypot(p3.x - p2.x, p3.y - p2.y) ** 0.5, 1e-3);
        const a = 2 * d1 * d1 + 3 * d1 * d2 + d2 * d2, an = 3 * d1 * (d1 + d2);
        const b = 2 * d3 * d3 + 3 * d3 * d2 + d2 * d2, bn = 3 * d3 * (d3 + d2);
        segments.push([
            p1,
            { x: (d1 * d1 * p2.x - d2 * d2 * p0.x + a * p1.x) / an, y: (d1 * d1 * p2.y - d2 * d2 * p0.y + a * p1.y) / an },
            { x: (d3 * d3 * p1.x - d2 * d2 * p3.x + b * p2.x) / bn, y: (d3 * d3 * p1.y - d2 * d2 * p3.y + b * p2.y) / bn },
            p2,
        ]);
    }
    return segments;
}

/** Vertical corridor for one ribbon: it wanders within `amplitude` of `center`. */
export type Band = { center: number; amplitude: number };

/**
 * Plans `count` ribbons that cross a `width` × `height` section from left to right.
 * Shapes are seeded by the section title, so they stay recognisable across resizes.
 * Without `bands`, the ribbons share the section height evenly.
 */

export function planRibbons(title: string, width: number, height: number, count: number, ribbonWidth: number, bands: Band[] = []): RibbonPlan[] {
    const plans: RibbonPlan[] = [];
    const pad = ribbonWidth * 2;
    const band = height / count;
    for (let index = 0; index < count; index++) {
        const random = seededRandom(hashString(`${title}:${index}`));
        const step = clamp(width / 5, 150, 280);
        const center = bands[index]?.center ?? band * (index + 0.5);
        const amplitude = bands[index]?.amplitude ?? Math.min(band * 0.55, 240, width * 0.25);
        const pickY = () => clamp(center + (random() * 2 - 1) * amplitude, ribbonWidth, height - ribbonWidth);
        const knots: Point[] = [{ x: -pad, y: pickY() }];
        const splits: number[] = [];
        const loopRadius = clamp(Math.min(band, width) * 0.3, ribbonWidth * 1.5, ribbonWidth * 2.6);
        const loopAt = random() < 0.75 ? width * (0.2 + random() * 0.6) : Infinity;
        const loopSide = random() < 0.5 ? 1 : -1;
        let looped = false;
        while (knots[knots.length - 1].x < width + pad) {
            const last = knots[knots.length - 1];
            if (!looped && last.x >= loopAt && knots.length > 1) {
                looped = true;
                // Prolate cycloid: the ribbon curls back over itself once, then carries on.
                const previous = knots[knots.length - 2];
                const length = Math.hypot(last.x - previous.x, last.y - previous.y) || 1;
                const tangent = { x: (last.x - previous.x) / length, y: (last.y - previous.y) / length };
                const normal = { x: -tangent.y * loopSide, y: tangent.x * loopSide };
                const b = loopRadius, a = b * 0.22;
                // Dense knots keep each chunk's reach-back (up to three segments) well clear of the crossing.
                for (let k = 1; k <= 16; k++) {
                    const theta = -Math.PI + (k * Math.PI) / 8;
                    const u = a * (theta + Math.PI) - b * Math.sin(theta);
                    const v = b * (1 + Math.cos(theta));
                    knots.push({ x: last.x + tangent.x * u + normal.x * v, y: last.y + tangent.y * u + normal.y * v });
                    // The knot at the loop's far side starts a new chunk; it is the segment after it that must sit on top.
                    if (k === 8) splits.push(knots.length - 1);
                }
                continue;
            }
            knots.push({ x: last.x + step * (0.8 + random() * 0.4), y: pickY() });
        }
        plans.push({ segments: catmullRom(knots), splits, direction: random() < 0.5 ? 1 : -1 });
    }
    return plans;
}

export function bezierPoint([p0, c1, c2, p1]: Segment, t: number): Point {
    const s = 1 - t;
    return {
        x: s * s * s * p0.x + 3 * s * s * t * c1.x + 3 * s * t * t * c2.x + t * t * t * p1.x,
        y: s * s * s * p0.y + 3 * s * s * t * c1.y + 3 * s * t * t * c2.y + t * t * t * p1.y,
    };
}

export function segmentsPath(segments: Segment[]) {
    if (!segments.length) return "";
    const f = (n: number) => n.toFixed(2);
    const [start] = segments[0];
    return `M${f(start.x)} ${f(start.y)}` + segments.map(([, c1, c2, end]) => `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(end.x)} ${f(end.y)}`).join("");
}

export type DrawChunk = {
    /** Full-width band in the edge color, reaching one segment back so chunk joins never show a seam. */
    border: string;
    /** Narrower fill drawn over `border`, reaching one segment further back to cover the border's cut end. */
    fill: string;
    /** Glyphs centred from this segment onward are drawn: three segments back, so glyphs cut by this chunk's bands are redrawn on top. */
    textStart: number;
    /** Segment index one past the chunk's last segment. */
    end: number;
    /** Vertical extent of everything the chunk draws, before adding half the ribbon width. */
    top: number;
    bottom: number;
};

export function drawChunks(plan: RibbonPlan): DrawChunk[] {
    const bounds = [0, ...plan.splits, plan.segments.length];
    const chunks: DrawChunk[] = [];
    for (let i = 0; i < bounds.length - 1; i++) {
        const start = bounds[i], end = bounds[i + 1];
        if (end <= start) continue;
        const textStart = Math.max(0, start - 3);
        // A Bézier stays inside its control points' hull, so their extent bounds the chunk.
        const ys = plan.segments.slice(textStart, end).flatMap(segment => segment.map(point => point.y));
        chunks.push({
            border: segmentsPath(plan.segments.slice(Math.max(0, start - 1), end)),
            fill: segmentsPath(plan.segments.slice(Math.max(0, start - 2), end)),
            textStart,
            end,
            top: Math.min(...ys),
            bottom: Math.max(...ys),
        });
    }
    return chunks;
}

export type ArcTable = {
    /** Position and direction at every whole unit of arc length along the ribbon. */
    x: Float32Array;
    y: Float32Array;
    angle: Float32Array;
    /** Arc length at the start of each segment, plus the total at the end. */
    segmentStarts: number[];
};

/** Resamples the ribbon at unit arc-length steps, so glyphs can be placed along it in constant time. */
export function arcTable(segments: Segment[]): ArcTable {
    const samples: Point[] = [];
    const lengths: number[] = [];
    const segmentStarts = [0];
    let total = 0;
    for (const segment of segments) {
        for (let step = samples.length ? 1 : 0; step <= 64; step++) {
            const point = bezierPoint(segment, step / 64);
            if (samples.length) total += Math.hypot(point.x - samples[samples.length - 1].x, point.y - samples[samples.length - 1].y);
            samples.push(point);
            lengths.push(total);
        }
        segmentStarts.push(total);
    }
    const count = Math.max(2, Math.ceil(total) + 1);
    const x = new Float32Array(count), y = new Float32Array(count), angle = new Float32Array(count);
    for (let i = 0, j = 0; i < count; i++) {
        const s = Math.min(i, total);
        while (j < lengths.length - 2 && lengths[j + 1] < s) j++;
        const span = lengths[j + 1] - lengths[j] || 1;
        const t = (s - lengths[j]) / span;
        const a = samples[j], b = samples[j + 1];
        x[i] = a.x + (b.x - a.x) * t;
        y[i] = a.y + (b.y - a.y) * t;
        angle[i] = Math.atan2(b.y - a.y, b.x - a.x);
    }
    return { x, y, angle, segmentStarts };
}

const contains = (rect: Rect, p: Point) => p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h;

/**
 * Chooses which cards a ribbon passes over: alternating along its length, so it weaves over one card and under the next.
 * Returns indices into `cards`.
 */
export function cardsAbove(plan: RibbonPlan, cards: Rect[], seed: number): number[] {
    const order: number[] = [];
    for (const segment of plan.segments) {
        for (let step = 0; step < 16; step++) {
            const point = bezierPoint(segment, step / 16);
            const hit = cards.findIndex(card => contains(card, point));
            if (hit >= 0 && !order.includes(hit)) order.push(hit);
        }
    }
    const offset = seed & 1;
    return order.filter((_, i) => (i + offset) % 2 === 0);
}
