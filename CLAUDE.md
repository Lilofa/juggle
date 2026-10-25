# Juggle — notes for AI assistants and developers

Desktop app (Tauri 2 + React 19 + TypeScript + SQLite) that organizes projects, tasks, notes,
linked files, photo/video packs and a content calendar. **Offline, local data only.**
Owner: a content creator (Instagram, VK/Facebook game-server posts, YouTube Shorts). Windows first.
The owner reads English as a second language: explain choices in simple English.

## Commands

```bash
npm install                 # once
npm start                   # run the app (tauri dev)
npm test                    # UI tests (Vitest + Testing Library)
npm run lint                # ESLint + Prettier check   (npm run format to fix)
npm run typecheck           # tsc --noEmit
cd src-tauri && cargo test  # Rust tests (needs ../dist to exist: mkdir -p dist)
cd src-tauri && cargo clippy --all-targets -- -D warnings && cargo fmt --check
npm run tauri build         # release build + installers
```

Before saying "done": run lint, typecheck, `npm test`, `cargo test`, clippy, and a build.

## Structure

```
src/                       React UI
  api/                     typed wrappers around Rust commands (one file per area)
    client.ts              call() = invoke; mutate() = invoke + tell screens to reload
    types.ts               mirrors src-tauri/src/models.rs — keep them in sync
  features/<area>/         screens: projects, tasks, today, notes, files, media, calendar, search, settings
  components/              shared UI (Modal, ConfirmDialog, Toast, Sidebar…)
  lib/                     pure helpers (dates, board drag logic, useData hook) — unit tested
  theme/                   theme presets + ThemeProvider (CSS variables in styles.css)
  i18n/en.ts               ALL user-visible text. Never hard-code UI strings in components.
src-tauri/src/
  lib.rs                   app setup + list of commands
  commands/                thin #[tauri::command] functions (data.rs, media.rs)
  db/                      SQL per area + migrations/ (schema)
  media/                   file copy/verify, thumbnails, export, Recycle Bin
  models.rs, error.rs, validate.rs, state.rs
```

## Rules (from the owner — follow them)

- Build only what is in the approved `PLAN.md`. New features → add to "Later" and ask first.
- **Ask before:** adding any dependency, changing the database schema, deleting files,
  or anything that sends data to the internet.
- No accounts, payments, cloud sync, analytics. No demo data in the app (test data only in tests, labelled).
- Commit after each finished feature or fix, with a clear message.

## Conventions

- **Database:** add a new file in `src-tauri/src/db/migrations/` and append it to `MIGRATIONS` in
  `db/mod.rs`. Never edit an existing migration. Schema version = `PRAGMA user_version`.
  Dates: `YYYY-MM-DD` text for days, UTC ISO strings for timestamps.
- **Rust:** logic in `db/*` / `media/*` functions that take `&Connection` (testable with
  `open_in_memory()`); commands stay thin. Return `AppResult<T>`. Never hold the DB lock during slow file work.
- **Files are sacred:** never overwrite (`create_new` + " (2)" names), verify copies, never delete user
  files — only `trash` (Recycle Bin) when the user asked. Removing a link/pack removes only the DB row.
- **Opening files** goes through Rust commands by id (`open_file_link`, `open_media_item`), so the UI
  cannot open arbitrary paths. The asset protocol scope is set at runtime (thumbnails + pack folders).
- **UI data:** `useData(loader, deps)` loads and reloads after any `mutate()`. Use `call()` for
  high-frequency updates (note autosave, media marks) and update local state yourself.
- **Routing:** HashRouter. Inside `/projects/:id/*` always use **absolute** paths (relative ones stack up).
- Don't rotate/scale the drag overlay (`.task-card.overlay`): it breaks keyboard drag.
- Weeks start on Monday. Platforms: instagram, vk, facebook, youtube_shorts, other.

## Known limitations

- Linux WebKitGTK cannot play video from the asset protocol → film icon + "Open in default app".
- Native file/folder dialogs can't be automated in e2e tests; those flows call the same Rust commands directly.
