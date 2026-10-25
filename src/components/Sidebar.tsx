import { useState } from "react";
import { NavLink } from "react-router-dom";
import { CalendarDays, Plus, Search, Settings, Sun } from "lucide-react";
import { listProjects } from "../api/projects";
import { ProjectDialog } from "../features/projects/ProjectDialog";
import { t } from "../i18n/en";
import { useData } from "../lib/useData";
import type { Project } from "../api/types";

export function Sidebar({ onSearch }: { onSearch: () => void }) {
  const { data: projects = [] } = useData(listProjects, []);
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const isMac = navigator.userAgent.includes("Mac");

  return (
    <nav className="sidebar" aria-label="Main">
      <div className="sidebar-logo">
        <img src="/logo.svg" alt="" width={22} height={22} />
        {t.app.name}
      </div>
      <button className="sidebar-search" onClick={onSearch}>
        <Search size={15} />
        {t.nav.search}
        <kbd className="muted">{isMac ? "⌘K" : "Ctrl+K"}</kbd>
      </button>
      <NavLink to="/" end className="nav-link">
        <Sun size={16} /> {t.nav.today}
      </NavLink>
      <NavLink to="/calendar" className="nav-link">
        <CalendarDays size={16} /> {t.nav.calendar}
      </NavLink>

      <div className="sidebar-section">
        <h3>{t.nav.projects}</h3>
        <button
          className="icon-button"
          onClick={() => setCreating(true)}
          aria-label={t.nav.newProject}
          title={t.nav.newProject}
        >
          <Plus size={16} />
        </button>
      </div>
      {active.map((p) => (
        <ProjectLink key={p.id} project={p} />
      ))}
      {archived.length > 0 && (
        <>
          <button className="archived-toggle" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "▾" : "▸"} {t.nav.archived} ({archived.length})
          </button>
          {showArchived && archived.map((p) => <ProjectLink key={p.id} project={p} />)}
        </>
      )}

      <div className="sidebar-bottom">
        <NavLink to="/settings" className="nav-link">
          <Settings size={16} /> {t.nav.settings}
        </NavLink>
      </div>
      {creating && <ProjectDialog onClose={() => setCreating(false)} />}
    </nav>
  );
}

function ProjectLink({ project }: { project: Project }) {
  return (
    <NavLink to={`/projects/${project.id}/board`} className="nav-link">
      <span className="dot" style={{ background: project.color }} />
      <span className="ellipsis">{project.name}</span>
      {project.openTaskCount > 0 && <span className="count">{project.openTaskCount}</span>}
    </NavLink>
  );
}
