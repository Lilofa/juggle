//! Database rows for media packs and items. File copying lives in `crate::media`.

use std::path::Path;

use rusqlite::{params, Connection, Row};

use super::NOW;
use crate::error::{AppError, AppResult};
use crate::models::{MarkCounts, MediaItem, MediaPack};
use crate::validate;

pub const MARKS: &[&str] = &["none", "use", "maybe", "reject"];

const PACK_SELECT: &str = "
    SELECT k.id, k.project_id, k.name, k.source_path, k.library_path, k.created_at,
           COUNT(i.id),
           COALESCE(SUM(i.mark = 'none'), 0), COALESCE(SUM(i.mark = 'use'), 0),
           COALESCE(SUM(i.mark = 'maybe'), 0), COALESCE(SUM(i.mark = 'reject'), 0)
    FROM media_packs k LEFT JOIN media_items i ON i.pack_id = k.id";

fn pack_from_row(row: &Row) -> rusqlite::Result<MediaPack> {
    Ok(MediaPack {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        source_path: row.get(3)?,
        library_path: row.get(4)?,
        created_at: row.get(5)?,
        item_count: row.get(6)?,
        counts: MarkCounts {
            none: row.get(7)?,
            use_: row.get(8)?,
            maybe: row.get(9)?,
            reject: row.get(10)?,
        },
    })
}

pub fn list_packs(conn: &Connection, project_id: i64) -> AppResult<Vec<MediaPack>> {
    let mut stmt = conn.prepare(&format!(
        "{PACK_SELECT} WHERE k.project_id = ?1 GROUP BY k.id ORDER BY k.created_at DESC, k.id DESC"
    ))?;
    let rows = stmt.query_map([project_id], pack_from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Every Library folder known to the database (used to allow the UI to show these files).
pub fn all_library_paths(conn: &Connection) -> AppResult<Vec<String>> {
    let mut stmt = conn.prepare("SELECT library_path FROM media_packs")?;
    let rows = stmt.query_map([], |r| r.get(0))?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get_pack(conn: &Connection, id: i64) -> AppResult<MediaPack> {
    conn.query_row(
        &format!("{PACK_SELECT} WHERE k.id = ?1 GROUP BY k.id"),
        [id],
        pack_from_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("media pack {id}")),
        other => other.into(),
    })
}

pub fn insert_pack(
    conn: &Connection,
    project_id: i64,
    name: &str,
    source_path: &str,
    library_path: &str,
) -> AppResult<i64> {
    conn.execute(
        "INSERT INTO media_packs (project_id, name, source_path, library_path) VALUES (?1, ?2, ?3, ?4)",
        params![project_id, name, source_path, library_path],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Adds items to a pack. `items` is (file name, kind, size in bytes).
/// The caller should wrap this in a transaction together with `insert_pack`.
pub fn insert_items(
    conn: &Connection,
    pack_id: i64,
    items: &[(String, String, u64)],
) -> AppResult<()> {
    let mut stmt = conn.prepare(
        "INSERT INTO media_items (pack_id, file_name, kind, size_bytes, position) VALUES (?1, ?2, ?3, ?4, ?5)",
    )?;
    for (position, (file_name, kind, size)) in items.iter().enumerate() {
        stmt.execute(params![
            pack_id,
            file_name,
            kind,
            *size as i64,
            position as i64
        ])?;
    }
    Ok(())
}

/// Ids of all items in the given packs (used to clean the thumbnail cache).
pub fn item_ids_for_packs(conn: &Connection, pack_ids: &[i64]) -> AppResult<Vec<i64>> {
    let mut ids = Vec::new();
    let mut stmt = conn.prepare("SELECT id FROM media_items WHERE pack_id = ?1")?;
    for pack_id in pack_ids {
        for id in stmt.query_map([pack_id], |r| r.get(0))? {
            ids.push(id?);
        }
    }
    Ok(ids)
}

pub fn pack_ids_for_project(conn: &Connection, project_id: i64) -> AppResult<Vec<i64>> {
    let mut stmt = conn.prepare("SELECT id FROM media_packs WHERE project_id = ?1")?;
    let rows = stmt.query_map([project_id], |r| r.get(0))?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn rename_pack(conn: &Connection, id: i64, name: &str) -> AppResult<MediaPack> {
    let name = validate::required("Pack name", name)?;
    conn.execute(
        &format!("UPDATE media_packs SET name = ?1, updated_at = {NOW} WHERE id = ?2"),
        params![name, id],
    )?;
    get_pack(conn, id)
}

/// Removes the pack from the app. The files in the Library folder stay on disk.
pub fn forget_pack(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM media_packs WHERE id = ?1", [id])?;
    Ok(())
}

const ITEM_SELECT: &str = "
    SELECT i.id, i.pack_id, i.file_name, k.library_path, i.kind, i.size_bytes, i.mark
    FROM media_items i JOIN media_packs k ON k.id = i.pack_id";

fn item_from_row(row: &Row) -> rusqlite::Result<MediaItem> {
    let file_name: String = row.get(2)?;
    let library_path: String = row.get(3)?;
    Ok(MediaItem {
        id: row.get(0)?,
        pack_id: row.get(1)?,
        path: Path::new(&library_path)
            .join(&file_name)
            .to_string_lossy()
            .into_owned(),
        file_name,
        kind: row.get(4)?,
        size_bytes: row.get(5)?,
        mark: row.get(6)?,
    })
}

pub fn list_items(conn: &Connection, pack_id: i64) -> AppResult<Vec<MediaItem>> {
    let mut stmt = conn.prepare(&format!(
        "{ITEM_SELECT} WHERE i.pack_id = ?1 ORDER BY i.position, i.id"
    ))?;
    let rows = stmt.query_map([pack_id], item_from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn list_items_with_mark(
    conn: &Connection,
    pack_id: i64,
    mark: &str,
) -> AppResult<Vec<MediaItem>> {
    let mut stmt = conn.prepare(&format!(
        "{ITEM_SELECT} WHERE i.pack_id = ?1 AND i.mark = ?2 ORDER BY i.position, i.id"
    ))?;
    let rows = stmt.query_map(params![pack_id, mark], item_from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get_item(conn: &Connection, id: i64) -> AppResult<MediaItem> {
    conn.query_row(
        &format!("{ITEM_SELECT} WHERE i.id = ?1"),
        [id],
        item_from_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("media item {id}")),
        other => other.into(),
    })
}

/// Sets the same mark on one or more items.
pub fn set_mark(conn: &Connection, ids: &[i64], mark: &str) -> AppResult<()> {
    let mark = validate::one_of("mark", mark, MARKS)?;
    let tx = conn.unchecked_transaction()?;
    for id in ids {
        tx.execute(
            &format!("UPDATE media_items SET mark = ?1, updated_at = {NOW} WHERE id = ?2"),
            params![mark, id],
        )?;
    }
    tx.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{open_in_memory, projects};

    #[test]
    fn packs_items_and_marks() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "P");
        let pack = insert_pack(&conn, p.id, "Shoot", "/src", "/lib/Shoot").unwrap();
        let items = vec![
            ("a.png".to_string(), "image".to_string(), 10),
            ("b.mp4".to_string(), "video".to_string(), 20),
            ("c.png".to_string(), "image".to_string(), 30),
        ];
        insert_items(&conn, pack, &items).unwrap();

        let listed = list_items(&conn, pack).unwrap();
        assert_eq!(listed.len(), 3);
        assert!(listed[0].path.ends_with("a.png"));

        set_mark(&conn, &[listed[0].id, listed[2].id], "use").unwrap();
        set_mark(&conn, &[listed[1].id], "reject").unwrap();
        assert!(set_mark(&conn, &[listed[1].id], "delete").is_err());

        let pack = get_pack(&conn, pack).unwrap();
        assert_eq!(pack.item_count, 3);
        assert_eq!(
            pack.counts,
            MarkCounts {
                none: 0,
                use_: 2,
                maybe: 0,
                reject: 1
            }
        );
        assert_eq!(
            list_items_with_mark(&conn, pack.id, "use").unwrap().len(),
            2
        );

        forget_pack(&conn, pack.id).unwrap();
        assert!(list_packs(&conn, p.id).unwrap().is_empty());
    }
}
