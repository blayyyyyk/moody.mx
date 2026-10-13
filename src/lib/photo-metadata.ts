import type { UploadRole } from "./photo-upload-policy";

export type ExifForm = Record<string, string>;
export type ExifRecord = Record<string, unknown>;
export type ExifField = {
    key: string; label: string; tag: string; read: string; section: string;
    kind: "text" | "date" | "number" | "select"; min?: number; max?: number; integer?: boolean;
    choices?: readonly (readonly [string, string])[]; placeholder?: string;
};

export const EXIF_FIELDS: readonly ExifField[] = [
    { key: "make", label: "Make", tag: "EXIF:Make", read: "IFD0:Make", section: "Camera / lens", kind: "text" },
    { key: "model", label: "Camera model", tag: "EXIF:Model", read: "IFD0:Model", section: "Camera / lens", kind: "text" },
    { key: "lens", label: "Lens model", tag: "EXIF:LensModel", read: "ExifIFD:LensModel", section: "Camera / lens", kind: "text" },
    { key: "taken", label: "Date taken", tag: "EXIF:DateTimeOriginal", read: "ExifIFD:DateTimeOriginal", section: "Capture settings", kind: "date" },
    { key: "aperture", label: "Aperture (f/)", tag: "EXIF:FNumber", read: "ExifIFD:FNumber", section: "Capture settings", kind: "number", min: .1, max: 256, placeholder: "5.6" },
    { key: "shutter", label: "Shutter (seconds)", tag: "EXIF:ExposureTime", read: "ExifIFD:ExposureTime", section: "Capture settings", kind: "number", min: .0000001, max: 86400, placeholder: "1/250" },
    { key: "iso", label: "ISO", tag: "EXIF:ISO", read: "ExifIFD:ISO", section: "Capture settings", kind: "number", min: 1, max: 65535, integer: true },
    { key: "focal", label: "Focal length (mm)", tag: "EXIF:FocalLength", read: "ExifIFD:FocalLength", section: "Capture settings", kind: "number", min: .1, max: 10000 },
    { key: "bias", label: "Exposure compensation (EV)", tag: "EXIF:ExposureCompensation", read: "ExifIFD:ExposureCompensation", section: "Capture settings", kind: "number", min: -30, max: 30 },
    { key: "whiteBalance", label: "White balance", tag: "EXIF:WhiteBalance", read: "ExifIFD:WhiteBalance", section: "Image", kind: "select", choices: [["0", "Auto"], ["1", "Manual"]] },
    { key: "colorSpace", label: "Color space", tag: "EXIF:ColorSpace", read: "ExifIFD:ColorSpace", section: "Image", kind: "select", choices: [["1", "sRGB"], ["2", "Adobe RGB"], ["65535", "Uncalibrated"]] },
    { key: "orientation", label: "Orientation", tag: "EXIF:Orientation", read: "IFD0:Orientation", section: "Image", kind: "select", choices: [["1", "Normal"], ["2", "Mirror horizontal"], ["3", "Rotate 180°"], ["4", "Mirror vertical"], ["5", "Transpose"], ["6", "Rotate 90° clockwise"], ["7", "Transverse"], ["8", "Rotate 90° counterclockwise"]] },
    { key: "artist", label: "Photographer", tag: "EXIF:Artist", read: "IFD0:Artist", section: "Attribution", kind: "text" },
    { key: "copyright", label: "Copyright", tag: "EXIF:Copyright", read: "IFD0:Copyright", section: "Attribution", kind: "text" },
    { key: "description", label: "Description", tag: "EXIF:ImageDescription", read: "IFD0:ImageDescription", section: "Attribution", kind: "text" },
];

export function formFromExif(metadata: ExifRecord): ExifForm {
    return Object.fromEntries(EXIF_FIELDS.map((field) => {
        const value = metadata[field.read];
        let text = typeof value === "string" || typeof value === "number" ? String(value) : "";
        if (field.kind === "date") text = text.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3T").slice(0, 19);
        if (field.key === "shutter" && typeof value === "number" && value > 0 && value < 1 && Math.abs(1 / value - Math.round(1 / value)) < .01) text = `1/${Math.round(1 / value)}`;
        return [field.key, text];
    }));
}

function exifDate(text: string) {
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) throw new Error("Use a valid date and time for Date taken.");
    const [, year, month, day, hour, minute, second = "00"] = match;
    const values = [year, month, day, hour, minute, second].map(Number);
    const date = new Date(0);
    date.setUTCFullYear(values[0], values[1] - 1, values[2]);
    date.setUTCHours(values[3], values[4], values[5], 0);
    if (values[0] < 1 || date.getUTCFullYear() !== values[0] || date.getUTCMonth() + 1 !== values[1] || date.getUTCDate() !== values[2] || date.getUTCHours() !== values[3] || date.getUTCMinutes() !== values[4] || date.getUTCSeconds() !== values[5]) throw new Error("Date taken is not a valid calendar date and time.");
    return `${year}:${month}:${day} ${hour}:${minute}:${second}`;
}

export function editedExifTags(form: ExifForm, original: ExifForm) {
    const tags: Record<string, string | number> = {};
    for (const field of EXIF_FIELDS) {
        const value = (form[field.key] ?? "").trim();
        if (value === (original[field.key] ?? "").trim()) continue;
        if (value.includes("\0") || value.length > (field.key === "description" ? 2000 : 240)) throw new Error(`${field.label} is too long or contains an invalid character.`);
        if (!value) { tags[field.tag] = ""; continue; }
        if (field.kind === "date") { tags[field.tag] = exifDate(value); continue; }
        if (field.kind === "number") {
            const parts = value.split("/");
            const number = parts.length <= 2 ? Number(parts[0]) / Number(parts[1] ?? 1) : NaN;
            if (!Number.isFinite(number) || number < field.min! || number > field.max! || (field.integer && !Number.isInteger(number))) throw new Error(`${field.label} must be ${field.integer ? "a whole number" : "a number or fraction"} between ${field.min} and ${field.max}.`);
            tags[field.tag] = number;
        } else if (field.kind === "select") {
            if (!field.choices?.some(([choice]) => choice === value)) throw new Error(`Choose a valid ${field.label.toLowerCase()}.`);
            tags[field.tag] = Number(value);
        } else tags[field.tag] = value;
    }
    return tags;
}

export function verifyExifTags(tags: Record<string, string | number>, metadata: ExifRecord) {
    for (const field of EXIF_FIELDS) {
        if (!(field.tag in tags)) continue;
        const expected = tags[field.tag];
        const actual = metadata[field.read];
        const matches = expected === "" ? actual === undefined || actual === ""
            : typeof expected === "number" ? typeof actual === "number" && Math.abs(actual - expected) <= Math.max(1e-7, Math.abs(expected) * 1e-6)
            : actual === expected;
        if (!matches) throw new Error(`${field.label} could not be verified in the prepared image. Nothing has been uploaded.`);
    }
}

export function companionExifTags(metadata: ExifRecord, edits: Record<string, string | number> = {}, normalized = false) {
    const tags: Record<string, string | number> = {};
    for (const field of EXIF_FIELDS) {
        const value = metadata[field.read];
        if (typeof value === "string" || typeof value === "number") tags[field.tag] = value;
    }
    // An embedded JPEG can contain older metadata than its parent RAW. Explicit
    // deletions must reach the companion too, rather than disappearing here.
    Object.assign(tags, edits);
    if (normalized) {
        if (edits["EXIF:Orientation"] !== "") tags["EXIF:Orientation"] = 1;
        if (edits["EXIF:ColorSpace"] !== "") tags["EXIF:ColorSpace"] = 1;
    }
    return tags;
}

export type InspectedPhoto = { metadata: ExifRecord; form: ExifForm; preview: File | null; raw: boolean; previewNote: string };
export type PreparedPhotoFile = { file: File; role: UploadRole };
export type PreparedPhoto = { files: PreparedPhotoFile[]; preview: File; metadata: ExifRecord; changed: number; previewNote: string };
export type MetadataRequest = { id: number; action: "inspect"; file: File } | { id: number; action: "prepare"; file: File; form: ExifForm; original: ExifForm };
