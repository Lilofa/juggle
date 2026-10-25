use rusqlite::{params, Connection, Row};

use super::NOW;
use crate::error::{AppError, AppResult};
use crate::models::{Post, PostInput};
use crate::validate;

pub const PLATFORMS: &[&str] = &["instagram", "vk", "facebook", "youtube_shorts", "other"];
pub const STATUSES: &[&str] = &["idea", "draft", "scheduled", "posted"];

const SELECT: &str = "
    SELECT s.id, s.project_id, p.name, p.color, s.title, s.platform, s.status, s.date, s.time,
           s.caption, s.created_at, s.updated_at
    FROM posts s LEFT JOIN projects p ON p.id = s.project_id";

fn from_row(row: &Row) -> rusqlite::Result<Post> {
    Ok(Post {
        id: row.get(0)?,
        project_id: row.get(1)?,
        project_name: row.get(2)?,
        project_color: row.get(3)?,
        title: row.get(4)?,
        platform: row.get(5)?,
        status: row.get(6)?,
        date: row.get(7)?,
        time: row.get(8)?,
        caption: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

fn query(conn: &Connection, filter: &str, params: impl rusqlite::Params) -> AppResult<Vec<Post>> {
    let mut stmt = conn.prepare(&format!("{SELECT} {filter}"))?;
    let rows = stmt.query_map(params, from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Posts planned between two days (both included), in time order.
pub fn list_between(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<Post>> {
    let (from, to) = (validate::date(from)?, validate::date(to)?);
    query(
        conn,
        "WHERE s.date BETWEEN ?1 AND ?2 ORDER BY s.date, s.time IS NULL, s.time, s.id",
        params![from, to],
    )
}

/// Posts without a date (ideas that are not planned yet).
pub fn list_unscheduled(conn: &Connection) -> AppResult<Vec<Post>> {
    query(
        conn,
        "WHERE s.date IS NULL ORDER BY s.created_at DESC, s.id DESC",
        [],
    )
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Post> {
    query(conn, "WHERE s.id = ?1", [id])?
        .pop()
        .ok_or_else(|| AppError::NotFound(format!("post {id}")))
}

struct Clean {
    title: String,
    platform: String,
    status: String,
    date: Option<String>,
    time: Option<String>,
}

fn clean(input: &PostInput) -> AppResult<Clean> {
    let date = validate::optional_date(input.date.as_deref())?;
    let time = validate::optional_time(input.time.as_deref())?;
    if date.is_none() && time.is_some() {
        return Err(AppError::invalid("A time needs a date"));
    }
    Ok(Clean {
        title: validate::required("Post title", &input.title)?,
        platform: validate::one_of("platform", &input.platform, PLATFORMS)?,
        status: validate::one_of("status", &input.status, STATUSES)?,
        date,
        time,
    })
}

pub fn create(conn: &Connection, input: &PostInput) -> AppResult<Post> {
    let c = clean(input)?;
    conn.execute(
        "INSERT INTO posts (project_id, title, platform, status, date, time, caption)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            input.project_id,
            c.title,
            c.platform,
            c.status,
            c.date,
            c.time,
            input.caption
        ],
    )?;
    get(conn, conn.last_insert_rowid())
}

pub fn update(conn: &Connection, id: i64, input: &PostInput) -> AppResult<Post> {
    let c = clean(input)?;
    let changed = conn.execute(
        &format!(
            "UPDATE posts SET project_id = ?1, title = ?2, platform = ?3, status = ?4, date = ?5,
                time = ?6, caption = ?7, updated_at = {NOW}
             WHERE id = ?8"
        ),
        params![
            input.project_id,
            c.title,
            c.platform,
            c.status,
            c.date,
            c.time,
            input.caption,
            id
        ],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound(format!("post {id}")));
    }
    get(conn, id)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute("DELETE FROM posts WHERE id = ?1", [id])?;
    Ok(())
}

#[cfg(test)]
pub(crate) fn input(title: &str, date: Option<&str>, time: Option<&str>) -> PostInput {
    PostInput {
        project_id: None,
        title: title.into(),
        platform: "instagram".into(),
        status: "idea".into(),
        date: date.map(Into::into),
        time: time.map(Into::into),
        caption: String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{open_in_memory, projects};

    #[test]
    fn range_and_unscheduled() {
        let conn = open_in_memory().unwrap();
        create(&conn, &input("late", Some("2026-11-03"), Some("18:00"))).unwrap();
        create(&conn, &input("early", Some("2026-11-03"), Some("09:00"))).unwrap();
        create(&conn, &input("allday", Some("2026-11-03"), None)).unwrap();
        create(&conn, &input("next month", Some("2026-12-01"), None)).unwrap();
        create(&conn, &input("idea", None, None)).unwrap();

        let titles: Vec<String> = list_between(&conn, "2026-11-01", "2026-11-30")
            .unwrap()
            .into_iter()
            .map(|p| p.title)
            .collect();
        assert_eq!(titles, vec!["early", "late", "allday"]);
        assert_eq!(list_unscheduled(&conn).unwrap()[0].title, "idea");
    }

    #[test]
    fn project_link_survives_project_delete() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "VK");
        let mut i = input("post", Some("2026-11-03"), None);
        i.project_id = Some(p.id);
        let post = create(&conn, &i).unwrap();
        assert_eq!(post.project_name.as_deref(), Some("VK"));

        projects::delete(&conn, p.id).unwrap();
        let post = get(&conn, post.id).unwrap();
        assert_eq!(post.project_id, None);
    }

    #[test]
    fn update_and_validation() {
        let conn = open_in_memory().unwrap();
        let post = create(&conn, &input("a", None, None)).unwrap();
        let mut i = input("b", Some("2026-11-05"), Some("10:15"));
        i.platform = "youtube_shorts".into();
        i.status = "scheduled".into();
        let post = update(&conn, post.id, &i).unwrap();
        assert_eq!(
            (post.platform.as_str(), post.status.as_str()),
            ("youtube_shorts", "scheduled")
        );

        assert!(
            create(&conn, &input("t", None, Some("10:00"))).is_err(),
            "time without date"
        );
        let mut bad = input("t", None, None);
        bad.platform = "tiktok".into();
        assert!(create(&conn, &bad).is_err());
    }
}
