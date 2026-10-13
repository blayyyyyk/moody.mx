import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { MAX_PHOTO_BYTES } from "./photo-upload-policy";

export type PhotoUploadTicket = {
    owner: string; folderId: string; url: string; name: string; size: number; mimeType: string; uploadId: string; expiresAt: number;
};

function key(secret: string) { return createHash("sha256").update(`photo-upload-v1:${secret}`).digest(); }

export function sealPhotoUpload(ticket: PhotoUploadTicket, secret: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
    cipher.setAAD(Buffer.from("photo-upload-v1"));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(ticket), "utf8"), cipher.final()]);
    return [iv, encrypted, cipher.getAuthTag()].map((part) => part.toString("base64url")).join(".");
}

export function openPhotoUpload(value: string, secret: string, owner: string, folderId: string, now = Date.now()): PhotoUploadTicket {
    if (value.length > 6000) throw new Error("Invalid upload session.");
    const parts = value.split(".").map((part) => Buffer.from(part, "base64url"));
    if (parts.length !== 3 || parts[0].length !== 12 || parts[2].length !== 16) throw new Error("Invalid upload session.");
    const decipher = createDecipheriv("aes-256-gcm", key(secret), parts[0]);
    decipher.setAAD(Buffer.from("photo-upload-v1"));
    decipher.setAuthTag(parts[2]);
    const ticket: PhotoUploadTicket = JSON.parse(Buffer.concat([decipher.update(parts[1]), decipher.final()]).toString("utf8"));
    if (ticket.owner !== owner || ticket.folderId !== folderId || !Number.isFinite(ticket.expiresAt) || ticket.expiresAt <= now
        || !Number.isSafeInteger(ticket.size) || ticket.size < 12 || ticket.size > MAX_PHOTO_BYTES) throw new Error("The upload session is invalid or expired.");
    const url = new URL(ticket.url);
    if (url.origin !== "https://www.googleapis.com" || url.username || url.password || url.pathname !== "/upload/drive/v3/files" || !url.searchParams.get("upload_id")) throw new Error("Invalid upload destination.");
    return ticket;
}
