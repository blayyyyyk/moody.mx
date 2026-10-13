import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { getProjects, getProjectsData, getProjectReadme } from "../src/lib/github";

const originalToken = process.env.GITHUB_API_KEY;
afterEach(() => {
  mock.restoreAll();
  if (originalToken === undefined) delete process.env.GITHUB_API_KEY;
  else process.env.GITHUB_API_KEY = originalToken;
});

function repository(name: string, owner = "blayyyyyk", privateRepo = false) {
  return { name, full_name: `${owner}/${name}`, private: privateRepo, owner: { login: owner },
    description: null, html_url: `https://github.com/${owner}/${name}`, language: null,
    stargazers_count: 0, pushed_at: "2026-10-12T00:00:00Z", default_branch: "main" };
}

test("star pagination filters private and other-owned repos before exposing projects", async () => {
  const pages: string[] = [];
  mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    pages.push(url.searchParams.get("page")!);
    return Response.json(url.searchParams.get("page") === "1"
      ? Array.from({ length: 100 }, (_, index) => repository(`other-${index}`, "someone-else"))
      : [repository("selected"), repository("private", "blayyyyyk", true), repository("unowned", "another-owner")]);
  });
  const projects = await getProjects();
  assert.deepEqual(projects.map(project => project.name), ["selected"]);
  assert.deepEqual(projects[0].topics, []);
  assert.deepEqual(pages, ["1", "2"]);
});

test("public data works without credentials and skips the authenticated calendar", async () => {
  delete process.env.GITHUB_API_KEY;
  mock.method(globalThis, "fetch", async (input: string, options: RequestInit) => {
    assert.equal(new Headers(options.headers).has("authorization"), false);
    assert.notEqual(new URL(input).pathname, "/graphql");
    return Response.json(input.includes("/starred") ? [repository("selected")] : []);
  });
  const data = await getProjectsData();
  assert.equal(data.projects.length, 1);
  assert.equal(data.projectsUnavailable, false);
  assert.equal(data.activityUnavailable, false);
  assert.equal(data.calendar, null);
});

test("activity and calendar failures do not discard successfully loaded projects", async () => {
  process.env.GITHUB_API_KEY = "test-token";
  mock.method(globalThis, "fetch", async (input: string) => {
    if (input.includes("/starred")) return Response.json([repository("selected")]);
    if (input.endsWith("/graphql")) return Response.json({ errors: [{ message: "Not authorized" }] });
    return Response.json({ message: "Unavailable" }, { status: 503 });
  });
  const data = await getProjectsData();
  assert.equal(data.projects.length, 1);
  assert.equal(data.projectsUnavailable, false);
  assert.equal(data.activityUnavailable, true);
  assert.deepEqual(data.activity, []);
  assert.equal(data.calendar, null);
});

test("README lookup enforces selection and decodes GitHub's resolved README path", async () => {
  const requests: string[] = [];
  mock.method(globalThis, "fetch", async (input: string) => {
    requests.push(input);
    if (input.includes("/starred")) return Response.json([repository("selected"), repository("private", "blayyyyyk", true)]);
    return Response.json({ content: Buffer.from("# Selected README\n\nCafé").toString("base64"), path: "docs/Readme.md" });
  });
  assert.equal(await getProjectReadme("private"), null);
  assert.equal(await getProjectReadme("unknown"), null);
  assert.equal(requests.some(url => url.endsWith("/readme")), false);
  assert.deepEqual(await getProjectReadme("selected"), { text: "# Selected README\n\nCafé", path: "docs/Readme.md", branch: "main" });
  assert.ok(requests.at(-1)?.endsWith("/repos/blayyyyyk/selected/readme"));
});
