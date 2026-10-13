import { NextRequest, NextResponse } from "next/server";
import { PhotoUploadError, requireUploadOrigin } from "@/lib/photo-auth";
import { PHOTO_CHUNK_BYTES, validPhotoSignature } from "@/lib/photo-upload-policy";
import { photoUploadStatus, uploadPhotoChunk } from "@/lib/photo-drive-upload";
import { authenticatedUpload, photoUploadFailure, refreshUploadedPhoto, uploadHeaders } from "@/lib/photo-upload-http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
    try {
        const { owner, ticket } = await authenticatedUpload(request);
        const progress = await photoUploadStatus(owner, ticket);
        refreshUploadedPhoto(progress, ticket.name);
        return NextResponse.json(progress, { headers: uploadHeaders });
    } catch (error) { return photoUploadFailure(error); }
}

export async function PUT(request: NextRequest) {
    try {
        requireUploadOrigin(request);
        const { owner, ticket } = await authenticatedUpload(request);
        const rawOffset = request.headers.get("x-photo-offset") ?? "";
        if (!/^\d+$/.test(rawOffset)) throw new PhotoUploadError(400, "Invalid chunk offset.");
        const offset = Number(rawOffset);
        if (!Number.isSafeInteger(offset) || offset < 0 || offset >= ticket.size) throw new PhotoUploadError(400, "Invalid chunk offset.");
        if (Number(request.headers.get("content-length")) > PHOTO_CHUNK_BYTES) throw new PhotoUploadError(413, "Upload chunks must not exceed 2 MB.");
        const reader = request.body?.getReader();
        if (!reader) throw new PhotoUploadError(400, "The upload chunk is empty.");
        const chunks: Uint8Array[] = [];
        let length = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.byteLength;
            if (length > PHOTO_CHUNK_BYTES) { await reader.cancel(); throw new PhotoUploadError(413, "Upload chunks must not exceed 2 MB."); }
            chunks.push(value);
        }
        if (!length || offset + length > ticket.size || (offset + length < ticket.size && length % (256 * 1024) !== 0)) throw new PhotoUploadError(400, "Invalid upload chunk length.");
        const bytes = Buffer.concat(chunks);
        if (offset === 0 && !validPhotoSignature(bytes, ticket.name)) throw new PhotoUploadError(415, "The file content does not match a supported image format.");
        const progress = await uploadPhotoChunk(owner, ticket, bytes, offset, request.signal);
        refreshUploadedPhoto(progress, ticket.name);
        return NextResponse.json(progress, { headers: uploadHeaders });
    } catch (error) { return photoUploadFailure(error); }
}
