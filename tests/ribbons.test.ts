import test from "node:test";
import assert from "node:assert/strict";
import { arcTable, bezierPoint, cardsAbove, drawChunks, planRibbons, type Rect } from "../src/lib/ribbon-geometry";

test("ribbons cross the full section width and stay seeded by title", () => {
    const plans = planRibbons("Music", 1440, 900, 3, 52);
    assert.equal(plans.length, 3);
    for (const plan of plans) {
        assert.ok(plan.segments[0][0].x < 0, "starts off the left edge");
        assert.ok(plan.segments[plan.segments.length - 1][3].x > 1440, "ends off the right edge");
        for (const split of plan.splits) assert.ok(split > 0 && split < plan.segments.length);
    }
    assert.deepEqual(planRibbons("Music", 1440, 900, 3, 52), plans);
    assert.notDeepEqual(planRibbons("Photos", 1440, 900, 3, 52), plans);
});

test("draw chunks cover every segment and reach back over their joins", () => {
    for (const plan of planRibbons("Projects", 1280, 1200, 3, 52)) {
        const chunks = drawChunks(plan);
        assert.equal(chunks.length, plan.splits.length + 1);
        chunks.forEach((chunk, i) => {
            if (i > 0) assert.equal(chunk.textStart, plan.splits[i - 1] - 3);
            assert.equal(chunk.end, i < plan.splits.length ? plan.splits[i] : plan.segments.length);
            assert.ok(chunk.top <= chunk.bottom);
            for (const path of [chunk.border, chunk.fill]) assert.match(path, /^M[-\d.]+ [-\d.]+(C[-\d. ]+)+$/);
        });
    }
});

test("ribbons alternate over and under the cards they cross", () => {
    const plan = planRibbons("Timeline", 1200, 400, 1, 52)[0];
    const y = bezierPoint(plan.segments[Math.floor(plan.segments.length / 2)], 0.5).y;
    const cards: Rect[] = [0, 1, 2, 3].map(i => ({ x: i * 300 + 10, y: 0, w: 280, h: 400 }));
    const above = cardsAbove(plan, cards, 0);
    assert.ok(y >= 0 && y <= 400);
    assert.ok(above.length >= 1 && above.length <= 2);
    assert.deepEqual(cardsAbove(plan, cards, 1).filter(card => above.includes(card)), []);
});

test("arc table samples the ribbon at unit steps", () => {
    const table = arcTable([[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }], [{ x: 30, y: 0 }, { x: 30, y: 10 }, { x: 30, y: 20 }, { x: 30, y: 30 }]]);
    assert.equal(table.segmentStarts.length, 3);
    assert.ok(Math.abs(table.segmentStarts[2] - 60) < 0.01);
    assert.equal(table.x.length, 61);
    assert.ok(Math.abs(table.x[15] - 15) < 0.01 && Math.abs(table.y[15]) < 0.01 && Math.abs(table.angle[15]) < 0.01);
    assert.ok(Math.abs(table.x[45] - 30) < 0.01 && Math.abs(table.y[45] - 15) < 0.01 && Math.abs(table.angle[45] - Math.PI / 2) < 0.01);
});

test("bands route each ribbon through its corridor", () => {
    const bands = [{ center: 100, amplitude: 30 }, { center: 600, amplitude: 60 }];
    const plans = planRibbons("Music", 1200, 900, 2, 52, bands);
    plans.forEach((plan, i) => {
        // Knots outside a loop stay inside the corridor.
        const knots = plan.segments.map(segment => segment[0]).filter((_, k) => !plan.splits.some(split => Math.abs(split - k) <= 8));
        for (const knot of knots) assert.ok(Math.abs(knot.y - bands[i].center) <= bands[i].amplitude + 1, `ribbon ${i} knot at ${knot.y}`);
    });
});
