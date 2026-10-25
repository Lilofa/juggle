import { call, mutate } from "./client";
import type { Task, TaskInput, TaskStatus } from "./types";

export const listTasks = (projectId: number) => call<Task[]>("list_tasks", { projectId });
export const listOpenTasks = () => call<Task[]>("list_open_tasks");
export const listTasksDueBetween = (from: string, to: string) =>
  call<Task[]>("list_tasks_due_between", { from, to });
export const createTask = (projectId: number, input: TaskInput) =>
  mutate<Task>("create_task", { projectId, input });
export const updateTask = (id: number, input: TaskInput) =>
  mutate<Task>("update_task", { id, input });
/** Saves the full order of one board column (after drag and drop). */
export const reorderTasks = (projectId: number, status: TaskStatus, orderedIds: number[]) =>
  mutate<void>("reorder_tasks", { projectId, status, orderedIds });
export const deleteTask = (id: number) => mutate<void>("delete_task", { id });

export const taskToInput = (t: Task): TaskInput => ({
  title: t.title,
  description: t.description,
  status: t.status,
  priority: t.priority,
  dueDate: t.dueDate,
});
