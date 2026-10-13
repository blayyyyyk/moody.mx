import { after, test } from "node:test";
import assert from "node:assert/strict";
import { fetchDrivePhotos } from "../src/lib/drive-photos";
import { featuredPhotoIds, masonryPhotos, photoDescription, photoDimensions } from "../src/lib/photos";
import type { Photo } from "../src/lib/types";

const originalFetch = globalThis.fetch;
const originalKey = process.env.NEXT_PUBLIC_GCP_API_KEY;
after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NEXT_PUBLIC_GCP_API_KEY;
    else process.env.NEXT_PUBLIC_GCP_API_KEY = originalKey;
});

// Drive may omit unrelated fields. Only gallery-consumed fields are fixtures.
const photo = (id: string, overrides: Partial<Photo> = {}) => ({
    id, title: `${id}.jpg`, mimeType: "image/jpeg", webContentLink: `https://drive.google.com/uc?id=${id}`,
    imageMediaMetadata: { width: 1200, height: 800, rotation: 0 }, ...overrides,
} as Photo);

test("Drive pagination includes newly uploaded images beyond the first result page", async () => {
    process.env.NEXT_PUBLIC_GCP_API_KEY = "test-only-key";
    const requests: URL[] = [];
    globalThis.fetch = (async (input) => {
        const url = new URL(String(input));
        requests.push(url);
        return Response.json(url.searchParams.has("pageToken")
            ? { items: [photo("new-upload", { imageMediaMetadata: { width: 800, height: 1200, rotation: 0 } })] }
            : { items: [photo("landscape")], nextPageToken: "next-page" });
    }) as typeof fetch;
    const result = await fetchDrivePhotos("folder-id");
    assert.deepEqual(result.map((item) => item.id), ["landscape", "new-upload"]);
    assert.equal(requests.length, 2);
    assert.equal(requests[1].searchParams.get("pageToken"), "next-page");
    assert.match(requests[0].searchParams.get("q")!, /trashed = false/);
    assert.match(requests[0].searchParams.get("q")!, /mimeType contains 'image\/'/);
    assert.deepEqual(masonryPhotos(result).map(({ width, height }) => width / height), [1.5, 2 / 3]);
});

test("gallery handles sparse metadata and excludes non-displayable Drive entries", () => {
    const broken = photo("missing-exif", { imageMediaMetadata: undefined });
    const result = masonryPhotos([
        broken,
        photo("folder", { mimeType: "application/vnd.google-apps.folder" }),
        photo("no-download", { webContentLink: "" }),
        photo("raw-original", { title: "original.ARW", mimeType: "image/x-sony-arw" }),
    ]);
    assert.equal(result.length, 1);
    assert.deepEqual(photoDimensions(broken), { width: 4, height: 3 });
    assert.deepEqual(photoDimensions(photo("invalid", { imageMediaMetadata: { width: Infinity, height: 0, rotation: 0 } })), { width: 4, height: 3 });
    assert.equal(result[0].key, "missing-exif");
    assert.equal(result[0].source, broken);
});

test("descriptions prefer authored text without exposing download URLs or camera filenames", () => {
    assert.equal(photoDescription(photo("DSC01234")), "Photograph from Blake’s collection");
    assert.equal(photoDescription(photo("coastal-walk")), "coastal walk");
    assert.equal(photoDescription(photo("DSC01234", { description: "A quiet harbor at sunrise" })), "A quiet harbor at sunrise");
});

test("masonry dimensions follow Drive quarter-turn and degree rotation metadata", () => {
    for (const rotation of [1, 3, 90, 270, -90]) {
        assert.deepEqual(photoDimensions(photo("portrait", { imageMediaMetadata: { width: 1200, height: 800, rotation } })), { width: 800, height: 1200 });
    }
    for (const rotation of [0, 2, 180, 360]) {
        assert.deepEqual(photoDimensions(photo("landscape", { imageMediaMetadata: { width: 1200, height: 800, rotation } })), { width: 1200, height: 800 });
    }
});

test("featured photos are sparse, separated, and selected from valid images without mutation", () => {
    const photos = Array.from({ length: 18 }, (_, index) => photo(`image-${index}`));
    const before = JSON.stringify(photos);
    const selections = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
        let state = seed;
        const selected = featuredPhotoIds(photos, () => {
            state = state * 16807 % 2147483647;
            return state / 2147483647;
        });
        assert.equal(selected.length, 2);
        assert.equal(new Set(selected).size, selected.length);
        const indexes = selected.map((id) => photos.findIndex((photo) => photo.id === id));
        assert.ok(indexes.every((index) => index >= 0));
        assert.ok(indexes[1] - indexes[0] >= 4);
        selections.add(selected.join(","));
    }
    assert.ok(selections.size > 1, "different per-load randomness should produce different featured selections");
    assert.equal(JSON.stringify(photos), before);
    assert.deepEqual(featuredPhotoIds(photos.slice(0, 5)), []);
    assert.deepEqual(featuredPhotoIds(Array.from({ length: 10 }, (_, i) => photo(`folder-${i}`, { mimeType: "application/vnd.google-apps.folder" }))), []);
});

test("Drive failures reject cleanly and empty folders have no reserved rows", async () => {
    process.env.NEXT_PUBLIC_GCP_API_KEY = "test-only-key";
    globalThis.fetch = (async () => Response.json({}, { status: 403 })) as typeof fetch;
    await assert.rejects(() => fetchDrivePhotos("folder-id"), /temporarily unavailable/);
    globalThis.fetch = (async () => Response.json({})) as typeof fetch;
    assert.deepEqual(await fetchDrivePhotos("folder-id"), []);
    delete process.env.NEXT_PUBLIC_GCP_API_KEY;
    globalThis.fetch = (async () => { throw new Error("Should not request Drive without configuration"); }) as typeof fetch;
    assert.deepEqual(await fetchDrivePhotos("folder-id"), []);
});
