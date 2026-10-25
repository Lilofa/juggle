import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, Download, ExternalLink, FolderOpen, Play } from "lucide-react";
import {
  exportMedia,
  getMediaPack,
  listMediaItems,
  mediaThumbnail,
  openMediaItem,
  revealMediaPack,
  setMediaMark,
} from "../../api/media";
import type { Mark, MarkCounts, MediaItem } from "../../api/types";
import { EmptyState } from "../../components/EmptyState";
import { ErrorText } from "../../components/ErrorText";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";
import { formatBytes } from "../../lib/format";
import { useData } from "../../lib/useData";
import { MARK_ORDER, MarkCountBadges } from "./MarkCountBadges";

type Filter = Mark | "all";
const MIN_TILE = 170;
const GAP = 10;
const CAPTION = 26;
const KEY_MARKS: Record<string, Mark> = { "1": "use", "2": "maybe", "3": "reject", "0": "none" };

/** Grid for sorting one pack: mark each file Use / Maybe / Reject, then export the chosen ones. */
export function PackView() {
  const packId = Number(useParams().packId);
  const navigate = useNavigate();
  const toast = useToast();
  const { data: pack, error } = useData(() => getMediaPack(packId), [packId]);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [focus, setFocus] = useState(0);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    listMediaItems(packId)
      .then(setItems)
      .catch((e) => toast(errorMessage(e), "error"));
  }, [packId, toast]);

  const visible = useMemo(
    () => (items ?? []).filter((i) => filter === "all" || i.mark === filter),
    [items, filter],
  );
  const counts = useMemo(() => {
    const c: MarkCounts = { none: 0, use: 0, maybe: 0, reject: 0 };
    for (const item of items ?? []) c[item.mark]++;
    return c;
  }, [items]);
  const focusIndex = Math.min(focus, Math.max(visible.length - 1, 0));
  const current = visible[focusIndex];

  // ----- Grid size -----
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, [items]);
  const cols = Math.max(1, Math.floor((width + GAP) / (MIN_TILE + GAP)));
  const tileWidth = width > 0 ? (width - GAP * (cols - 1)) / cols : MIN_TILE;
  const rowHeight = tileWidth + CAPTION + GAP;
  const rowCount = Math.ceil(visible.length / cols);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 3,
  });
  useEffect(() => virtualizer.measure(), [rowHeight, virtualizer]);
  useEffect(() => {
    if (rowCount > 0) virtualizer.scrollToIndex(Math.floor(focusIndex / cols), { align: "auto" });
  }, [focusIndex, cols, rowCount, virtualizer]);

  // ----- Actions -----
  const mark = useCallback(
    (value: Mark) => {
      if (!current) return;
      const before = current.mark;
      setItems(
        (list) => list?.map((i) => (i.id === current.id ? { ...i, mark: value } : i)) ?? null,
      );
      // With a filter, the item may leave the list: the next one then takes its place.
      if (filter === "all" || filter === value)
        setFocus(Math.min(focusIndex + 1, visible.length - 1));
      setMediaMark([current.id], value).catch((e) => {
        toast(errorMessage(e), "error");
        setItems(
          (list) => list?.map((i) => (i.id === current.id ? { ...i, mark: before } : i)) ?? null,
        );
      });
    },
    [current, filter, focusIndex, visible.length, toast],
  );

  const exportUse = async () => {
    if (counts.use === 0) {
      toast(t.media.exportNothing);
      return;
    }
    try {
      const dest = await open({ directory: true, multiple: false });
      if (typeof dest !== "string") return;
      toast(t.media.exported(await exportMedia(packId, "use", dest)));
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  // ----- Keyboard -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("input, textarea, select, [role=dialog]") ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      const last = visible.length - 1;
      const move = (to: number) => {
        e.preventDefault();
        setFocus(Math.max(0, Math.min(last, to)));
      };
      if (e.key in KEY_MARKS) {
        e.preventDefault();
        mark(KEY_MARKS[e.key]!);
      } else if (e.key === "ArrowRight") move(focusIndex + 1);
      else if (e.key === "ArrowLeft") move(focusIndex - 1);
      else if (e.key === "ArrowDown") move(preview ? focusIndex + 1 : focusIndex + cols);
      else if (e.key === "ArrowUp") move(preview ? focusIndex - 1 : focusIndex - cols);
      else if (e.key === "Home") move(0);
      else if (e.key === "End") move(last);
      else if (e.key === " ") {
        e.preventDefault();
        setPreview((p) => !p);
      } else if (e.key === "Escape" && preview) setPreview(false);
      else if (e.key === "Enter" && current) void openMediaItem(current.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible.length, focusIndex, cols, preview, current, mark]);

  if (error) return <ErrorText error={error} />;
  if (!pack || !items) return null;

  return (
    <div className="stack" style={{ flex: 1, minHeight: 0 }}>
      <div className="row" style={{ flexWrap: "wrap" }}>
        <button
          className="button small"
          onClick={() => navigate(`/projects/${pack.projectId}/media`)}
        >
          <ArrowLeft size={14} /> {t.media.back}
        </button>
        <h2 className="ellipsis">{pack.name}</h2>
        <span className="muted small">{t.media.items(items.length)}</span>
        <span className="spacer" />
        <button
          className="button small"
          onClick={() => revealMediaPack(pack.id).catch((e) => toast(errorMessage(e), "error"))}
        >
          <FolderOpen size={14} /> {t.common.showInFolder}
        </button>
        <button className="button small primary" onClick={exportUse}>
          <Download size={14} /> {t.media.exportUse}
        </button>
      </div>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <div className="segmented" role="group" aria-label="Filter">
          <button aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            {t.media.filterAll} ({items.length})
          </button>
          {MARK_ORDER.map((m) => (
            <button key={m} aria-pressed={filter === m} onClick={() => setFilter(m)}>
              {t.media.marks[m]} ({counts[m]})
            </button>
          ))}
        </div>
        <span className="spacer" />
        <span className="small muted">{t.media.keysHint}</span>
      </div>

      <div ref={scrollRef} className="media-scroller" style={{ height: "calc(100vh - 260px)" }}>
        {visible.length === 0 ? (
          <EmptyState>{t.media.noItems}</EmptyState>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((row) =>
              Array.from({ length: cols }, (_, c) => {
                const index = row.index * cols + c;
                const item = visible[index];
                if (!item) return null;
                return (
                  <Tile
                    key={item.id}
                    item={item}
                    focused={index === focusIndex}
                    style={{
                      top: row.start,
                      left: c * (tileWidth + GAP),
                      width: tileWidth,
                      height: tileWidth + CAPTION,
                    }}
                    onClick={() => setFocus(index)}
                    onDoubleClick={() => {
                      setFocus(index);
                      setPreview(true);
                    }}
                  />
                );
              }),
            )}
          </div>
        )}
      </div>

      <MarkCountBadges counts={counts} />

      {preview && current && (
        <Preview
          item={current}
          position={`${focusIndex + 1} / ${visible.length}`}
          onMark={mark}
          onClose={() => setPreview(false)}
          onOpenExternal={() =>
            openMediaItem(current.id).catch((e) => toast(errorMessage(e), "error"))
          }
        />
      )}
    </div>
  );
}

/** Cached thumbnail URLs, so scrolling back does not ask Rust again. */
const thumbCache = new Map<number, string>();

function Thumb({ item }: { item: MediaItem }) {
  const [src, setSrc] = useState(() => thumbCache.get(item.id));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (item.kind !== "image" || thumbCache.has(item.id)) return;
    let alive = true;
    mediaThumbnail(item.id)
      .then((path) => {
        const url = convertFileSrc(path);
        thumbCache.set(item.id, url);
        if (alive) setSrc(url);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [item.id, item.kind]);

  if (item.kind === "video") {
    // The browser shows the first frame. Only visible tiles exist, so this stays light.
    return <video src={`${convertFileSrc(item.path)}#t=0.5`} preload="metadata" muted />;
  }
  if (failed) return <span className="small muted">?</span>;
  return src ? <img src={src} alt={item.fileName} draggable={false} /> : null;
}

function Tile({
  item,
  focused,
  style,
  onClick,
  onDoubleClick,
}: {
  item: MediaItem;
  focused: boolean;
  style: React.CSSProperties;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  return (
    <div
      className={`media-tile mark-${item.mark} ${focused ? "focused" : ""}`}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      aria-label={`${item.fileName}: ${t.media.marks[item.mark]}`}
      aria-current={focused}
    >
      <div className="media-thumb">
        <Thumb item={item} />
      </div>
      {item.kind === "video" && (
        <span className="kind">
          <Play size={10} /> MP4
        </span>
      )}
      {item.mark !== "none" && (
        <span className={`badge mark-badge mark-${item.mark} corner`}>
          {t.media.marks[item.mark]}
        </span>
      )}
      <div className="caption">
        <span className="ellipsis">{item.fileName}</span>
      </div>
    </div>
  );
}

function Preview({
  item,
  position,
  onMark,
  onClose,
  onOpenExternal,
}: {
  item: MediaItem;
  position: string;
  onMark: (mark: Mark) => void;
  onClose: () => void;
  onOpenExternal: () => void;
}) {
  const src = convertFileSrc(item.path);
  return (
    <div className="preview" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      {item.kind === "video" ? (
        <video key={item.id} src={src} controls autoPlay />
      ) : (
        <img key={item.id} src={src} alt={item.fileName} />
      )}
      <div className="bar">
        <span>{position}</span>
        <span className="ellipsis" style={{ maxWidth: 360 }}>
          {item.fileName}
        </span>
        <span className="small" style={{ opacity: 0.7 }}>
          {formatBytes(item.sizeBytes)}
        </span>
        {(["use", "maybe", "reject"] as Mark[]).map((m, i) => (
          <button
            key={m}
            className={`button small mark-${m}`}
            aria-pressed={item.mark === m}
            style={
              item.mark === m
                ? { background: "var(--mark)", color: "white", borderColor: "var(--mark)" }
                : undefined
            }
            onClick={() => onMark(m)}
          >
            {i + 1} {t.media.marks[m]}
          </button>
        ))}
        <button className="button small" onClick={onOpenExternal} title={t.media.openExternal}>
          <ExternalLink size={14} />
        </button>
        <button className="button small" onClick={onClose} title={t.media.previewClose}>
          {t.common.close}
        </button>
      </div>
    </div>
  );
}
