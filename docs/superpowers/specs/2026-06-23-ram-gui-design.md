# mac-cleaner GUI + RAM Optimizer — Design Spec
_Date: 2026-06-23_

## Overview

Extend `@phamyqb/mac-cleaner` with a RAM monitoring and optimization GUI — a transparent floating HUD overlay + menu bar icon, modeled after Memory Meter 3 (App Store). The existing CLI remains fully intact and unchanged. The GUI is an opt-in mode launched via `--gui`.

## Goals

- Live RAM stats in the menu bar and a transparent floating HUD panel
- Identify and kill top RAM-consuming processes
- One-click memory cleanup (`purge` via native sudo dialog)
- Auto-trigger cleanup when memory pressure hits a configurable threshold
- Reuse all existing disk cleaner logic (`categories.js`, `cleaners.js`, `scanner.js`) inside the GUI
- No `.app` installation — runs via `npx @phamyqb/mac-cleaner --gui`, bypassing Gatekeeper

## Non-Goals

- Cross-platform support (macOS only)
- Native Swift rewrite
- Storing or caching sudo credentials
- Packaging as a signed/notarized `.app` bundle

---

## Architecture

### Two runtime modes, one package

```
npx @phamyqb/mac-cleaner         → existing interactive CLI (unchanged)
npx @phamyqb/mac-cleaner --gui   → launches Electron GUI
```

`index.js` detects `--gui` at the top and spawns Electron. Everything below that branch is the existing CLI code, untouched.

```js
if (process.argv.includes('--gui')) {
  const { spawn } = await import('node:child_process')
  const { default: electronPath } = await import('electron')
  spawn(electronPath, ['gui/main.js'], { stdio: 'inherit' })
  process.exit()
}
```

### Project structure

```
mac-cleaner/
├── index.js                    # entry: --gui → Electron, else existing CLI
├── src/
│   ├── categories.js           # unchanged
│   ├── scanner.js              # unchanged
│   ├── cleaners.js             # unchanged
│   └── ram/
│       ├── stats.js            # reads vm_stat, sysctl, memory_pressure
│       └── processes.js        # reads top RAM consumers via ps
├── gui/
│   ├── main.js                 # Electron main: Tray, BrowserWindow, IPC, poller
│   ├── preload.js              # contextBridge — exposes safe IPC to renderer
│   └── renderer/
│       ├── index.html
│       ├── main.jsx
│       ├── App.jsx
│       └── components/
│           ├── RamGauge.jsx    # donut gauge + bar breakdown
│           ├── ProcessList.jsx # top 8 RAM consumers with Kill button
│           ├── DiskCleaner.jsx # existing categories rendered as checkboxes
│           └── Settings.jsx    # threshold, auto-clean, notification toggles
├── vite.config.js
└── package.json                # adds electron, react, vite as deps
```

---

## Components

### Electron main process (`gui/main.js`)

Three responsibilities:

1. **Tray icon** — updates every 2s with live RAM % (e.g. `64%`). Single click opens/closes the HUD window.
2. **HUD BrowserWindow** — `transparent: true`, `frame: false`, `alwaysOnTop: true`, `vibrancy: 'under-window'` (native macOS blur). Positioned below the menu bar on first open, remembers last position across sessions.
3. **Background poller** — `setInterval` every 5s reads memory pressure level. Fires a native macOS notification on `warn` or `critical`. If auto-clean is enabled and pressure is `critical`, runs `purge` silently.

### IPC channels (main ↔ renderer via `contextBridge`)

| Channel | Direction | Payload |
|---|---|---|
| `ram:stats` | main → renderer push | `{ used, free, wired, compressed, total, pressureLevel }` |
| `ram:processes` | main → renderer push | `[{ pid, name, memMB }]` top 8 |
| `ram:clean` | renderer → main | triggers `sudo purge` via `osascript` |
| `process:kill` | renderer → main | `{ pid }` |
| `disk:scan` | renderer → main | returns sizes map (reuses `scanner.js`) |
| `disk:clean` | renderer → main | `{ ids[] }` runs selected cleaners |
| `settings:get/set` | both | threshold %, auto-clean toggle, notification toggle |

### RAM data sources (`src/ram/stats.js`)

| Command | Data extracted |
|---|---|
| `vm_stat` | free / active / inactive / wired / compressed pages |
| `sysctl hw.memsize` | total physical RAM in bytes |
| `memory_pressure` | pressure level string: `normal` / `warn` / `critical` |

All shell-command based — no native addons, no compilation step.

### RAM process list (`src/ram/processes.js`)

```bash
ps -axo pid,comm,rss --sort=-rss
```

Returns top 8 processes by RSS (resident set size). Filters out kernel tasks (`pid == 0`).

### Renderer UI — four tabs

| Tab | Content |
|---|---|
| **RAM** | Donut gauge (used % of total) + stacked bar (used / wired / compressed / free) + memory pressure badge + "Clean Memory" button |
| **Processes** | Live list: process name, RAM in MB, Kill button per row |
| **Disk** | Checkbox list of categories from `categories.js` with sizes + "Clean Selected" button |
| **Settings** | Auto-trigger threshold slider (60–90%), auto-clean toggle, notification toggle |

### Auto-trigger flow

```
poller (5s) → memory_pressure output
  normal   → no action
  warn     → macOS notification: "Memory pressure is high"
  critical → if auto-clean ON  → run purge silently, notify "Memory cleaned automatically"
             if auto-clean OFF → notification with "Clean Now" action button
```

---

## sudo / `purge` approach

`purge` requires root. We use a one-shot `osascript` call so macOS handles the credential dialog natively (Touch ID or password). No credentials are stored by the app.

```js
osascript -e 'do shell script "purge" with administrator privileges'
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| `vm_stat` / `memory_pressure` fails | Show `--` in UI, retry next poll cycle silently |
| `purge` sudo cancelled by user | Show toast: "Clean cancelled" |
| `kill` fails (process already gone) | Catch, refresh process list, no crash |
| Disk cleaner item fails | Mark as failed in summary, continue with others (same as CLI) |
| Electron not in node_modules | `--gui` branch prints: `"Run npm install first to use the GUI"` |
| HUD loses focus | Window stays open — close only via tray click or ✕ button |

---

## Dependencies added

| Package | Purpose |
|---|---|
| `electron` | GUI runtime — Tray, BrowserWindow, IPC, native notifications |
| `react` + `react-dom` | Renderer UI |
| `vite` + `@vitejs/plugin-react` | Bundles renderer into `dist/renderer/` |

All existing dependencies (`chalk`, `ora`, `@inquirer/prompts`) remain for the CLI path.

---

## Testing

Existing test runner (`node --test`) is extended with:

| File | Covers |
|---|---|
| `test/ram/stats.test.js` | Parses `vm_stat` and `memory_pressure` output from fixture strings |
| `test/ram/processes.test.js` | Parses `ps` output into `[{ pid, name, memMB }]` |
| `test/scanner.test.js` | Existing — unchanged |

Electron renderer is not unit-tested. All testable logic lives in pure functions in `src/ram/`.

---

## UX Reference

```
[Menu bar]  🧠 64%   ← tray icon, updates every 2s

[HUD panel — transparent, frameless, frosted glass]
┌─────────────────────────────────────┐
│  mac-cleaner          [RAM][DISK][⚙]│
│                                     │
│   ████████░░  6.4 / 8.0 GB         │
│   Pressure: ● normal                │
│                                     │
│   Wired      1.2 GB                 │
│   Compressed 0.4 GB                 │
│   Free       1.6 GB                 │
│                                     │
│   [ Clean Memory ]                  │
└─────────────────────────────────────┘

[Processes tab]
│  Chrome Helper     812 MB  [Kill]   │
│  Slack             634 MB  [Kill]   │
│  Xcode             580 MB  [Kill]   │
│  ...                                │

[Settings tab]
│  Auto-trigger threshold:  [====75%] │
│  Auto-clean:              [ON ]     │
│  Notifications:           [ON ]     │
```
