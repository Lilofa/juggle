# Juggle

A desktop app that keeps your **projects, tasks, deadlines, notes, files, photo/video packs and
content calendar** in one place. Everything is stored **only on your computer** — no internet,
no account, no tracking.

Built with Tauri 2 (Rust) + React + TypeScript + SQLite. Windows first; Linux and Mac later.

## Features

|                      |                                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Projects**         | Colour, description, archive. Tabs: Board · Notes · Files · Media.                                                                                                                                                                                                              |
| **Tasks**            | Kanban board (To do → Doing → Done) with drag and drop (mouse or keyboard), list view, priority, deadline.                                                                                                                                                                      |
| **Today**            | All open tasks from every project: Overdue, Today, This week, Later, No deadline.                                                                                                                                                                                               |
| **Notes**            | Markdown notes per project, saved automatically while you type.                                                                                                                                                                                                                 |
| **Files**            | Link files and folders to a project (only the path is saved). Open / Show in folder. Missing files are marked.                                                                                                                                                                  |
| **Media packs**      | Import a folder of photos and videos (PNG, JPG, JPEG, WEBP, MP4, MOV). Juggle **copies** them into its Library folder and checks every copy. Sort with keys `1` Use · `2` Maybe · `3` Reject · `0` Clear, `Space` for a big preview, then export the "Use" files to any folder. |
| **Content calendar** | Month view of planned posts for Instagram, VK, Facebook, YouTube Shorts, with status (Idea → Draft → Scheduled → Posted), time and caption. Task deadlines are shown too.                                                                                                       |
| **Search**           | `Ctrl+K` searches projects, tasks, notes, posts and linked files (works for Cyrillic too).                                                                                                                                                                                      |
| **Themes**           | Light / Dark / Same as system, and 6 accent colours.                                                                                                                                                                                                                            |

### Your files are safe

- Import **copies**; it never overwrites a file (name clashes become `photo (2).png`).
- Originals are moved to the **Recycle Bin** only if you tick that option _and_ every file was copied correctly.
- Juggle never deletes your files. "Remove link" and "Remove pack from Juggle" only remove the entry in the app.

## Run it on Windows

**One-time setup** (about 15 minutes):

1. Install **Node.js 20 or newer** (LTS): https://nodejs.org
2. Install **Rust**: https://rustup.rs (choose the default options)
3. Install **Microsoft C++ Build Tools** with "Desktop development with C++"
   (see https://tauri.app/start/prerequisites/ — Windows 10/11 already have WebView2)
4. In this folder, run once: `npm install`

**Start the app** (one command):

```
npm start
```

The first start compiles the Rust part and takes a few minutes; later starts are fast.

**Build an installer** (`.msi` and `.exe` in `src-tauri/target/release/bundle/`):

```
npm run tauri build
```

Every push to GitHub also builds the Windows installer automatically (GitHub → Actions → the run → _Artifacts_).

## Where your data lives

| What                                               | Windows                                             | Linux                                           |
| -------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Database (projects, tasks, notes, posts, settings) | `%APPDATA%\app.juggle.desktop\juggle.db`            | `~/.local/share/app.juggle.desktop/juggle.db`   |
| Media Library (copied packs)                       | `Pictures\Juggle Library\` (changeable in Settings) | `~/Pictures/Juggle Library/`                    |
| Thumbnail cache (safe to delete)                   | `%APPDATA%\app.juggle.desktop\thumbnails\`          | `~/.local/share/app.juggle.desktop/thumbnails/` |

To back up everything, close Juggle and copy the database file and the Library folder.

## Development

| Command                      | What it does                                            |
| ---------------------------- | ------------------------------------------------------- |
| `npm start`                  | Run the app in development mode (hot reload for the UI) |
| `npm test`                   | UI unit tests (Vitest)                                  |
| `cd src-tauri && cargo test` | Rust tests: database, migrations, media import/export   |
| `npm run lint`               | ESLint + Prettier check                                 |
| `npm run typecheck`          | TypeScript check                                        |
| `npm run tauri build`        | Release build and installers                            |

See `CLAUDE.md` for the project structure and rules, and `PLAN.md` for the roadmap.

## Known limitations

- **Linux only:** videos cannot play _inside_ the app (WebKitGTK limitation). The tile shows a film
  icon; use "Open in default app". On Windows (WebView2) MP4 should play inside the app —
  this was not tested yet, please check it on your PC.
- Not yet: backup button, recurring tasks, reminders, AI assistant, more languages — see `PLAN.md` → "Later".
