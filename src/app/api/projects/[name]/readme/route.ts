import { getProjectReadme } from "@/lib/github";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[\w.-]+$/.test(name)) return Response.json({ error: "Invalid repository" }, { status: 400 });
  try {
    const readme = await getProjectReadme(name);
    if (!readme) return Response.json({ error: "Project not found" }, { status: 404 });
    return Response.json(readme, { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch {
    return Response.json({ error: "README unavailable. You can still view this repository on GitHub." }, { status: 502 });
  }
}
