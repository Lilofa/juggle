import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { getSettings, setLibraryDir } from "../../api/settings";
import type { Theme } from "../../api/types";
import { useToast } from "../../components/Toast";
import { t } from "../../i18n/en";
import { errorMessage } from "../../lib/errors";
import { useData } from "../../lib/useData";
import { ACCENTS } from "../../theme/presets";
import { useTheme } from "../../theme/ThemeProvider";

const THEMES: Theme[] = ["light", "dark", "system"];

export function SettingsPage() {
  const toast = useToast();
  const { theme, accent, setTheme, setAccent } = useTheme();
  const { data: settings } = useData(getSettings, []);

  const changeLibrary = async () => {
    try {
      const dir = await open({
        directory: true,
        multiple: false,
        defaultPath: settings?.libraryDir,
      });
      if (typeof dir === "string") await setLibraryDir(dir);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <div className="page">
      <h1>{t.settings.title}</h1>

      <section className="card settings-section">
        <h2>{t.settings.appearance}</h2>
        <div className="field">
          {t.settings.theme}
          <div className="segmented" role="group" aria-label={t.settings.theme}>
            {THEMES.map((value) => (
              <button key={value} aria-pressed={theme === value} onClick={() => setTheme(value)}>
                {t.settings.themes[value]}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          {t.settings.accent}
          <div className="swatches">
            {ACCENTS.map((a) => (
              <div key={a.id} className="accent-option">
                <button
                  className="swatch"
                  style={{ background: a.color }}
                  aria-pressed={accent === a.id}
                  aria-label={t.settings.accents[a.id]}
                  onClick={() => setAccent(a.id)}
                />
                {t.settings.accents[a.id]}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card settings-section">
        <h2>{t.settings.library}</h2>
        <p className="muted">{t.settings.libraryBody}</p>
        <div className="row">
          <span className="mono ellipsis">{settings?.libraryDir}</span>
          <button className="button small" onClick={changeLibrary}>
            <FolderOpen size={14} /> {t.settings.change}
          </button>
        </div>
      </section>

      <section className="card settings-section">
        <h2>{t.settings.privacy}</h2>
        <p className="muted">{t.settings.privacyBody}</p>
        <p className="small muted">
          {t.settings.version} {__APP_VERSION__}
        </p>
      </section>
    </div>
  );
}
