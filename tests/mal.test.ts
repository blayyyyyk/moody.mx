import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { getMalSnapshot } from "../src/lib/mal";
import { compareMalEntries, currentMalEntry, malProgress, type MalEntry } from "../src/lib/mal-types";
import { malRecommendationState, recommendMal } from "../src/lib/mal-recommendations";
import { POST } from "../src/app/api/mal/recommend/route";

const original = { id: process.env.MAL_CLIENT_ID, secret: process.env.MAL_CLIENT_SECRET, refresh: process.env.MAL_REFRESH_TOKEN };
afterEach(() => {
  mock.restoreAll();
  for (const [key, value] of [["MAL_CLIENT_ID", original.id], ["MAL_CLIENT_SECRET", original.secret], ["MAL_REFRESH_TOKEN", original.refresh]]) {
    if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
  }
});
function entry(id: number, title: string, score: number | null): MalEntry {
  return { id, title, score, coverUrl: null, completed: 3, total: null, status: "reading", updatedAt: null, synopsis: null, genres: [], revisiting: false, url: `https://myanimelist.net/manga/${id}` };
}
function apiEntry(id: number, title: string, score: number) {
  return { node: { id, title, num_chapters: 0 }, list_status: { score, status: "reading", num_chapters_read: 42, updated_at: "2026-10-01T00:00:00Z" } };
}

test("ratings descend, tied scores use titles, and unrated entries sort last alphabetically", () => {
  const items = [entry(1, "Zeta", null), entry(2, "Zebra", 10), entry(3, "Alpha", 10), entry(4, "Beta", 8), entry(5, "Apple", null)];
  assert.deepEqual(items.sort(compareMalEntries).map(item => item.title), ["Alpha", "Zebra", "Beta", "Apple", "Zeta"]);
  assert.equal(malProgress(entry(1, "Ongoing", 9), "manga"), "3 / ? chapters");
  assert.equal(malProgress({ ...items[0], status: "completed" }, "anime"), "Completed");
});

test("spotlights use the latest in-progress update, not the highest rating or a completed item", () => {
  const entries = [
    { ...entry(1, "Highest", 10), updatedAt: "2020-01-01" },
    { ...entry(2, "Current", 8), updatedAt: "2026-01-01" },
    { ...entry(3, "Finished", 9), status: "completed", updatedAt: "2026-10-01" },
  ];
  assert.equal(currentMalEntry(entries, "manga")?.id, 2);
  assert.equal(currentMalEntry(entries, "anime"), null);
  assert.equal(currentMalEntry([{ ...entries[2], revisiting: true }], "manga")?.id, 3);
});

test("fetches every page and sorts globally while isolating anime failures", async () => {
  process.env.MAL_CLIENT_ID = "test-client";
  const offsets: string[] = [];
  mock.method(globalThis, "fetch", async (input: URL, init: RequestInit) => {
    const url = new URL(input);
    assert.equal(new Headers(init.headers).get("X-MAL-CLIENT-ID"), "test-client");
    if (url.pathname.endsWith("animelist")) return Response.json({}, { status: 503 });
    offsets.push(url.searchParams.get("offset")!);
    return Response.json(url.searchParams.get("offset") === "0"
      ? { data: [apiEntry(1, "Zebra", 10), apiEntry(2, "Unrated", 0)], paging: { next: "https://api.myanimelist.net/v2/users/TheSwiginator/mangalist?offset=1000" } }
      : { data: [apiEntry(3, "Alpha", 10)] });
  });
  const data = await getMalSnapshot();
  assert.deepEqual(offsets, ["0", "1000"]);
  assert.deepEqual(data.manga.entries.map(item => item.title), ["Alpha", "Zebra", "Unrated"]);
  assert.equal(data.manga.entries[2].score, null);
  assert.equal(data.manga.entries[0].total, null);
  assert.equal(data.anime.state, "unavailable");
});

test("missing credentials make no requests; unexpected pagination never receives credentials", async () => {
  delete process.env.MAL_CLIENT_ID;
  let calls = 0;
  mock.method(globalThis, "fetch", async (input: URL) => {
    calls++;
    assert.equal(new URL(input).hostname, "api.myanimelist.net");
    return Response.json({ data: [], paging: { next: "https://example.org/steal?offset=1000" } });
  });
  assert.equal((await getMalSnapshot()).manga.state, "unconfigured");
  assert.equal(calls, 0);
  process.env.MAL_CLIENT_ID = "test-client";
  assert.equal((await getMalSnapshot()).manga.state, "unavailable");
  assert.equal(calls, 2);
});

test("recommendation endpoint rejects cross-origin, invalid JSON and invalid IDs before MAL calls", async () => {
  mock.method(globalThis, "fetch", () => { throw new Error("Unexpected upstream call"); });
  const request = (body: string, origin = "http://localhost") => new Request("http://localhost/api/mal/recommend", { method: "POST", headers: { origin, "content-type": "application/json" }, body });
  assert.equal((await POST(request('{"kind":"anime","id":1}', "https://example.org"))).status, 403);
  assert.equal((await POST(request("null"))).status, 400);
  assert.equal((await POST(request("not json"))).status, 400);
  assert.equal((await POST(request('{"kind":"anime","id":-1}'))).status, 400);
});

test("MAL account check, duplicates, failures and concurrent visitors protect a shared three-slot budget", async () => {
  process.env.MAL_CLIENT_ID = "test-client";
  process.env.MAL_CLIENT_SECRET = "test-secret";
  process.env.MAL_REFRESH_TOKEN = "test-refresh";
  let wrongUser = true;
  let failWrite = false;
  let writes = 0;
  let tokenRequests = 0;
  const statuses: string[] = [];
  mock.method(globalThis, "fetch", async (input: string, init: RequestInit = {}) => {
    if (input.endsWith("/oauth2/token")) { tokenRequests++; return Response.json({ access_token: "test-access", refresh_token: "test-next-refresh", expires_in: 3600 }); }
    if (input.endsWith("/users/@me")) return Response.json({ name: wrongUser ? "someone-else" : "TheSwiginator" });
    if (init.method === "PATCH") {
      writes++; statuses.push(new URLSearchParams(String(init.body)).get("status")!);
      return Response.json({}, { status: failWrite ? 503 : 200 });
    }
    return Response.json(input.includes("/99?") ? { my_list_status: { status: "completed", score: 10 } } : { id: 1 });
  });
  await assert.rejects(() => recommendMal("manga", 1), /does not belong/);
  assert.equal(writes, 0);
  assert.equal(malRecommendationState().allowance.remaining, 3);
  wrongUser = false;
  await assert.rejects(() => recommendMal("anime", 99), /already on/);
  assert.equal(writes, 0);
  failWrite = true;
  await assert.rejects(() => recommendMal("anime", 1), /couldn’t save/);
  assert.equal(malRecommendationState().allowance.remaining, 3);
  failWrite = false;
  const results = await Promise.allSettled([recommendMal("manga", 1), recommendMal("manga", 1), recommendMal("anime", 2), recommendMal("anime", 3), recommendMal("anime", 4)]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 3);
  assert.equal(writes, 4); // One failed write, three successful writes.
  assert.deepEqual(statuses.slice(1), ["plan_to_read", "plan_to_watch", "plan_to_watch"]);
  assert.equal(malRecommendationState().allowance.remaining, 0);
  assert.equal(tokenRequests, 2);
  assert.ok(!JSON.stringify(malRecommendationState()).includes("test-secret"));
});
