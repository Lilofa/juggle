//! Juggle backend: local SQLite database and file work, called from the React UI.

mod commands;
mod db;
mod error;
mod media;
mod models;
mod state;
mod validate;

use tauri::Manager;

use commands::{data, media as media_cmd};
use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle();
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let conn = db::open(&data_dir.join("juggle.db"))?;

            let thumbs_dir = data_dir.join("thumbnails");
            std::fs::create_dir_all(&thumbs_dir)?;
            let default_library = app
                .path()
                .picture_dir()
                .unwrap_or_else(|_| data_dir.clone())
                .join("Juggle Library");

            // The UI may show files from the thumbnail cache and from every pack folder.
            commands::allow_asset_dir(handle, &thumbs_dir)?;
            for dir in db::media::all_library_paths(&conn)? {
                commands::allow_asset_dir(handle, std::path::Path::new(&dir))?;
            }

            app.manage(AppState::new(conn, thumbs_dir, default_library));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            data::list_projects,
            data::create_project,
            data::update_project,
            data::set_project_archived,
            data::delete_project,
            data::list_tasks,
            data::list_open_tasks,
            data::list_tasks_due_between,
            data::create_task,
            data::update_task,
            data::reorder_tasks,
            data::delete_task,
            data::list_notes,
            data::create_note,
            data::update_note,
            data::delete_note,
            data::list_file_links,
            data::add_file_links,
            data::rename_file_link,
            data::remove_file_link,
            data::open_file_link,
            data::reveal_file_link,
            data::list_posts_between,
            data::list_unscheduled_posts,
            data::get_post,
            data::create_post,
            data::update_post,
            data::delete_post,
            data::search,
            data::get_settings,
            data::set_setting,
            media_cmd::list_media_packs,
            media_cmd::get_media_pack,
            media_cmd::list_media_items,
            media_cmd::set_media_mark,
            media_cmd::rename_media_pack,
            media_cmd::forget_media_pack,
            media_cmd::import_media_pack,
            media_cmd::media_thumbnail,
            media_cmd::export_media,
            media_cmd::open_media_item,
            media_cmd::reveal_media_pack,
            media_cmd::set_library_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Juggle");
}
