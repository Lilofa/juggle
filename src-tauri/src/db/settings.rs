use std::collections::HashMap;

use rusqlite::{params, Connection};

use crate::error::{AppError, AppResult};

/// Allowed settings and the values they accept (`None` = any text).
const KEYS: &[(&str, Option<&[&str]>)] = &[
    ("theme", Some(&["light", "dark", "system"])),
    (
        "accent",
        Some(&["ocean", "forest", "sunset", "grape", "rose", "graphite"]),
    ),
    ("libraryDir", None),
];

pub const LIBRARY_DIR: &str = "libraryDir";

pub fn all(conn: &Connection) -> AppResult<HashMap<String, String>> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get(conn: &Connection, key: &str) -> AppResult<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query_map([key], |r| r.get(0))?;
    Ok(rows.next().transpose()?)
}

pub fn set(conn: &Connection, key: &str, value: &str) -> AppResult<()> {
    let allowed = KEYS
        .iter()
        .find(|(k, _)| *k == key)
        .ok_or_else(|| AppError::invalid(format!("Unknown setting: {key}")))?;
    if let Some(values) = allowed.1 {
        crate::validate::one_of(key, value, values)?;
    }
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn set_get_and_validate() {
        let conn = open_in_memory().unwrap();
        assert_eq!(get(&conn, "theme").unwrap(), None);
        set(&conn, "theme", "dark").unwrap();
        set(&conn, "theme", "light").unwrap();
        assert_eq!(get(&conn, "theme").unwrap().as_deref(), Some("light"));
        assert!(set(&conn, "theme", "pink").is_err());
        assert!(set(&conn, "password", "x").is_err());
        assert_eq!(all(&conn).unwrap().len(), 1);
    }
}
