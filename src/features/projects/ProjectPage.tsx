import { useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  FileText,
  Folder,
  Images,
  KanbanSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { deleteProject, listProjects, setProjectArchived } from "../../api/projects";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { ErrorText } from "../../components/ErrorText";
import { t } from "../../i18n/en";
import { useData } from "../../lib/useData";
import { FilesTab } from "../files/FilesTab";
import { MediaTab } from "../media/MediaTab";
import { PackView } from "../media/PackView";
import { NotesTab } from "../notes/NotesTab";
import { TasksTab } from "../tasks/TasksTab";
import { ProjectDialog } from "./ProjectDialog";

export function ProjectPage() {
  const projectId = Number(useParams().projectId);
  const navigate = useNavigate();
  const { data: projects, error } = useData(listProjects, []);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const project = projects?.find((p) => p.id === projectId);
  if (error)
    return (
      <div className="page">
        <ErrorText error={error} />
      </div>
    );
  if (!projects) return null;
  if (!project)
    return (
      <div className="page">
        <EmptyState>{t.projects.notFound}</EmptyState>
      </div>
    );

  // Always use full paths: relative links inside this "/*" route would stack up.
  const base = `/projects/${project.id}`;
  const tab = (to: string, label: string, Icon: typeof FileText) => (
    <NavLink to={to} className="tab">
      <Icon size={15} /> {label}
    </NavLink>
  );

  return (
    <div className="page">
      <div className="page-header">
        <span className="dot" style={{ background: project.color, width: 14, height: 14 }} />
        <h1>{project.name}</h1>
        {project.archived && <span className="badge">{t.projects.archivedBadge}</span>}
        <span className="spacer" />
        <button
          className="icon-button"
          onClick={() => setEditing(true)}
          title={t.common.edit}
          aria-label={t.common.edit}
        >
          <Pencil size={16} />
        </button>
        <button
          className="icon-button"
          onClick={() => setProjectArchived(project.id, !project.archived)}
          title={project.archived ? t.projects.unarchive : t.projects.archive}
          aria-label={project.archived ? t.projects.unarchive : t.projects.archive}
        >
          {project.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
        </button>
        <button
          className="icon-button"
          onClick={() => setDeleting(true)}
          title={t.common.delete}
          aria-label={t.common.delete}
        >
          <Trash2 size={16} />
        </button>
      </div>
      {project.description && <p className="muted">{project.description}</p>}

      <div className="tabs">
        {tab(`${base}/board`, t.projects.tabs.board, KanbanSquare)}
        {tab(`${base}/notes`, t.projects.tabs.notes, FileText)}
        {tab(`${base}/files`, t.projects.tabs.files, Folder)}
        {tab(`${base}/media`, t.projects.tabs.media, Images)}
      </div>

      <Routes>
        <Route path="board" element={<TasksTab key={project.id} projectId={project.id} />} />
        <Route path="notes" element={<NotesTab key={project.id} projectId={project.id} />} />
        <Route path="files" element={<FilesTab key={project.id} projectId={project.id} />} />
        <Route path="media" element={<MediaTab key={project.id} project={project} />} />
        <Route path="media/:packId" element={<PackView />} />
        <Route path="*" element={<Navigate to={`${base}/board`} replace />} />
      </Routes>

      {editing && <ProjectDialog project={project} onClose={() => setEditing(false)} />}
      {deleting && (
        <ConfirmDialog
          title={t.projects.deleteTitle}
          body={t.projects.deleteBody}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await deleteProject(project.id);
            navigate("/");
          }}
        />
      )}
    </div>
  );
}
