// Add hand-positioned vector markings to the approved 12° traces. Source paths
// are preserved verbatim; the trace generator never writes these final assets.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const output = new URL("public/camera-illustrations/", root);
const letteringSource = await readFile(new URL("src/app/clientComponents/turntable.tsx", root), "utf8");
const glyphBlock = letteringSource.match(/const lettering: Record<string, string> = \{([\s\S]*?)\n\};/)?.[1];
const sony = letteringSource.match(/const sonyWordmark = "([^"]+)";/)?.[1];
if (!glyphBlock || !sony) throw new Error("Could not read the shared vector lettering source.");
const glyphs = Object.fromEntries(Array.from(glyphBlock.matchAll(/^\s*(?:"([^"]+)"|([A-Z])): "([^"]+)"/gm), ([, quoted, letter, path]) => [quoted ?? letter, path]));

function label(text, x, y, height = 5, rotate = 0) {
    const scale = height / 7;
    const width = (text.length * 7 - 2) * scale;
    const paths = Array.from(text, (letter, index) => {
        if (letter === " ") return "";
        if (!glyphs[letter]) throw new Error(`Missing vector glyph: ${letter}`);
        return `<path d="${glyphs[letter]}" transform="translate(${index * 7} 0)"/>`;
    }).join("");
    return `<g transform="translate(${x} ${y}) rotate(${rotate})"><g transform="translate(${-width / 2} 0) scale(${scale})" fill="none" stroke="black" stroke-width=".75" stroke-linecap="round" stroke-linejoin="round">${paths}</g></g>`;
}
function wordmark(x, y, width, rotate = 0) {
    return `<g transform="translate(${x} ${y}) rotate(${rotate})"><path d="${sony}" transform="scale(${width / 1280})" fill="black" stroke="none"/></g>`;
}
function arcLabel(text, x, y, radius, start, step = 4, height = 6) {
    return Array.from(text, (letter, index) => {
        const angle = start + index * step;
        const radians = angle * Math.PI / 180;
        return label(letter, x + Math.cos(radians) * radius, y + Math.sin(radians) * radius, height, angle + 90);
    }).join("");
}
function modeDial() {
    return ["P", "A", "S", "M", "1", "2", "S&Q", "AUTO", "movie"].map((text, index) => {
        const angle = -90 + index * 40;
        const radians = angle * Math.PI / 180;
        const x = 384.7 + Math.cos(radians) * 20, y = 350.5 + Math.sin(radians) * 20;
        if (text === "movie") return `<g transform="translate(${x} ${y}) rotate(${angle + 90})" stroke-width=".65"><path d="M-4-2H1V2H-4ZM1-1 4-3V3L1 1Z"/></g>`;
        const height = text === "AUTO" ? 3.1 : text === "S&Q" ? 3.7 : 5;
        return label(text, x, y - height / 2, height, angle + 90);
    }).join("");
}
function exposureDial() {
    return ["0", "+1", "+2", "+3", "-3", "-2", "-1"].map((text, index) => {
        const angle = (-90 + index * 360 / 7) * Math.PI / 180;
        return label(text, 477.7 + Math.cos(angle) * 18, 368.2 + Math.sin(angle) * 13 - 2, 4);
    }).join("");
}

const annotations = {
    top: [
        label("FE 3.5-5.6/28-70 OSS", 280, 111, 5.3),
        label("70", 245, 206, 5.4), label("50", 265, 206, 5.4), label("35", 285, 206, 5.4), label("28", 305, 206, 5.4),
        '<path d="M305 215v5" stroke-width=".8"/><circle cx="305" cy="247" r="1.4" fill="black" stroke="none"/>',
        wordmark(255, 267, 50),
        label("C2", 428.4, 320.5, 5.2), label("C1", 470.8, 320.9, 5.2),
        label("OFF", 423, 299.5, 4.2), label("ON", 482, 298, 4.2),
        modeDial(), exposureDial(),
        '<path d="m382.5 315 4.4 0-2.2 3.5Z" fill="black" stroke="none"/><path d="m475.7 339 4 0-2 3Z" fill="black" stroke="none"/>',
        '<g stroke-width=".8"><circle cx="160" cy="349" r="3.3"/><path d="M153.5 349h13"/></g>',
    ].join(""),
    side: [
        label("FE 3.5-5.6/28-70 OSS", 142.5, 274, 5.5, -90),
        label("70 50 35 28", 274, 274, 5.2, -90),
        '<path d="M285 248h5" stroke-width=".8"/><circle cx="322" cy="248" r="1.4" fill="black" stroke="none"/>',
        wordmark(350, 296, 44, -90),
        label("MIC", 475, 194, 5),
        '<g transform="translate(475 217)" stroke-width=".75"><path d="M-5 3V-1a5 5 0 0 1 10 0v4M-5 0h2v5h-2ZM3 0h2v5H3Z"/></g>',
        label("HDMI", 475, 239, 5), label("USB-C", 475, 260, 5), label("MULTI", 475, 283, 5),
        label("ILCE-7M3", 473, 358, 5.2),
    ].join(""),
    front: [
        wordmark(331, 89, 87),
        '<g transform="translate(507 182) scale(.55)" stroke-width="1.6"><path d="M17 4C12-3 1-1 1 9S11 20 15 12L19 0M5 1C14 0 11 15 21 17M28 0H44L31 18M48 8V18M53 8V18M58 8V18"/></g>',
        arcLabel("FE 3.5-5.6/28-70 OSS", 374.5, 272.4, 101, -132, 4.2, 6.5),
        wordmark(356.5, 369.4, 36),
        arcLabel("55", 374.5, 272.4, 101, 35, 4.5, 5.5),
        '<g transform="translate(460.2 319.9)" stroke-width=".7"><circle r="2.2"/><path d="m-2 2 4-4"/></g>',
    ].join(""),
};

const checkpoint = {
    top: "e73aec681c7749e22853eececb0d4419813950360aa68caaa7d643b39c467832",
    side: "d3ad77aa7da205dc538b57773bfbb651c53327430261f79a47329b15dac3123a",
    front: "b0dbc6e56ac125a7f20d71e516de6f91415eebf9daa162e1eed01b3376540a76",
};
await mkdir(output, { recursive: true });
for (const view of ["top", "side", "front"]) {
    const original = await readFile(new URL(`public/prototype-camera-traces/${view}-detail.svg`, root), "utf8");
    const hash = createHash("sha256").update(original).digest("hex");
    if (hash !== checkpoint[view]) throw new Error(`${view} trace has changed since checkpoint c5c0a75; refusing to silently replace its geometry.`);
    const annotated = original.replace("</svg>", `<title>Sony α7 III — ${view} view</title><g id="camera-lettering" fill="none" stroke="black" stroke-linecap="round" stroke-linejoin="round">${annotations[view]}</g></svg>`);
    if (!annotated.startsWith(original.slice(0, original.lastIndexOf("</svg>")))) throw new Error("Original geometry was modified.");
    await writeFile(new URL(`${view}.svg`, output), annotated);
    console.log(`${view}: added vector lettering; original 12° geometry verified against c5c0a75.`);
}
