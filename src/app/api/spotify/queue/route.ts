import { NextRequest, NextResponse } from "next/server";
import { spotify } from "@/lib/spotify";
import { spotifyFailure } from "@/lib/spotify-http";
import { createQueueLimiter } from "@/lib/spotify-queue-limit";

const limiter = createQueueLimiter();
const headers = { "Cache-Control": "no-store" };

export async function GET() {
    return NextResponse.json({ allowance: limiter.allowance() }, { headers });
}

export async function POST(request: NextRequest) {
    if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Queue requests must come from this website." }, { status: 403 });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Expected JSON." }, { status: 415 });
    let uri: unknown;
    try { uri = (await request.json()).uri; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
    if (typeof uri !== "string" || !/^spotify:track:[a-zA-Z0-9]{22}$/.test(uri)) return NextResponse.json({ error: "Choose a valid Spotify track." }, { status: 400 });
    // Reserve before awaiting Spotify so concurrent visitors cannot oversubscribe.
    const slot = limiter.reserve();
    if (!slot) {
        const allowance = limiter.allowance();
        return NextResponse.json({ error: "All three hourly recommendations have been used. Please try again when a slot opens.", allowance }, {
            status: 429,
            headers: { ...headers, "Retry-After": String(Math.max(1, Math.ceil(((allowance.resetsAt ?? Date.now() + 3600000) - Date.now()) / 1000))) },
        });
    }
    try {
        await spotify(`/me/player/queue?${new URLSearchParams({ uri })}`, "POST");
        slot.commit();
        return NextResponse.json({ queued: true, allowance: limiter.allowance() }, { headers });
    } catch (error) {
        slot.release();
        return spotifyFailure(error, limiter.allowance());
    }
}
