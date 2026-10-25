# PLAN — "Juggle" (working name)

A desktop app that keeps projects, tasks, deadlines, notes, files and photo packs in one place.
Windows first. Linux and Mac later. Works offline. All data stays on your computer.

> "Juggle" is only a working name. Before you publish, choose the final name and check that no one else uses it as a trademark.

---

## 1. MVP — what we build now (8 features)

> Approved on 2026-10-25. The owner added the content calendar and global search to the MVP.

### Base (needed by every feature)

- App window with a sidebar: **Today**, list of **Projects**, **Settings**.
- **Themes:** Light / Dark / System switch, plus 6 accent colour presets (for example Ocean, Forest, Sunset, Grape, Rose, Graphite). Each project also gets its own colour.
- Local SQLite database. Data stays after you restart the app.

### Feature 1 — Projects

- Create, rename, colour, archive, and delete a project (delete asks you to confirm first).
- Examples: "Boss Instagram", "Game server VK/FB", "My YouTube Shorts".
- The project page has tabs: **Board · Notes · Files · Media**.

### Feature 2 — Tasks with a Kanban board

- Columns: **To do → Doing → Done**. Drag cards between columns and up or down inside a column.
- A task has a title, a description, a priority (low / normal / high), and an optional deadline.
- Switch between the **Board** view and a simple **List** view.

### Feature 3 — Deadlines and the "Today" screen

- One screen for all projects: **Overdue**, **Today**, **This week**, **Later / no date**.
- Overdue tasks are shown in red. Click a task to open it.

### Feature 4 — Notes

- Each project has many notes, written in Markdown, with an Edit / Preview switch.
- Notes save automatically while you type.

### Feature 5 — Files and folders

- Link any file or folder to a project. The app stores only the **path**. It does not copy the file.
- Buttons: "Open" (opens the file in its normal program) and "Show in folder".
- If a file was moved or deleted, the app shows it as "missing".

### Feature 6 — Media pack sorter (photos and videos)

Built for packs of about 1000 files (PNG, JPG, MP4, and also JPEG, WEBP, MOV).

1. **Import a pack:** pick a folder and a project. The app **copies** every file into its own safe
   **Library folder** (default: `Pictures\Juggle Library\<project>\<pack name>\`) and checks that each copy is complete.
2. **Optional:** "Move originals to the Recycle Bin after a safe copy" (off by default). Originals go to
   the Recycle Bin, so they are **never deleted permanently**.
3. **Sort:** a fast grid with small thumbnails. Mark each file **Use / Maybe / Reject** with the mouse
   or with the keys `1` `2` `3`. Use the arrow keys to move, and `Space` to open a big preview (videos play).
4. **Filter** by mark. You can see counts such as "Use: 24 · Maybe: 60 · Reject: 300 · Not sorted: 616".
5. **Export chosen:** copy all "Use" files to a folder you pick (for example, to post them).

- The app **never deletes** files in the Library during the MVP.
- Honest limit: the app cannot stop someone from deleting the Library folder in Windows Explorer.
  Backup is in the "Later" list.

### Feature 7 — Content calendar

- A month view (and an "Upcoming" list) of planned posts.
- A post has a title, a **platform** (Instagram, VK, Facebook, YouTube Shorts, Other), a **status**
  (Idea → Draft → Scheduled → Posted), a date, an optional time, a caption, and a project.
- Each platform has its own colour. You can filter by platform and by project.
- Task deadlines are also shown in the calendar (in grey), so you see everything for a day.

### Feature 8 — Global search

- A search box at the top (shortcut `Ctrl+K`) that finds projects, tasks, notes, posts, and linked files
  by text.
- Click a result to open it.
- How: simple SQLite text search (`LIKE`). It is fast enough for personal data (thousands of items) and
  needs no extra tables.

### Not in the MVP (on purpose)

No internet, no accounts, no payments, no cloud sync, no analytics. No demo data inside the app.
Test data exists only inside the tests and is clearly labelled.

---

## 2. Later (ideas for after the MVP)

**Next version (v1.1), suggested order:**

1. **AI assistant** (needs internet and your own API key, for example Claude by Anthropic). Ideas:
   - "Plan this project": turns a goal into tasks with deadlines.
   - Writes captions and post ideas for Instagram / VK / Facebook / Shorts.
   - Summarises notes.
   - **Code check:** for a project linked to a code folder, it reads the code and tells you what is
     broken and what needs to be reworked.
   - Rules: off by default, the API key is stored in the Windows Credential Manager (not in the
     database), and the app shows you exactly what will be sent before it sends anything.
2. Attach media from a pack to a calendar post.
3. Faster ranked search (SQLite FTS5) if the simple search gets slow.

**After that:**

- Backup and restore (one button, one zip file), plus export to JSON / CSV.
- Clean up rejected media (send to the Recycle Bin after you confirm).
- More languages (Russian and others). From day one, all UI text lives in one file, so this will be easy.
- Mac and Linux installers.
- Auto-update, and license keys for selling (for example Gumroad license keys).
- Recurring tasks, subtasks and checklists, tags, reminders and notifications.
- Custom Kanban columns. More theme presets.

**Why the AI is not in the MVP:** it needs internet, an API key (an account), and it costs money for
each request. Your rules say "no accounts or internet in the MVP". I will design the code so the AI can
plug in later without big changes. If you want the AI in the MVP anyway, tell me and I will update this plan.

---

## 3. Tech stack and why

| Part          | Choice                                  | Why                                                                                                                                                       |
| ------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop shell | **Tauri 2**                             | Small installer (about 10 MB compared with about 100 MB for Electron), low memory use, builds for Windows, Mac and Linux.                                 |
| UI            | **React 19 + TypeScript + Vite**        | Popular, many examples, TypeScript catches mistakes early. Vite is fast.                                                                                  |
| Database      | **SQLite through `rusqlite` (in Rust)** | One local file, very reliable. Doing the database work in Rust (not in the UI) keeps the data rules in one place and lets us test them with `cargo test`. |
| File work     | **Rust**                                | Copying 1000 files, making thumbnails, and using the Recycle Bin are faster and safer in Rust.                                                            |
| Styling       | **Plain CSS with CSS variables**        | Themes are just variable swaps. No extra framework to learn.                                                                                              |

Your choice (Tauri + React + TS + SQLite) is good. I only add one detail: the SQLite code lives in Rust,
not in JavaScript.

**Database tables** (the first version of the schema; if it needs to change later, I will ask you first):
`projects`, `tasks`, `notes`, `file_links`, `media_packs`, `media_items`, `posts`, `settings`.
Each table has `created_at` and `updated_at`. Schema versions are tracked with SQLite's `user_version`,
so future changes can be applied safely.

---

## 4. Dependencies (only these will be installed)

### JavaScript: runtime

| Package                                                    | Purpose                                     |
| ---------------------------------------------------------- | ------------------------------------------- |
| `react`, `react-dom`                                       | UI                                          |
| `@tauri-apps/api`                                          | Talk to the Rust side                       |
| `@tauri-apps/plugin-dialog`                                | "Pick a folder or file" windows             |
| `@tauri-apps/plugin-opener`                                | Open files and "Show in folder"             |
| `react-router-dom`                                         | Move between pages                          |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Kanban drag and drop                        |
| `@tanstack/react-virtual`                                  | Smooth grid for 1000+ media files           |
| `react-markdown`, `remark-gfm`                             | Show notes as Markdown (safe: no raw HTML)  |
| `date-fns`                                                 | Date maths (deadlines, calendar month grid) |
| `lucide-react`                                             | Icons                                       |

### JavaScript: development only

`typescript`, `vite`, `@vitejs/plugin-react`, `@tauri-apps/cli`, `vitest`, `jsdom`,
`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`,
`eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `prettier`,
`@types/react`, `@types/react-dom`

### Rust crates

| Crate                                                      | Purpose                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| `tauri` (with the `protocol-asset` feature), `tauri-build` | App shell, and showing local images and videos               |
| `tauri-plugin-dialog`, `tauri-plugin-opener`               | Rust side of the two plugins above                           |
| `serde`, `serde_json`                                      | Send data between Rust and the UI                            |
| `rusqlite` (with the `bundled` feature)                    | SQLite (bundled, so users don't need to install anything)    |
| `thiserror`                                                | Clear error messages                                         |
| `image` (PNG, JPEG and WEBP only)                          | Make thumbnails                                              |
| `trash`                                                    | Move originals to the Recycle Bin (never delete permanently) |
| `tempfile` (tests only)                                    | Temporary folders in tests                                   |

### Tools (not app dependencies)

- On **your** PC: Node.js 20+ (LTS), Rust (stable), and the Microsoft C++ Build Tools / WebView2
  (Tauri's setup guide explains this; Windows 11 already has WebView2).
- In my **cloud container** (Linux) I will install the Tauri system libraries (`libwebkit2gtk-4.1-dev`
  and similar) with `apt`. This changes only my container, not your project.
- **GitHub Actions** (a file in `.github/workflows/`): on each push it runs the tests and builds a
  **Windows installer**. This proves the app builds on Windows, because I can't run Windows here.

---

## 5. Folder structure

```
juggle/
├─ PLAN.md  CLAUDE.md  README.md  LICENSE(later)
├─ package.json  vite.config.ts  tsconfig.json  eslint.config.js  .prettierrc
├─ index.html
├─ .github/workflows/ci.yml       # tests + Windows build
├─ src/                           # React UI
│  ├─ main.tsx  App.tsx
│  ├─ api/                        # typed calls to Rust (one file per area)
│  ├─ components/                 # shared UI parts (Button, Modal, Sidebar…)
│  ├─ features/
│  │  ├─ projects/  tasks/  today/  notes/  files/  media/  calendar/  search/  settings/
│  ├─ theme/                      # CSS variables, presets, theme switch
│  ├─ i18n/en.ts                  # all UI text (ready for more languages)
│  ├─ lib/                        # helpers (dates, formatting)
│  └─ test/                       # test setup
└─ src-tauri/                     # Rust side
   ├─ Cargo.toml  tauri.conf.json  capabilities/  icons/
   └─ src/
      ├─ main.rs  lib.rs
      ├─ db/            # connection + migrations
      ├─ models/        # Rust structs (Project, Task…)
      ├─ commands/      # functions the UI can call
      └─ media/         # import, thumbnails, export
```

---

## 6. How I will build and check it

- One git commit for each finished feature, with a clear message.
- Rust tests: database rules, migrations, and media import (copy, verify, never overwrite).
- UI tests: Today grouping, Kanban moves, theme switch.
- Commands checked: `npm run lint`, `npm test`, `cargo test`, `npm run tauri build`.
  I will also start the app on Linux in my container and take a screenshot. The Windows build is checked
  by GitHub Actions.
- Run on your PC with one command: `npm install` once, then `npm run tauri dev`.

---

## 7. Needed later to publish (short list)

- **Final name and icon.** Check the trademark and domain.
- **Code signing for Windows.** Without it, Windows SmartScreen shows a warning. Options: Azure Trusted
  Signing (about $10/month) or an OV/EV certificate ($100–400/year).
  The Microsoft Store signs apps for you.
- **Microsoft Store:** Partner Center developer account (free for individuals at the moment, check before
  you sign up), age rating, store screenshots, privacy policy URL.
- **Mac:** Apple Developer Program ($99/year), signing and notarization. The Mac App Store also needs
  the "sandbox", which limits file access, so the Files and Media features need extra work there.
- **Gumroad (or similar):** a seller account, signed installers, and license keys (Gumroad has a
  license API).
- **Licenses:** pick a license for your own code (usually a proprietary EULA if you sell it). Keep the
  third-party license notices (our dependencies are mostly MIT / Apache-2.0, which allow this).
- **Privacy policy:** easy for the MVP (no data leaves the PC). Needed in more detail once the AI feature
  sends data online.
- **Auto-updater** (`tauri-plugin-updater`) and a place to host updates, for versions outside the stores.

---

## 8. Decisions

- Name: **Juggle** (working name).
- AI: **Later** (v1.1).
- Content calendar and global search: **in the MVP**.
- GitHub: the owner is connecting it. The code will be pushed when access works.
