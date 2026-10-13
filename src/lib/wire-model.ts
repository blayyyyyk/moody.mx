// The offline generator owns the geometry work. Runtime decoding creates views
// onto a single buffer: no STL parsing, vertex welding, normals, or edge discovery.
export function decodeWireModel(buffer: ArrayBuffer) {
    if (buffer.byteLength < 32) throw new Error("Incomplete model");
    const header = new DataView(buffer);
    if (header.getUint32(0, true) !== 0x3152574d) throw new Error("Unsupported model format");
    const vertices = header.getUint32(4, true);
    const indices = header.getUint32(8, true);
    const edgeVertices = header.getUint32(12, true);
    const extent = header.getFloat32(16, true);
    const indexOffset = Math.ceil((32 + vertices * 6) / 4) * 4;
    const edgeOffset = indexOffset + indices * 4;
    if (buffer.byteLength !== edgeOffset + edgeVertices * 6 || !Number.isFinite(extent) || extent <= 0) throw new Error("Invalid model data");
    return {
        positions: new Int16Array(buffer, 32, vertices * 3),
        indices: new Uint32Array(buffer, indexOffset, indices),
        edges: new Int16Array(buffer, edgeOffset, edgeVertices * 3),
        extent,
    };
}
