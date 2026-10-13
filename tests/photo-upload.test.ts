import { after, mock, test } from "node:test";
import assert from "node:assert/strict";
import { encode } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { POST as startUpload } from "../src/app/api/admin/photos/upload/start/route";
import { GET as uploadStatus, PUT as sendChunk } from "../src/app/api/admin/photos/upload/chunk/route";
import { isPhotoOwner } from "../src/lib/photo-owner-policy";
import { companionExifTags, editedExifTags, formFromExif, verifyExifTags } from "../src/lib/photo-metadata";
import { PHOTO_CHUNK_BYTES, validPhotoSignature, validatePhotoUpload } from "../src/lib/photo-upload-policy";
import { openPhotoUpload, sealPhotoUpload } from "../src/lib/photo-upload-ticket";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const invalidations: string[] = [];
mock.method(require("next/cache"), "revalidateTag", (tag: string) => { invalidations.push(tag); });
after(() => { globalThis.fetch = originalFetch; process.env = originalEnv; mock.restoreAll(); });

test("owner policy requires the exact configured, verified Google account", () => {
    assert.equal(isPhotoOwner({ email: "owner@example.test", email_verified: true }, " OWNER@example.test "), true);
    assert.equal(isPhotoOwner({ email: "other@example.test", email_verified: true }, "owner@example.test"), false);
    assert.equal(isPhotoOwner({ email: "owner@example.test", email_verified: false }, "owner@example.test"), false);
    assert.equal(isPhotoOwner({ email: "owner@example.test", email_verified: "true" }, "owner@example.test"), false);
    assert.equal(isPhotoOwner({ email: "owner@example.test", email_verified: true }, undefined), false);
});

test("EXIF edits validate fractions, dates and choices and verify physical tag values", () => {
    const original = formFromExif({ "IFD0:Make": "SONY", "ExifIFD:ExposureTime": .004 });
    const tags = editedExifTags({ ...original, make: "", iso: "400", shutter: "1/125", taken: "2026-10-13T12:30", whiteBalance: "1" }, original);
    assert.deepEqual(tags, { "EXIF:Make": "", "EXIF:DateTimeOriginal": "2026:10:13 12:30:00", "EXIF:ExposureTime": .008, "EXIF:ISO": 400, "EXIF:WhiteBalance": 1 });
    verifyExifTags(tags, { "ExifIFD:DateTimeOriginal": "2026:10:13 12:30:00", "ExifIFD:ExposureTime": .008, "ExifIFD:ISO": 400, "ExifIFD:WhiteBalance": 1 });
    assert.throws(() => editedExifTags({ ...original, taken: "2026-02-30T12:30" }, original), /calendar/);
    assert.throws(() => editedExifTags({ ...original, shutter: "1/0" }, original), /Shutter/);
    assert.throws(() => editedExifTags({ ...original, iso: "12.5" }, original), /whole number/);
    assert.throws(() => editedExifTags({ ...original, orientation: "99" }, original), /orientation/);
    assert.throws(() => verifyExifTags({ "EXIF:ISO": 400 }, { "ExifIFD:ISO": 100 }), /could not be verified/);
});

test("upload tickets hide Google session URLs and reject tampering, expiry and another owner", () => {
    const secret = "test-only-secret-with-at-least-32-characters";
    const ticket = { owner: "owner@example.test", folderId: "gallery", name: "photo.jpg", size: 1000, mimeType: "image/jpeg", uploadId: "uuid", url: "https://www.googleapis.com/upload/drive/v3/files?upload_id=private-session", expiresAt: 20000 };
    const sealed = sealPhotoUpload(ticket, secret);
    assert.equal(sealed.includes("private-session"), false);
    assert.deepEqual(openPhotoUpload(sealed, secret, ticket.owner, ticket.folderId, 10000), ticket);
    assert.throws(() => openPhotoUpload(sealed, secret, "other@example.test", ticket.folderId, 10000));
    assert.throws(() => openPhotoUpload(sealed, secret, ticket.owner, "other-folder", 10000));
    assert.throws(() => openPhotoUpload(sealed, secret, ticket.owner, ticket.folderId, 20001));
    const parts = sealed.split("."); parts[1] = (parts[1][0] === "A" ? "B" : "A") + parts[1].slice(1);
    assert.throws(() => openPhotoUpload(parts.join("."), secret, ticket.owner, ticket.folderId, 10000));
    assert.throws(() => openPhotoUpload(sealPhotoUpload({ ...ticket, url: "https://attacker.example/upload" }, secret), secret, ticket.owner, ticket.folderId, 10000));
    assert.throws(() => openPhotoUpload(sealPhotoUpload({ ...ticket, url: "https://www.googleapis.com:444/upload/drive/v3/files?upload_id=test" }, secret), secret, ticket.owner, ticket.folderId, 10000));
});

test("RAW companions carry explicit deletions and normalize rendered preview metadata", () => {
    const tags = companionExifTags({ "IFD0:Make": "SONY", "IFD0:Orientation": 6 }, { "EXIF:Artist": "", "EXIF:Copyright": "", "EXIF:ImageDescription": "" }, true);
    assert.equal(tags["EXIF:Artist"], "");
    assert.equal(tags["EXIF:Copyright"], "");
    assert.equal(tags["EXIF:ImageDescription"], "");
    assert.equal(tags["EXIF:Orientation"], 1);
    assert.equal(tags["EXIF:ColorSpace"], 1);
    assert.throws(() => verifyExifTags(tags, { "IFD0:Make": "SONY", "IFD0:Orientation": 1, "ExifIFD:ColorSpace": 1, "IFD0:Artist": "Stale embedded author" }), /Photographer/);
    verifyExifTags(tags, { "IFD0:Make": "SONY", "IFD0:Orientation": 1, "ExifIFD:ColorSpace": 1 });
    assert.equal(companionExifTags({}, { "EXIF:Orientation": "" }, true)["EXIF:Orientation"], "");
});

test("upload validation rejects unsafe names, unsupported data and mismatched RAW roles", () => {
    const spec = { name: "photo.jpg", size: 2000, role: "image", uploadId: "11111111-1111-4111-8111-111111111111" };
    assert.equal(validatePhotoUpload(spec).mimeType, "image/jpeg");
    assert.throws(() => validatePhotoUpload({ ...spec, name: "../photo.jpg" }));
    assert.throws(() => validatePhotoUpload({ ...spec, role: "raw-original" }));
    assert.throws(() => validatePhotoUpload({ ...spec, size: 200 * 1024 * 1024 }));
    assert.equal(validPhotoSignature(new Uint8Array([0xff, 0xd8, 0xff, ...Array(29).fill(0)]), "photo.jpg"), true);
    assert.equal(validPhotoSignature(new Uint8Array([0x49, 0x49, 42, ...Array(29).fill(0)]), "photo.arw"), true);
    assert.equal(validPhotoSignature(new TextEncoder().encode("FUJIFILMCCD-RAW padded-header"), "photo.raf"), true);
    assert.equal(validPhotoSignature(new TextEncoder().encode("not-an-image-header"), "photo.jpg"), false);
});

test("owner-only resumable Drive uploads enforce authorization, folder and chunk boundaries", async (t) => {
    Object.assign(process.env, {
        GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret", PHOTO_ADMIN_EMAIL: "owner@example.test",
        NEXTAUTH_SECRET: "test-session-secret-at-least-32-characters", NEXTAUTH_URL: "http://localhost:3001", NEXT_PUBLIC_SHARED_FOLDER_ID: "configured-gallery",
    });
    const origin = "http://localhost:3001";
    const input = { name: "photo.jpg", size: PHOTO_CHUNK_BYTES + 64, role: "image", uploadId: "11111111-1111-4111-8111-111111111111", parents: ["attacker-folder"] };
    const cookie = async (email = "owner@example.test") => `next-auth.session-token=${await encode({ secret: process.env.NEXTAUTH_SECRET!, token: { sub: "test-owner", email, photoOwner: true, googleAccessToken: "test-google-access", googleExpiresAt: Date.now() + 3600000 } })}`;
    const ownerCookie = await cookie();
    const startRequest = (session = ownerCookie, requestOrigin = origin) => new NextRequest(`${origin}/api/admin/photos/upload/start`, { method: "POST", headers: { origin: requestOrigin, cookie: session, "content-type": "application/json" }, body: JSON.stringify(input) });
    let calls = 0, uploaded = 0, completed = false;
    globalThis.fetch = (async (resource, init) => {
        calls++;
        const url = String(resource);
        const headers = new Headers(init?.headers);
        assert.equal(headers.get("authorization"), "Bearer test-google-access");
        if (url.startsWith("https://www.googleapis.com/drive/v3/files?")) return Response.json({ files: completed ? [{ id: "saved-file", name: "photo.jpg" }] : [] });
        if (init?.method === "POST") {
            const body = JSON.parse(String(init.body));
            assert.deepEqual(body.parents, ["configured-gallery"]);
            assert.equal(body.appProperties.portfolioRole, "image");
            return new Response(null, { headers: { location: "https://www.googleapis.com/upload/drive/v3/files?upload_id=test-session" } });
        }
        const range = headers.get("content-range")!;
        if (!range.startsWith("bytes */")) {
            const match = range.match(/^bytes (\d+)-(\d+)\/(\d+)$/)!;
            assert.equal(Number(match[1]), uploaded);
            assert.equal(Number(match[3]), input.size);
            uploaded = Number(match[2]) + 1;
        }
        completed = uploaded === input.size;
        return completed ? Response.json({ id: "saved-file", name: "photo.jpg" }) : new Response(null, { status: 308, headers: uploaded ? { range: `bytes=0-${uploaded - 1}` } : {} });
    }) as typeof fetch;

    await t.test("anonymous, wrong-account and cross-origin writes never reach Drive", async () => {
        assert.equal((await startUpload(startRequest(""))).status, 401);
        assert.equal((await startUpload(startRequest(await cookie("other@example.test")))).status, 401);
        assert.equal((await startUpload(startRequest(ownerCookie, "https://other.example"))).status, 403);
        assert.equal(calls, 0);
    });
    const started = await startUpload(startRequest());
    assert.equal(started.status, 200);
    const body = await started.json();
    assert.equal(body.chunkSize, PHOTO_CHUNK_BYTES);
    assert.equal(JSON.stringify(body).includes("test-google-access"), false);
    const chunkRequest = (bytes: Buffer, offset: string, ticket = body.ticket, session = ownerCookie) => new NextRequest(`${origin}/api/admin/photos/upload/chunk`, { method: "PUT", headers: { origin, cookie: session, "x-photo-upload": ticket, "x-photo-offset": offset }, body: bytes });
    await t.test("invalid headers, signatures and oversized chunks are rejected", async () => {
        const before = calls;
        assert.equal((await sendChunk(chunkRequest(Buffer.alloc(256 * 1024), "0"))).status, 415);
        assert.equal((await sendChunk(chunkRequest(Buffer.alloc(12), "-1"))).status, 400);
        assert.equal((await sendChunk(chunkRequest(Buffer.alloc(PHOTO_CHUNK_BYTES + 1), "0"))).status, 413);
        assert.equal((await sendChunk(chunkRequest(Buffer.alloc(12), "0", "invalid"))).status, 410);
        assert.equal((await sendChunk(chunkRequest(Buffer.alloc(12), "0", body.ticket, ""))).status, 401);
        assert.equal(calls, before);
    });
    await t.test("bytes upload in bounded chunks and status probes report the saved offset", async () => {
        const first = Buffer.alloc(PHOTO_CHUNK_BYTES); first.set([0xff, 0xd8, 0xff]);
        const partial = await sendChunk(chunkRequest(first, "0"));
        assert.deepEqual(await partial.json(), { complete: false, offset: PHOTO_CHUNK_BYTES });
        assert.equal(invalidations.length, 0);
        const status = await uploadStatus(new NextRequest(`${origin}/api/admin/photos/upload/chunk`, { headers: { cookie: ownerCookie, "x-photo-upload": body.ticket } }));
        assert.deepEqual(await status.json(), { complete: false, offset: PHOTO_CHUNK_BYTES });
        const final = await sendChunk(chunkRequest(Buffer.alloc(64), String(PHOTO_CHUNK_BYTES)));
        assert.deepEqual(await final.json(), { complete: true, offset: input.size, file: { id: "saved-file", name: "photo.jpg", url: "https://drive.google.com/file/d/saved-file/view" } });
        assert.deepEqual(invalidations, ["portfolio-photo-feed"]);
    });
    await t.test("retrying the same completed upload reuses its Drive file", async () => {
        const retry = await startUpload(startRequest());
        const result = await retry.json();
        assert.equal(result.complete, true);
        assert.equal(result.file.id, "saved-file");
        assert.equal(result.ticket, undefined);
    });
});
