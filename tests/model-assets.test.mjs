import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { decodeWireModel } from "../src/lib/wire-model.ts";

const manifest = JSON.parse(await readFile(new URL("../public/models/manifest.json", import.meta.url), "utf8"));
for (const [name, stats] of Object.entries(manifest)) {
    test(`${name}: packed geometry is valid, bounded, and cheap to decode`, async () => {
        const original = await readFile(new URL(`../public/${stats.source}`, import.meta.url));
        const source = await readFile(new URL(`../public/models/${name}.wire.bin`, import.meta.url));
        const buffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
        const start = performance.now();
        const model = decodeWireModel(buffer);
        assert.ok(performance.now() - start < 50, "runtime decoding must not become a long task");
        assert.equal(model.positions.buffer, buffer, "decoding reuses the downloaded buffer");
        assert.equal(model.indices.buffer, buffer);
        assert.equal(model.edges.buffer, buffer);
        assert.equal(model.indices.length / 3, stats.triangles);
        assert.equal(model.edges.length / 6, stats.edgeSegments);
        assert.ok(stats.triangles <= 40000);
        assert.ok(stats.relativeError <= 0.001);
        assert.ok(stats.bytes < stats.sourceBytes * 0.1);
        assert.equal(original.length, stats.sourceBytes);
        assert.equal(createHash("sha256").update(original).digest("hex"), stats.sourceSha256, "generated model must match its source STL");
        for (const index of model.indices) assert.ok(index < model.positions.length / 3);
        console.log(`${name}: ${stats.bytes} bytes, ${stats.triangles} triangles, ${stats.edgeSegments} preserved outline segments`);
    });
}

test("invalid assets are rejected before creating GPU buffers", () => {
    assert.throws(() => decodeWireModel(new ArrayBuffer(2)), /Incomplete/);
    assert.throws(() => decodeWireModel(new ArrayBuffer(32)), /Unsupported/);
    const header = new ArrayBuffer(32);
    new DataView(header).setUint32(0, 0x3152574d, true);
    assert.throws(() => decodeWireModel(header), /Invalid/);
});
