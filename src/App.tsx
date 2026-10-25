import { useEffect, useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { ToastProvider } from "./components/Toast";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { ProjectPage } from "./features/projects/ProjectPage";
import { SearchDialog } from "./features/search/SearchDialog";
import { SettingsPage } from "./features/settings/SettingsPage";
import { TodayPage } from "./features/today/TodayPage";
import { ThemeProvider } from "./theme/ThemeProvider";

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K (Cmd+K on Mac) opens search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <HashRouter>
          <div className="app">
            <Sidebar onSearch={() => setSearchOpen(true)} />
            <main className="main">
              <Routes>
                <Route path="/" element={<TodayPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/projects/:projectId/*" element={<ProjectPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}
        </HashRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
