export interface GitHubProject {
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  pushedAt: string;
  topics: string[];
  branch: string;
}

export interface GitHubActivity {
  id: string;
  repo: string;
  date: string;
  action: string;
  detail: string | null;
  url: string;
}

export interface ProjectsData {
  projects: GitHubProject[];
  activity: GitHubActivity[];
  calendar: {
    totalContributions: number;
    weeks: { contributionDays: { date: string; contributionCount: number; contributionLevel: string }[] }[];
  } | null;
  projectsUnavailable: boolean;
  activityUnavailable: boolean;
}
