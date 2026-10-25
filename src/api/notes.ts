import { call, mutate } from "./client";
import type { Note } from "./types";

export const listNotes = (projectId: number) => call<Note[]>("list_notes", { projectId });
export const createNote = (projectId: number, title: string) =>
  mutate<Note>("create_note", { projectId, title });
/** Autosave: does not reload other screens on every key press. */
export const updateNote = (id: number, title: string, body: string) =>
  call<Note>("update_note", { id, title, body });
export const deleteNote = (id: number) => mutate<void>("delete_note", { id });
