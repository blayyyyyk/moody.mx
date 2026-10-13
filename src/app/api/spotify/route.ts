import { NextResponse } from "next/server";
import { musicSnapshot, spotifyConfigured } from "@/lib/spotify";
import { spotifyFailure } from "@/lib/spotify-http";

export const dynamic = "force-dynamic";

export async function GET() {
    if (!spotifyConfigured()) return NextResponse.json({ error: "Spotify isn't connected yet.", configured: false }, { status: 503 });
    try {
        return NextResponse.json(await musicSnapshot(), { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return spotifyFailure(error); }
}
