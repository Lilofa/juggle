use rusqlite::{params, Connection, Row};

use super::NOW;
use crate::error::{AppError, AppResult};
use crate::models::Note;

const SELECT: &str = "SELECT id, project_id, title, body, created_at, updated_at FROM notes";

fn from_row(row: &Row) -> rusqlite::Result<Note> {
    Ok(Note {
        id: row.get(0)?,
        project_id: row.get(1)?,
        title: row.get(2)?,
        body: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

/// Newest changes first.
pub fn list(conn: &Connection, project_id: i64) -> AppResult<Vec<Note>> {
    let mut stmt = conn.prepare(&format!(
        "{SELECT} WHERE project_id = ?1 ORDER BY updated_at DESC, id DESC"
    ))?;
    let rows = stmt.query_map([project_id], from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Note> {
    conn.query_row(&format!("{SELECT} WHERE id = ?1"), [id], from_row)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("note {id}")),
            other => other.into(),
        })
}

pub fn create(conn: &Connection, project_id: i64, title: &str) -> AppResult<Note> {
    conn.execute(
        "INSERT INTO notes (project_id, title) VALUES (?1, ?2)",
        params![project_id, title.trim()],
    )?;
    get(conn, conn.last_insert_rowid())
}

pub fn update(conn: &Connection, id: i64, title: &str, body: &str) -> AppResult<Note> {
    let changed = conn.execute(
        &format!("UPDATE notes SET title = ?1, body = ?2, updated_at = {NOW} WHERE id = ?3"),
        params![title.trim(), body, id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound(format!("note {id}")));
    }
    get(conn, id)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM notes WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{open_in_memory, projects};

    #[test]
    fn crud() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "P");
        let n = create(&conn, p.id, " Ideas ").unwrap();
        assert_eq!(n.title, "Ideas");
        let n = update(&conn, n.id, "Ideas", "# Hello\n- one").unwrap();
        assert_eq!(n.body, "# Hello\n- one");
        assert_eq!(list(&conn, p.id).unwrap().len(), 1);
        delete(&conn, n.id).unwrap();
        assert!(list(&conn, p.id).unwrap().is_empty());
        assert!(update(&conn, n.id, "x", "y").is_err());
    }
}
