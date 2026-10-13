export function isPhotoOwner(profile: { email?: unknown; email_verified?: unknown } | undefined, allowedEmail: string | undefined) {
    return Boolean(allowedEmail?.trim() && typeof profile?.email === "string"
        && profile.email_verified === true
        && profile.email.trim().toLowerCase() === allowedEmail.trim().toLowerCase());
}
