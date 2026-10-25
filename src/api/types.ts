// Mirrors src-tauri/src/models.rs. Keep both files in sync.

export type TaskStatus = "todo" | "doing" | "done";
export type Priority = "low" | "normal" | "high";
export type Mark = "none" | "use" | "maybe" | "reject";
export type Platform = "instagram" | "vk" | "facebook" | "youtube_shorts" | "other";
export type PostStatus = "idea" | "draft" | "scheduled" | "posted";
export type Theme = "light" | "dark" | "system";
export type Accent = "ocean" | "forest" | "sunset" | "grape" | "rose" | "graphite";

export const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];
export const PRIORITIES: Priority[] = ["low", "normal", "high"];
export const PLATFORMS: Platform[] = ["instagram", "vk", "facebook", "youtube_shorts", "other"];
export const POST_STATUSES: PostStatus[] = ["idea", "draft", "scheduled", "posted"];

export interface Project {
  id: number;
  name: string;
  color: string;
  description: string;
  archived: boolean;
  position: number;
  openTaskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  name: string;
  color: string;
  description: string;
}

export interface Task {
  id: number;
  projectId: number;
  projectName: string;
  projectColor: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  /** YYYY-MM-DD */
  dueDate: string | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
}

export interface Note {
  id: number;
  projectId: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileLink {
  id: number;
  projectId: number;
  path: string;
  label: string;
  isDir: boolean;
  exists: boolean;
  createdAt: string;
}

export interface MarkCounts {
  none: number;
  use: number;
  maybe: number;
  reject: number;
}

export interface MediaPack {
  id: number;
  projectId: number;
  name: string;
  sourcePath: string;
  libraryPath: string;
  itemCount: number;
  counts: MarkCounts;
  createdAt: string;
}

export interface MediaItem {
  id: number;
  packId: number;
  fileName: string;
  path: string;
  kind: "image" | "video";
  sizeBytes: number;
  mark: Mark;
}

export interface ImportPackInput {
  projectId: number;
  sourcePath: string;
  name: string;
  trashOriginals: boolean;
}

export interface ImportResult {
  pack: MediaPack;
  copied: number;
  failed: string[];
  originalsTrashed: boolean;
}

export interface Post {
  id: number;
  projectId: number | null;
  projectName: string | null;
  projectColor: string | null;
  title: string;
  platform: Platform;
  status: PostStatus;
  /** YYYY-MM-DD, or null for an unscheduled idea */
  date: string | null;
  /** HH:MM */
  time: string | null;
  caption: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostInput {
  projectId: number | null;
  title: string;
  platform: Platform;
  status: PostStatus;
  date: string | null;
  time: string | null;
  caption: string;
}

export type SearchKind = "project" | "task" | "note" | "post" | "file";

export interface SearchResult {
  kind: SearchKind;
  id: number;
  projectId: number | null;
  title: string;
  snippet: string;
}

export interface Settings {
  theme?: Theme;
  accent?: Accent;
  libraryDir: string;
}
