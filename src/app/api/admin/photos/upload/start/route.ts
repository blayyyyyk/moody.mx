import { NextRequest, NextResponse } from "next/server";
import { PhotoUploadError, requirePhotoOwner, requireUploadOrigin } from "@/lib/photo-auth";
import { validatePhotoUpload } from "@/lib/photo-upload-policy";
import { startPhotoUpload } from "@/lib/photo-drive-upload";
import { photoUploadFailure, refreshUploadedPhoto, uploadHeaders } from "@/lib/photo-upload-http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        requireUploadOrigin(request);
        const owner = await requirePhotoOwner(request);
        if (!request.headers.get("content-type")?.startsWith("application/json")) throw new PhotoUploadError(415, "Expected upload details as JSON.");
        const text = await request.text();
        if (text.length > 5000) throw new PhotoUploadError(413, "Upload details are too large.");
        let input;
        try { input = validatePhotoUpload(JSON.parse(text)); } catch (error) { throw new PhotoUploadError(400, error instanceof Error ? error.message : "Invalid upload details."); }
        const progress = await startPhotoUpload(owner, input);
        refreshUploadedPhoto(progress, input.name);
        return NextResponse.json(progress, { headers: uploadHeaders });
    } catch (error) { return photoUploadFailure(error); }
}
