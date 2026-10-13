// PROTOTYPE: compare hidden-line projections of a7.glb with the authored camera SVGs.
// Generated files are disposable; the existing drawings remain the default.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { Matrix4, Quaternion } from "three";

const root = new URL("../", import.meta.url);
const output = new URL("public/prototype-camera-traces/", root);
await mkdir(output, { recursive: true });
const buffer = await readFile(new URL("public/a7.glb", root));
const jsonLength = buffer.readUInt32LE(12);
const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString());
const binaryStart = 28 + jsonLength;
const primitive = gltf.meshes[0].primitives[0];
function accessor(index) {
    const info = gltf.accessors[index];
    const view = gltf.bufferViews[info.bufferView];
    const Constructor = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[info.componentType];
    const components = info.type === "VEC3" ? 3 : 1;
    return new Constructor(buffer.buffer, buffer.byteOffset + binaryStart + (view.byteOffset ?? 0) + (info.byteOffset ?? 0), info.count * components);
}
const raw = accessor(primitive.attributes.POSITION);
const rawNormals = accessor(primitive.attributes.NORMAL);
const indices = accessor(primitive.indices);
const vertexCount = raw.length / 3;
const triangleCount = indices.length / 3;
const matrix = new Matrix4().makeRotationFromQuaternion(new Quaternion(...gltf.nodes[0].rotation)).elements;
function rotate(array) {
    const result = new Float32Array(array.length);
    for (let i = 0; i < array.length; i += 3) {
        const x = array[i], y = array[i + 1], z = array[i + 2];
        result[i] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
        result[i + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
        result[i + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    }
    return result;
}
const positions = rotate(raw);
const normals = rotate(rawNormals);
const welded = new Uint32Array(vertexCount);
const unique = new Map();
for (let i = 0; i < vertexCount; i++) {
    const key = `${Math.round(positions[i * 3] * 100)},${Math.round(positions[i * 3 + 1] * 100)},${Math.round(positions[i * 3 + 2] * 100)}`;
    if (!unique.has(key)) unique.set(key, i);
    welded[i] = unique.get(key);
}
const faceNormals = new Float32Array(triangleCount * 3);
const edges = new Map();
for (let face = 0; face < triangleCount; face++) {
    const a = indices[face * 3], b = indices[face * 3 + 1], c = indices[face * 3 + 2];
    const abx = positions[b * 3] - positions[a * 3], aby = positions[b * 3 + 1] - positions[a * 3 + 1], abz = positions[b * 3 + 2] - positions[a * 3 + 2];
    const acx = positions[c * 3] - positions[a * 3], acy = positions[c * 3 + 1] - positions[a * 3 + 1], acz = positions[c * 3 + 2] - positions[a * 3 + 2];
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz) || 1;
    faceNormals.set([nx / length, ny / length, nz / length], face * 3);
    for (const [first, second] of [[a, b], [b, c], [c, a]]) {
        const v1 = welded[first], v2 = welded[second];
        if (v1 === v2) continue;
        const low = Math.min(v1, v2), high = Math.max(v1, v2);
        const key = `${low}:${high}`;
        const edge = edges.get(key);
        if (edge) edge.back = face;
        else edges.set(key, { a: low, b: high, front: face, back: -1 });
    }
}
console.log(`Loaded ${vertexCount.toLocaleString()} vertices / ${triangleCount.toLocaleString()} triangles; welded to ${unique.size.toLocaleString()} positions.`);

// Welded adjacency detects real creases, rather than UV seams or every triangle.
function pointKey(point) { return `${Math.round(point[0] * 10)},${Math.round(point[1] * 10)}`; }
function pathsFromSegments(segments) {
    const ends = new Map();
    segments.forEach((segment, index) => segment.forEach((point) => {
        const key = pointKey(point);
        if (!ends.has(key)) ends.set(key, []);
        ends.get(key).push(index);
    }));
    const used = new Set();
    const paths = [];
    function walk(index, start) {
        const points = [start];
        let cursor = pointKey(start);
        while (!used.has(index)) {
            used.add(index);
            const segment = segments[index];
            const next = pointKey(segment[0]) === cursor ? segment[1] : segment[0];
            points.push(next);
            cursor = pointKey(next);
            const neighbors = ends.get(cursor);
            if (neighbors.length !== 2) break;
            const unvisited = neighbors.find((candidate) => !used.has(candidate));
            if (unvisited === undefined) break;
            index = unvisited;
        }
        // Remove almost-collinear tessellation vertices without rounding corners.
        const clean = [points[0]];
        for (let i = 1; i < points.length - 1; i++) {
            const a = clean.at(-1), b = points[i], c = points[i + 1];
            const distance = Math.abs((c[0] - a[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (c[1] - a[1])) / (Math.hypot(c[0] - a[0], c[1] - a[1]) || 1);
            if (distance > .08) clean.push(b);
        }
        clean.push(points.at(-1));
        paths.push(clean.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(""));
    }
    segments.forEach((segment, index) => {
        const start = segment.find((point) => ends.get(pointKey(point)).length !== 2);
        if (start && !used.has(index)) walk(index, start);
    });
    segments.forEach((segment, index) => { if (!used.has(index)) walk(index, segment[0]); });
    return paths.join("");
}

const width = 1920, height = 1440, supersample = 3;
function simplify(points, tolerance = .8) {
    if (points.length < 3) return points;
    const a = points[0], b = points.at(-1);
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let farthest = 0, index = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const p = points[i];
        const distance = length ? Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / length : Math.hypot(p[0] - a[0], p[1] - a[1]);
        if (distance > farthest) { farthest = distance; index = i; }
    }
    return farthest > tolerance ? [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)] : [a, b];
}

function traceFilteredRender(filename) {
    const w = 1280, h = 960;
    const result = spawnSync("magick", [filename, "-resize", `${w}x${h}!`, "-colorspace", "Gray", "-blur", "0x1.4", "-canny", "0x1+4%+12%", "-depth", "8", "gray:-"], { maxBuffer: w * h * 2 });
    if (result.status !== 0) throw new Error("The raster edge filter failed.");
    const mask = result.stdout;
    const active = [];
    for (let i = 0; i < mask.length; i++) if (mask[i] > 128) active.push(i);
    const adjacent = new Map();
    for (const pixel of active) {
        const x = pixel % w, y = Math.floor(pixel / w), neighbors = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if ((!dx && !dy) || x + dx < 0 || x + dx >= w || y + dy < 0 || y + dy >= h) continue;
            const next = pixel + dy * w + dx;
            if (mask[next] <= 128) continue;
            if (dx && dy && (mask[pixel + dx] > 128 || mask[pixel + dy * w] > 128)) continue;
            neighbors.push(next);
        }
        adjacent.set(pixel, neighbors);
    }
    const visited = new Set(), strokes = [];
    const edgeKey = (a, b) => Math.min(a, b) * w * h + Math.max(a, b);
    function walk(start, next) {
        const path = [start];
        let current = start;
        while (!visited.has(edgeKey(current, next))) {
            visited.add(edgeKey(current, next));
            path.push(next);
            const neighbors = adjacent.get(next);
            if (neighbors.length !== 2) break;
            const after = neighbors.find((candidate) => candidate !== current);
            current = next;
            next = after;
        }
        if (path.length < 8) return;
        const points = simplify(path.map((pixel) => [pixel % w + .5, Math.floor(pixel / w) + .5]));
        strokes.push(points.map((point, index) => `${index ? "L" : "M"}${(point[0] / 2).toFixed(2)} ${(point[1] / 2).toFixed(2)}`).join(""));
    }
    for (const [pixel, neighbors] of adjacent) if (neighbors.length !== 2) for (const next of neighbors) if (!visited.has(edgeKey(pixel, next))) walk(pixel, next);
    for (const [pixel, neighbors] of adjacent) for (const next of neighbors) if (!visited.has(edgeKey(pixel, next))) walk(pixel, next);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="none" stroke="black" stroke-width=".85" stroke-linecap="round" stroke-linejoin="round" d="${strokes.join("")}"/></svg>`;
}

const views = [
    { name: "top", axes: [0, 2, 1], signs: [-1, 1, 1] },
    { name: "side", axes: [2, 1, 0], signs: [-1, 1, 1] },
    { name: "front", axes: [0, 1, 2], signs: [1, 1, 1] },
];
const stats = [];
for (const view of views) {
    const [u, v, depthAxis] = view.axes;
    const [su, sv, sd] = view.signs;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (let i = 0; i < vertexCount; i++) {
        const x = positions[i * 3 + u] * su, y = positions[i * 3 + v] * sv;
        minU = Math.min(minU, x); maxU = Math.max(maxU, x);
        minV = Math.min(minV, y); maxV = Math.max(maxV, y);
    }
    const scale = Math.min((width - 64 * supersample) / (maxU - minU), (height - 64 * supersample) / (maxV - minV));
    const offsetX = (width - (maxU - minU) * scale) / 2;
    const offsetY = (height - (maxV - minV) * scale) / 2;
    const xs = new Float32Array(vertexCount), ys = new Float32Array(vertexCount), zs = new Float32Array(vertexCount), light = new Float32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
        xs[i] = (positions[i * 3 + u] * su - minU) * scale + offsetX;
        ys[i] = (maxV - positions[i * 3 + v] * sv) * scale + offsetY;
        zs[i] = positions[i * 3 + depthAxis] * sd;
        light[i] = Math.max(0, normals[i * 3 + u] * su * .25 + normals[i * 3 + v] * sv * .4 + normals[i * 3 + depthAxis] * sd * .85);
    }
    const depths = new Float32Array(width * height).fill(-Infinity);
    const pixels = Buffer.alloc(width * height * 3, 255);
    for (let face = 0; face < triangleCount; face++) {
        const a = indices[face * 3], b = indices[face * 3 + 1], c = indices[face * 3 + 2];
        const ax = xs[a], ay = ys[a], bx = xs[b], by = ys[b], cx = xs[c], cy = ys[c];
        const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
        if (Math.abs(denominator) < .00001) continue;
        const inverse = 1 / denominator;
        const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(width - 1, Math.ceil(Math.max(ax, bx, cx)));
        const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(height - 1, Math.ceil(Math.max(ay, by, cy)));
        const stepA = (by - cy) * inverse, stepB = (cy - ay) * inverse;
        for (let y = minY; y <= maxY; y++) {
            let wa = ((by - cy) * (minX + .5 - cx) + (cx - bx) * (y + .5 - cy)) * inverse;
            let wb = ((cy - ay) * (minX + .5 - cx) + (ax - cx) * (y + .5 - cy)) * inverse;
            for (let x = minX; x <= maxX; x++, wa += stepA, wb += stepB) {
                const wc = 1 - wa - wb;
                if (wa < -1e-5 || wb < -1e-5 || wc < -1e-5) continue;
                const depth = wa * zs[a] + wb * zs[b] + wc * zs[c];
                const index = y * width + x;
                if (depth > depths[index]) {
                    depths[index] = depth;
                    const shade = Math.min(245, Math.round(65 + 175 * (wa * light[a] + wb * light[b] + wc * light[c])));
                    pixels[index * 3] = pixels[index * 3 + 1] = pixels[index * 3 + 2] = shade;
                }
            }
        }
    }
    const imagePath = new URL(`${view.name}-model.png`, output);
    const converted = spawnSync("magick", ["ppm:-", imagePath.pathname], { input: Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), pixels]) });
    if (converted.status !== 0) throw new Error("Could not write the solid-model reference image.");
    const filtered = traceFilteredRender(imagePath.pathname);
    await writeFile(new URL(`${view.name}-filtered.svg`, output), filtered);
    stats.push({ view: view.name, variant: "filtered", bytes: Buffer.byteLength(filtered) });

    const facing = (face) => faceNormals[face * 3 + depthAxis] * sd;
    function visible(x, y, z) {
        const px = Math.round(x), py = Math.round(y);
        let nearestDepth = Infinity;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = px + dx, yy = py + dy;
            if (xx >= 0 && xx < width && yy >= 0 && yy < height) nearestDepth = Math.min(nearestDepth, depths[yy * width + xx]);
        }
        return z >= nearestDepth - 1.5 / scale;
    }
    for (const [name, angle, minimum] of [["contours", 35, .65], ["detail", 12, .3]]) {
        const outline = [], creases = [];
        for (const edge of edges.values()) {
            const front = facing(edge.front), back = edge.back >= 0 ? facing(edge.back) : 0;
            if (front <= 0 && back <= 0) continue;
            const silhouette = edge.back < 0 || front * back <= 0;
            const dot = edge.back < 0 ? -1 : faceNormals[edge.front * 3] * faceNormals[edge.back * 3] + faceNormals[edge.front * 3 + 1] * faceNormals[edge.back * 3 + 1] + faceNormals[edge.front * 3 + 2] * faceNormals[edge.back * 3 + 2];
            if (!silhouette && dot >= Math.cos(angle * Math.PI / 180)) continue;
            const a = edge.a, b = edge.b;
            const distance = Math.hypot(xs[b] - xs[a], ys[b] - ys[a]);
            if (distance / supersample < minimum) continue;
            const steps = Math.max(1, Math.ceil(distance / .7));
            let start, previous;
            const record = () => {
                if (start && previous && Math.hypot(start[0] - previous[0], start[1] - previous[1]) >= minimum) (silhouette ? outline : creases).push([start, previous]);
                start = undefined;
            };
            for (let step = 0; step <= steps; step++) {
                const t = step / steps;
                const x = xs[a] + (xs[b] - xs[a]) * t, y = ys[a] + (ys[b] - ys[a]) * t, z = zs[a] + (zs[b] - zs[a]) * t;
                const point = [x / supersample, y / supersample];
                if (visible(x, y, z)) { start ??= point; previous = point; }
                else { record(); previous = undefined; }
            }
            record();
        }
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill="none" stroke="black" stroke-linecap="round" stroke-linejoin="round"><path stroke-width=".72" d="${pathsFromSegments(creases)}"/><path stroke-width="1.25" d="${pathsFromSegments(outline)}"/></g></svg>`;
        await writeFile(new URL(`${view.name}-${name}.svg`, output), svg);
        stats.push({ view: view.name, variant: name, angle, segments: outline.length + creases.length, bytes: Buffer.byteLength(svg) });
    }
    console.log(`Traced ${view.name}: solid reference, contours, and detail.`);
}
await writeFile(new URL("manifest.json", output), JSON.stringify({ source: "a7.glb", vertexCount, triangleCount, stats }, null, 2));
console.table(stats);
console.log("Preview at http://localhost:3001/?camera-art=filtered#photos");
