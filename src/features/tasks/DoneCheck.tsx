import { Check } from "lucide-react";
import { taskToInput, updateTask } from "../../api/tasks";
import type { Task } from "../../api/types";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";

/** Round checkbox that marks a task as done (or back to "to do"). */
export function DoneCheck({ task }: { task: Task }) {
  const toast = useToast();
  const done = task.status === "done";
  const toggle = async () => {
    try {
      await updateTask(task.id, { ...taskToInput(task), status: done ? "todo" : "done" });
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  return (
    <button
      className={`check ${done ? "checked" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        void toggle();
      }}
      aria-label={done ? t.tasks.markNotDone : t.tasks.markDone}
      title={done ? t.tasks.markNotDone : t.tasks.markDone}
    >
      {done && <Check size={12} strokeWidth={3} />}
    </button>
  );
}
