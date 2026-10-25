import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Columns3, List, Plus } from "lucide-react";
import { listTasks } from "../../api/tasks";
import type { Task, TaskStatus } from "../../api/types";
import { EmptyState } from "../../components/EmptyState";
import { ErrorText } from "../../components/ErrorText";
import { t } from "../../i18n/en";
import { useData } from "../../lib/useData";
import { Board } from "./Board";
import { TaskDialog } from "./TaskDialog";
import { TaskList } from "./TaskList";

type Dialog = { task?: Task; status?: TaskStatus } | null;

export function TasksTab({ projectId }: { projectId: number }) {
  const { data: tasks, error } = useData(() => listTasks(projectId), [projectId]);
  const [view, setView] = useState<"board" | "list">("board");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [params, setParams] = useSearchParams();

  // Search results link here with ?task=<id>.
  const linkedId = Number(params.get("task"));
  const linkedTask = linkedId ? tasks?.find((task) => task.id === linkedId) : undefined;
  const open = dialog ?? (linkedTask ? { task: linkedTask } : null);
  const close = () => {
    setDialog(null);
    if (params.has("task")) setParams({}, { replace: true });
  };

  if (error) return <ErrorText error={error} />;
  if (!tasks) return null;

  return (
    <div className="stack">
      <div className="row">
        <div className="segmented" role="group">
          <button aria-pressed={view === "board"} onClick={() => setView("board")}>
            <Columns3 size={14} /> {t.tasks.boardView}
          </button>
          <button aria-pressed={view === "list"} onClick={() => setView("list")}>
            <List size={14} /> {t.tasks.listView}
          </button>
        </div>
        <span className="spacer" />
        <button className="button primary" onClick={() => setDialog({ status: "todo" })}>
          <Plus size={16} /> {t.tasks.newTask}
        </button>
      </div>
      {view === "board" ? (
        <Board
          projectId={projectId}
          tasks={tasks}
          onOpen={(task) => setDialog({ task })}
          onAdd={(status) => setDialog({ status })}
        />
      ) : tasks.length === 0 ? (
        <EmptyState>{t.tasks.emptyColumn}</EmptyState>
      ) : (
        <TaskList tasks={tasks} onOpen={(task) => setDialog({ task })} />
      )}
      {open && (
        <TaskDialog
          projectId={projectId}
          task={open.task}
          initialStatus={open.status}
          onClose={close}
        />
      )}
    </div>
  );
}
