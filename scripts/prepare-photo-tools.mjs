import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(new URL("../package.json", import.meta.url));
const destination = resolve(root, "public/photo-tools");
await mkdir(destination, { recursive: true });
await cp(dirname(require.resolve("@colorhythm/exiftool-wasm")), resolve(destination, "exiftool"), { recursive: true });
await cp(dirname(require.resolve("libraw-wasm-nothread")), resolve(destination, "libraw"), { recursive: true });
await build({
    entryPoints: [resolve(root, "src/lib/photo-metadata.worker.ts")],
    outfile: resolve(destination, "metadata-worker.js"), bundle: true, format: "esm", platform: "browser", target: "es2022", minify: true,
    plugins: [{ name: "self-host-photo-tools", setup(build) {
        build.onResolve({ filter: /^@colorhythm\/exiftool-wasm$/ }, () => ({ path: "/photo-tools/exiftool/index.js", external: true }));
        build.onResolve({ filter: /^libraw-wasm-nothread$/ }, () => ({ path: "/photo-tools/libraw/index.js", external: true }));
    } }],
});
console.log("Prepared self-hosted photo metadata worker and WASM tools.");
