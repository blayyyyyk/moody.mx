import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { EdgesGeometry } from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { runtimeModelNames } from "./model-config.mjs";

for (const name of runtimeModelNames) {
    const bytes = await readFile(new URL(`../public/${name}.stl`, import.meta.url));
    const start = performance.now();
    const geometry = new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    geometry.center();
    const parsed = performance.now();
    const edges = new EdgesGeometry(geometry, 35);
    const end = performance.now();
    console.log(JSON.stringify({ name, bytes: bytes.length, triangles: geometry.attributes.position.count / 3, edgeSegments: edges.attributes.position.count / 2, parseMs: Math.round(parsed - start), edgeMs: Math.round(end - parsed), residentGeometryBytes: geometry.attributes.position.array.byteLength + geometry.attributes.normal.array.byteLength + edges.attributes.position.array.byteLength }));
    geometry.dispose();
    edges.dispose();
}
