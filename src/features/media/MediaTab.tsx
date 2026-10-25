import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { FolderOpen, Pencil, Trash2, Upload } from "lucide-react";
import { forgetMediaPack, listMediaPacks, renameMediaPack, revealMediaPack } from "../../api/media";
import { getSettings } from "../../api/settings";
import type { MediaPack, Project } from "../../api/types";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { ErrorText } from "../../components/ErrorText";
import { RenameDialog } from "../../components/RenameDialog";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";
import { useData } from "../../lib/useData";
import { ImportDialog } from "./ImportDialog";
import { MarkCountBadges } from "./MarkCountBadges";

export function MediaTab({ project }: { project: Project }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: packs, error } = useData(() => listMediaPacks(project.id), [project.id]);
  const { data: settings } = useData(getSettings, []);
  const [importing, setImporting] = useState(false);
  const [renaming, setRenaming] = useState<MediaPack | null>(null);
  const [forgetting, setForgetting] = useState<MediaPack | null>(null);

  if (error) return <ErrorText error={error} />;
  if (!packs) return null;

  const stop = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="stack">
      <div className="row">
        <button className="button primary" onClick={() => setImporting(true)}>
          <Upload size={15} /> {t.media.importPack}
        </button>
        {settings && (
          <span className="small muted ellipsis" title={settings.libraryDir}>
            {t.media.libraryHint} <span className="mono">{settings.libraryDir}</span>
          </span>
        )}
      </div>
      {packs.length === 0 ? (
        <EmptyState>{t.media.empty}</EmptyState>
      ) : (
        <div className="pack-grid">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="card pack-card"
              role="link"
              tabIndex={0}
              onClick={() => navigate(String(pack.id))}
              onKeyDown={(e) => e.key === "Enter" && navigate(String(pack.id))}
            >
              <div className="row">
                <h2 className="ellipsis">{pack.name}</h2>
                <span className="spacer" />
                <button
                  className="icon-button"
                  onClick={(e) => stop(e, () => setRenaming(pack))}
                  title={t.common.rename}
                  aria-label={t.common.rename}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button"
                  onClick={(e) =>
                    stop(e, () =>
                      revealMediaPack(pack.id).catch((err) => toast(errorMessage(err), "error")),
                    )
                  }
                  title={t.common.showInFolder}
                  aria-label={t.common.showInFolder}
                >
                  <FolderOpen size={15} />
                </button>
                <button
                  className="icon-button"
                  onClick={(e) => stop(e, () => setForgetting(pack))}
                  title={t.media.forget}
                  aria-label={t.media.forget}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="small muted">
                {t.media.items(pack.itemCount)} · {format(parseISO(pack.createdAt), "d MMM yyyy")}
              </div>
              <MarkCountBadges counts={pack.counts} />
            </div>
          ))}
        </div>
      )}
      {importing && (
        <ImportDialog
          projectId={project.id}
          onClose={() => setImporting(false)}
          onOpenPack={(id) => navigate(String(id))}
        />
      )}
      {renaming && (
        <RenameDialog
          title={t.common.rename}
          initial={renaming.name}
          onClose={() => setRenaming(null)}
          onSave={(name) => renameMediaPack(renaming.id, name)}
        />
      )}
      {forgetting && (
        <ConfirmDialog
          title={t.media.forgetTitle}
          body={t.media.forgetBody}
          confirmLabel={t.media.forget}
          onClose={() => setForgetting(null)}
          onConfirm={() => forgetMediaPack(forgetting.id)}
        />
      )}
    </div>
  );
}
