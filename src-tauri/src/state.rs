use std::path::PathBuf;
use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;

use crate::db::settings;
use crate::error::AppResult;

/// Shared app state: one database connection and the app's folders.
pub struct AppState {
    db: Mutex<Connection>,
    /// Small preview images (a cache that can be rebuilt any time).
    pub thumbs_dir: PathBuf,
    /// Library folder used when the user has not picked one.
    pub default_library_dir: PathBuf,
}

impl AppState {
    pub fn new(conn: Connection, thumbs_dir: PathBuf, default_library_dir: PathBuf) -> Self {
        Self {
            db: Mutex::new(conn),
            thumbs_dir,
            default_library_dir,
        }
    }

    /// Locks the database. Keep the lock short: never hold it during slow file work.
    pub fn db(&self) -> MutexGuard<'_, Connection> {
        // A panic in another command must not lock the user out of their data.
        self.db
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn library_dir(&self, conn: &Connection) -> AppResult<PathBuf> {
        Ok(settings::get(conn, settings::LIBRARY_DIR)?
            .map(PathBuf::from)
            .unwrap_or_else(|| self.default_library_dir.clone()))
    }

    pub fn thumbnail_path(&self, item_id: i64) -> PathBuf {
        self.thumbs_dir.join(format!("{item_id}.jpg"))
    }

    /// Removes cached thumbnails (only our own cache files, never user files).
    pub fn forget_thumbnails(&self, item_ids: &[i64]) {
        for id in item_ids {
            let _ = std::fs::remove_file(self.thumbnail_path(*id));
        }
    }
}
