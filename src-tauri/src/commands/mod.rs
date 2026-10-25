//! Functions the UI can call with `invoke`. They stay thin: checks and work live in `db` and `media`.

pub mod data;
pub mod media;

use tauri::{AppHandle, Manager};

use crate::error::{AppError, AppResult};
use crate::state::AppState;

/// Lets the UI show local files from this folder (photos, videos, thumbnails).
pub fn allow_asset_dir(app: &AppHandle, dir: &std::path::Path) -> AppResult<()> {
    app.asset_protocol_scope()
        .allow_directory(dir, true)
        .map_err(|e| AppError::invalid(e.to_string()))
}

pub fn state(app: &AppHandle) -> tauri::State<'_, AppState> {
    app.state::<AppState>()
}
