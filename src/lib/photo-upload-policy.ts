export const MAX_PHOTO_BYTES = 128 * 1024 * 1024;
export const PHOTO_CHUNK_BYTES = 2 * 1024 * 1024;
export const RAW_EXTENSIONS = ["arw", "dng", "cr2", "cr3", "nef", "nrw", "orf", "raf", "rw2", "pef", "srw"] as const;
export const PHOTO_ACCEPT = ".jpg,.jpeg,.png," + RAW_EXTENSIONS.map((extension) => `.${extension}`).join(",");

const rawTypes: Record<string, string> = {
    arw: "image/x-sony-arw", dng: "image/x-adobe-dng", cr2: "image/x-canon-cr2", cr3: "image/x-canon-cr3",
    nef: "image/x-nikon-nef", nrw: "image/x-nikon-nrw", orf: "image/x-olympus-orf", raf: "image/x-fuji-raf",
    rw2: "image/x-panasonic-rw2", pef: "image/x-pentax-pef", srw: "image/x-samsung-srw",
};

export function photoFormat(name: string) {
    const extension = name.split(".").at(-1)?.toLowerCase() ?? "";
    if (extension === "jpg" || extension === "jpeg") return { extension, mimeType: "image/jpeg", raw: false };
    if (extension === "png") return { extension, mimeType: "image/png", raw: false };
    if (Object.hasOwn(rawTypes, extension)) return { extension, mimeType: rawTypes[extension], raw: true };
    return null;
}

export function isRawPhoto(name: string) { return Boolean(photoFormat(name)?.raw); }

export function validPhotoSignature(bytes: Uint8Array, name: string) {
    const format = photoFormat(name);
    if (!format || bytes.length < 12) return false;
    const ascii = (start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));
    if (format.mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (format.mimeType === "image/png") return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
    return (ascii(0, 2) === "II" && [42, 43, 85, 82].includes(bytes[2]))
        || (ascii(0, 2) === "MM" && (bytes[3] === 42 || bytes[3] === 43 || ascii(2, 2) === "OR"))
        || ascii(0, 15) === "FUJIFILMCCD-RAW"
        || (ascii(4, 4) === "ftyp" && ascii(8, 4) === "crx ");
}

export type UploadRole = "image" | "raw-original" | "raw-preview";
export type DrivePhotoResult = { id: string; name: string; url: string };
export type UploadProgress = { complete: boolean; offset: number; file?: DrivePhotoResult };

export function validatePhotoUpload(value: unknown) {
    if (!value || typeof value !== "object") throw new Error("Choose an image to upload.");
    const input = value as Record<string, unknown>;
    if (typeof input.name !== "string" || !input.name.trim() || input.name.length > 180 || /[\/\\\u0000-\u001f]/.test(input.name)) throw new Error("Use a filename without path separators or control characters (180 characters maximum).");
    const format = photoFormat(input.name);
    if (!format) throw new Error("Choose a JPEG, PNG, or supported camera RAW file.");
    if (typeof input.size !== "number" || !Number.isSafeInteger(input.size) || input.size < 12 || input.size > MAX_PHOTO_BYTES) throw new Error("Images must be between 12 bytes and 128 MB.");
    if (typeof input.uploadId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.uploadId)) throw new Error("Invalid upload identifier.");
    if (input.role !== "image" && input.role !== "raw-original" && input.role !== "raw-preview") throw new Error("Invalid upload role.");
    if (format.raw !== (input.role === "raw-original") || (input.role === "raw-preview" && format.mimeType !== "image/jpeg")) throw new Error("The upload role does not match the image format.");
    if (input.description !== undefined && (typeof input.description !== "string" || input.description.length > 2000)) throw new Error("Image descriptions must be under 2,000 characters.");
    return { name: input.name.trim(), size: input.size, uploadId: input.uploadId, role: input.role as UploadRole, description: String(input.description ?? ""), mimeType: format.mimeType };
}
