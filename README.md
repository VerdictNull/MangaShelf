# MangaShelf

A desktop manga reader for Windows built with Electron + React. Browse MangaDex, track your library, download chapters for offline reading, and pick up where you left off.

## Features

- Browse 80,000+ manga from MangaDex
- Library with read-status tracking (Reading, Completed, On Hold, Dropped, Plan to Read)
- Download chapters for offline reading
- Single-page, double-page, and webtoon (vertical scroll) reading modes
- Reading progress saved automatically — "Continue Reading" on the home screen
- Collections and favorites
- Dark mode and light coffee theme
- Command palette (`Ctrl+K`) for quick navigation
- CBZ / ZIP / CBR / PDF import for local manga

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- npm (comes with Node.js)
- Windows 10/11 x64

> **Linux / macOS:** dev mode works, but packaging targets are Windows-only by default.

## Getting Started

```bash
git clone https://github.com/YOUR_USERNAME/mangashelf.git
cd mangashelf

npm install

# Rebuild the native SQLite module for your Electron version (required once after install)
npm run rebuild

npm run dev
```

The app window will open automatically. Hot-reload is active — changes to renderer code reflect instantly.

## Building a Distributable

```bash
npm run package:win
```

Produces an NSIS installer (`MangaShelf Setup 1.0.0.exe`) and a portable executable in `dist/`. No install required for the portable version.

## Project Structure

```
src/
  main/        Electron main process — SQLite DB, IPC handlers, download service
  preload/     contextBridge API surface
  renderer/    React app — pages, components, stores
  shared/      TypeScript types shared between main and renderer
scripts/
  dev.js       Wraps electron-vite dev, removes ELECTRON_RUN_AS_NODE first
```

## Notes

**`npm run rebuild`** recompiles `better-sqlite3` (a native Node addon) for the specific Electron version bundled in the project. You only need to run this once after `npm install`, or again if you update the `electron` package version.

**`npm run dev`** uses `scripts/dev.js` instead of calling electron-vite directly. This is necessary because `electron-rebuild` leaves `ELECTRON_RUN_AS_NODE=1` in the shell, which causes Electron 32 to boot in Node mode (breaking all Electron APIs). The script deletes that variable before starting.

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 32 |
| Bundler | electron-vite |
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| State | Zustand |
| Database | better-sqlite3 (SQLite) |
| HTTP | axios + p-queue (rate limiter) |
| Query cache | TanStack Query |

## Releasing

Push a version tag to trigger a GitHub Actions build that packages and publishes a GitHub Release automatically.

### Steps

1. Bump the version in `package.json`:
   ```bash
   npm version patch   # 1.0.0 → 1.0.1  (bug fix)
   npm version minor   # 1.0.0 → 1.1.0  (new feature)
   npm version major   # 1.0.0 → 2.0.0  (breaking change)
   ```
   `npm version` updates `package.json`, commits, and creates a local git tag.

2. Push the commit and tag:
   ```bash
   git push origin main --follow-tags
   ```

3. GitHub Actions builds the Windows installer + portable and publishes them at:
   `https://github.com/YOUR_USERNAME/mangashelf/releases`

### First-time setup

Before releasing, update the `owner` and `repo` fields in the `"publish"` block in `package.json` to match your GitHub username and repo name. Then add a `GH_TOKEN` secret in **Settings → Secrets and variables → Actions** — a Personal Access Token with `repo` scope. The workflow's `permissions: contents: write` block also allows the auto-provided `GITHUB_TOKEN` to work without a PAT if you prefer.

### Auto-update behaviour

| Installation | Auto-updates |
|---|---|
| NSIS installer (`MangaShelf Setup x.x.x.exe`) | Yes — downloads silently, installs on next quit |
| Portable (`MangaShelf x.x.x.exe`) | No — portable builds cannot self-update |

Installed copies check for a new release ~10 seconds after launch. If one is found it downloads in the background and a system notification appears when it's ready. The update installs automatically the next time MangaShelf is closed.
