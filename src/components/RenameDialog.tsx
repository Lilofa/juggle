import { useState } from "react";
import { t } from "../i18n/en";
import { errorMessage } from "../lib/errors";
import { ErrorText } from "./ErrorText";
import { Modal } from "./Modal";

/** Small dialog with one text field. */
export function RenameDialog({
  title,
  initial,
  onSave,
  onClose,
}: {
  title: string;
  initial: string;
  onSave: (value: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await onSave(value);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
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
          <button className="button primary" onClick={save} disabled={!value.trim()}>
            {t.common.save}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)} />
      </form>
      <ErrorText error={error} />
    </Modal>
  );
}
