import { parseMetadata, writeMetadata } from "@colorhythm/exiftool-wasm";
import LibRaw from "libraw-wasm-nothread";
import { companionExifTags, editedExifTags, formFromExif, verifyExifTags, type ExifRecord, type InspectedPhoto, type MetadataRequest, type PreparedPhoto } from "./photo-metadata";
import { MAX_PHOTO_BYTES, photoFormat, validPhotoSignature } from "./photo-upload-policy";

// ExifTool's relative WASM URL otherwise resolves against this worker rather
// than the self-hosted package directory.
const wasmOptions = { fetch: (...args: unknown[]) => fetch(new URL(`./exiftool/${String(args[0]).split("/").at(-1)}`, import.meta.url), args[1] as RequestInit | undefined) };

async function readExif(file: File): Promise<ExifRecord> {
    const result = await parseMetadata(file, { ...wasmOptions, args: ["-json", "-n", "-G1", "-m", "-q"], transform: (text) => JSON.parse(text)[0] });
    if (!result.success) throw new Error(result.error || "Image metadata could not be read.");
    return result.data;
}

async function validateFile(file: File) {
    const format = photoFormat(file.name);
    if (!format || file.size < 12 || file.size > MAX_PHOTO_BYTES) throw new Error("Choose a JPEG, PNG, or supported RAW file under 128 MB.");
    if (!validPhotoSignature(new Uint8Array(await file.slice(0, 32).arrayBuffer()), file.name)) throw new Error("The file content does not match its image format.");
    return format;
}

async function embeddedPreview(file: File) {
    for (const tag of ["JpgFromRaw", "PreviewImage"]) {
        const result = await parseMetadata(file, { ...wasmOptions, args: ["-b", `-${tag}`, "-m", "-q"], binary: true });
        if (result.success && result.data.byteLength > 1000 && result.data[0] === 0xff && result.data[1] === 0xd8) {
            return new File([new Uint8Array(result.data)], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
        }
    }
    return null;
}

async function writeExif(file: File, tags: Record<string, string | number>) {
    if (!Object.keys(tags).length) return file;
    const result = await writeMetadata(file, tags, { ...wasmOptions, args: ["-n", "-m", "-charset", "EXIF=UTF8"] });
    if (!result.success) throw new Error(result.error || "Metadata could not be written to this image.");
    return new File([result.data], file.name, { type: photoFormat(file.name)!.mimeType, lastModified: file.lastModified });
}

async function renderRawPreview(file: File) {
    const raw = new LibRaw();
    try {
        await raw.open(new Uint8Array(await file.arrayBuffer()), { halfSize: true, useCameraWb: true, outputColor: 1, outputBps: 8 });
        const image = await raw.imageData();
        if (!image || image.bits !== 8 || image.colors < 3) throw new Error("This RAW preview format is not supported by the decoder.");
        const rgba = new Uint8ClampedArray(image.width * image.height * 4);
        for (let source = 0, target = 0; target < rgba.length; source += image.colors, target += 4) {
            rgba[target] = image.data[source]; rgba[target + 1] = image.data[source + 1]; rgba[target + 2] = image.data[source + 2]; rgba[target + 3] = 255;
        }
        const canvas = new OffscreenCanvas(image.width, image.height);
        canvas.getContext("2d")!.putImageData(new ImageData(rgba, image.width, image.height), 0, 0);
        const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: .94 });
        return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
    } finally { raw.dispose(); }
}

async function inspect(file: File): Promise<InspectedPhoto> {
    const format = await validateFile(file);
    const metadata = await readExif(file);
    if (!format.raw) return { metadata, form: formFromExif(metadata), preview: file, raw: false, previewNote: "Original image; metadata editing does not recompress its pixels." };
    const embedded = await embeddedPreview(file);
    const preview = embedded ? await writeExif(embedded, companionExifTags(metadata)) : null;
    return { metadata, form: formFromExif(metadata), preview, raw: true, previewNote: preview ? "Camera-embedded JPEG preview. The edited RAW will also be saved." : "No embedded JPEG found. A gallery preview will be rendered locally when you prepare the upload." };
}

async function prepare(message: Extract<MetadataRequest, { action: "prepare" }>): Promise<PreparedPhoto> {
    const format = await validateFile(message.file);
    const tags = editedExifTags(message.form, message.original);
    const edited = await writeExif(message.file, tags);
    const metadata = await readExif(edited);
    verifyExifTags(tags, metadata);
    if (!format.raw) return { files: [{ file: edited, role: "image" }], preview: edited, metadata, changed: Object.keys(tags).length, previewNote: "EXIF changes verified. Original image pixels are preserved." };
    const embedded = await embeddedPreview(edited);
    const previewEdits = companionExifTags(metadata, tags, !embedded);
    const preview = await writeExif(embedded ?? await renderRawPreview(edited), previewEdits);
    const previewMetadata = await readExif(preview);
    verifyExifTags(previewEdits, previewMetadata);
    return {
        files: [{ file: edited, role: "raw-original" }, { file: preview, role: "raw-preview" }],
        preview, metadata, changed: Object.keys(tags).length,
        previewNote: embedded ? "Edited RAW plus camera-embedded JPEG, with matching capture metadata." : "Edited full-resolution RAW plus a half-size, sRGB JPEG rendered for the gallery.",
    };
}

let pending = Promise.resolve();
self.onmessage = (event: MessageEvent<MetadataRequest>) => {
    const message = event.data;
    pending = pending.then(async () => {
        try {
            const result = message.action === "inspect" ? await inspect(message.file) : await prepare(message);
            self.postMessage({ id: message.id, result });
        } catch (error) {
            self.postMessage({ id: message.id, error: error instanceof Error ? error.message : "The image could not be processed." });
        }
    });
};
