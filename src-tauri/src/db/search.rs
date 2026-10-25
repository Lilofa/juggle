//! Global search. Simple case-insensitive text matching; fast enough for personal data.

use rusqlite::{params, Connection};

use crate::error::AppResult;
use crate::models::SearchResult;

const LIMIT_PER_KIND: i64 = 20;
const SNIPPET_CHARS: usize = 120;

/// Each source: kind, SQL returning (id, project_id, title, text for the snippet).
const SOURCES: &[(&str, &str)] = &[
    ("project", "SELECT id, id, name, description FROM projects
                 WHERE instr(fold(name), ?1) OR instr(fold(description), ?1)
                 ORDER BY archived, name LIMIT ?2"),
    ("task", "SELECT id, project_id, title, description FROM tasks
              WHERE instr(fold(title), ?1) OR instr(fold(description), ?1)
              ORDER BY status = 'done', updated_at DESC LIMIT ?2"),
    ("note", "SELECT id, project_id, CASE WHEN title = '' THEN 'Untitled note' ELSE title END, body FROM notes
              WHERE instr(fold(title), ?1) OR instr(fold(body), ?1)
              ORDER BY updated_at DESC LIMIT ?2"),
    ("post", "SELECT id, project_id, title, caption FROM posts
              WHERE instr(fold(title), ?1) OR instr(fold(caption), ?1)
              ORDER BY date IS NULL, date DESC LIMIT ?2"),
    ("file", "SELECT id, project_id, label, path FROM file_links
              WHERE instr(fold(label), ?1) OR instr(fold(path), ?1)
              ORDER BY label LIMIT ?2"),
];

pub fn search(conn: &Connection, query: &str) -> AppResult<Vec<SearchResult>> {
    let needle = query.trim().to_lowercase();
    if needle.is_empty() {
        return Ok(Vec::new());
    }
    let mut results = Vec::new();
    for (kind, sql) in SOURCES {
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map(params![needle, LIMIT_PER_KIND], |r| {
            let text: String = r.get(3)?;
            Ok(SearchResult {
                kind: kind.to_string(),
                id: r.get(0)?,
                project_id: r.get(1)?,
                title: r.get(2)?,
                snippet: snippet(&text, &needle),
            })
        })?;
        for row in rows {
            results.push(row?);
        }
    }
    Ok(results)
}

/// A short piece of `text` around the first match, on one line.
fn snippet(text: &str, needle: &str) -> String {
    let chars: Vec<char> = text
        .chars()
        .map(|c| if c.is_whitespace() { ' ' } else { c })
        .collect();
    let lower: Vec<char> = chars.iter().flat_map(|c| c.to_lowercase()).collect();
    let needle: Vec<char> = needle.chars().collect();
    // Only use the match position when lowercasing kept the length (true for almost all text).
    let found = if lower.len() == chars.len() {
        lower
            .windows(needle.len().max(1))
            .position(|w| w == needle.as_slice())
    } else {
        None
    };
    let start = found.map_or(0, |i| i.saturating_sub(SNIPPET_CHARS / 3));
    let end = (start + SNIPPET_CHARS).min(chars.len());
    let mut out: String = chars[start..end].iter().collect();
    out = out.trim().to_string();
    if start > 0 {
        out.insert(0, '…');
    }
    if end < chars.len() {
        out.push('…');
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{files, notes, open_in_memory, posts, projects, tasks};

    #[test]
    fn finds_all_kinds_case_insensitive() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "Game Server");
        tasks::create(
            &conn,
            p.id,
            &tasks::input("Post server update", "todo", None),
        )
        .unwrap();
        let n = notes::create(&conn, p.id, "").unwrap();
        notes::update(&conn, n.id, "", "Remember the SERVER restart on Friday").unwrap();
        posts::create(&conn, &posts::input("Сервер открыт", None, None)).unwrap();
        files::add(&conn, p.id, &["/tmp/server-logo.png".to_string()]).unwrap();

        let kinds: Vec<String> = search(&conn, "server")
            .unwrap()
            .into_iter()
            .map(|r| r.kind)
            .collect();
        assert_eq!(kinds, vec!["project", "task", "note", "file"]);

        // Cyrillic text is matched without caring about case.
        let ru = search(&conn, "сервер").unwrap();
        assert_eq!(ru.len(), 1);
        assert_eq!(ru[0].kind, "post");

        let note = search(&conn, "restart").unwrap();
        assert_eq!(note[0].title, "Untitled note");
        assert!(note[0].snippet.contains("restart"));
    }

    #[test]
    fn special_characters_are_plain_text() {
        let conn = open_in_memory().unwrap();
        let p = projects::sample(&conn, "100% done_now");
        projects::sample(&conn, "other");
        let found = search(&conn, "%").unwrap();
        assert_eq!(found.len(), 1);
        assert_eq!(found[0].id, p.id);
        assert!(search(&conn, "   ").unwrap().is_empty());
    }

    #[test]
    fn snippet_is_short_and_centred() {
        let long = format!("{} needle {}", "a".repeat(300), "b".repeat(300));
        let s = snippet(&long, "needle");
        assert!(s.contains("needle"));
        assert!(s.starts_with('…') && s.ends_with('…'));
        assert!(s.chars().count() <= SNIPPET_CHARS + 2);
    }
}
