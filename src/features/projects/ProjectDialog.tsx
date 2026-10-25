import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProject, updateProject } from "../../api/projects";
import type { Project } from "../../api/types";
import { ErrorText } from "../../components/ErrorText";
import { Modal } from "../../components/Modal";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";
import { PROJECT_COLORS } from "../../theme/presets";

/** Create a new project, or edit one when `project` is given. */
export function ProjectDialog({ project, onClose }: { project?: Project; onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0]!);
  const [description, setDescription] = useState(project?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const input = { name, color, description };
      if (project) {
        await updateProject(project.id, input);
      } else {
        const created = await createProject(input);
        navigate(`/projects/${created.id}/board`);
      }
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={project ? t.projects.dialogEdit : t.projects.dialogNew}
      onClose={onClose}
      footer={
        <>
          <button className="button" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button className="button primary" onClick={save} disabled={busy || !name.trim()}>
            {project ? t.common.save : t.common.create}
          </button>
        </>
      }
    >
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void save();
        }}
      >
        <label className="field">
          {t.projects.name}
          <input
            type="text"
            value={name}
            placeholder={t.projects.namePlaceholder}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="field">
          {t.projects.color}
          <div className="swatches">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch"
                style={{ background: c }}
                aria-label={c}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <label className="field">
          {t.projects.description}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>
        <ErrorText error={error} />
      </form>
    </Modal>
  );
}
