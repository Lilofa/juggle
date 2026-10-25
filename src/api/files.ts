import { call, mutate } from "./client";
import type { FileLink } from "./types";

export const listFileLinks = (projectId: number) =>
  call<FileLink[]>("list_file_links", { projectId });
export const addFileLinks = (projectId: number, paths: string[]) =>
  mutate<number>("add_file_links", { projectId, paths });
export const renameFileLink = (id: number, label: string) =>
  mutate<FileLink>("rename_file_link", { id, label });
export const removeFileLink = (id: number) => mutate<void>("remove_file_link", { id });
export const openFileLink = (id: number) => call<void>("open_file_link", { id });
export const revealFileLink = (id: number) => call<void>("reveal_file_link", { id });
