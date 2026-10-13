import "server-only";
import type { MalKind } from "./mal-types";
import { malOrigin, malUsername } from "./mal";
import { createQueueLimiter } from "./spotify-queue-limit";

// A separate budget from Music, shared by both MAL lists within this instance.
const limiter = createQueueLimiter();
const pending = new Set<string>();
const recentlyAdded = new Map<string, number>();
let accessToken = "";
let expiresAt = 0;
let refreshToken = "";
let refreshing: Promise<string> | null = null;

export class MalRecommendationError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}

export function malRecommendationState() {
  return { configured: Boolean(process.env.MAL_CLIENT_ID && process.env.MAL_CLIENT_SECRET && process.env.MAL_REFRESH_TOKEN), allowance: limiter.allowance() };
}

async function token(): Promise<string> {
  if (accessToken && expiresAt > Date.now() + 60000) return accessToken;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    if (!malRecommendationState().configured) throw new MalRecommendationError("Blake needs to connect MyAnimeList before recommendations can be added.");
    const response = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST", cache: "no-store", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: process.env.MAL_CLIENT_ID!, client_secret: process.env.MAL_CLIENT_SECRET!, grant_type: "refresh_token", refresh_token: refreshToken || process.env.MAL_REFRESH_TOKEN! }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new MalRecommendationError("The MAL connection needs to be renewed. Please try again later.");
    const body = await response.json();
    if (!body.access_token || !Number.isFinite(body.expires_in) || body.expires_in <= 0) throw new MalRecommendationError("MAL did not return a usable connection.");
    const user = await fetch(`${malOrigin}/v2/users/@me`, { cache: "no-store", headers: { Authorization: `Bearer ${body.access_token}` }, signal: AbortSignal.timeout(12000) });
    if (!user.ok || (await user.json()).name?.toLowerCase() !== malUsername.toLowerCase()) throw new MalRecommendationError("The MAL connection does not belong to Blake’s configured account.");
    accessToken = body.access_token;
    expiresAt = Date.now() + body.expires_in * 1000;
    refreshToken = body.refresh_token || refreshToken;
    return accessToken;
  })();
  try { return await refreshing; } finally { refreshing = null; }
}

async function authorized(path: string, init: RequestInit = {}) {
  let response = await fetch(`${malOrigin}/v2${path}`, { ...init, cache: "no-store", headers: { ...init.headers, Authorization: `Bearer ${await token()}` }, signal: AbortSignal.timeout(12000) });
  if (response.status === 401) {
    accessToken = "";
    response = await fetch(`${malOrigin}/v2${path}`, { ...init, cache: "no-store", headers: { ...init.headers, Authorization: `Bearer ${await token()}` }, signal: AbortSignal.timeout(12000) });
  }
  if (!response.ok) throw new MalRecommendationError(response.status === 429 ? "MAL is busy. Please try again later." : "MAL couldn’t save this recommendation. Please try again.", response.status === 429 ? 429 : 503);
  return response;
}

export async function recommendMal(kind: MalKind, id: number) {
  const key = `${kind}:${id}`;
  for (const [item, time] of recentlyAdded) if (time + 3600000 <= Date.now()) recentlyAdded.delete(item);
  if (pending.has(key) || recentlyAdded.has(key)) throw new MalRecommendationError("That title has already been recommended.", 409);
  if (!malRecommendationState().configured) throw new MalRecommendationError("Blake needs to connect MyAnimeList before recommendations can be added.");
  const slot = limiter.reserve();
  if (!slot) throw new MalRecommendationError("All three shared hourly recommendations have been used. Try again when a slot opens.", 429);
  pending.add(key);
  try {
    // Uncached authorized lookup protects existing scores, progress and statuses.
    const details = await (await authorized(`/${kind}/${id}?fields=my_list_status`)).json();
    if (details.my_list_status) throw new MalRecommendationError("That title is already on Blake’s list. Its existing status has been kept.", 409);
    await authorized(`/${kind}/${id}/my_list_status`, {
      method: "PATCH", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ status: kind === "manga" ? "plan_to_read" : "plan_to_watch" }),
    });
    recentlyAdded.set(key, Date.now());
    slot.commit();
  } catch (error) {
    slot.release();
    throw error;
  } finally { pending.delete(key); }
}
