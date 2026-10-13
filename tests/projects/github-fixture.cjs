// Loaded only by Playwright's dedicated Next process. Never imported by the app.
// Synthetic public data keeps browser checks independent of credentials and GitHub uptime.
process.env.GITHUB_API_KEY = "projects-browser-fixture";
const originalFetch = globalThis.fetch;
const owner = "blayyyyyk";
const repositories = Array.from({ length: 8 }, (_, index) => ({
  name: `example-project-${index + 1}`,
  full_name: `${owner}/example-project-${index + 1}`,
  description: "Synthetic repository for testing the portfolio's scrolling list and README drawer.",
  html_url: `https://github.com/${owner}/example-project-${index + 1}`,
  private: false, owner: { login: owner }, language: "TypeScript", stargazers_count: index + 1,
  pushed_at: "2026-10-12T12:00:00Z", topics: ["fixture", "browser-tests"], default_branch: "main",
}));
const weeks = Array.from({ length: 53 }, (_, week) => ({
  contributionDays: Array.from({ length: 7 }, (_, day) => {
    const date = new Date(Date.UTC(2025, 9, 12 + week * 7 + day));
    const count = (week + day) % 5;
    return { date: date.toISOString().slice(0, 10), contributionCount: count,
      contributionLevel: ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"][count] };
  }),
}));
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  if (url.hostname !== "api.github.com") return originalFetch(input, init);
  if (url.pathname === "/graphql") return Response.json({ data: { user: { contributionsCollection: {
    contributionCalendar: { totalContributions: weeks.flatMap(week => week.contributionDays).reduce((sum, day) => sum + day.contributionCount, 0), weeks },
  } } } });
  if (url.pathname.endsWith("/starred")) return Response.json(repositories);
  if (url.pathname.endsWith("/events/public")) return Response.json(repositories.map((repo, index) => ({
    id: String(index), type: "PullRequestEvent", created_at: "2026-10-12T12:00:00Z", repo: { name: repo.full_name },
    payload: { action: "opened", pull_request: { html_url: `${repo.html_url}/pull/1`, title: "Synthetic activity entry with enough detail to exercise both desktop and mobile scrolling." } },
  })));
  if (url.pathname.endsWith("/readme")) return Response.json({ content: Buffer.from("# Fixture README\n\nSynthetic repository documentation.").toString("base64"), path: "README.md" });
  return Response.json({ message: "Fixture not found" }, { status: 404 });
};
