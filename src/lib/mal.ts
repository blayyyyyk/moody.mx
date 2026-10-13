import "server-only";
import { compareMalEntries, type MalEntry, type MalKind, type MalList, type MalSnapshot } from "./mal-types";

export const malOrigin = "https://api.myanimelist.net";
export const malUsername = "TheSwiginator";
const origin = malOrigin;
const username = malUsername;
const pageSize = 1000;

interface ListItem {
  node: {
    id: number;
    title: string;
    main_picture?: { medium?: string; large?: string };
    num_chapters?: number;
    num_episodes?: number;
    synopsis?: string;
    genres?: { name: string }[];
  };
  list_status: {
    status: string;
    score?: number;
    num_chapters_read?: number;
    num_episodes_watched?: number;
    is_rereading?: boolean;
    is_rewatching?: boolean;
    updated_at?: string;
  };
}

function normalize(item: ListItem, kind: MalKind): MalEntry {
  const { node, list_status: status } = item;
  const total = kind === "manga" ? node.num_chapters : node.num_episodes;
  const score = status.score;
  const updated = status.updated_at;
  return {
    id: node.id, title: node.title, url: `https://myanimelist.net/${kind}/${node.id}`,
    coverUrl: node.main_picture?.large ?? node.main_picture?.medium ?? null,
    score: typeof score === "number" && score > 0 && score <= 10 ? score : null,
    status: status.status,
    completed: Math.max(0, (kind === "manga" ? status.num_chapters_read : status.num_episodes_watched) ?? 0),
    total: total && total > 0 ? total : null,
    revisiting: (kind === "manga" ? status.is_rereading : status.is_rewatching) ?? false,
    updatedAt: updated && Number.isFinite(Date.parse(updated)) ? updated : null,
    synopsis: node.synopsis?.trim() || null,
    genres: node.genres?.map(genre => genre.name) ?? [],
  };
}

async function getList(kind: MalKind, clientId: string): Promise<MalList> {
  const path = `/v2/users/${username}/${kind}list`;
  const entries = new Map<number, MalEntry>();
  let offset = 0;
  // One deadline for the whole list, including pagination.
  const signal = AbortSignal.timeout(15000);
  while (true) {
    const url = new URL(path, origin);
    url.search = new URLSearchParams({
      limit: String(pageSize), offset: String(offset), nsfw: "true",
      fields: `list_status,main_picture,${kind === "manga" ? "num_chapters" : "num_episodes"},synopsis,genres`,
    }).toString();
    const response = await fetch(url, { headers: { "X-MAL-CLIENT-ID": clientId }, next: { revalidate: 900, tags: ["mal-lists"] }, signal });
    if (!response.ok) throw new Error(`MAL ${kind} list unavailable`);
    const page: { data: ListItem[]; paging?: { next?: string } } = await response.json();
    if (!Array.isArray(page.data)) throw new Error("Invalid MAL list response");
    for (const item of page.data) entries.set(item.node.id, normalize(item, kind));
    if (!page.paging?.next) break;
    const next = new URL(page.paging.next);
    const nextOffset = Number(next.searchParams.get("offset"));
    if (next.origin !== origin || next.pathname !== path || !Number.isSafeInteger(nextOffset) || nextOffset <= offset) {
      throw new Error("Invalid MAL pagination");
    }
    offset = nextOffset;
  }
  return { state: "ready", entries: [...entries.values()].sort(compareMalEntries) };
}

export async function getMalSnapshot(): Promise<MalSnapshot> {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId) return { username, manga: { state: "unconfigured", entries: [] }, anime: { state: "unconfigured", entries: [] } };
  const [manga, anime] = await Promise.allSettled([getList("manga", clientId), getList("anime", clientId)]);
  const unavailable: MalList = { state: "unavailable", entries: [] };
  return { username, manga: manga.status === "fulfilled" ? manga.value : unavailable, anime: anime.status === "fulfilled" ? anime.value : unavailable };
}

export async function searchMal(kind: MalKind, query: string): Promise<MalEntry[]> {
  const clientId = process.env.MAL_CLIENT_ID;
  if (!clientId) throw new Error("MAL is not configured");
  const params = new URLSearchParams({ q: query, limit: "12", fields: "main_picture,num_chapters,num_episodes", nsfw: "true" });
  const response = await fetch(`${origin}/v2/${kind}?${params}`, {
    headers: { "X-MAL-CLIENT-ID": clientId }, next: { revalidate: 900 }, signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Search unavailable");
  const page: { data: { node: ListItem["node"] }[] } = await response.json();
  return page.data.map(item => normalize({ ...item, list_status: { status: kind === "manga" ? "plan_to_read" : "plan_to_watch" } }, kind));
}
