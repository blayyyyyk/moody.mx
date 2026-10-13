"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, BookOpen, Check, ChevronDown, ChevronUp, Film, Loader2, Plus, Search, X } from "lucide-react";
import Heading from "./heading";
import { compareMalEntries, currentMalEntry, malProgress, malStatus, type MalEntry, type MalKind, type MalList, type MalSnapshot } from "@/lib/mal-types";
import styles from "../../../styles/MangaAnime.module.css";

interface RecommendationState { configured: boolean; allowance: { limit: number; remaining: number; resetsAt: number | null } }
const emptyList: MalList = { state: "ready", entries: [] };

function Cover({ entry, large = false }: { entry: MalEntry; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [entry.coverUrl]);
  const className = large ? styles.spotlightCover : styles.cover;
  return entry.coverUrl && !failed
    // MAL cover sizes/hosts vary; preserve portrait framing without proxying credentials.
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className={className} src={entry.coverUrl} alt={`${entry.title} cover`} loading="lazy" onError={() => setFailed(true)} />
    : <span className={`${className} ${styles.placeholder}`} aria-label={`No cover available for ${entry.title}`}><BookOpen size={20} aria-hidden="true" /></span>;
}

function ScrollPanel({ children, label }: { children: ReactNode; label: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ above: false, below: false });
  const update = useCallback(() => {
    const node = viewport.current;
    if (!node) return;
    const above = node.scrollTop > 2;
    const below = node.scrollHeight - node.clientHeight - node.scrollTop > 2;
    setEdges(old => old.above === above && old.below === below ? old : { above, below });
  }, []);
  useEffect(() => {
    const observer = new ResizeObserver(update);
    if (viewport.current) observer.observe(viewport.current);
    if (content.current) observer.observe(content.current);
    update();
    return () => observer.disconnect();
  }, [update]);
  function scroll(direction: number) {
    const node = viewport.current;
    node?.scrollBy({ top: direction * node.clientHeight * 0.75, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <div className={styles.viewport}>
    <div className={styles.scroll} ref={viewport} onScroll={update} tabIndex={0} role="region" aria-label={label}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "PageDown" || event.key === "PageUp") { event.preventDefault(); scroll(event.key === "PageDown" ? 1 : -1); }
      }}>
      <div ref={content}>{children}</div>
    </div>
    <button className={`${styles.scrollArrow} ${styles.up}`} data-visible={edges.above} disabled={!edges.above} aria-hidden={!edges.above} aria-label={`Scroll ${label.toLowerCase()} up`} onClick={() => scroll(-1)}><ChevronUp size={20} /></button>
    <button className={`${styles.scrollArrow} ${styles.down}`} data-visible={edges.below} disabled={!edges.below} aria-hidden={!edges.below} aria-label={`Scroll ${label.toLowerCase()} down`} onClick={() => scroll(1)}><ChevronDown size={20} /></button>
  </div>;
}

function ListColumn({ kind, list, loading, recommendation, pending, onRecommend }: {
  kind: MalKind; list: MalList; loading: boolean; recommendation: RecommendationState | null;
  pending: string | null; onRecommend: (kind: MalKind, entry: MalEntry) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MalEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const searchMode = query.trim().length >= 2;
  useEffect(() => {
    const controller = new AbortController();
    setResults([]); setError("");
    if (!searchMode) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/mal/search?${new URLSearchParams({ kind, q: query.trim() })}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Search unavailable.");
        setResults(body.entries);
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Search unavailable."); }
      finally { if (!controller.signal.aborted) setSearching(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, kind, searchMode]);
  const entries = searchMode ? results : list.entries;
  const label = kind === "manga" ? "Manga" : "Anime";
  return <div className={styles.panel}>
    <div className={styles.panelLabel}><h3>{kind === "manga" ? <BookOpen size={15} /> : <Film size={15} />}{label}</h3><span>{searchMode ? "Search MAL" : `${list.entries.length} titles`}</span></div>
    <label className={styles.search}>
      <Search size={16} aria-hidden="true" />
      <input type="search" aria-label={`Search ${kind} to recommend`} disabled={loading} maxLength={100} value={query} placeholder={`recommend ${kind} to me`} onChange={event => setQuery(event.target.value)} />
      {query && <button onClick={() => setQuery("")} aria-label={`Clear ${kind} search`}><X size={16} /></button>}
    </label>
    <div className={styles.legend}><span>{searchMode ? "Select a title to recommend" : "My rating · highest first"}</span><span>{searchMode ? (kind === "manga" ? "Plan to read" : "Plan to watch") : "Status / progress"}</span></div>
    <ScrollPanel key={searchMode ? `search-${query.trim()}` : "list"} label={`${label} list`}>
      {loading && !searchMode ? <p className={styles.empty} role="status">Loading {kind}…</p>
        : !searchMode && list.state !== "ready" ? <p className={styles.empty}>{list.state === "unconfigured" ? "The MAL connection is being set up." : `The ${kind} list is unavailable. It may be private or MAL may be offline.`}</p>
        : searching ? <p className={styles.empty} role="status">Searching MAL…</p>
        : error ? <p className={styles.empty} role="status">{error}</p>
        : entries.length ? <ol className={styles.list}>{entries.map(entry => {
          const existing = list.entries.some(item => item.id === entry.id);
          const adding = pending === `${kind}:${entry.id}`;
          return <li className={styles.row} key={entry.id}>
            <a className={styles.entry} href={entry.url} target="_blank" rel="noreferrer">
              <Cover entry={entry} />
              <span className={styles.title}>{entry.title}</span>
              <span className={styles.rating} aria-label={entry.score === null ? "Not rated" : `My rating: ${entry.score} out of 10`}>{entry.score === null ? "—" : <>{entry.score}<small>/10</small></>}</span>
              <span className={styles.progress}>{malProgress(entry, kind)}{entry.status !== "completed" || entry.revisiting ? <small>{malStatus(entry, kind)}</small> : null}</span>
            </a>
            {searchMode && <button className={styles.add} aria-label={`Add ${entry.title} to plan to ${kind === "manga" ? "read" : "watch"}`} aria-describedby="mal-recommendation-status"
              disabled={existing || Boolean(pending) || !recommendation?.configured || recommendation.allowance.remaining === 0 || list.state !== "ready"}
              onClick={() => void onRecommend(kind, entry)}>
              {adding ? <Loader2 size={16} className={styles.spinner} /> : existing ? <Check size={16} /> : <Plus size={16} />}<span>{existing ? "On my list" : adding ? "Adding…" : "Recommend"}</span>
            </button>}
          </li>;
        })}</ol> : <p className={styles.empty}>{searchMode ? "No matching titles. Try another search." : `No ${kind} on my list yet.`}</p>}
    </ScrollPanel>
    <a className={styles.footerLink} href={`https://myanimelist.net/${kind}list/TheSwiginator`} target="_blank" rel="noreferrer">Full {kind} list on MAL <ArrowUpRight size={14} /></a>
  </div>;
}

function Spotlight({ entry, kind, unavailable }: { entry: MalEntry | null; kind: MalKind; unavailable: boolean }) {
  const label = kind === "manga" ? "Reading" : "Watching";
  return <div className={styles.spotlight}>
    <h3>{label}</h3>
    {entry ? <>
      <a className={styles.spotlightTop} href={entry.url} target="_blank" rel="noreferrer"><Cover entry={entry} large /><span><strong>{entry.title}</strong><span>{malProgress(entry, kind)}</span>{entry.score !== null && <span>My rating: {entry.score}/10</span>}</span></a>
      {entry.genres.length > 0 && <div className={styles.genres}>{entry.genres.slice(0, 4).map(genre => <span key={genre}>{genre}</span>)}</div>}
      {entry.synopsis && <p className={styles.synopsis}>{entry.synopsis}</p>}
      {entry.updatedAt && <p className={styles.updated}>List updated <time dateTime={entry.updatedAt}>{new Date(entry.updatedAt).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}</time></p>}
    </> : <p className={styles.empty}>{unavailable ? "Waiting for the MAL list." : `Nothing currently marked as ${label.toLowerCase()} on MAL.`}</p>}
  </div>;
}

export default function MangaAnime() {
  const [data, setData] = useState<MalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [recommendation, setRecommendation] = useState<RecommendationState | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const version = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (busy || document.hidden) return;
      busy = true;
      const requestVersion = version.current;
      try {
        const response = await fetch("/api/mal", { signal: controller.signal });
        if (!response.ok) throw new Error("MAL unavailable");
        const snapshot = await response.json();
        if (requestVersion === version.current) setData(snapshot);
        setFailed(false);
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { busy = false; if (!controller.signal.aborted) setLoading(false); }
    }
    void refresh();
    const interval = setInterval(refresh, 900000);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [attempt]);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      const requestVersion = version.current;
      try {
        const response = await fetch("/api/mal/recommend", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Allowance unavailable");
        const state = await response.json();
        if (requestVersion === version.current) setRecommendation(state);
      } catch { if (!controller.signal.aborted && requestVersion === version.current) setRecommendation(null); }
    }
    void refresh();
    const interval = setInterval(refresh, 60000);
    return () => { controller.abort(); clearInterval(interval); };
  }, []);
  async function recommend(kind: MalKind, entry: MalEntry) {
    if (pending) return;
    version.current += 1;
    setPending(`${kind}:${entry.id}`); setMessage("");
    try {
      const response = await fetch("/api/mal/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id: entry.id }) });
      const body = await response.json();
      version.current += 1;
      if (body.allowance) setRecommendation(body);
      if (!response.ok) throw new Error(body.error ?? "Could not save this recommendation.");
      setData(previous => previous ? { ...previous, [kind]: { ...previous[kind], entries: [...previous[kind].entries.filter(item => item.id !== entry.id), entry].sort(compareMalEntries) } } : previous);
      setMessage(`Added “${entry.title}” to my plan to ${kind === "manga" ? "read" : "watch"} list. Thank you!`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this recommendation."); }
    finally { version.current += 1; setPending(null); }
  }
  const manga = data?.manga ?? (failed ? { state: "unavailable" as const, entries: [] } : emptyList);
  const anime = data?.anime ?? (failed ? { state: "unavailable" as const, entries: [] } : emptyList);
  return <section className={styles.section} aria-labelledby="manga-anime">
    <Heading id="manga-anime" className={`border-primary border p-3 ${styles.heading}`}>Manga / Anime</Heading>
    <div className={styles.grid}>
      <ListColumn kind="manga" list={manga} loading={loading} recommendation={recommendation} pending={pending} onRecommend={recommend} />
      <ListColumn kind="anime" list={anime} loading={loading} recommendation={recommendation} pending={pending} onRecommend={recommend} />
      <aside className={styles.panel} aria-label="Currently into">
        <div className={styles.panelLabel}><h3>Currently into</h3><span>From my MAL lists</span></div>
        <ScrollPanel label="Currently into"><Spotlight kind="manga" entry={currentMalEntry(manga.entries, "manga")} unavailable={loading || manga.state !== "ready"} /><Spotlight kind="anime" entry={currentMalEntry(anime.entries, "anime")} unavailable={loading || anime.state !== "ready"} /></ScrollPanel>
        <a className={styles.footerLink} href="https://myanimelist.net/profile/TheSwiginator" target="_blank" rel="noreferrer">TheSwiginator on MyAnimeList <ArrowUpRight size={14} /></a>
      </aside>
    </div>
    <div className={styles.sectionFooter}>
      <div id="mal-recommendation-status" role="status">{message || (recommendation ? recommendation.configured ? `Recommend three titles. ${recommendation.allowance.remaining} left this hour, shared across manga, anime, and all visitors.` : "Browse my lists now. Recommendations open once I connect my MAL account." : "Checking recommendation availability…")}</div>
      {(failed || manga.state === "unavailable" || anime.state === "unavailable") && <button className={styles.retry} onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>Retry lists</button>}
    </div>
  </section>;
}
