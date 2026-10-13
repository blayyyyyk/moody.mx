export type MalKind = "manga" | "anime";

export interface MalEntry {
  id: number;
  title: string;
  url: string;
  coverUrl: string | null;
  score: number | null;
  status: string;
  completed: number;
  total: number | null;
  revisiting: boolean;
  updatedAt: string | null;
  synopsis: string | null;
  genres: string[];
}

export interface MalList {
  state: "ready" | "unavailable" | "unconfigured";
  entries: MalEntry[];
}

export interface MalSnapshot {
  username: string;
  manga: MalList;
  anime: MalList;
}

const titles = new Intl.Collator("en", { sensitivity: "base", numeric: true });

export function compareMalEntries(a: MalEntry, b: MalEntry) {
  return (b.score ?? -1) - (a.score ?? -1) || titles.compare(a.title, b.title) || a.id - b.id;
}

export function currentMalEntry(entries: MalEntry[], kind: MalKind): MalEntry | null {
  return entries.filter(entry => entry.status === (kind === "manga" ? "reading" : "watching") || entry.revisiting)
    .sort((a, b) => (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0) || compareMalEntries(a, b))[0] ?? null;
}

export function malProgress(entry: MalEntry, kind: MalKind) {
  return `${entry.completed.toLocaleString("en")} / ${entry.total?.toLocaleString("en") ?? "?"} ${kind === "manga" ? "chapters" : "episodes"}`;
}

export function malStatus(entry: MalEntry, kind: MalKind) {
  if (entry.revisiting) return kind === "manga" ? "Rereading" : "Rewatching";
  const labels: Record<string, string> = { reading: "Reading", watching: "Watching", on_hold: "On hold", dropped: "Dropped", plan_to_read: "Plan to read", plan_to_watch: "Plan to watch", completed: "Completed" };
  return labels[entry.status] ?? "On my list";
}
