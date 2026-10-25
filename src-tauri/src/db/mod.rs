//! Database: opening, schema migrations, and one module per data area.

pub mod files;
pub mod media;
pub mod notes;
pub mod posts;
pub mod projects;
pub mod search;
pub mod settings;
pub mod tasks;

use std::path::Path;

use rusqlite::functions::FunctionFlags;
use rusqlite::Connection;

use crate::error::{AppError, AppResult};

/// SQL expression for "now" in UTC, used when a row is updated.
pub const NOW: &str = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

/// Schema versions, in order. Never edit an old entry: add a new one instead.
/// The current version is stored in SQLite's `user_version`.
const MIGRATIONS: &[&str] = &[include_str!("migrations/001_initial.sql")];

pub fn open(path: &Path) -> AppResult<Connection> {
    let conn = Connection::open(path)?;
    prepare(conn)
}

#[cfg(test)]
pub fn open_in_memory() -> AppResult<Connection> {
    prepare(Connection::open_in_memory()?)
}

fn prepare(conn: Connection) -> AppResult<Connection> {
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA busy_timeout = 5000;",
    )?;
    // SQLite's lower() only knows ASCII. This one also works for Cyrillic and other alphabets.
    conn.create_scalar_function(
        "fold",
        1,
        FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
        |ctx| Ok(ctx.get::<Option<String>>(0)?.map(|s| s.to_lowercase())),
    )?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> AppResult<()> {
    let version: usize = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if version > MIGRATIONS.len() {
        return Err(AppError::invalid(
            "This database was made by a newer version of Juggle. Please update the app.",
        ));
    }
    for (index, sql) in MIGRATIONS.iter().enumerate().skip(version) {
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(sql)?;
        tx.pragma_update(None, "user_version", index + 1)?;
        tx.commit()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_run_once_and_set_version() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.db");
        drop(open(&path).unwrap());
        // Opening again must not run the migrations a second time.
        let conn = open(&path).unwrap();
        let version: usize = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap();
        assert_eq!(version, MIGRATIONS.len());
    }

    #[test]
    fn refuses_newer_database() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.db");
        let conn = open(&path).unwrap();
        conn.pragma_update(None, "user_version", 999).unwrap();
        drop(conn);
        assert!(open(&path).is_err());
    }

    #[test]
    fn fold_lowercases_cyrillic() {
        let conn = open_in_memory().unwrap();
        let s: String = conn
            .query_row("SELECT fold('ПРИВЕТ World')", [], |r| r.get(0))
            .unwrap();
        assert_eq!(s, "привет world");
    }
}
