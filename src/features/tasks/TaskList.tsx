import { TASK_STATUSES, type Task } from "../../api/types";
import { t } from "../../i18n/en";
import { toColumns } from "../../lib/board";
import { DoneCheck } from "./DoneCheck";
import { TaskMeta } from "./TaskMeta";

/** Simple list view of the same tasks, grouped by status. */
export function TaskList({ tasks, onOpen }: { tasks: Task[]; onOpen: (task: Task) => void }) {
  const columns = toColumns(tasks);
  return (
    <div className="stack">
      {TASK_STATUSES.map((status) =>
        columns[status].length === 0 ? null : (
          <section key={status} className="stack" style={{ gap: 6 }}>
            <h3>
              {t.tasks.statuses[status]} · {columns[status].length}
            </h3>
            <div className="card list">
              {columns[status].map((task) => (
                <div key={task.id} className="list-row clickable" onClick={() => onOpen(task)}>
                  <DoneCheck task={task} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="ellipsis" style={{ fontWeight: 550 }}>
                      {task.title}
                    </div>
                    <TaskMeta task={task} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}
