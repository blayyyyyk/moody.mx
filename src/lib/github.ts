// src/lib/github.ts
import "server-only";
import { Octokit } from "@octokit/rest";
import { cache } from "react";

const octokit = new Octokit({
  auth: process.env.GITHUB_API_KEY,
});

// 1. Fetch starred repos once (GraphQL)  
// 2. Fetch README contents in the same query  
// CACHED on server for X seconds
export const getProjects = cache(async () => {
  const query = `
    query($username: String!) {
      user(login: $username) {
        starredRepositories(first: 50, orderBy:{field: STARRED_AT, direction: DESC}) {
          nodes {
            name
            owner { login }
            description
            pushedAt
            url
            repositoryTopics(first: 10) {
              nodes { topic { name } }
            }
            object(expression: "HEAD:README.md") {
              ... on Blob {
                text
              }
            }
          }
        }
      }
    }
  `;

  const data = await octokit.graphql(query, {
    username: "blayyyyyk",
  });

  //@ts-ignore
  const repos = data.user.starredRepositories.nodes;
  
  // Filter to only your own repos
  return repos.filter((r: any) => r.owner.login === "blayyyyyk");
});
