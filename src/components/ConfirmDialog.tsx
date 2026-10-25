import { useState } from "react";
import { t } from "../i18n/en";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

/** Asks "are you sure?" before a destructive action. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="button" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button className="button danger" onClick={confirm} disabled={busy}>
            {confirmLabel ?? t.common.delete}
          </button>
        </>
      }
    >
      <p>{body}</p>
    </Modal>
  );
}
