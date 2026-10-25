import type { UniqueIdentifier } from "@dnd-kit/core";
import { TASK_STATUSES, type Task, type TaskStatus } from "../api/types";

export type Columns = Record<TaskStatus, Task[]>;

/** Droppable id of an (empty) column. Task cards use their numeric task id. */
export const columnId = (status: TaskStatus) => `col-${status}`;

export function toColumns(tasks: Task[]): Columns {
  const columns: Columns = { todo: [], doing: [], done: [] };
  for (const task of tasks) columns[task.status].push(task);
  for (const status of TASK_STATUSES) columns[status].sort((a, b) => a.position - b.position);
  return columns;
}

/** Which column holds this card, or which column this id is. */
export function findColumn(columns: Columns, id: UniqueIdentifier): TaskStatus | null {
  if (typeof id === "string" && id.startsWith("col-")) {
    const status = id.slice(4) as TaskStatus;
    return TASK_STATUSES.includes(status) ? status : null;
  }
  return TASK_STATUSES.find((s) => columns[s].some((task) => task.id === id)) ?? null;
}

/**
 * Moves the dragged card to where it was dropped: before the card it is over,
 * or at the end when dropped on a column. Returns new column arrays (no mutation).
 */
export function moveTask(columns: Columns, activeId: number, overId: UniqueIdentifier): Columns {
  const from = findColumn(columns, activeId);
  const to = findColumn(columns, overId);
  if (!from || !to || activeId === overId) return columns;

  const source = columns[from].filter((task) => task.id !== activeId);
  const moved = columns[from].find((task) => task.id === activeId)!;
  const target = from === to ? source : [...columns[to]];
  // For a move inside one column, use the over card's original index (like arrayMove).
  const overIndex = columns[to].findIndex((task) => task.id === overId);
  const insertAt = overIndex < 0 ? target.length : overIndex;
  target.splice(insertAt, 0, { ...moved, status: to });

  return { ...columns, [from]: source, [to]: target };
}
