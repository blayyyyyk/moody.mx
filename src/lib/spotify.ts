import "server-only";
import type { MusicArtist, MusicSnapshot, MusicTrack } from "./spotify-types";

type SpotifyTrack = {
    id: string;
    uri: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
    external_urls: { spotify: string };
    duration_ms: number;
};

export class SpotifyError extends Error {
    constructor(public status: number, message: string, public retryAfter = 30) {
        super(message);
    }
}

let token: { value: string; expires: number } | undefined;
let tokenRequest: Promise<string> | undefined;

export function spotifyConfigured() {
    return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && process.env.SPOTIFY_REFRESH_TOKEN);
}

async function accessToken() {
    if (!spotifyConfigured()) throw new SpotifyError(503, "Spotify isn't connected yet.");
    if (token && token.expires > Date.now()) return token.value;
    if (tokenRequest) return tokenRequest;
    tokenRequest = (async () => {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: process.env.SPOTIFY_REFRESH_TOKEN! }),
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new SpotifyError(503, "Spotify needs to be reconnected.");
        const data = await response.json();
        token = { value: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
        return token.value;
    })();
    try { return await tokenRequest; } finally { tokenRequest = undefined; }
}

export async function spotify<T>(path: string, method = "GET", retry = true): Promise<T | null> {
    const response = await fetch(`https://api.spotify.com/v1${path}`, {
        method,
        headers: { Authorization: `Bearer ${await accessToken()}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401 && retry) {
        token = undefined;
        return spotify<T>(path, method, false);
    }
    if (!response.ok) {
        const messages: Record<number, string> = {
            403: "Spotify denied this action. Check account permissions and Premium access.",
            404: "No active Spotify player. Blake needs to start playback before tracks can be queued.",
            429: "Spotify is busy. Please wait before trying again.",
        };
        throw new SpotifyError(response.status, messages[response.status] ?? "Spotify is unavailable. Please try again shortly.", Number(response.headers.get("retry-after")) || 30);
    }
    if (response.status === 204) return null;
    // Queue responses can be an empty 200 as well as 204.
    const body = await response.text();
    return body ? JSON.parse(body) as T : null;
}

function track(item: SpotifyTrack): MusicTrack {
    return {
        id: item.id, uri: item.uri, name: item.name,
        artist: item.artists.map((artist) => artist.name).join(", "),
        album: item.album.name, image: item.album.images[0]?.url ?? null,
        url: item.external_urls.spotify, durationMs: item.duration_ms,
    };
}

let snapshot: { data: MusicSnapshot; expires: number } | undefined;
let snapshotRequest: Promise<MusicSnapshot> | undefined;
let favorites: { track: MusicTrack | null; artist: MusicArtist | null; expires: number } | undefined;

export async function musicSnapshot(): Promise<MusicSnapshot> {
    if (snapshot && snapshot.expires > Date.now()) return snapshot.data;
    if (snapshotRequest) return snapshotRequest;
    snapshotRequest = (async () => {
        const [recent, playing] = await Promise.all([
            spotify<{ items: { track: SpotifyTrack; played_at: string }[] }>("/me/player/recently-played?limit=50"),
            spotify<{ is_playing: boolean; currently_playing_type: string; item: SpotifyTrack | null }>("/me/player/currently-playing"),
        ]);
        if (!favorites || favorites.expires <= Date.now()) {
            const [tracks, artists] = await Promise.all([
                spotify<{ items: SpotifyTrack[] }>("/me/top/tracks?time_range=short_term&limit=1"),
                spotify<{ items: { name: string; images: { url: string }[]; external_urls: { spotify: string } }[] }>("/me/top/artists?time_range=short_term&limit=1"),
            ]);
            const artist = artists?.items[0];
            favorites = {
                track: tracks?.items[0] ? track(tracks.items[0]) : null,
                artist: artist ? { name: artist.name, image: artist.images[0]?.url ?? null, url: artist.external_urls.spotify } : null,
                expires: Date.now() + 15 * 60 * 1000,
            };
        }
        const data: MusicSnapshot = {
            recent: (recent?.items ?? []).filter((item) => item.track?.id).sort((a, b) => b.played_at.localeCompare(a.played_at)).map((item) => ({ ...track(item.track), playedAt: item.played_at })),
            topTrack: favorites.track, topArtist: favorites.artist,
            nowPlaying: playing?.is_playing && playing.currently_playing_type === "track" && playing.item?.id ? track(playing.item) : null,
            updatedAt: new Date().toISOString(),
        };
        snapshot = { data, expires: Date.now() + 20000 };
        return data;
    })();
    try { return await snapshotRequest; } finally { snapshotRequest = undefined; }
}

export async function searchMusic(query: string) {
    const data = await spotify<{ tracks: { items: SpotifyTrack[] } }>(`/search?${new URLSearchParams({ q: query, type: "track", limit: "10" })}`);
    return (data?.tracks.items ?? []).filter((item) => item?.id).map(track);
}
