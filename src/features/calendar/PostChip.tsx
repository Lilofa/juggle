import type { Post } from "../../api/types";
import { t } from "../../i18n/en";
import { PLATFORM_STYLE } from "../../lib/platforms";

export function PostChip({ post, onClick }: { post: Post; onClick: () => void }) {
  const style = PLATFORM_STYLE[post.platform];
  return (
    <button
      className={`chip ${post.status === "posted" ? "posted" : ""}`}
      style={{ ["--chip" as string]: style.color }}
      title={`${t.calendar.platforms[post.platform]} · ${t.calendar.statuses[post.status]}${post.time ? ` · ${post.time}` : ""}\n${post.title}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="tag">{style.short}</span>
      {post.time && <span className="muted">{post.time}</span>}
      <span className="ellipsis">{post.title}</span>
    </button>
  );
}
