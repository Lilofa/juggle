use std::path::Path;

use rusqlite::{params, Connection, Row};

use super::NOW;
use crate::error::{AppError, AppResult};
use crate::models::FileLink;

const SELECT: &str = "SELECT id, project_id, path, label, is_dir, created_at FROM file_links";

fn from_row(row: &Row) -> rusqlite::Result<FileLink> {
    let path: String = row.get(2)?;
    Ok(FileLink {
        id: row.get(0)?,
        project_id: row.get(1)?,
        exists: Path::new(&path).exists(),
        path,
        label: row.get(3)?,
        is_dir: row.get(4)?,
        created_at: row.get(5)?,
    })
}

pub fn list(conn: &Connection, project_id: i64) -> AppResult<Vec<FileLink>> {
    let mut stmt = conn.prepare(&format!(
        "{SELECT} WHERE project_id = ?1 ORDER BY is_dir DESC, label COLLATE NOCASE"
    ))?;
    let rows = stmt.query_map([project_id], from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<FileLink> {
    conn.query_row(&format!("{SELECT} WHERE id = ?1"), [id], from_row)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("file link {id}")),
            other => other.into(),
        })
}

/// Links files or folders to a project. Paths that are already linked are skipped.
/// Returns how many new links were added.
pub fn add(conn: &Connection, project_id: i64, paths: &[String]) -> AppResult<usize> {
    let tx = conn.unchecked_transaction()?;
    let mut added = 0;
    for raw in paths {
        let path = Path::new(raw);
        if !path.is_absolute() {
            return Err(AppError::invalid(format!("Not a full path: {raw}")));
        }
        let label = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| raw.clone());
        added += tx.execute(
            "INSERT OR IGNORE INTO file_links (project_id, path, label, is_dir) VALUES (?1, ?2, ?3, ?4)",
            params![project_id, raw, label, path.is_dir()],
        )?;
    }
    tx.commit()?;
    Ok(added)
}

pub fn rename(conn: &Connection, id: i64, label: &str) -> AppResult<FileLink> {
    let label = crate::validate::required("Label", label)?;
    conn.execute(
        &format!("UPDATE file_links SET label = ?1, updated_at = {NOW} WHERE id = ?2"),
        params![label, id],
    )?;
    get(conn, id)
}

/// Removes only the link. The file itself is never touched.
pub fn remove(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM file_links WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{open_in_memory, projects};

    #[test]
    fn add_list_rename_remove() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "P");
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("brief.txt");
        std::fs::write(&file, "x").unwrap();
        let missing = dir.path().join("gone.png");
        let paths = vec![
            file.to_string_lossy().into_owned(),
            dir.path().to_string_lossy().into_owned(),
            missing.to_string_lossy().into_owned(),
        ];

        assert_eq!(add(&conn, p.id, &paths).unwrap(), 3);
        // Adding the same paths again adds nothing.
        assert_eq!(add(&conn, p.id, &paths).unwrap(), 0);

        let links = list(&conn, p.id).unwrap();
        assert!(links[0].is_dir, "folders come first");
        let gone = links.iter().find(|l| l.label == "gone.png").unwrap();
        assert!(!gone.exists);
        let brief = links.iter().find(|l| l.label == "brief.txt").unwrap();
        assert!(brief.exists);

        assert_eq!(rename(&conn, brief.id, "Brief").unwrap().label, "Brief");
        remove(&conn, brief.id).unwrap();
        assert!(file.exists(), "removing a link must keep the file");
        assert_eq!(list(&conn, p.id).unwrap().len(), 2);
    }

    #[test]
    fn rejects_relative_paths() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "P");
        assert!(add(&conn, p.id, &["relative/file.txt".to_string()]).is_err());
    }
}
