import type { Photo } from "./types";
import { isRawPhoto } from "./photo-upload-policy";

export function isGalleryPhoto(photo: Photo) {
    return Boolean(photo.mimeType?.startsWith("image/") && photo.webContentLink
        && !isRawPhoto(photo.originalFilename || photo.title || `image.${photo.fileExtension}`));
}

export function photoDimensions(photo: Photo) {
    const width = photo.imageMediaMetadata?.width;
    const height = photo.imageMediaMetadata?.height;
    if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) return { width: 4, height: 3 };
    // Drive reports clockwise quarter-turns. Also accept degree values from
    // imported metadata, while leaving invalid or half-turn values unswapped.
    const rotation = photo.imageMediaMetadata?.rotation;
    const quarterTurn = rotation === 1 || rotation === 3 || rotation === -1 || rotation === -3
        || (Number.isInteger(rotation) && Math.abs(rotation % 180) === 90);
    return quarterTurn ? { width: height, height: width } : { width, height };
}

export function photoDescription(photo: Photo) {
    if (photo.description?.trim()) return photo.description.trim();
    const title = photo.title?.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    return title && !/^(?:DSC|DSCF|IMG|IMAGE|PXL|DCIM)[ _-]?\d+$/i.test(title)
        ? title : "Photograph from Blake’s collection";
}

export function masonryPhotos(photos: Photo[]) {
    return photos.filter(isGalleryPhoto).map((photo) => ({
        key: photo.id,
        src: photo.webContentLink,
        alt: photoDescription(photo),
        ...photoDimensions(photo),
        source: photo,
    }));
}

export function featuredPhotoIds(photos: Photo[], random = Math.random): string[] {
    const images = masonryPhotos(photos);
    if (images.length < 6) return [];
    const count = Math.max(1, Math.floor(images.length / 8));
    const candidates = images.map((_, index) => index);
    for (let index = candidates.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
    }
    const selected: number[] = [];
    for (const index of candidates) {
        // Keep the larger photos separated in the gallery's source order.
        if (selected.every((previous) => Math.abs(previous - index) >= 4)) selected.push(index);
        if (selected.length === count) break;
    }
    return selected.sort((a, b) => a - b).map((index) => images[index].key);
}
