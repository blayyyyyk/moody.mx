import "server-only";
import type { Photo, PhotosResponse } from "./types";
import { isGalleryPhoto } from "./photos";

export const PHOTO_FEED_CACHE_TAG = "portfolio-photo-feed";

export async function fetchDrivePhotos(folderId: string): Promise<Photo[]> {
    const apiKey = process.env.NEXT_PUBLIC_GCP_API_KEY;
    if (!apiKey) return [];

    const photos: Photo[] = [];
    let pageToken: string | undefined;
    do {
        const query = new URLSearchParams({
            q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
            key: apiKey,
            maxResults: "1000",
            ...(pageToken ? { pageToken } : {}),
        });
        const response = await fetch(`https://www.googleapis.com/drive/v2/files?${query}`, {
            headers: { Accept: "application/json" },
            next: { revalidate: 300, tags: [PHOTO_FEED_CACHE_TAG] },
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("The photo library is temporarily unavailable.");
        const result: PhotosResponse = await response.json();
        photos.push(...(result.items ?? []).filter(isGalleryPhoto));
        pageToken = result.nextPageToken;
    } while (pageToken);
    return photos;
}
