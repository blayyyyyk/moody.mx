"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, GitCommitHorizontal, Star, X } from "lucide-react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { GitHubProject, ProjectsData } from "@/lib/projects-types";
import styles from "../../../styles/Projects.module.css";

const profile = "https://github.com/blayyyyyk";
const levels = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
const dateLabel = (value: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));

function Contributions({ calendar }: Pick<ProjectsData, "calendar">) {
  const scroll = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const dates = calendar?.weeks.flatMap(week => week.contributionDays) ?? [];
  const [activeDate, setActiveDate] = useState(dates.at(-1)?.date ?? "");
  function selectDate(date: string, focus = false) {
    const day = dates.find(day => day.date === date);
    if (!day) return;
    setActiveDate(date);
    setSelected(`${dateLabel(date)}: ${day.contributionCount} contribution${day.contributionCount === 1 ? "" : "s"}`);
    if (focus) scroll.current?.querySelector<HTMLButtonElement>(`[data-date="${date}"]`)?.focus();
  }
  useEffect(() => { if (scroll.current) scroll.current.scrollLeft = scroll.current.scrollWidth; }, []);
  return (
    <div className={styles.contributions}>
      <div className={styles.bar}>
        <h2>Contribution history</h2>
        <a href={profile} target="_blank" rel="noreferrer">@blayyyyyk <ArrowUpRight size={14} /></a>
      </div>
      {calendar ? <>
        <div className={styles.chartScroll} ref={scroll} tabIndex={0} aria-label="Contribution calendar, scroll horizontally to explore the year">
          <div className={styles.calendar}>
            <div className={styles.weekdays} aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
            {calendar.weeks.map((week, index) => {
              const first = week.contributionDays[0];
              const month = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
              const prev = calendar.weeks[index - 1]?.contributionDays[0];
              const showMonth = index === 0 || (prev && new Date(`${prev.date}T00:00:00Z`).getUTCMonth() !== month);
              return <div className={styles.week} key={first.date}>
                <span className={styles.month}>{showMonth ? new Date(`${first.date}T00:00:00Z`).toLocaleString("en", { month: "short", timeZone: "UTC" }) : ""}</span>
                <div className={styles.days}>
                  {week.contributionDays.map(day => {
                    const label = `${dateLabel(day.date)}: ${day.contributionCount} contribution${day.contributionCount === 1 ? "" : "s"}`;
                    return <button key={day.date} type="button" className={styles.day}
                      data-date={day.date} tabIndex={activeDate === day.date ? 0 : -1}
                      style={{ gridRow: new Date(`${day.date}T00:00:00Z`).getUTCDay() + 1 }}
                      data-level={Math.max(0, levels.indexOf(day.contributionLevel))} aria-label={label} title={label}
                      onFocus={() => selectDate(day.date)} onMouseEnter={() => setSelected(label)} onClick={() => selectDate(day.date)}
                      onKeyDown={event => {
                        const offsets: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
                        if (!(event.key in offsets)) return;
                        event.preventDefault();
                        const next = dates[Math.max(0, Math.min(dates.length - 1, dates.findIndex(item => item.date === day.date) + offsets[event.key]))];
                        selectDate(next.date, true);
                      }} />;
                  })}
                </div>
              </div>;
            })}
          </div>
        </div>
        <div className={styles.chartFooter}>
          <span aria-live="polite">{selected ?? `${calendar.totalContributions.toLocaleString("en")} contributions in the last year`}</span>
          <span className={styles.legend}>Less {levels.map((_, i) => <i key={i} data-level={i} />)} More</span>
          <label className={styles.datePicker}>Inspect a date <input type="date" value={activeDate} min={dates[0]?.date} max={dates.at(-1)?.date} onChange={event => selectDate(event.target.value)} /></label>
        </div>
      </> : <div className={styles.empty}>Contribution history is temporarily unavailable. <a href={`${profile}?tab=overview`}>View the calendar on GitHub <ArrowUpRight size={14} /></a></div>}
    </div>
  );
}

interface Readme { text: string; path: string; branch: string }

function ProjectReadme({ project }: { project: GitHubProject }) {
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
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeHighlight, rehypeKatex, [rehypeSlug, { prefix: "readme-" }]]}
      urlTransform={(url, key) => {
        const safe = defaultUrlTransform(url);
        if (!safe) return "";
        if (safe.startsWith("#")) return `#readme-${safe.slice(1)}`;
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(safe)) return safe;
        const base = key === "src" ? `https://raw.githubusercontent.com/${project.fullName}/${branch}/` : `${project.url}/blob/${branch}/`;
        return new URL(safe.replace(/^\//, ""), `${base}${safe.startsWith("/") ? "" : directory}`).href;
      }}
      components={{
        a: ({ children, href }) => <a href={href} target={href?.startsWith("#") ? undefined : "_blank"} rel="noreferrer">{children}</a>,
        // README images have arbitrary hosts and dimensions; preserve their intrinsic aspect ratio.
        // eslint-disable-next-line @next/next/no-img-element
        img: ({ src, alt }) => <img src={src} alt={alt ?? ""} loading="lazy" />,
        table: ({ children }) => <div className={styles.tableScroll}><table>{children}</table></div>,
      }}
    >{readme.text}</ReactMarkdown>
  </article>;
}

function ProjectRow({ project }: { project: GitHubProject }) {
  const [open, setOpen] = useState(false);
  return <li className={styles.project}>
    <div className={styles.projectTop}><h3>{project.name}</h3><span className={styles.starCount}><Star size={13} aria-hidden="true" />{project.stars}</span></div>
    {project.description && <p>{project.description}</p>}
    <div className={styles.tags}>{project.language && <span>{project.language}</span>}{project.topics.slice(0, 5).map(topic => <span key={topic}>{topic}</span>)}</div>
    <div className={styles.projectFooter}>
      <span>Updated <time dateTime={project.pushedAt}>{dateLabel(project.pushedAt)}</time></span>
      <Drawer autoFocus open={open} onOpenChange={setOpen}>
        <DrawerTrigger className={styles.control} aria-label={`Read README for ${project.name}`}>Read README <ArrowUpRight size={16} /></DrawerTrigger>
        <DrawerContent className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <div><DrawerTitle className={styles.drawerTitle}>{project.name}</DrawerTitle><DrawerDescription className={styles.drawerDescription}>{project.description ?? project.fullName}</DrawerDescription></div>
            <DrawerClose className={styles.control} aria-label="Close README"><X size={18} /><span>Close</span></DrawerClose>
          </div>
          <div className={styles.drawerBar}><span>README</span><a href={project.url} target="_blank" rel="noreferrer">View repository <ArrowUpRight size={14} /></a></div>
          <div className={styles.readmeScroll} data-vaul-no-drag>{open && <ProjectReadme project={project} />}</div>
        </DrawerContent>
      </Drawer>
    </div>
  </li>;
}

function ScrollList({ children, label, subject }: { children: ReactNode; label: string; subject: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ above: false, below: false });
  const updateEdges = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const above = node.scrollTop > 2;
    const below = node.scrollHeight - node.clientHeight - node.scrollTop > 2;
    setEdges(previous => previous.above === above && previous.below === below ? previous : { above, below });
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(updateEdges);
    if (scrollRef.current) observer.observe(scrollRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    updateEdges();
    return () => observer.disconnect();
  }, [updateEdges]);

  function scrollList(direction: -1 | 1) {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollBy({ top: direction * node.clientHeight * 0.75, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <div className={styles.listViewport}>
    <div ref={scrollRef} className={styles.listScroll} onScroll={updateEdges} tabIndex={0} role="region" aria-label={label}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "PageDown" || event.key === "PageUp") {
          event.preventDefault();
          scrollList(event.key === "PageDown" ? 1 : -1);
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          event.currentTarget.scrollTo({ top: event.key === "Home" ? 0 : event.currentTarget.scrollHeight });
        }
      }}>
      <div ref={contentRef}>{children}</div>
    </div>
    <button type="button" className={`${styles.scrollArrow} ${styles.scrollUp}`} data-visible={edges.above} disabled={!edges.above} aria-hidden={!edges.above} aria-label={`Scroll ${subject} up`} onClick={() => scrollList(-1)}><ChevronUp size={20} aria-hidden="true" /></button>
    <button type="button" className={`${styles.scrollArrow} ${styles.scrollDown}`} data-visible={edges.below} disabled={!edges.below} aria-hidden={!edges.below} aria-label={`Scroll ${subject} down`} onClick={() => scrollList(1)}><ChevronDown size={20} aria-hidden="true" /></button>
  </div>;
}

export default function ProjectsExplorer({ data }: { data: ProjectsData }) {
  return <div className={styles.explorer}>
    <Contributions calendar={data.calendar} />
    <div className={styles.columns}>
      <div className={styles.repositories}>
        <div className={styles.bar}><h2><Star size={16} aria-hidden="true" /> Starred projects</h2><span>{data.projects.length.toString().padStart(2, "0")} repositories</span></div>
        <ScrollList label="Starred project list" subject="projects">
          {data.projects.length ? <ul className={styles.list}>{data.projects.map(project => <ProjectRow key={project.fullName} project={project} />)}</ul> : <div className={styles.empty}>{data.projectsUnavailable ? "Projects couldn’t be loaded right now." : "No starred projects to show yet."}<a href={`${profile}?tab=repositories`}>Browse repositories on GitHub <ArrowUpRight size={14} /></a></div>}
        </ScrollList>
      </div>
      <aside className={styles.activity} aria-label="Recent GitHub activity">
        <div className={styles.bar}><h2><GitCommitHorizontal size={16} aria-hidden="true" /> Recent activity</h2><span>Public</span></div>
        <ScrollList label="Recent activity list" subject="activity">
        {data.activity.length ? <ol className={styles.list}>{data.activity.map(event => <li className={styles.event} key={event.id}>
          <div className={styles.eventHeading}><span>{event.action}</span><time dateTime={event.date}>{dateLabel(event.date)}</time></div>
          <a href={event.url} target="_blank" rel="noreferrer">{event.repo}<ArrowUpRight size={14} /></a>
          {event.detail && <p>{event.detail}</p>}
        </li>)}</ol> : <div className={styles.empty}>{data.activityUnavailable ? "Activity couldn’t be loaded right now." : "No recent public activity."}</div>}
        </ScrollList>
        <a className={styles.activityLink} href={profile} target="_blank" rel="noreferrer">Explore on GitHub <ArrowUpRight size={16} /></a>
      </aside>
    </div>
  </div>;
}
