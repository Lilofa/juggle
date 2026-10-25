import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { createNote, deleteNote, listNotes, updateNote } from "../../api/notes";
import type { Note } from "../../api/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { ErrorText } from "../../components/ErrorText";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";
import { useData } from "../../lib/useData";

const AUTOSAVE_MS = 600;

export function NotesTab({ projectId }: { projectId: number }) {
  const toast = useToast();
  const { data: notes, error } = useData(() => listNotes(projectId), [projectId]);
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get("note")) || notes?.[0]?.id;
  const selected = notes?.find((n) => n.id === selectedId);
  const select = (id: number) => setParams({ note: String(id) }, { replace: true });

  const add = async () => {
    try {
      const note = await createNote(projectId, "");
      select(note.id);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  if (error) return <ErrorText error={error} />;
  if (!notes) return null;

  return (
    <div className="notes">
      <div className="card notes-list">
        <div className="list-row">
          <button className="button small primary" onClick={add}>
            <Plus size={14} /> {t.notes.newNote}
          </button>
        </div>
        {notes.length === 0 && <EmptyState>{t.notes.empty}</EmptyState>}
        {notes.map((note) => (
          <div
            key={note.id}
            className={`note-item ${note.id === selected?.id ? "active" : ""}`}
            onClick={() => select(note.id)}
          >
            <div className="ellipsis" style={{ fontWeight: 550 }}>
              {note.title || t.notes.untitled}
            </div>
            <div className="small muted">
              {formatDistanceToNow(parseISO(note.updatedAt), { addSuffix: true })}
            </div>
          </div>
        ))}
      </div>
      {selected ? (
        <NoteEditor key={selected.id} note={selected} />
      ) : (
        <div className="card">
          <EmptyState>{t.notes.pick}</EmptyState>
        </div>
      )}
    </div>
  );
}

function NoteEditor({ note }: { note: Note }) {
  const toast = useToast();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [mode, setMode] = useState<"edit" | "preview">(note.body ? "preview" : "edit");
  const [status, setStatus] = useState<"saved" | "saving">("saved");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const latest = useRef({ title, body });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = async () => {
    try {
      await updateNote(note.id, latest.current.title, latest.current.body);
      setStatus("saved");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  // Save after a short pause in typing.
  const change = (next: { title?: string; body?: string }) => {
    if (next.title !== undefined) setTitle(next.title);
    if (next.body !== undefined) setBody(next.body);
    latest.current = { ...latest.current, ...next };
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(save, AUTOSAVE_MS);
  };

  // Save right away when leaving the note, so nothing is lost.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void updateNote(note.id, latest.current.title, latest.current.body);
      }
    },
    [note.id],
  );

  return (
    <div className="card note-editor">
      <div className="row">
        <input
          type="text"
          className="title-input"
          value={title}
          placeholder={t.notes.titlePlaceholder}
          onChange={(e) => change({ title: e.target.value })}
        />
        <span className="small muted" aria-live="polite">
          {status === "saving" ? t.notes.saving : t.notes.saved}
        </span>
        <div className="segmented" role="group">
          <button aria-pressed={mode === "edit"} onClick={() => setMode("edit")}>
            {t.notes.edit}
          </button>
          <button aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>
            {t.notes.preview}
          </button>
        </div>
        <button
          className="icon-button"
          onClick={() => setConfirmDelete(true)}
          aria-label={t.common.delete}
          title={t.common.delete}
        >
          <Trash2 size={16} />
        </button>
      </div>
      {mode === "edit" ? (
        <textarea
          value={body}
          placeholder={t.notes.bodyPlaceholder}
          onChange={(e) => change({ body: e.target.value })}
        />
      ) : (
        <div className="markdown" onDoubleClick={() => setMode("edit")}>
          {body.trim() ? (
            <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
          ) : (
            <p className="muted">{t.notes.bodyPlaceholder}</p>
          )}
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={t.notes.deleteTitle}
          body={t.tasks.deleteBody}
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            clearTimeout(timer.current);
            timer.current = undefined;
            await deleteNote(note.id);
          }}
        />
      )}
    </div>
  );
}
