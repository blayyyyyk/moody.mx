import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { photoAuthConfigured, photoAuthOptions } from "@/lib/photo-auth";

const handler = NextAuth(photoAuthOptions);
export const runtime = "nodejs";

async function route(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
    if (!photoAuthConfigured()) {
        const { nextauth } = await context.params;
        return NextResponse.json(nextauth[0] === "session" ? null : { error: "Owner sign-in is not configured yet." }, { status: nextauth[0] === "session" ? 200 : 503, headers: { "Cache-Control": "no-store" } });
    }
    return handler(request, context);
}

export { route as GET, route as POST };
