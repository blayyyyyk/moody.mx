import { NextResponse } from "next/server";
import { SpotifyError } from "./spotify";
import type { QueueAllowance } from "./spotify-types";

export function spotifyFailure(error: unknown, allowance?: QueueAllowance) {
    const known = error instanceof SpotifyError;
    const status = known && error.status === 429 ? 429 : 503;
    return NextResponse.json({ error: known ? error.message : "Spotify is temporarily unavailable. Please try again shortly.", ...(allowance ? { allowance } : {}) }, {
        status,
        headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": String((error as SpotifyError).retryAfter) } : {}) },
    });
}

// Best-effort per-instance limits. Use hosting WAF limits for multi-instance deployments.
const windows = new Map<string, { count: number; until: number }>();
export function allowRequest(key: string, limit: number, milliseconds: number) {
    const now = Date.now();
    for (const [key, value] of windows) if (value.until <= now) windows.delete(key);
    const current = windows.get(key);
    if (current && current.count >= limit) return false;
    if (current) current.count += 1;
    else windows.set(key, { count: 1, until: now + milliseconds });
    return true;
}
