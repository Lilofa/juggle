import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSettings, setSetting } from "../api/settings";
import type { Accent, Theme } from "../api/types";
import { DEFAULT_ACCENT, DEFAULT_THEME, resolveTheme } from "./presets";

interface ThemeContextValue {
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const darkQuery = () => window.matchMedia?.("(prefers-color-scheme: dark)");

/** Loads the saved theme, applies it to <html>, and saves changes. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [accent, setAccentState] = useState<Accent>(DEFAULT_ACCENT);
  const [systemDark, setSystemDark] = useState(() => darkQuery()?.matches ?? false);

  useEffect(() => {
    getSettings()
      .then((s) => {
        if (s.theme) setThemeState(s.theme);
        if (s.accent) setAccentState(s.accent);
      })
      .catch(() => {
        // Keep the defaults if settings cannot be read.
      });
    const query = darkQuery();
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query?.addEventListener("change", onChange);
    return () => query?.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolveTheme(theme, systemDark);
    root.dataset.accent = accent;
  }, [theme, accent, systemDark]);

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value);
    void setSetting("theme", value);
  }, []);
  const setAccent = useCallback((value: Accent) => {
    setAccentState(value);
    void setSetting("accent", value);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
