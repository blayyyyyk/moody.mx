import "server-only";
import { createHash } from "node:crypto";
import type { JWT } from "next-auth/jwt";
import { PhotoUploadError } from "./photo-auth";
import { PHOTO_CHUNK_BYTES, type DrivePhotoResult, type UploadProgress, validatePhotoUpload } from "./photo-upload-policy";
import { sealPhotoUpload, type PhotoUploadTicket } from "./photo-upload-ticket";

let cachedToken: { key: string; value: string; expires: number } | undefined;
let refreshing: { key: string; value: Promise<string> } | undefined;

export function galleryFolderId() {
    const folder = process.env.NEXT_PUBLIC_SHARED_FOLDER_ID;
    if (!folder || !/^[\w-]+$/.test(folder)) throw new PhotoUploadError(503, "The gallery's Google Drive folder is not configured.");
    return folder;
}

async function googleToken(owner: JWT): Promise<string> {
    if (typeof owner.googleAccessToken === "string" && Number(owner.googleExpiresAt) > Date.now() + 60000) return owner.googleAccessToken;
    if (typeof owner.googleRefreshToken !== "string" || !owner.googleRefreshToken) throw new PhotoUploadError(401, "Sign in again to reconnect Google Drive.");
    const key = createHash("sha256").update(owner.googleRefreshToken).digest("hex");
    if (cachedToken?.key === key && cachedToken.expires > Date.now()) return cachedToken.value;
    if (refreshing?.key === key) return refreshing.value;
    const refreshToken = owner.googleRefreshToken;
    const promise = (async () => {
        const response = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET! }),
        });
        if (!response.ok) throw new PhotoUploadError(401, "Google authorization has expired. Sign out and sign in again.");
        const token = await response.json();
        if (typeof token.access_token !== "string" || !token.access_token) throw new PhotoUploadError(502, "Google did not return a valid access token.");
        cachedToken = { key, value: token.access_token, expires: Date.now() + (Number(token.expires_in) || 3600) * 1000 - 60000 };
        return token.access_token as string;
    })();
    refreshing = { key, value: promise };
    try { return await promise; } finally { if (refreshing?.value === promise) refreshing = undefined; }
}

async function driveFetch(owner: JWT, url: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${await googleToken(owner)}`);
    return fetch(url, { ...init, headers, cache: "no-store", redirect: "manual", signal: init.signal ?? AbortSignal.timeout(60000) });
}

function uploadFailure(status: number): never {
    if (status === 401) throw new PhotoUploadError(401, "Google authorization has expired. Sign in again.");
    if (status === 403) throw new PhotoUploadError(403, "Google Drive denied the upload. Check write access to the gallery folder and available storage.");
    if (status === 429) throw new PhotoUploadError(429, "Google Drive is busy. Wait a moment, then resume the upload.");
    throw new PhotoUploadError(502, "Google Drive could not accept the upload. You can retry without reselecting the image.");
}

function driveFile(file: { id?: unknown; name?: unknown }): DrivePhotoResult {
    if (typeof file.id !== "string" || !/^[\w-]+$/.test(file.id) || typeof file.name !== "string") throw new PhotoUploadError(502, "Google returned an incomplete file confirmation.");
    return { id: file.id, name: file.name, url: `https://drive.google.com/file/d/${file.id}/view` };
}

async function completedUpload(owner: JWT, folder: string, uploadId: string) {
    const query = new URLSearchParams({
        q: `'${folder}' in parents and trashed = false and appProperties has { key='portfolioUploadId' and value='${uploadId}' }`,
        fields: "files(id,name)", pageSize: "1", supportsAllDrives: "true", includeItemsFromAllDrives: "true",
    });
    const response = await driveFetch(owner, `https://www.googleapis.com/drive/v3/files?${query}`);
    if (!response.ok) uploadFailure(response.status);
    const result = await response.json();
    return result.files?.[0] ? driveFile(result.files[0]) : undefined;
}

export async function startPhotoUpload(owner: JWT, input: ReturnType<typeof validatePhotoUpload>) {
    const folder = galleryFolderId();
    const existing = await completedUpload(owner, folder, input.uploadId);
    if (existing) return { complete: true, offset: input.size, file: existing };
    const response = await driveFetch(owner, "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": input.mimeType, "X-Upload-Content-Length": String(input.size) },
        body: JSON.stringify({
            name: input.name, mimeType: input.mimeType, description: input.description, parents: [folder],
            appProperties: { portfolioUploadId: input.uploadId, portfolioRole: input.role },
        }),
    });
    if (!response.ok) uploadFailure(response.status);
    const url = response.headers.get("location");
    if (!url || new URL(url).hostname !== "www.googleapis.com" || !url.startsWith("https://www.googleapis.com/upload/drive/v3/files?")) throw new PhotoUploadError(502, "Google did not create a valid upload session.");
    const ticket = sealPhotoUpload({ owner: owner.email!, folderId: folder, url, name: input.name, size: input.size, mimeType: input.mimeType, uploadId: input.uploadId, expiresAt: Date.now() + 60 * 60 * 1000 }, process.env.NEXTAUTH_SECRET!);
    return { complete: false, offset: 0, ticket, chunkSize: PHOTO_CHUNK_BYTES };
}

async function progress(owner: JWT, response: Response, ticket: PhotoUploadTicket): Promise<UploadProgress> {
    if (response.status === 200 || response.status === 201) return { complete: true, offset: ticket.size, file: driveFile(await response.json()) };
    if (response.status === 308) {
        const range = response.headers.get("range");
        const match = range?.match(/^bytes=0-(\d+)$/);
        const offset = match ? Number(match[1]) + 1 : 0;
        if ((range && !match) || !Number.isSafeInteger(offset) || offset > ticket.size) throw new PhotoUploadError(502, "Google returned an invalid upload offset.");
        return { complete: false, offset };
    }
    if (response.status === 404 || response.status === 410) {
        const file = await completedUpload(owner, ticket.folderId, ticket.uploadId);
        if (file) return { complete: true, offset: ticket.size, file };
        throw new PhotoUploadError(410, "The upload session expired. Retry to start a new session.");
    }
    uploadFailure(response.status);
}

export async function photoUploadStatus(owner: JWT, ticket: PhotoUploadTicket) {
    const response = await driveFetch(owner, ticket.url, { method: "PUT", headers: { "Content-Length": "0", "Content-Range": `bytes */${ticket.size}` } });
    return progress(owner, response, ticket);
}

export async function uploadPhotoChunk(owner: JWT, ticket: PhotoUploadTicket, bytes: Uint8Array, offset: number, signal: AbortSignal) {
    const response = await driveFetch(owner, ticket.url, {
        method: "PUT", signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
        headers: { "Content-Type": ticket.mimeType, "Content-Length": String(bytes.byteLength), "Content-Range": `bytes ${offset}-${offset + bytes.byteLength - 1}/${ticket.size}` },
        body: Buffer.from(bytes),
    });
    return progress(owner, response, ticket);
}
