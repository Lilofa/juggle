//! Commands for media packs: import, sort, preview, export.

use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_opener::OpenerExt;

use super::{allow_asset_dir, state};
use crate::db::{self, projects, settings};
use crate::error::{AppError, AppResult};
use crate::media;
use crate::models::{ImportPackInput, ImportResult, MediaItem, MediaPack};
use crate::state::AppState;

#[derive(Clone, Serialize)]
struct ImportProgress {
    done: usize,
    total: usize,
}

#[tauri::command]
pub fn list_media_packs(state: State<AppState>, project_id: i64) -> AppResult<Vec<MediaPack>> {
    db::media::list_packs(&state.db(), project_id)
}

#[tauri::command]
pub fn get_media_pack(state: State<AppState>, id: i64) -> AppResult<MediaPack> {
    db::media::get_pack(&state.db(), id)
}

#[tauri::command]
pub fn list_media_items(state: State<AppState>, pack_id: i64) -> AppResult<Vec<MediaItem>> {
    db::media::list_items(&state.db(), pack_id)
}

#[tauri::command]
pub fn set_media_mark(state: State<AppState>, ids: Vec<i64>, mark: String) -> AppResult<()> {
    db::media::set_mark(&state.db(), &ids, &mark)
}

#[tauri::command]
pub fn rename_media_pack(state: State<AppState>, id: i64, name: String) -> AppResult<MediaPack> {
    db::media::rename_pack(&state.db(), id, &name)
}

/// Removes the pack from the app. The files stay in the Library folder.
#[tauri::command]
pub fn forget_media_pack(state: State<AppState>, id: i64) -> AppResult<()> {
    let item_ids = {
        let conn = state.db();
        let ids = db::media::item_ids_for_packs(&conn, &[id])?;
        db::media::forget_pack(&conn, id)?;
        ids
    };
    state.forget_thumbnails(&item_ids);
    Ok(())
}

/// Copies a folder of photos and videos into the Library. Sends `media-import-progress` events.
#[tauri::command]
pub async fn import_media_pack(app: AppHandle, input: ImportPackInput) -> AppResult<ImportResult> {
    tauri::async_runtime::spawn_blocking(move || import_blocking(&app, input))
        .await
        .map_err(|e| AppError::invalid(e.to_string()))?
}

fn import_blocking(app: &AppHandle, input: ImportPackInput) -> AppResult<ImportResult> {
    let state = state(app);
    let source = PathBuf::from(&input.source_path);
    if !source.is_dir() {
        return Err(AppError::invalid("Please pick a folder"));
    }
    let (project, library) = {
        let conn = state.db();
        (
            projects::get(&conn, input.project_id)?,
            state.library_dir(&conn)?,
        )
    };
    std::fs::create_dir_all(&library)?;
    if media::is_inside(&source, &library) {
        return Err(AppError::invalid(
            "This folder is already inside the Juggle Library. Pick the original folder instead.",
        ));
    }
    let files = media::collect_media_files(&source)?;
    if files.is_empty() {
        return Err(AppError::invalid(
            "No photos or videos found in this folder (PNG, JPG, JPEG, WEBP, MP4, MOV).",
        ));
    }

    let name = match input.name.trim() {
        "" => source
            .file_name()
            .map_or("Pack".into(), |n| n.to_string_lossy().into_owned()),
        custom => custom.to_string(),
    };
    let pack_dir = media::create_unique_dir(&library.join(media::safe_name(&project.name)), &name)?;
    allow_asset_dir(app, &pack_dir)?;

    let (copied, mut failed) = media::copy_all(&files, &pack_dir, |done, total| {
        let _ = app.emit("media-import-progress", ImportProgress { done, total });
    });

    let pack_id = {
        let conn = state.db();
        let tx = conn.unchecked_transaction()?;
        let id = db::media::insert_pack(
            &tx,
            project.id,
            &name,
            &input.source_path,
            &pack_dir.to_string_lossy(),
        )?;
        let rows: Vec<(String, String, u64)> = copied
            .iter()
            .map(|c| (c.file_name.clone(), c.kind.to_string(), c.size))
            .collect();
        db::media::insert_items(&tx, id, &rows)?;
        tx.commit()?;
        id
    };

    // Originals go to the Recycle Bin only when every file was copied and saved.
    let mut originals_trashed = false;
    if input.trash_originals {
        if failed.is_empty() {
            let originals: Vec<PathBuf> = copied.iter().map(|c| c.original.clone()).collect();
            match media::trash_files(&originals) {
                Ok(()) => originals_trashed = true,
                Err(e) => failed.push(format!("Originals were kept: {e}")),
            }
        } else {
            failed.push("Originals were kept because some files could not be copied.".into());
        }
    }

    let pack = db::media::get_pack(&state.db(), pack_id)?;
    Ok(ImportResult {
        pack,
        copied: copied.len(),
        failed,
        originals_trashed,
    })
}

/// Returns the path of a small preview for an image (made on first request, then cached).
#[tauri::command]
pub async fn media_thumbnail(app: AppHandle, item_id: i64) -> AppResult<String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = state(&app);
        let item = db::media::get_item(&state.db(), item_id)?;
        if item.kind != "image" {
            return Err(AppError::invalid("Thumbnails are only made for images"));
        }
        let dest = state.thumbnail_path(item_id);
        if !dest.exists() {
            media::make_thumbnail(Path::new(&item.path), &dest)?;
        }
        Ok(dest.to_string_lossy().into_owned())
    })
    .await
    .map_err(|e| AppError::invalid(e.to_string()))?
}

/// Copies all items with one mark (usually "use") to a folder the user picked.
#[tauri::command]
pub async fn export_media(
    app: AppHandle,
    pack_id: i64,
    mark: String,
    dest_dir: String,
) -> AppResult<usize> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = state(&app);
        crate::validate::one_of("mark", &mark, db::media::MARKS)?;
        let items = db::media::list_items_with_mark(&state.db(), pack_id, &mark)?;
        let files: Vec<PathBuf> = items.iter().map(|i| PathBuf::from(&i.path)).collect();
        media::export(&files, Path::new(&dest_dir))
    })
    .await
    .map_err(|e| AppError::invalid(e.to_string()))?
}

#[tauri::command]
pub fn open_media_item(app: AppHandle, state: State<AppState>, id: i64) -> AppResult<()> {
    let item = db::media::get_item(&state.db(), id)?;
    app.opener()
        .open_path(item.path, None::<&str>)
        .map_err(|e| AppError::invalid(e.to_string()))
}

#[tauri::command]
pub fn reveal_media_pack(app: AppHandle, state: State<AppState>, id: i64) -> AppResult<()> {
    let pack = db::media::get_pack(&state.db(), id)?;
    app.opener()
        .reveal_item_in_dir(pack.library_path)
        .map_err(|e| AppError::invalid(e.to_string()))
}

/// Changes where new packs are saved. Existing packs stay where they are.
#[tauri::command]
pub fn set_library_dir(app: AppHandle, state: State<AppState>, path: String) -> AppResult<()> {
    let dir = PathBuf::from(&path);
    if !dir.is_absolute() {
        return Err(AppError::invalid("Please pick a full folder path"));
    }
    std::fs::create_dir_all(&dir)?;
    settings::set(&state.db(), settings::LIBRARY_DIR, &path)?;
    allow_asset_dir(&app, &dir)
}
