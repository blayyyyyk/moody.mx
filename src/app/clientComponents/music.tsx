"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Music2, Plus, Search, X } from "lucide-react";
import Heading from "./heading";
import type { MusicSnapshot, MusicTrack } from "@/lib/spotify-types";
import styles from "../../../styles/Music.module.css";

const Headphones = dynamic(() => import("./headphones"), { ssr: false, loading: () => <div className={styles.modelLoading}>Loading headphones…</div> });

function SpotifyLogo() {
    return <svg viewBox="0 0 24 24" className={styles.spotifyLogo} aria-hidden="true"><path fill="currentColor" d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1.03.25c-2.82-1.73-6.36-2.12-10.54-1.17a.75.75 0 0 1-.33-1.46c4.57-1.04 8.49-.59 11.65 1.35.35.22.46.68.25 1.03Zm1.47-3.26a.94.94 0 0 1-1.29.31c-3.22-1.98-8.13-2.55-11.94-1.39a.94.94 0 0 1-.55-1.8c4.35-1.32 9.76-.68 13.47 1.59.44.27.58.85.31 1.29Zm.13-3.4C15.24 8.35 8.88 8.14 5.2 9.26a1.13 1.13 0 0 1-.66-2.16c4.22-1.28 11.24-1.03 15.71 1.62a1.13 1.13 0 0 1-1.15 1.94Z" /></svg>;
}

function Artwork({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    // Spotify-hosted artwork stays unmodified and links back to Spotify.
    return src && !failed
        // eslint-disable-next-line @next/next/no-img-element
        ? <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
        : <span className={`${className} ${styles.artPlaceholder}`}><Music2 aria-hidden="true" /></span>;
}

function duration(ms: number) {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function Music() {
    const [data, setData] = useState<MusicSnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [configured, setConfigured] = useState(true);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MusicTrack[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");
    const [queueMessage, setQueueMessage] = useState("");
    const [queuing, setQueuing] = useState<string | null>(null);
    const [queued, setQueued] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(false);
    const retryAt = useRef(0);
    const cooldownTimer = useRef<ReturnType<typeof setTimeout>>();
    const searchingMode = query.trim().length >= 2;

    useEffect(() => {
        const controller = new AbortController();
        let pending = false;
        const refresh = async () => {
            if (document.hidden || pending || Date.now() < retryAt.current) return;
            pending = true;
            try {
                const response = await fetch("/api/spotify", { signal: controller.signal });
                const body = await response.json();
                if (!response.ok) {
                    setConfigured(body.configured !== false);
                    retryAt.current = Date.now() + Math.max(30, Number(response.headers.get("retry-after")) || 30) * 1000;
                    throw new Error(body.error);
                }
                setData(body); setError(""); setConfigured(true);
            } catch (error) {
                if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not refresh Spotify.");
            } finally { pending = false; if (!controller.signal.aborted) setLoading(false); }
        };
        void refresh();
        const timer = setInterval(refresh, 30000);
        document.addEventListener("visibilitychange", refresh);
        return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setResults([]); setSearchError(""); setQueueMessage(""); setQueued(null);
        if (!searchingMode || !configured) { setSearching(false); return; }
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
                const body = await response.json();
                if (!response.ok) throw new Error(body.error);
                setResults(body.tracks);
            } catch (error) {
                if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : "Search failed. Try again.");
            } finally { if (!controller.signal.aborted) setSearching(false); }
        }, 350);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query, searchingMode, configured]);

    useEffect(() => () => clearTimeout(cooldownTimer.current), []);

    async function addToQueue(track: MusicTrack) {
        if (queuing || cooldown) return;
        setQueuing(track.id); setQueueMessage(""); setQueued(null);
        try {
            const response = await fetch("/api/spotify/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uri: track.uri }) });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error);
            setQueued(track.id); setQueueMessage(`Added “${track.name}” to Blake’s queue. You can add another in a minute.`);
            setCooldown(true);
            cooldownTimer.current = setTimeout(() => setCooldown(false), 60000);
        } catch (error) { setQueueMessage(error instanceof Error ? error.message : "Could not add this track. Try again."); }
        finally { setQueuing(null); }
    }

    const tracks = searchingMode ? results : data?.recent ?? [];
    const emptyText = loading ? "Loading listening history…" : !configured ? "The listening feed is waiting for Blake to connect Spotify." : error && !data ? error : "No recent tracks to show yet.";

    return (
        <section className={styles.section} aria-labelledby="music">
            <Heading className={`border-primary border p-3 ${styles.heading}`} icon={<SpotifyLogo />}>Music</Heading>
            <div className={styles.grid}>
                <div className={`${styles.panel} ${styles.history}`}>
                    <div className={styles.searchBar}>
                        <Search size={16} aria-hidden="true" />
                        <input aria-label="Search Spotify for a song to add to Blake’s queue" type="search" placeholder="Search a song. Add to my queue." value={query} maxLength={100} disabled={!configured || loading} onChange={(event) => setQuery(event.target.value)} />
                        {query && <button className={styles.iconButton} onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
                    </div>
                    <div className={styles.panelLabel}>
                        <h3>{searchingMode ? "Add to my queue" : "Recently played"}</h3>
                        <span>{searchingMode ? "Spotify search" : "Latest first"}</span>
                    </div>
                    <div className={styles.trackScroll} tabIndex={0} aria-label={searchingMode ? "Search results" : "Recently played tracks"} aria-busy={searchingMode ? searching : loading}>
                        {searchingMode && (searching || searchError || !results.length) ? <p className={styles.empty} role="status">{searching ? "Searching Spotify…" : searchError || "No tracks found. Try a different title or artist."}</p> : !tracks.length ? <p className={styles.empty}>{emptyText}</p> : <ol className={styles.trackList}>
                            {tracks.map((track, index) => <li key={`${track.id}-${track.playedAt ?? index}`} className={styles.trackRow}>
                                <a href={track.url} target="_blank" rel="noopener noreferrer" className={styles.trackLink} aria-label={`${track.name} by ${track.artist} on Spotify`}>
                                    <Artwork src={track.image} alt="" className={styles.trackArt} />
                                    <span className={styles.trackTitle} title={track.name}>{track.name}</span>
                                    <span className={styles.trackArtist} title={track.artist}>{track.artist}</span>
                                    <span className={styles.duration}>{duration(track.durationMs)}</span>
                                </a>
                                {searchingMode && <button className={styles.iconButton} disabled={Boolean(queuing) || cooldown} onClick={() => addToQueue(track)} aria-label={`Add ${track.name} by ${track.artist} to Blake’s queue`}>
                                    {queuing === track.id ? <Loader2 size={16} className={styles.spinner} /> : queued === track.id ? <Check size={16} /> : <Plus size={16} />}
                                </button>}
                            </li>)}
                        </ol>}
                    </div>
                    <div className={styles.historyFooter} role="status" aria-live="polite">
                        {queueMessage || (cooldown ? "Queue added. Please wait a minute before adding another song." : searchingMode ? "Pick a track with +. An active Spotify player is needed." : error && data ? "Refresh interrupted. Showing the last received tracks." : data ? "Listening feed · refreshes every 30 seconds" : "Connected listening, straight from Spotify.")}
                    </div>
                </div>

                <div className={`${styles.panel} ${styles.favorite} ${styles.topTrack}`}>
                    <div className={styles.panelLabel}><h3>Top track</h3><span>Past 4 weeks</span></div>
                    {data?.topTrack ? <a className={styles.favoriteLink} href={data.topTrack.url} target="_blank" rel="noopener noreferrer">
                        <Artwork src={data.topTrack.image} alt={`${data.topTrack.album} album cover`} className={styles.favoriteArt} />
                        <div className={styles.favoriteCopy}><h4>{data.topTrack.name}</h4><p>{data.topTrack.album}</p><p>{data.topTrack.artist}</p></div>
                    </a> : <div className={styles.favoriteEmpty}><Artwork alt="" className={styles.emptyCover} /><p>{loading ? "Finding the repeat favorite…" : !configured ? "A favorite on repeat, once connected." : error ? "Top track temporarily unavailable." : "Not enough listening history yet."}</p></div>}
                </div>

                <div className={`${styles.panel} ${styles.favorite} ${styles.topArtist}`}>
                    <div className={styles.panelLabel}><h3>Top artist</h3><span>Past 4 weeks</span></div>
                    {data?.topArtist ? <a className={styles.favoriteLink} href={data.topArtist.url} target="_blank" rel="noopener noreferrer">
                        <Artwork src={data.topArtist.image} alt={data.topArtist.name} className={styles.favoriteArt} />
                        <div className={styles.favoriteCopy}><h4>{data.topArtist.name}</h4></div>
                    </a> : <div className={styles.favoriteEmpty}><Artwork alt="" className={styles.emptyCover} /><p>{loading ? "Finding the current favorite…" : !configured ? "The artist in heavy rotation, once connected." : error ? "Top artist temporarily unavailable." : "Not enough listening history yet."}</p></div>}
                </div>

                <div className={`${styles.panel} ${styles.sculpture}`}>
                    <div className={styles.model}><Headphones /></div>
                    <div className={styles.nowPlaying}>
                        <span className={styles.nowLabel}>{data?.nowPlaying ? "Playing now" : data ? "Between tracks" : "On my wavelength"}</span>
                        {data?.nowPlaying ? <a href={data.nowPlaying.url} target="_blank" rel="noopener noreferrer"><strong>{data.nowPlaying.name}</strong><span>{data.nowPlaying.artist}</span></a> : <p>{data ? "A little quiet. More music soon." : "A few favorites. A shared queue."}</p>}
                        <a className={styles.spotifyCredit} href="https://open.spotify.com/" target="_blank" rel="noopener noreferrer">Listen on Spotify ↗</a>
                    </div>
                </div>
            </div>
        </section>
    );
}
