import type { Accent, Theme } from "../api/types";

export const ACCENTS: { id: Accent; color: string }[] = [
  { id: "ocean", color: "#2f6fed" },
  { id: "forest", color: "#1f9d55" },
  { id: "sunset", color: "#f2711c" },
  { id: "grape", color: "#7c4ddb" },
  { id: "rose", color: "#e0245e" },
  { id: "graphite", color: "#4b5563" },
];

/** Colours offered for projects. */
export const PROJECT_COLORS = [
  "#2f6fed",
  "#1f9d55",
  "#f2711c",
  "#7c4ddb",
  "#e0245e",
  "#0ea5a4",
  "#d4a106",
  "#8b5e3c",
  "#4b5563",
  "#ec4899",
];

export const DEFAULT_THEME: Theme = "system";
export const DEFAULT_ACCENT: Accent = "ocean";

/** "system" becomes "light" or "dark" using the computer's setting. */
export function resolveTheme(theme: Theme, systemPrefersDark: boolean): "light" | "dark" {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}
