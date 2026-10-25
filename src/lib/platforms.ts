import type { Platform } from "../api/types";

/** Colour and short tag for each social platform in the calendar. */
export const PLATFORM_STYLE: Record<Platform, { color: string; short: string }> = {
  instagram: { color: "#d62976", short: "IG" },
  vk: { color: "#0077ff", short: "VK" },
  facebook: { color: "#3b5998", short: "FB" },
  youtube_shorts: { color: "#e62117", short: "YT" },
  other: { color: "#6b7280", short: "•" },
};
