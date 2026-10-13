import { MalRecommendationError, malRecommendationState, recommendMal } from "@/lib/mal-recommendations";
import { revalidateTag } from "next/cache";

const headers = { "Cache-Control": "no-store" };
export async function GET() { return Response.json(malRecommendationState(), { headers }); }

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Recommendations must come from this website." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "Expected JSON." }, { status: 415, headers });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400, headers }); }
  if (!body || (body.kind !== "manga" && body.kind !== "anime") || !Number.isSafeInteger(body.id) || body.id <= 0) return Response.json({ error: "Choose a valid manga or anime title." }, { status: 400, headers });
  try {
    await recommendMal(body.kind, body.id);
    revalidateTag("mal-lists");
    return Response.json({ added: true, ...malRecommendationState() }, { headers });
  } catch (error) {
    const known = error instanceof MalRecommendationError;
    return Response.json({ error: known ? error.message : "MAL is unavailable. Please try again.", ...malRecommendationState() }, { status: known ? error.status : 503, headers });
  }
}
