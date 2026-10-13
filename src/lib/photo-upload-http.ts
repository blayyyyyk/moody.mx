import { NextResponse, type NextRequest } from "next/server";
import { PhotoUploadError, requirePhotoOwner } from "./photo-auth";
import { galleryFolderId } from "./photo-drive-upload";
import { openPhotoUpload } from "./photo-upload-ticket";
import { revalidateTag } from "next/cache";
import { PHOTO_FEED_CACHE_TAG } from "./drive-photos";
import { isRawPhoto, type UploadProgress } from "./photo-upload-policy";

export const uploadHeaders = { "Cache-Control": "no-store" };

export function refreshUploadedPhoto(progress: UploadProgress, name: string) {
    if (progress.complete && !isRawPhoto(name)) revalidateTag(PHOTO_FEED_CACHE_TAG);
}

export function photoUploadFailure(error: unknown) {
    return NextResponse.json({ error: error instanceof PhotoUploadError ? error.message : "The upload could not be completed. Please retry." }, {
        status: error instanceof PhotoUploadError ? error.status : 503, headers: uploadHeaders,
    });
}

export async function authenticatedUpload(request: NextRequest) {
    const owner = await requirePhotoOwner(request);
    let ticket;
    try {
        ticket = openPhotoUpload(request.headers.get("x-photo-upload") ?? "", process.env.NEXTAUTH_SECRET!, owner.email!, galleryFolderId());
    } catch { throw new PhotoUploadError(410, "The upload session is invalid or expired. Retry to start a new session."); }
    return { owner, ticket };
}
