import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addDays, addMonths, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getPost, listPostsBetween, listUnscheduledPosts } from "../../api/posts";
import { listProjects } from "../../api/projects";
import { listTasksDueBetween } from "../../api/tasks";
import { PLATFORMS, type Platform, type Post } from "../../api/types";
import { EmptyState } from "../../components/EmptyState";
import { ErrorText } from "../../components/ErrorText";
import { t } from "../../i18n/en";
import { buildMonthGrid, formatDay, toDayString, todayString } from "../../lib/dates";
import { PLATFORM_STYLE } from "../../lib/platforms";
import { useData } from "../../lib/useData";
import { PostChip } from "./PostChip";
import { PostDialog } from "./PostDialog";

const MAX_CHIPS = 4;
type Dialog = { post?: Post; date?: string | null } | null;

export function CalendarPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [month, setMonth] = useState(() => new Date());
  const [platform, setPlatform] = useState<Platform | "">("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [showTasks, setShowTasks] = useState(true);
  const [dialog, setDialog] = useState<Dialog>(null);

  const grid = useMemo(() => buildMonthGrid(month), [month]);
  const today = todayString();
  const upcomingTo = toDayString(addDays(new Date(), 30));

  const posts = useData(() => listPostsBetween(grid.from, grid.to), [grid.from, grid.to]);
  const tasks = useData(() => listTasksDueBetween(grid.from, grid.to), [grid.from, grid.to]);
  const upcoming = useData(() => listPostsBetween(today, upcomingTo), [today, upcomingTo]);
  const ideas = useData(listUnscheduledPosts, []);
  const projects = useData(listProjects, []);

  // Search results link here with ?post=<id>.
  const linkedId = Number(params.get("post"));
  const linked = useData(() => (linkedId ? getPost(linkedId) : Promise.resolve(null)), [linkedId]);
  const openDialog = dialog ?? (linked.data ? { post: linked.data } : null);
  const closeDialog = () => {
    setDialog(null);
    if (params.has("post")) setParams({}, { replace: true });
  };

  const matches = (p: Post) =>
    (!platform || p.platform === platform) && (projectId === "" || p.projectId === projectId);
  const postsByDay = groupBy((posts.data ?? []).filter(matches), (p) => p.date!);
  const tasksByDay = groupBy(
    (tasks.data ?? []).filter((task) => projectId === "" || task.projectId === projectId),
    (task) => task.dueDate!,
  );
  const activeProjects = (projects.data ?? []).filter((p) => !p.archived);

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t.calendar.title}</h1>
        <span className="spacer" />
        <button className="button primary" onClick={() => setDialog({ date: today })}>
          <Plus size={16} /> {t.calendar.newPost}
        </button>
      </div>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <button
          className="icon-button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          aria-label={t.calendar.prev}
        >
          <ChevronLeft size={18} />
        </button>
        <h2 style={{ minWidth: 150, textAlign: "center" }}>{format(month, "MMMM yyyy")}</h2>
        <button
          className="icon-button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          aria-label={t.calendar.next}
        >
          <ChevronRight size={18} />
        </button>
        <button className="button small" onClick={() => setMonth(new Date())}>
          {t.calendar.today}
        </button>
        <span className="spacer" />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform | "")}
          style={{ width: "auto" }}
        >
          <option value="">{t.calendar.allPlatforms}</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {t.calendar.platforms[p]}
            </option>
          ))}
        </select>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : "")}
          style={{ width: "auto" }}
        >
          <option value="">{t.calendar.allProjects}</option>
          {activeProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="checkbox small">
          <input
            type="checkbox"
            checked={showTasks}
            onChange={(e) => setShowTasks(e.target.checked)}
          />
          {t.calendar.showTasks}
        </label>
      </div>
      <ErrorText error={posts.error ?? tasks.error} />

      <div className="calendar-layout">
        <div className="month" role="grid">
          {t.calendar.weekdays.map((d) => (
            <div key={d} className="weekday">
              {d}
            </div>
          ))}
          {grid.weeks.flat().map(({ day, inMonth }) => {
            const dayPosts = postsByDay.get(day) ?? [];
            const dayTasks = showTasks ? (tasksByDay.get(day) ?? []) : [];
            const hidden = Math.max(0, dayPosts.length + dayTasks.length - MAX_CHIPS);
            return (
              <div
                key={day}
                role="gridcell"
                aria-label={formatDay(day, "EEEE d MMMM")}
                className={`day ${inMonth ? "" : "out"} ${day === today ? "today" : ""}`}
                onClick={() => setDialog({ date: day })}
              >
                <span className="num">{parseISO(day).getDate()}</span>
                {dayPosts.slice(0, MAX_CHIPS).map((p) => (
                  <PostChip key={p.id} post={p} onClick={() => setDialog({ post: p })} />
                ))}
                {dayTasks.slice(0, Math.max(0, MAX_CHIPS - dayPosts.length)).map((task) => (
                  <button
                    key={`t${task.id}`}
                    className={`chip task ${task.status === "done" ? "done" : ""}`}
                    title={`${task.projectName}: ${task.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${task.projectId}/board?task=${task.id}`);
                    }}
                  >
                    <span className="ellipsis">☐ {task.title}</span>
                  </button>
                ))}
                {hidden > 0 && <span className="small muted">{t.calendar.more(hidden)}</span>}
              </div>
            );
          })}
        </div>

        <aside className="stack">
          <SideList
            title={t.calendar.upcoming}
            posts={(upcoming.data ?? []).filter((p) => p.status !== "posted" && matches(p))}
            empty={t.calendar.nothingUpcoming}
            onOpen={(post) => setDialog({ post })}
            showDate
          />
          <SideList
            title={t.calendar.unscheduled}
            posts={(ideas.data ?? []).filter(matches)}
            empty={t.calendar.noIdeas}
            onOpen={(post) => setDialog({ post })}
            onAdd={() => setDialog({ date: null })}
          />
        </aside>
      </div>

      {openDialog && (
        <PostDialog
          post={openDialog.post}
          initialDate={openDialog.date}
          projects={activeProjects}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}

function SideList({
  title,
  posts,
  empty,
  onOpen,
  onAdd,
  showDate,
}: {
  title: string;
  posts: Post[];
  empty: string;
  onOpen: (post: Post) => void;
  onAdd?: () => void;
  showDate?: boolean;
}) {
  return (
    <section className="card">
      <div className="list-row">
        <h3>{title}</h3>
        <span className="spacer" />
        {onAdd && (
          <button
            className="icon-button"
            onClick={onAdd}
            aria-label={t.calendar.newPost}
            title={t.calendar.newPost}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      {posts.length === 0 && <EmptyState>{empty}</EmptyState>}
      <div className="list">
        {posts.map((p) => (
          <div key={p.id} className="list-row clickable" onClick={() => onOpen(p)}>
            <span
              className="platform-tag"
              style={{ ["--chip" as string]: PLATFORM_STYLE[p.platform].color }}
            >
              {PLATFORM_STYLE[p.platform].short}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ellipsis">{p.title}</div>
              <div className="small muted">
                {showDate && p.date && `${formatDay(p.date)}${p.time ? ` ${p.time}` : ""} · `}
                {t.calendar.statuses[p.status]}
                {p.projectName && ` · ${p.projectName}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    map.set(k, [...(map.get(k) ?? []), item]);
  }
  return map;
}
