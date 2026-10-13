import { getMalSnapshot } from "@/lib/mal";

export async function GET() {
  const data = await getMalSnapshot();
  const healthy = data.manga.state === "ready" && data.anime.state === "ready";
  return Response.json(data, { headers: { "Cache-Control": healthy ? "public, s-maxage=900, stale-while-revalidate=900" : "no-store" } });
}
