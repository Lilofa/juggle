import { Flag } from "lucide-react";
import type { Task } from "../../api/types";
import { t } from "../../i18n/en";
import { dueLabel, isOverdue } from "../../lib/dates";

/** Deadline and priority shown under a task title. */
export function TaskMeta({ task, showProject }: { task: Task; showProject?: boolean }) {
  const overdue = task.status !== "done" && isOverdue(task.dueDate);
  return (
    <div className="task-meta">
      {showProject && (
        <span className="row" style={{ gap: 4 }}>
          <span className="dot" style={{ background: task.projectColor, width: 8, height: 8 }} />
          {task.projectName}
        </span>
      )}
      {task.dueDate && (
        <span className={`due ${overdue ? "overdue" : ""}`}>{dueLabel(task.dueDate)}</span>
      )}
      {task.priority !== "normal" && (
        <span className={`row priority-${task.priority}`} style={{ gap: 2 }}>
          <Flag size={12} /> {t.tasks.priorities[task.priority]}
        </span>
      )}
    </div>
  );
}
