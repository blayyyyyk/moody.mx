import "server-only";
import { cache } from "react";
import type { GitHubActivity, GitHubProject, ProjectsData } from "./projects-types";

export const githubUsername = "blayyyyyk";
const api = "https://api.github.com";

async function github<T>(path: string): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(process.env.GITHUB_API_KEY ? { Authorization: `Bearer ${process.env.GITHUB_API_KEY}` } : {}),
    },
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return response.json();
}

interface Repository {
  name: string; full_name: string; description: string | null; html_url: string;
  private: boolean; owner: { login: string }; language: string | null;
  stargazers_count: number; pushed_at: string; topics?: string[]; default_branch: string;
}

export const getProjects = cache(async (): Promise<GitHubProject[]> => {
  const projects: GitHubProject[] = [];
  // Paginate before filtering: selected repositories may be beyond the first page of stars.
  for (let page = 1; ; page++) {
    const repos = await github<Repository[]>(`/users/${githubUsername}/starred?per_page=100&page=${page}`);
    projects.push(...repos.filter(repo => !repo.private && repo.owner.login.toLowerCase() === githubUsername).map(repo => ({
      name: repo.name, fullName: repo.full_name, description: repo.description,
      url: repo.html_url, language: repo.language, stars: repo.stargazers_count,
      pushedAt: repo.pushed_at, topics: repo.topics ?? [], branch: repo.default_branch,
    })));
    if (repos.length < 100) return projects;
  }
});

interface Event {
  id: string; type: string; created_at: string; repo: { name: string };
  payload: { action?: string; ref?: string; ref_type?: string;
    pull_request?: { html_url: string; title: string }; issue?: { html_url: string; title: string };
    release?: { html_url: string; name: string }; commits?: { message: string }[] };
}

async function getActivity(): Promise<GitHubActivity[]> {
  const events = await github<Event[]>(`/users/${githubUsername}/events/public?per_page=30`);
  return events.slice(0, 8).map(event => {
    const p = event.payload;
    const verbs: Record<string, string> = {
      PushEvent: "Pushed changes", CreateEvent: `Created ${p.ref_type ?? "repository"}`,
      DeleteEvent: `Deleted ${p.ref_type ?? "branch"}`, WatchEvent: "Starred repository",
      ForkEvent: "Forked repository", PullRequestEvent: `${p.action ?? "Updated"} pull request`,
      IssuesEvent: `${p.action ?? "Updated"} issue`, IssueCommentEvent: "Commented on issue",
      ReleaseEvent: "Published release", PullRequestReviewEvent: "Reviewed pull request",
    };
    return { id: event.id, repo: event.repo.name, date: event.created_at,
      action: verbs[event.type] ?? "Updated repository",
      detail: p.pull_request?.title ?? p.issue?.title ?? p.release?.name ?? p.commits?.[0]?.message.split("\n")[0] ?? null,
      url: p.pull_request?.html_url ?? p.issue?.html_url ?? p.release?.html_url ?? `https://github.com/${event.repo.name}` };
  });
}

async function getContributions(): Promise<ProjectsData["calendar"]> {
  if (!process.env.GITHUB_API_KEY) return null;
  const response = await fetch(`${api}/graphql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GITHUB_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: `query { user(login: "${githubUsername}") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } } } }` }),
    next: { revalidate: 3600 }, signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("Contribution calendar unavailable");
  const data = await response.json();
  if (data.errors || !data.data?.user) throw new Error("Contribution calendar unavailable");
  return data.data.user.contributionsCollection.contributionCalendar;
}

export const getProjectsData = cache(async (): Promise<ProjectsData> => {
  const [projects, activity, calendar] = await Promise.allSettled([getProjects(), getActivity(), getContributions()]);
  return {
    projects: projects.status === "fulfilled" ? projects.value : [],
    activity: activity.status === "fulfilled" ? activity.value : [],
    calendar: calendar.status === "fulfilled" ? calendar.value : null,
    projectsUnavailable: projects.status === "rejected", activityUnavailable: activity.status === "rejected",
  };
});

export async function getProjectReadme(name: string) {
  const projects = await getProjects();
  const project = projects.find(item => item.name === name);
  if (!project) return null;
  const readme = await github<{ content: string; path: string }>(`/repos/${githubUsername}/${encodeURIComponent(name)}/readme`);
  return { text: Buffer.from(readme.content, "base64").toString("utf8"), path: readme.path, branch: project.branch };
}
