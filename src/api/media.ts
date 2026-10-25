import { listen } from "@tauri-apps/api/event";
import { call, mutate } from "./client";
import type { ImportPackInput, ImportResult, Mark, MediaItem, MediaPack } from "./types";

export const listMediaPacks = (projectId: number) =>
  call<MediaPack[]>("list_media_packs", { projectId });
export const getMediaPack = (id: number) => call<MediaPack>("get_media_pack", { id });
export const listMediaItems = (packId: number) => call<MediaItem[]>("list_media_items", { packId });
/** Fast path for sorting: does not reload other screens. */
export const setMediaMark = (ids: number[], mark: Mark) =>
  call<void>("set_media_mark", { ids, mark });
export const renameMediaPack = (id: number, name: string) =>
  mutate<MediaPack>("rename_media_pack", { id, name });
export const forgetMediaPack = (id: number) => mutate<void>("forget_media_pack", { id });
export const importMediaPack = (input: ImportPackInput) =>
  mutate<ImportResult>("import_media_pack", { input });
/** Path of a cached small JPEG preview for an image. */
export const mediaThumbnail = (itemId: number) => call<string>("media_thumbnail", { itemId });
export const exportMedia = (packId: number, mark: Mark, destDir: string) =>
  call<number>("export_media", { packId, mark, destDir });
export const openMediaItem = (id: number) => call<void>("open_media_item", { id });
export const revealMediaPack = (id: number) => call<void>("reveal_media_pack", { id });

export function onImportProgress(handler: (done: number, total: number) => void) {
  return listen<{ done: number; total: number }>("media-import-progress", (e) =>
    handler(e.payload.done, e.payload.total),
  );
}
