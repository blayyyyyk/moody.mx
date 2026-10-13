"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { GitHubProject } from "@/lib/projects-types";
import styles from "../../../styles/Projects.module.css";

const readmeSchema = {
  ...defaultSchema,
  clobberPrefix: "readme-",
  strip: [...(defaultSchema.strip ?? []), "style", "iframe", "object", "embed"],
  attributes: {
    ...defaultSchema.attributes,
    code: [["className", /^language-./, "math-inline", "math-display"]],
    // Fall back to the picture's img; srcset must not bypass URL validation.
    source: ["media", "type"],
  },
};

interface Readme { text: string; path: string; branch: string }

export default function ProjectReadme({ project }: { project: GitHubProject }) {
  const [readme, setReadme] = useState<Readme | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(`/api/projects/${encodeURIComponent(project.name)}/readme`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("README unavailable"); return response.json(); })
      .then(setReadme)
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [project.name, attempt]);

  if (error) return <div className={styles.empty} role="status">The README couldn’t be loaded. <button className={styles.control} onClick={() => setAttempt(value => value + 1)}>Try again</button><a href={`${project.url}#readme`} target="_blank" rel="noreferrer">Read on GitHub <ArrowUpRight size={14} /></a></div>;
  if (!readme) return <div className={styles.empty} role="status">Loading README…</div>;
  if (!readme.text.trim()) return <div className={styles.empty}>This repository has an empty README. <a href={project.url}>Explore the repository</a></div>;

  const directory = readme.path.slice(0, readme.path.lastIndexOf("/") + 1);
  const branch = encodeURIComponent(readme.branch);
  return <article className={styles.markdown}>
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, readmeSchema], rehypeHighlight, rehypeKatex, [rehypeSlug, { prefix: "readme-" }]]}
      urlTransform={(url, key) => {
        const safe = defaultUrlTransform(url);
        if (!safe) return "";
        if (safe.startsWith("#")) return `#readme-${safe.slice(1)}`;
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(safe)) return safe;
        const base = key === "src" ? `https://raw.githubusercontent.com/${project.fullName}/${branch}/` : `${project.url}/blob/${branch}/`;
        return new URL(safe.replace(/^\//, ""), `${base}${safe.startsWith("/") ? "" : directory}`).href;
      }}
      components={{
        a: ({ node: _node, children, href, ...props }) => <a {...props} href={href} target={href?.startsWith("#") ? undefined : "_blank"} rel="noreferrer">{children}</a>,
        // README images have arbitrary hosts and dimensions; preserve their intrinsic aspect ratio.
        // eslint-disable-next-line @next/next/no-img-element
        img: ({ node: _node, src, alt, ...props }) => <img {...props} src={src} alt={alt ?? ""} loading="lazy" />,
        table: ({ children }) => <div className={styles.tableScroll}><table>{children}</table></div>,
      }}
    >{readme.text}</ReactMarkdown>
  </article>;
}
