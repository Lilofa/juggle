import { call, mutate } from "./client";
import type { Settings } from "./types";

export const getSettings = () => call<Settings>("get_settings");
export const setSetting = (key: "theme" | "accent", value: string) =>
  call<void>("set_setting", { key, value });
export const setLibraryDir = (path: string) => mutate<void>("set_library_dir", { path });
