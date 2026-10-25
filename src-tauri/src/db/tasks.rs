use rusqlite::{params, Connection, Row};

use super::NOW;
use crate::error::{AppError, AppResult};
use crate::models::{Task, TaskInput};
use crate::validate;

pub const STATUSES: &[&str] = &["todo", "doing", "done"];
pub const PRIORITIES: &[&str] = &["low", "normal", "high"];

const SELECT: &str = "
    SELECT t.id, t.project_id, p.name, p.color, t.title, t.description, t.status, t.priority,
           t.due_date, t.position, t.completed_at, t.created_at, t.updated_at
    FROM tasks t JOIN projects p ON p.id = t.project_id";

fn from_row(row: &Row) -> rusqlite::Result<Task> {
    Ok(Task {
        id: row.get(0)?,
        project_id: row.get(1)?,
        project_name: row.get(2)?,
        project_color: row.get(3)?,
        title: row.get(4)?,
        description: row.get(5)?,
        status: row.get(6)?,
        priority: row.get(7)?,
        due_date: row.get(8)?,
        position: row.get(9)?,
        completed_at: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

fn query(conn: &Connection, filter: &str, params: impl rusqlite::Params) -> AppResult<Vec<Task>> {
    let mut stmt = conn.prepare(&format!("{SELECT} {filter}"))?;
    let rows = stmt.query_map(params, from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn list_for_project(conn: &Connection, project_id: i64) -> AppResult<Vec<Task>> {
    query(
        conn,
        "WHERE t.project_id = ?1 ORDER BY t.status, t.position, t.id",
        [project_id],
    )
}

/// Unfinished tasks of all active (not archived) projects. Used by the Today screen.
pub fn list_open(conn: &Connection) -> AppResult<Vec<Task>> {
    query(
        conn,
        "WHERE t.status != 'done' AND p.archived = 0
         ORDER BY t.due_date IS NULL, t.due_date, t.priority = 'high' DESC, t.id",
        [],
    )
}

/// Tasks with a deadline between two days (both included). Used by the calendar.
pub fn list_due_between(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<Task>> {
    let from = validate::date(from)?;
    let to = validate::date(to)?;
    query(
        conn,
        "WHERE t.due_date BETWEEN ?1 AND ?2 AND p.archived = 0 ORDER BY t.due_date, t.id",
        params![from, to],
    )
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Task> {
    query(conn, "WHERE t.id = ?1", [id])?
        .pop()
        .ok_or_else(|| AppError::NotFound(format!("task {id}")))
}

struct Clean {
    title: String,
    description: String,
    status: String,
    priority: String,
    due_date: Option<String>,
}

fn clean(input: &TaskInput) -> AppResult<Clean> {
    Ok(Clean {
        title: validate::required("Task title", &input.title)?,
        description: input.description.trim_end().to_string(),
        status: validate::one_of("status", &input.status, STATUSES)?,
        priority: validate::one_of("priority", &input.priority, PRIORITIES)?,
        due_date: validate::optional_date(input.due_date.as_deref())?,
    })
}

/// New tasks go to the end of their column.
pub fn create(conn: &Connection, project_id: i64, input: &TaskInput) -> AppResult<Task> {
    let c = clean(input)?;
    conn.execute(
        &format!(
            "INSERT INTO tasks (project_id, title, description, status, priority, due_date, position, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6,
                     (SELECT COALESCE(MAX(position), -1) + 1 FROM tasks WHERE project_id = ?1 AND status = ?4),
                     CASE WHEN ?4 = 'done' THEN {NOW} END)"
        ),
        params![project_id, c.title, c.description, c.status, c.priority, c.due_date],
    )?;
    get(conn, conn.last_insert_rowid())
}

/// Saves all fields. If the status changes, the task moves to the end of the new column.
pub fn update(conn: &Connection, id: i64, input: &TaskInput) -> AppResult<Task> {
    let c = clean(input)?;
    let old = get(conn, id)?;
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        &format!("UPDATE tasks SET title = ?1, description = ?2, priority = ?3, due_date = ?4, updated_at = {NOW} WHERE id = ?5"),
        params![c.title, c.description, c.priority, c.due_date, id],
    )?;
    if old.status != c.status {
        set_status(&tx, id, old.project_id, &c.status)?;
    }
    tx.commit()?;
    get(conn, id)
}

fn set_status(conn: &Connection, id: i64, project_id: i64, status: &str) -> AppResult<()> {
    conn.execute(
        &format!(
            "UPDATE tasks SET status = ?1,
                position = (SELECT COALESCE(MAX(position), -1) + 1 FROM tasks WHERE project_id = ?2 AND status = ?1),
                completed_at = CASE WHEN ?1 = 'done' THEN COALESCE(completed_at, {NOW}) END,
                updated_at = {NOW}
             WHERE id = ?3"
        ),
        params![status, project_id, id],
    )?;
    Ok(())
}

/// Puts the given tasks into one board column in exactly this order.
/// Used after drag and drop: the UI sends the full new order of the target column.
pub fn reorder(
    conn: &Connection,
    project_id: i64,
    status: &str,
    ordered_ids: &[i64],
) -> AppResult<()> {
    let status = validate::one_of("status", status, STATUSES)?;
    let tx = conn.unchecked_transaction()?;
    for (position, id) in ordered_ids.iter().enumerate() {
        let changed = tx.execute(
            &format!(
                "UPDATE tasks SET position = ?1,
                    completed_at = CASE WHEN ?2 = 'done' THEN COALESCE(completed_at, {NOW}) END,
                    updated_at = CASE WHEN status != ?2 THEN {NOW} ELSE updated_at END,
                    status = ?2
                 WHERE id = ?3 AND project_id = ?4"
            ),
            params![position as i64, status, id, project_id],
        )?;
        if changed == 0 {
            return Err(AppError::NotFound(format!(
                "task {id} in project {project_id}"
            )));
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
pub(crate) fn input(title: &str, status: &str, due: Option<&str>) -> TaskInput {
    TaskInput {
        title: title.into(),
        description: String::new(),
        status: status.into(),
        priority: "normal".into(),
        due_date: due.map(Into::into),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{open_in_memory, projects};

    fn ids(tasks: &[Task], status: &str) -> Vec<i64> {
        tasks
            .iter()
            .filter(|t| t.status == status)
            .map(|t| t.id)
            .collect()
    }

    #[test]
    fn new_tasks_go_to_end_of_column() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "P");
        let a = create(&conn, p.id, &input("a", "todo", None)).unwrap();
        let b = create(&conn, p.id, &input("b", "todo", None)).unwrap();
        assert_eq!((a.position, b.position), (0, 1));
        assert_eq!(a.project_name, "P");
    }

    #[test]
    fn reorder_moves_between_columns() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "P");
        let a = create(&conn, p.id, &input("a", "todo", None)).unwrap();
        let b = create(&conn, p.id, &input("b", "todo", None)).unwrap();
        let c = create(&conn, p.id, &input("c", "doing", None)).unwrap();

        // Drag "a" into Doing, above "c".
        reorder(&conn, p.id, "doing", &[a.id, c.id]).unwrap();
        let all = list_for_project(&conn, p.id).unwrap();
        assert_eq!(ids(&all, "doing"), vec![a.id, c.id]);
        assert_eq!(ids(&all, "todo"), vec![b.id]);

        reorder(&conn, p.id, "done", &[b.id]).unwrap();
        assert!(get(&conn, b.id).unwrap().completed_at.is_some());
    }

    #[test]
    fn reorder_rejects_task_from_other_project() {
        let conn = open_in_memory().unwrap();
        let p1 = projects::sample(&conn, "P1");
        let p2 = projects::sample(&conn, "P2");
        let t = create(&conn, p2.id, &input("t", "todo", None)).unwrap();
        assert!(reorder(&conn, p1.id, "todo", &[t.id]).is_err());
        assert_eq!(get(&conn, t.id).unwrap().project_id, p2.id);
    }

    #[test]
    fn update_status_sets_completed_and_back() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "P");
        let t = create(&conn, p.id, &input("t", "todo", Some("2026-11-01"))).unwrap();
        let t = update(&conn, t.id, &input("t2", "done", Some("2026-11-02"))).unwrap();
        assert_eq!(t.title, "t2");
        assert!(t.completed_at.is_some());
        let t = update(&conn, t.id, &input("t2", "todo", None)).unwrap();
        assert!(t.completed_at.is_none());
        assert_eq!(t.due_date, None);
    }

    #[test]
    fn open_and_due_lists() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "P");
        let archived = projects::sample(&conn, "Old");
        projects::set_archived(&conn, archived.id, true).unwrap();
        create(&conn, p.id, &input("later", "todo", Some("2026-12-01"))).unwrap();
        create(&conn, p.id, &input("soon", "doing", Some("2026-11-01"))).unwrap();
        create(&conn, p.id, &input("nodate", "todo", None)).unwrap();
        create(&conn, p.id, &input("finished", "done", Some("2026-11-01"))).unwrap();
        create(
            &conn,
            archived.id,
            &input("hidden", "todo", Some("2026-11-01")),
        )
        .unwrap();

        let open: Vec<String> = list_open(&conn)
            .unwrap()
            .into_iter()
            .map(|t| t.title)
            .collect();
        assert_eq!(open, vec!["soon", "later", "nodate"]);

        let due: Vec<String> = list_due_between(&conn, "2026-11-01", "2026-11-30")
            .unwrap()
            .into_iter()
            .map(|t| t.title)
            .collect();
        assert_eq!(due, vec!["soon", "finished"]);
    }

    #[test]
    fn deleting_project_deletes_tasks() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "P");
        let t = create(&conn, p.id, &input("t", "todo", None)).unwrap();
        projects::delete(&conn, p.id).unwrap();
        assert!(get(&conn, t.id).is_err());
    }

    #[test]
    fn rejects_bad_input() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "P");
        assert!(create(&conn, p.id, &input("", "todo", None)).is_err());
        assert!(create(&conn, p.id, &input("x", "blocked", None)).is_err());
        assert!(create(&conn, p.id, &input("x", "todo", Some("tomorrow"))).is_err());
    }
}
