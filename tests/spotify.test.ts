import { after, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { musicSnapshot, searchMusic, spotify, SpotifyError } from "../src/lib/spotify";
import { GET, POST } from "../src/app/api/spotify/queue/route";
import { createQueueLimiter } from "../src/lib/spotify-queue-limit";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
after(() => { globalThis.fetch = originalFetch; process.env = originalEnv; });

test("Spotify server integration and public queue boundaries", async (t) => {
    delete process.env.SPOTIFY_REFRESH_TOKEN;
    await assert.rejects(() => musicSnapshot(), /isn't connected/);
    process.env.SPOTIFY_CLIENT_ID = "test-client";
    process.env.SPOTIFY_CLIENT_SECRET = "test-secret";
    process.env.SPOTIFY_REFRESH_TOKEN = "test-refresh";
    const calls: string[] = [];
    let queueStatus = 204;
    let forceUnauthorized = false;
    let favoritesFail = false;
    let currentlyPlaying = false;
    const item = {
        id: "1234567890123456789012", uri: "spotify:track:1234567890123456789012", name: "Test track",
        artists: [{ name: "Test artist" }], album: { name: "Test album", images: [{ url: "https://example.com/art.jpg" }] },
        external_urls: { spotify: "https://open.spotify.com/track/1234567890123456789012" }, duration_ms: 201000,
    };
    globalThis.fetch = (async (input, options) => {
        const url = String(input);
        calls.push(url);
        if (url.includes("accounts.spotify.com")) {
            assert.equal(options?.method, "POST");
            assert.match(String(options?.body), /refresh_token=test-refresh/);
            return Response.json({ access_token: "private-access-token", expires_in: 3600 });
        }
        if (forceUnauthorized) { forceUnauthorized = false; return new Response(null, { status: 401 }); }
        if (url.includes("recently-played")) return Response.json({ items: [{ track: item, played_at: "2026-10-11T10:00:00Z" }, { track: item, played_at: "2026-10-12T10:00:00Z" }] });
        if (url.includes("currently-playing")) return currentlyPlaying ? Response.json({ is_playing: true, currently_playing_type: "track", item }) : new Response(null, { status: 204 });
        if (url.includes("/me/top/") && favoritesFail) return new Response(null, { status: 503 });
        if (url.includes("top/tracks")) return Response.json({ items: [item] });
        if (url.includes("top/artists")) return Response.json({ items: [{ name: "Test artist", images: [], external_urls: { spotify: "https://open.spotify.com/artist/test" } }] });
        if (url.includes("/search")) return Response.json({ tracks: { items: [item] } });
        if (url.includes("/queue")) return new Response(null, { status: queueStatus, headers: { "Retry-After": "90" } });
        throw new Error(`Unexpected API call: ${url}`);
    }) as typeof fetch;

    await t.test("coalesces token/snapshot requests, sorts history, and omits credentials", async () => {
        const [first, second] = await Promise.all([musicSnapshot(), musicSnapshot()]);
        assert.deepEqual(first, second);
        assert.equal(first.recent[0].playedAt, "2026-10-12T10:00:00Z");
        assert.equal(first.topTrack?.album, "Test album");
        assert.equal(first.topArtist?.image, null);
        assert.equal(first.nowPlaying, null);
        assert.equal(calls.filter((url) => url.includes("accounts.spotify.com")).length, 1);
        const count = calls.length;
        await musicSnapshot();
        assert.equal(calls.length, count);
        assert.doesNotMatch(JSON.stringify(first), /private-access-token|test-secret|test-refresh/);
    });
    await t.test("refreshes once after unauthorized responses and encodes searches", async () => {
        forceUnauthorized = true;
        const results = await searchMusic("artist & title");
        assert.equal(results.length, 1);
        assert.ok(calls.some((url) => url.includes("q=artist+%26+title")));
        assert.equal(calls.filter((url) => url.includes("accounts.spotify.com")).length, 2);
    });

    const request = (body: unknown, origin = "http://localhost:3000", cookie?: string) => new NextRequest("http://localhost:3000/api/spotify/queue", {
        method: "POST", headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body),
    });
    await t.test("rejects cross-origin and invalid queue writes without contacting Spotify", async () => {
        const count = calls.length;
        assert.equal((await POST(request({ uri: item.uri }, "https://other.example"))).status, 403);
        assert.equal((await POST(request({ uri: "spotify:album:invalid" }))).status, 400);
        assert.equal(calls.length, count);
    });
    await t.test("queues a track and reports the shared remaining allowance", async () => {
        const response = await POST(request({ uri: item.uri }));
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.queued, true);
        assert.equal(body.allowance.remaining, 2);
        assert.equal(body.allowance.limit, 3);
        assert.equal((await (await GET()).json()).allowance.remaining, 2);
    });
    await t.test("explains inactive playback and preserves Spotify rate-limit timing", async () => {
        queueStatus = 404;
        const inactive = await POST(request({ uri: item.uri }));
        assert.equal(inactive.status, 503);
        const failure = await inactive.json();
        assert.match(failure.error, /No active Spotify player/);
        assert.equal(failure.allowance.remaining, 2);
        queueStatus = 429;
        await assert.rejects(() => spotify("/me/player/queue", "POST"), (error: unknown) => error instanceof SpotifyError && error.retryAfter === 90);
        const limited = await POST(request({ uri: item.uri }));
        assert.equal(limited.status, 429);
        assert.equal(limited.headers.get("retry-after"), "90");
        assert.equal((await (await GET()).json()).allowance.remaining, 2, "failed writes must not consume recommendation slots");
    });
    await t.test("concurrent visitors share three slots and a fourth does not reach Spotify", async () => {
        queueStatus = 204;
        const queueCalls = () => calls.filter((url) => url.includes("/queue")).length;
        const before = queueCalls();
        const responses = await Promise.all(Array.from({ length: 3 }, () => POST(request({ uri: item.uri }))));
        assert.deepEqual(responses.map((response) => response.status).sort(), [200, 200, 429]);
        assert.equal(queueCalls() - before, 2);
        const rejected = responses.find((response) => response.status === 429)!;
        assert.ok(Number(rejected.headers.get("retry-after")) > 3500);
        assert.equal((await rejected.json()).allowance.remaining, 0);
        assert.equal((await (await GET()).json()).allowance.remaining, 0);
    });
    await t.test("favorites failures retain rankings without blocking playing-to-idle updates", async () => {
        const originalNow = Date.now;
        let time = originalNow() + 16 * 60 * 1000;
        Date.now = () => time;
        try {
            favoritesFail = true;
            currentlyPlaying = true;
            const playing = await musicSnapshot();
            assert.equal(playing.nowPlaying?.id, item.id);
            assert.equal(playing.topTrack?.id, item.id);
            assert.equal(playing.favoritesUnavailable, true);
            time += 21000;
            currentlyPlaying = false;
            const idle = await musicSnapshot();
            assert.equal(idle.nowPlaying, null);
            assert.equal(idle.favoritesUnavailable, true);
        } finally { Date.now = originalNow; }
    });
});

test("rolling hourly slots expire independently and released failures are reusable", () => {
    let now = 1000;
    const limiter = createQueueLimiter(() => now);
    const first = limiter.reserve()!;
    first.commit();
    now += 1000;
    const second = limiter.reserve()!;
    second.commit();
    const third = limiter.reserve()!;
    assert.equal(limiter.reserve(), null, "pending work reserves a slot immediately");
    third.release();
    assert.equal(limiter.allowance().remaining, 1);
    limiter.reserve()!.commit();
    now = 3601000;
    assert.equal(limiter.allowance().remaining, 1, "only the oldest slot expires after one hour");
    now += 1000;
    assert.equal(limiter.allowance().remaining, 3);
    assert.equal(limiter.allowance().resetsAt, null);
});
