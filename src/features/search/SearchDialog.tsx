import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { search } from "../../api/search";
import type { SearchResult } from "../../api/types";
import { ErrorText } from "../../components/ErrorText";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";
import { searchTarget } from "./searchTarget";

const DEBOUNCE_MS = 150;

/** Ctrl+K search over projects, tasks, notes, posts and linked files. */
export function SearchDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      search(query)
        .then((r) => {
          if (!alive) return;
          setResults(r);
          setSelected(0);
          setError(null);
        })
        .catch((e) => alive && setError(errorMessage(e)));
    }, DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const go = (r: SearchResult | undefined) => {
    if (!r) return;
    navigate(searchTarget(r));
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      go(results[selected]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal modal-wide search-box"
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.search}
      >
        <input
          type="search"
          className="search-input"
          autoFocus
          value={query}
          placeholder={t.search.placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="search-results" ref={listRef} role="listbox">
          <ErrorText error={error} />
          {query.trim() === "" && (
            <p className="small muted" style={{ padding: 8 }}>
              {t.search.hint}
            </p>
          )}
          {query.trim() !== "" && results.length === 0 && !error && (
            <p className="muted" style={{ padding: 8 }}>
              {t.search.empty}
            </p>
          )}
          {results.map((r, i) => (
            <div
              key={`${r.kind}-${r.id}`}
              role="option"
              aria-selected={i === selected}
              className={`search-result ${i === selected ? "selected" : ""}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => go(r)}
            >
              <span className="kind">{t.search.kinds[r.kind]}</span>
              <div style={{ minWidth: 0 }}>
                <div className="ellipsis" style={{ fontWeight: 550 }}>
                  {r.title}
                </div>
                {r.snippet && <div className="small muted ellipsis">{r.snippet}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
