//! Data shapes shared between the database and the UI.
//! Field names become camelCase in JSON (for example `project_id` → `projectId`).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub description: String,
    pub archived: bool,
    pub position: i64,
    pub open_task_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInput {
    pub name: String,
    pub color: String,
    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: i64,
    pub project_id: i64,
    pub project_name: String,
    pub project_color: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    pub position: i64,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskInput {
    pub title: String,
    #[serde(default)]
    pub description: String,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: i64,
    pub project_id: i64,
    pub title: String,
    pub body: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FileLink {
    pub id: i64,
    pub project_id: i64,
    pub path: String,
    pub label: String,
    pub is_dir: bool,
    /// Checked on disk each time the list is loaded.
    pub exists: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct MarkCounts {
    pub none: i64,
    #[serde(rename = "use")]
    pub use_: i64,
    pub maybe: i64,
    pub reject: i64,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MediaPack {
    pub id: i64,
    pub project_id: i64,
    pub name: String,
    pub source_path: String,
    pub library_path: String,
    pub item_count: i64,
    pub counts: MarkCounts,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MediaItem {
    pub id: i64,
    pub pack_id: i64,
    pub file_name: String,
    /// Full path of the copy inside the Library.
    pub path: String,
    pub kind: String,
    pub size_bytes: i64,
    pub mark: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPackInput {
    pub project_id: i64,
    pub source_path: String,
    /// Optional custom name. The folder name is used when empty.
    #[serde(default)]
    pub name: String,
    /// Move the originals to the Recycle Bin after every file was copied safely.
    #[serde(default)]
    pub trash_originals: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub pack: MediaPack,
    pub copied: usize,
    /// Files that could not be copied, with the reason.
    pub failed: Vec<String>,
    pub originals_trashed: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Post {
    pub id: i64,
    pub project_id: Option<i64>,
    pub project_name: Option<String>,
    pub project_color: Option<String>,
    pub title: String,
    pub platform: String,
    pub status: String,
    pub date: Option<String>,
    pub time: Option<String>,
    pub caption: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PostInput {
    pub project_id: Option<i64>,
    pub title: String,
    pub platform: String,
    pub status: String,
    pub date: Option<String>,
    pub time: Option<String>,
    #[serde(default)]
    pub caption: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    /// One of: project, task, note, post, file.
    pub kind: String,
    pub id: i64,
    pub project_id: Option<i64>,
    pub title: String,
    pub snippet: String,
}
