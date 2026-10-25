import { t } from "../i18n/en";

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="error-text" role="alert">
      {t.common.errorPrefix}
      {error}
    </p>
  );
}
