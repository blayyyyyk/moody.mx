import { NextRequest, NextResponse } from "next/server";
import { searchMusic } from "@/lib/spotify";
import { allowRequest, spotifyFailure } from "@/lib/spotify-http";

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2 || query.length > 100) return NextResponse.json({ error: "Search using 2–100 characters." }, { status: 400 });
    if (!allowRequest("search", 60, 60000)) return NextResponse.json({ error: "Too many searches. Try again in a minute." }, { status: 429, headers: { "Retry-After": "60" } });
    try { return NextResponse.json({ tracks: await searchMusic(query) }, { headers: { "Cache-Control": "no-store" } }); }
    catch (error) { return spotifyFailure(error); }
}
