import { useState } from "react";
import { createTask, deleteTask, updateTask } from "../../api/tasks";
import {
  PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskInput,
  type TaskStatus,
} from "../../api/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorText } from "../../components/ErrorText";
import { Modal } from "../../components/Modal";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";

interface TaskDialogProps {
  projectId: number;
  /** Edit this task. Without it, a new task is created. */
  task?: Task;
  initialStatus?: TaskStatus;
  onClose: () => void;
}

export function TaskDialog({ projectId, task, initialStatus = "todo", onClose }: TaskDialogProps) {
  const [form, setForm] = useState<TaskInput>({
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? initialStatus,
    priority: task?.priority ?? "normal",
    dueDate: task?.dueDate ?? null,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      if (task) await updateTask(task.id, form);
      else await createTask(projectId, form);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        title={task ? t.tasks.dialogEdit : t.tasks.dialogNew}
        onClose={onClose}
        footer={
          <>
            {task && (
              <button className="button danger left" onClick={() => setConfirmDelete(true)}>
                {t.common.delete}
              </button>
            )}
            <button className="button" onClick={onClose}>
              {t.common.cancel}
            </button>
            <button className="button primary" onClick={save} disabled={busy || !form.title.trim()}>
              {task ? t.common.save : t.common.create}
            </button>
          </>
        }
      >
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="field">
            {t.tasks.title}
            <input
              type="text"
              value={form.title}
              placeholder={t.tasks.titlePlaceholder}
              onChange={(e) => set("title", e.target.value)}
            />
          </label>
          <label className="field">
            {t.tasks.description}
            <textarea
              value={form.description}
              rows={4}
              onChange={(e) => set("description", e.target.value)}
            />
          </label>
          <div className="field-row">
            <label className="field">
              {t.tasks.status}
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as TaskStatus)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.tasks.statuses[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              {t.tasks.priority}
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as TaskInput["priority"])}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {t.tasks.priorities[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            {t.tasks.dueDate}
            <div className="row">
              <input
                type="date"
                value={form.dueDate ?? ""}
                onChange={(e) => set("dueDate", e.target.value || null)}
              />
              {form.dueDate && (
                <button type="button" className="button small" onClick={() => set("dueDate", null)}>
                  {t.tasks.clearDate}
                </button>
              )}
            </div>
          </label>
          <ErrorText error={error} />
        </form>
      </Modal>
      {confirmDelete && task && (
        <ConfirmDialog
          title={t.tasks.deleteTitle}
          body={t.tasks.deleteBody}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await deleteTask(task.id);
            onClose();
          }}
        />
      )}
    </>
  );
}
