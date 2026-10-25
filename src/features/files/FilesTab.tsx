import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { ExternalLink, File, Folder, FolderOpen, Link2Off, Pencil } from "lucide-react";
import {
  addFileLinks,
  listFileLinks,
  openFileLink,
  removeFileLink,
  renameFileLink,
  revealFileLink,
} from "../../api/files";
import type { FileLink } from "../../api/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { ErrorText } from "../../components/ErrorText";
import { RenameDialog } from "../../components/RenameDialog";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";
import { useData } from "../../lib/useData";

export function FilesTab({ projectId }: { projectId: number }) {
  const toast = useToast();
  const { data: links, error } = useData(() => listFileLinks(projectId), [projectId]);
  const [removing, setRemoving] = useState<FileLink | null>(null);
  const [renaming, setRenaming] = useState<FileLink | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const link = (directory: boolean) =>
    run(async () => {
      const picked = await open({ directory, multiple: true });
      if (!picked) return;
      const paths = Array.isArray(picked) ? picked : [picked];
      const added = await addFileLinks(projectId, paths);
      toast(t.files.added(added));
    });

  if (error) return <ErrorText error={error} />;
  if (!links) return null;

  return (
    <div className="stack">
      <div className="row">
        <button className="button primary" onClick={() => link(false)}>
          <File size={15} /> {t.files.linkFiles}
        </button>
        <button className="button" onClick={() => link(true)}>
          <Folder size={15} /> {t.files.linkFolder}
        </button>
        <span className="small muted">{t.files.hint}</span>
      </div>
      {links.length === 0 ? (
        <EmptyState>{t.files.empty}</EmptyState>
      ) : (
        <div className="card list">
          {links.map((l) => (
            <div
              key={l.id}
              className="list-row clickable"
              onDoubleClick={() => l.exists && run(() => openFileLink(l.id))}
            >
              {l.isDir ? <Folder size={18} /> : <File size={18} />}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row">
                  <span className="ellipsis" style={{ fontWeight: 550 }}>
                    {l.label}
                  </span>
                  {!l.exists && (
                    <span className="badge danger" title={t.files.missingHint}>
                      {t.files.missing}
                    </span>
                  )}
                </div>
                <div className="ellipsis mono muted" title={l.path}>
                  {l.path}
                </div>
              </div>
              <div className="actions">
                <button
                  className="icon-button"
                  disabled={!l.exists}
                  onClick={() => run(() => openFileLink(l.id))}
                  title={t.common.open}
                  aria-label={t.common.open}
                >
                  <ExternalLink size={16} />
                </button>
                <button
                  className="icon-button"
                  disabled={!l.exists}
                  onClick={() => run(() => revealFileLink(l.id))}
                  title={t.common.showInFolder}
                  aria-label={t.common.showInFolder}
                >
                  <FolderOpen size={16} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => setRenaming(l)}
                  title={t.common.rename}
                  aria-label={t.common.rename}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => setRemoving(l)}
                  title={t.files.removeLink}
                  aria-label={t.files.removeLink}
                >
                  <Link2Off size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {removing && (
        <ConfirmDialog
          title={t.files.removeTitle}
          body={t.files.removeBody}
          confirmLabel={t.files.removeLink}
          onClose={() => setRemoving(null)}
          onConfirm={() => removeFileLink(removing.id)}
        />
      )}
      {renaming && (
        <RenameDialog
          title={t.common.rename}
          initial={renaming.label}
          onClose={() => setRenaming(null)}
          onSave={(label) => renameFileLink(renaming.id, label)}
        />
      )}
    </div>
  );
}
