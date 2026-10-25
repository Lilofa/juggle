use rusqlite::{params, Connection, Row};

use super::NOW;
use crate::error::{AppError, AppResult};
use crate::models::{Project, ProjectInput};
use crate::validate;

const SELECT: &str = "
    SELECT p.id, p.name, p.color, p.description, p.archived, p.position,
           (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status != 'done'),
           p.created_at, p.updated_at
    FROM projects p";

fn from_row(row: &Row) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        description: row.get(3)?,
        archived: row.get(4)?,
        position: row.get(5)?,
        open_task_count: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub fn list(conn: &Connection) -> AppResult<Vec<Project>> {
    let mut stmt = conn.prepare(&format!("{SELECT} ORDER BY p.archived, p.position, p.id"))?;
    let rows = stmt.query_map([], from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Project> {
    conn.query_row(&format!("{SELECT} WHERE p.id = ?1"), [id], from_row)
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("project {id}")),
            other => other.into(),
        })
}

pub fn create(conn: &Connection, input: &ProjectInput) -> AppResult<Project> {
    let name = validate::required("Project name", &input.name)?;
    let color = validate::color(&input.color)?;
    conn.execute(
        "INSERT INTO projects (name, color, description, position)
         VALUES (?1, ?2, ?3, (SELECT COALESCE(MAX(position), 0) + 1 FROM projects))",
        params![name, color, input.description.trim()],
    )?;
    get(conn, conn.last_insert_rowid())
}

pub fn update(conn: &Connection, id: i64, input: &ProjectInput) -> AppResult<Project> {
    let name = validate::required("Project name", &input.name)?;
    let color = validate::color(&input.color)?;
    let changed = conn.execute(
        &format!(
            "UPDATE projects SET name = ?1, color = ?2, description = ?3, updated_at = {NOW}
             WHERE id = ?4"
        ),
        params![name, color, input.description.trim(), id],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound(format!("project {id}")));
    }
    get(conn, id)
}

pub fn set_archived(conn: &Connection, id: i64, archived: bool) -> AppResult<Project> {
    conn.execute(
        &format!("UPDATE projects SET archived = ?1, updated_at = {NOW} WHERE id = ?2"),
        params![archived, id],
    )?;
    get(conn, id)
}

/// Deletes the project and its tasks, notes, file links and pack records.
/// Files on disk (linked files and Library copies) are never touched.
pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
pub(crate) fn sample(conn: &Connection, name: &str) -> Project {
    create(
        conn,
        &ProjectInput {
            name: name.into(),
            color: "#112233".into(),
            description: String::new(),
        },
    )
    .unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn create_update_archive_delete() {
        let conn = open_in_memory().unwrap();
        let p = sample(&conn, "  Boss Instagram ");
        assert_eq!(p.name, "Boss Instagram");
        let second = sample(&conn, "Shorts");
        assert!(second.position > p.position);

        let input = ProjectInput {
            name: "Renamed".into(),
            color: "#ABCDEF".into(),
            description: "d".into(),
        };
        let p = update(&conn, p.id, &input).unwrap();
        assert_eq!((p.name.as_str(), p.color.as_str()), ("Renamed", "#abcdef"));

        let p = set_archived(&conn, p.id, true).unwrap();
        assert!(p.archived);
        // Archived projects are listed last.
        assert_eq!(list(&conn).unwrap().last().unwrap().id, p.id);

        delete(&conn, p.id).unwrap();
        assert!(matches!(get(&conn, p.id), Err(AppError::NotFound(_))));
    }

    #[test]
    fn rejects_bad_input() {
        let conn = open_in_memory().unwrap();
        let empty = ProjectInput {
            name: " ".into(),
            color: "#112233".into(),
            description: String::new(),
        };
        assert!(create(&conn, &empty).is_err());
        let bad_color = ProjectInput {
            name: "x".into(),
            color: "blue".into(),
            description: String::new(),
        };
        assert!(create(&conn, &bad_color).is_err());
    }
}
