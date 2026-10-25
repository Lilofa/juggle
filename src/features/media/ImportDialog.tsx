import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { importMediaPack, onImportProgress } from "../../api/media";
import type { ImportResult } from "../../api/types";
import { ErrorText } from "../../components/ErrorText";
import { Modal } from "../../components/Modal";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";

interface ImportDialogProps {
  projectId: number;
  onClose: () => void;
  onOpenPack: (packId: number) => void;
}

/** Pick a folder → copy every photo and video into the Library, with a progress bar. */
export function ImportDialog({ projectId, onClose, onOpenPack }: ImportDialogProps) {
  const [source, setSource] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [trashOriginals, setTrashOriginals] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = progress !== null && result === null && error === null;

  useEffect(() => {
    const unlisten = onImportProgress((done, total) => setProgress({ done, total }));
    return () => {
      void unlisten.then((stop) => stop());
    };
  }, []);

  const pick = async () => {
    const picked = await open({ directory: true, multiple: false });
    if (typeof picked === "string") {
      setSource(picked);
      setName(picked.split(/[\\/]/).filter(Boolean).pop() ?? "");
    }
  };

  const start = async () => {
    if (!source) return;
    setError(null);
    setProgress({ done: 0, total: 0 });
    try {
      setResult(await importMediaPack({ projectId, sourcePath: source, name, trashOriginals }));
    } catch (e) {
      setError(errorMessage(e));
      setProgress(null);
    }
  };

  // While copying, the dialog cannot be closed by accident.
  const close = () => {
    if (!running) onClose();
  };

  const footer = result ? (
    <>
      <button className="button" onClick={onClose}>
        {t.common.close}
      </button>
      <button className="button primary" onClick={() => onOpenPack(result.pack.id)}>
        {t.media.import.openPack}
      </button>
    </>
  ) : (
    <>
      <button className="button" onClick={close} disabled={running}>
        {t.common.cancel}
      </button>
      <button className="button primary" onClick={start} disabled={!source || running}>
        {t.media.import.start}
      </button>
    </>
  );

  return (
    <Modal title={t.media.import.title} onClose={close} footer={footer}>
      {result ? (
        <div className="stack">
          <p>{t.media.import.done(result.copied)}</p>
          {result.originalsTrashed && <p>{t.media.import.trashed}</p>}
          {result.failed.length > 0 && (
            <div>
              <p className="error-text">{t.media.import.failed}</p>
              <ul className="small mono">
                {result.failed.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="stack">
          <div className="field">
            {t.media.import.folder}
            <div className="row">
              <button className="button" onClick={pick} disabled={running}>
                <FolderOpen size={15} /> {t.media.import.pickFolder}
              </button>
              <span className="ellipsis mono muted" title={source ?? undefined}>
                {source ?? t.media.import.noFolder}
              </span>
            </div>
            <span className="small muted">{t.media.import.supported}</span>
          </div>
          <label className="field">
            {t.media.import.name}
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={running}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={trashOriginals}
              onChange={(e) => setTrashOriginals(e.target.checked)}
              disabled={running}
            />
            <span>
              {t.media.import.trash}
              <br />
              <span className="small muted">{t.media.import.trashHint}</span>
            </span>
          </label>
          {progress && (
            <div className="stack" style={{ gap: 4 }}>
              <div className="progress">
                <div
                  style={{
                    width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="small muted">
                {t.media.import.working(progress.done, progress.total)}
              </span>
            </div>
          )}
          <ErrorText error={error} />
        </div>
      )}
    </Modal>
  );
}
