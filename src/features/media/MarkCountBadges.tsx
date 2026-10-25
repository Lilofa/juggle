import type { Mark, MarkCounts } from "../../api/types";
import { t } from "../../i18n/en";

export const MARK_ORDER: Mark[] = ["use", "maybe", "reject", "none"];

export function MarkCountBadges({ counts }: { counts: MarkCounts }) {
  return (
    <div className="mark-counts">
      {MARK_ORDER.map((mark) => (
        <span key={mark} className={`badge mark-badge mark-${mark}`}>
          {t.media.marks[mark]}: {counts[mark]}
        </span>
      ))}
    </div>
  );
}
