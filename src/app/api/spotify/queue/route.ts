import { NextRequest, NextResponse } from "next/server";
import { spotify } from "@/lib/spotify";
import { allowRequest, spotifyFailure } from "@/lib/spotify-http";

export async function POST(request: NextRequest) {
    if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Queue requests must come from this website." }, { status: 403 });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Expected JSON." }, { status: 415 });
    let uri: unknown;
    try { uri = (await request.json()).uri; } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
    if (typeof uri !== "string" || !/^spotify:track:[a-zA-Z0-9]{22}$/.test(uri)) return NextResponse.json({ error: "Choose a valid Spotify track." }, { status: 400 });
    if (request.cookies.has("spotify-queue-cooldown") || !allowRequest("queue", 10, 60000)) return NextResponse.json({ error: "Please wait a minute before adding another song." }, { status: 429, headers: { "Retry-After": "60" } });
    try {
        await spotify(`/me/player/queue?${new URLSearchParams({ uri })}`, "POST");
        const response = NextResponse.json({ queued: true });
        response.cookies.set("spotify-queue-cooldown", "1", { httpOnly: true, sameSite: "strict", secure: request.nextUrl.protocol === "https:", maxAge: 60, path: "/api/spotify/queue" });
        return response;
    } catch (error) { return spotifyFailure(error); }
}
