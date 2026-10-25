import { useState } from "react";
import { format } from "date-fns";
import { listProjects } from "../../api/projects";
import { listOpenTasks } from "../../api/tasks";
import type { Task } from "../../api/types";
import { EmptyState } from "../../components/EmptyState";
import { ErrorText } from "../../components/ErrorText";
import { t } from "../../i18n/en";
import { groupTasksByDue, type TaskGroups } from "../../lib/dates";
import { useData } from "../../lib/useData";
import { DoneCheck } from "../tasks/DoneCheck";
import { TaskDialog } from "../tasks/TaskDialog";
import { TaskMeta } from "../tasks/TaskMeta";

const GROUP_ORDER: (keyof TaskGroups)[] = ["overdue", "today", "thisWeek", "later", "noDate"];

/** All unfinished tasks from every active project, grouped by deadline. */
export function TodayPage() {
  const tasks = useData(listOpenTasks, []);
  const projects = useData(listProjects, []);
  const [editing, setEditing] = useState<Task | null>(null);

  const groups = groupTasksByDue(tasks.data ?? []);
  const hasProjects = (projects.data ?? []).length > 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t.today.title}</h1>
        <span className="muted">{format(new Date(), "EEEE, d MMMM yyyy")}</span>
      </div>
      <ErrorText error={tasks.error} />
      {tasks.data && projects.data && !hasProjects && <EmptyState>{t.today.noProjects}</EmptyState>}
      {tasks.data && hasProjects && tasks.data.length === 0 && (
        <EmptyState>{t.today.allClear}</EmptyState>
      )}

      {GROUP_ORDER.map((key) =>
        groups[key].length === 0 ? null : (
          <section key={key} className={`today-group ${key}`} aria-label={t.today.groups[key]}>
            <h3>
              {t.today.groups[key]} · {groups[key].length}
            </h3>
            <div className="card list">
              {groups[key].map((task) => (
                <div key={task.id} className="list-row clickable" onClick={() => setEditing(task)}>
                  <DoneCheck task={task} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="ellipsis" style={{ fontWeight: 550 }}>
                      {task.title}
                    </div>
                    <TaskMeta task={task} showProject />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ),
      )}
      {editing && (
        <TaskDialog projectId={editing.projectId} task={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
