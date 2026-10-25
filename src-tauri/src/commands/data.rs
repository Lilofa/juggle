//! Commands for projects, tasks, notes, file links, posts, search and settings.

use std::collections::HashMap;

use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::db::{self, files, notes, posts, projects, search as search_db, settings, tasks};
use crate::error::{AppError, AppResult};
use crate::models::*;
use crate::state::AppState;

// ---- Projects ----

#[tauri::command]
pub fn list_projects(state: State<AppState>) -> AppResult<Vec<Project>> {
    projects::list(&state.db())
}

#[tauri::command]
pub fn create_project(state: State<AppState>, input: ProjectInput) -> AppResult<Project> {
    projects::create(&state.db(), &input)
}

#[tauri::command]
pub fn update_project(state: State<AppState>, id: i64, input: ProjectInput) -> AppResult<Project> {
    projects::update(&state.db(), id, &input)
}

#[tauri::command]
pub fn set_project_archived(state: State<AppState>, id: i64, archived: bool) -> AppResult<Project> {
    projects::set_archived(&state.db(), id, archived)
}

/// Deletes the project's data in the app. Files on disk are kept.
#[tauri::command]
pub fn delete_project(state: State<AppState>, id: i64) -> AppResult<()> {
    let item_ids = {
        let conn = state.db();
        let packs = db::media::pack_ids_for_project(&conn, id)?;
        let item_ids = db::media::item_ids_for_packs(&conn, &packs)?;
        projects::delete(&conn, id)?;
        item_ids
    };
    state.forget_thumbnails(&item_ids);
    Ok(())
}

// ---- Tasks ----

#[tauri::command]
pub fn list_tasks(state: State<AppState>, project_id: i64) -> AppResult<Vec<Task>> {
    tasks::list_for_project(&state.db(), project_id)
}

#[tauri::command]
pub fn list_open_tasks(state: State<AppState>) -> AppResult<Vec<Task>> {
    tasks::list_open(&state.db())
}

#[tauri::command]
pub fn list_tasks_due_between(
    state: State<AppState>,
    from: String,
    to: String,
) -> AppResult<Vec<Task>> {
    tasks::list_due_between(&state.db(), &from, &to)
}

#[tauri::command]
pub fn create_task(state: State<AppState>, project_id: i64, input: TaskInput) -> AppResult<Task> {
    tasks::create(&state.db(), project_id, &input)
}

#[tauri::command]
pub fn update_task(state: State<AppState>, id: i64, input: TaskInput) -> AppResult<Task> {
    tasks::update(&state.db(), id, &input)
}

#[tauri::command]
pub fn reorder_tasks(
    state: State<AppState>,
    project_id: i64,
    status: String,
    ordered_ids: Vec<i64>,
) -> AppResult<()> {
    tasks::reorder(&state.db(), project_id, &status, &ordered_ids)
}

#[tauri::command]
pub fn delete_task(state: State<AppState>, id: i64) -> AppResult<()> {
    tasks::delete(&state.db(), id)
}

// ---- Notes ----

#[tauri::command]
pub fn list_notes(state: State<AppState>, project_id: i64) -> AppResult<Vec<Note>> {
    notes::list(&state.db(), project_id)
}

#[tauri::command]
pub fn create_note(state: State<AppState>, project_id: i64, title: String) -> AppResult<Note> {
    notes::create(&state.db(), project_id, &title)
}

#[tauri::command]
pub fn update_note(
    state: State<AppState>,
    id: i64,
    title: String,
    body: String,
) -> AppResult<Note> {
    notes::update(&state.db(), id, &title, &body)
}

#[tauri::command]
pub fn delete_note(state: State<AppState>, id: i64) -> AppResult<()> {
    notes::delete(&state.db(), id)
}

// ---- File links ----

#[tauri::command]
pub fn list_file_links(state: State<AppState>, project_id: i64) -> AppResult<Vec<FileLink>> {
    files::list(&state.db(), project_id)
}

#[tauri::command]
pub fn add_file_links(
    state: State<AppState>,
    project_id: i64,
    paths: Vec<String>,
) -> AppResult<usize> {
    files::add(&state.db(), project_id, &paths)
}

#[tauri::command]
pub fn rename_file_link(state: State<AppState>, id: i64, label: String) -> AppResult<FileLink> {
    files::rename(&state.db(), id, &label)
}

#[tauri::command]
pub fn remove_file_link(state: State<AppState>, id: i64) -> AppResult<()> {
    files::remove(&state.db(), id)
}

/// Opens a linked file with its normal program. Only saved links can be opened.
#[tauri::command]
pub fn open_file_link(app: AppHandle, state: State<AppState>, id: i64) -> AppResult<()> {
    let link = files::get(&state.db(), id)?;
    app.opener()
        .open_path(link.path, None::<&str>)
        .map_err(|e| AppError::invalid(e.to_string()))
}

#[tauri::command]
pub fn reveal_file_link(app: AppHandle, state: State<AppState>, id: i64) -> AppResult<()> {
    let link = files::get(&state.db(), id)?;
    app.opener()
        .reveal_item_in_dir(link.path)
        .map_err(|e| AppError::invalid(e.to_string()))
}

// ---- Content calendar ----

#[tauri::command]
pub fn list_posts_between(
    state: State<AppState>,
    from: String,
    to: String,
) -> AppResult<Vec<Post>> {
    posts::list_between(&state.db(), &from, &to)
}

#[tauri::command]
pub fn list_unscheduled_posts(state: State<AppState>) -> AppResult<Vec<Post>> {
    posts::list_unscheduled(&state.db())
}

#[tauri::command]
pub fn get_post(state: State<AppState>, id: i64) -> AppResult<Post> {
    posts::get(&state.db(), id)
}

#[tauri::command]
pub fn create_post(state: State<AppState>, input: PostInput) -> AppResult<Post> {
    posts::create(&state.db(), &input)
}

#[tauri::command]
pub fn update_post(state: State<AppState>, id: i64, input: PostInput) -> AppResult<Post> {
    posts::update(&state.db(), id, &input)
}

#[tauri::command]
pub fn delete_post(state: State<AppState>, id: i64) -> AppResult<()> {
    posts::delete(&state.db(), id)
}

// ---- Search ----

#[tauri::command]
pub fn search(state: State<AppState>, query: String) -> AppResult<Vec<SearchResult>> {
    search_db::search(&state.db(), &query)
}

// ---- Settings ----

/// All saved settings, plus `libraryDir` (the default folder when none was picked).
#[tauri::command]
pub fn get_settings(state: State<AppState>) -> AppResult<HashMap<String, String>> {
    let conn = state.db();
    let mut all = settings::all(&conn)?;
    let library = state.library_dir(&conn)?;
    all.insert(
        settings::LIBRARY_DIR.into(),
        library.to_string_lossy().into_owned(),
    );
    Ok(all)
}

#[tauri::command]
pub fn set_setting(state: State<AppState>, key: String, value: String) -> AppResult<()> {
    if key == settings::LIBRARY_DIR {
        return Err(AppError::invalid(
            "Use set_library_dir to change the Library folder",
        ));
    }
    settings::set(&state.db(), &key, &value)
}
