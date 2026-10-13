import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { EdgesGeometry } from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshoptSimplifier } from "meshoptimizer";
import { runtimeModelNames } from "./model-config.mjs";

await MeshoptSimplifier.ready;
const directory = new URL("../public/models/", import.meta.url);
await mkdir(directory, { recursive: true });
const manifest = {};
for (const name of runtimeModelNames) {
    const input = await readFile(new URL(`../public/${name}.stl`, import.meta.url));
    const geometry = new STLLoader().parse(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength));
    geometry.center();
    // Keep the original sharp outlines/lettering. Compute them OFFLINE, not when scrolling.
    const edges = new EdgesGeometry(geometry, 35);
    geometry.deleteAttribute("normal");
    const indexed = mergeVertices(geometry);
    const positions = indexed.attributes.position.array;
    const [indices, error] = MeshoptSimplifier.simplify(new Uint32Array(indexed.index.array), positions, 3, 60000, 0.001, ["LockBorder"]);
    const [remap, count] = MeshoptSimplifier.compactMesh(indices);
    const compact = new Float32Array(count * 3);
    for (let i = 0; i < remap.length; i++) {
        if (remap[i] !== 0xffffffff) compact.set(positions.subarray(i * 3, i * 3 + 3), remap[i] * 3);
    }
    const extent = Math.max(...geometry.boundingBox.min.toArray().map(Math.abs), ...geometry.boundingBox.max.toArray().map(Math.abs));
    const quantize = (values) => Int16Array.from(values, (value) => Math.round(value / extent * 32767));
    const solid = quantize(compact);
    const outline = quantize(edges.attributes.position.array);
    const indexOffset = Math.ceil((32 + solid.byteLength) / 4) * 4;
    const edgeOffset = indexOffset + indices.byteLength;
    const output = new ArrayBuffer(edgeOffset + outline.byteLength);
    const header = new DataView(output);
    header.setUint32(0, 0x3152574d, true); // MWR1: header, normalized int16 positions, uint32 indices, int16 edges.
    header.setUint32(4, count, true);
    header.setUint32(8, indices.length, true);
    header.setUint32(12, outline.length / 3, true);
    header.setFloat32(16, extent, true);
    new Int16Array(output, 32, solid.length).set(solid);
    new Uint32Array(output, indexOffset, indices.length).set(indices);
    new Int16Array(output, edgeOffset, outline.length).set(outline);
    await writeFile(new URL(`${name}.wire.bin`, directory), Buffer.from(output));
    manifest[name] = { source: `${name}.stl`, sourceSha256: createHash("sha256").update(input).digest("hex"), sourceBytes: input.length, bytes: output.byteLength, originalTriangles: geometry.attributes.position.count / 3, triangles: indices.length / 3, edgeSegments: outline.length / 6, relativeError: error };
    console.log(name, JSON.stringify(manifest[name]));
    geometry.dispose(); indexed.dispose(); edges.dispose();
}
await writeFile(new URL("manifest.json", directory), JSON.stringify(manifest, null, 2) + "\n");
