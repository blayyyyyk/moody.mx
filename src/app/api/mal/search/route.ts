import { searchMal } from "@/lib/mal";
import { allowRequest } from "@/lib/spotify-http";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const query = params.get("q")?.trim() ?? "";
  if ((kind !== "manga" && kind !== "anime") || query.length < 2 || query.length > 100) return Response.json({ error: "Enter 2–100 characters to search." }, { status: 400 });
  if (!allowRequest("mal-search", 60, 60000)) return Response.json({ error: "Search is busy. Try again in a minute." }, { status: 429, headers: { "Retry-After": "60" } });
  try { return Response.json({ entries: await searchMal(kind, query) }); }
  catch { return Response.json({ error: "MAL search is unavailable. Please try again." }, { status: 503 }); }
}
