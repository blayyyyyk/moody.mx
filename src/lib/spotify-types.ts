export type MusicTrack = {
    id: string;
    uri: string;
    name: string;
    artist: string;
    album: string;
    image: string | null;
    url: string;
    durationMs: number;
    playedAt?: string;
};

export type MusicArtist = {
    name: string;
    image: string | null;
    url: string;
};

export type MusicSnapshot = {
    recent: MusicTrack[];
    topTrack: MusicTrack | null;
    topArtist: MusicArtist | null;
    nowPlaying: MusicTrack | null;
    updatedAt: string;
};
