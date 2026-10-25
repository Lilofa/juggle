// TEST DATA ONLY. Used by unit tests, never shipped in the app.
import type { Task } from "../api/types";

export function sampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    projectId: 1,
    projectName: "Test project",
    projectColor: "#2f6fed",
    title: "Test task",
    description: "",
    status: "todo",
    priority: "normal",
    dueDate: null,
    position: 0,
    completedAt: null,
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}
