import "server-only";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { isPhotoOwner } from "./photo-owner-policy";

export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export function photoAuthConfigured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        && process.env.PHOTO_ADMIN_EMAIL?.trim() && process.env.NEXTAUTH_SECRET);
}

export const photoAuthOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
    providers: [GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        authorization: { params: { scope: `openid email profile ${GOOGLE_DRIVE_SCOPE}`, access_type: "offline", prompt: "consent select_account" } },
    })],
    callbacks: {
        async signIn({ account, profile }) {
            return Boolean(photoAuthConfigured() && account?.provider === "google"
                && account.scope?.split(" ").includes(GOOGLE_DRIVE_SCOPE)
                && isPhotoOwner(profile, process.env.PHOTO_ADMIN_EMAIL));
        },
        async jwt({ token, account, profile }) {
            if (account) {
                token.photoOwner = isPhotoOwner(profile, process.env.PHOTO_ADMIN_EMAIL);
                token.googleAccessToken = account.access_token;
                token.googleRefreshToken = account.refresh_token;
                token.googleExpiresAt = (account.expires_at ?? 0) * 1000;
            }
            return token;
        },
        async session({ session, token }) {
            // Provider tokens remain inside NextAuth's encrypted HttpOnly cookie.
            return {
                ...session,
                photoOwner: token.photoOwner === true && isPhotoOwner({ email: token.email, email_verified: true }, process.env.PHOTO_ADMIN_EMAIL),
                user: { name: token.name, email: token.email, image: token.picture },
            };
        },
    },
};

export class PhotoUploadError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

export async function requirePhotoOwner(request: NextRequest) {
    if (!photoAuthConfigured()) throw new PhotoUploadError(503, "Owner sign-in is not configured yet.");
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (token?.photoOwner !== true || !isPhotoOwner({ email: token.email, email_verified: true }, process.env.PHOTO_ADMIN_EMAIL)) {
        throw new PhotoUploadError(401, "Sign in with the authorized Google account to upload photos.");
    }
    return token;
}

export function requireUploadOrigin(request: NextRequest) {
    if (request.headers.get("origin") !== request.nextUrl.origin) throw new PhotoUploadError(403, "Upload requests must come from this website.");
}
