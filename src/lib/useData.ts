import { useCallback, useEffect, useRef, useState } from "react";
import { onDataChanged } from "../api/client";

export interface DataState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads data with `load()` and reloads it when `deps` change or when any
 * `mutate()` call changes data somewhere in the app.
 */
export function useData<T>(load: () => Promise<T>, deps: unknown[]): DataState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => onDataChanged(reload), [reload]);

  useEffect(() => {
    let cancelled = false;
    loadRef
      .current()
      .then((value) => {
        if (cancelled) return;
        setData(value);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  return { data, error, loading: data === undefined && error === null, reload };
}
