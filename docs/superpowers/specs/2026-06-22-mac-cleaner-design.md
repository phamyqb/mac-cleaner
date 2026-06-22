# mac-cleaner CLI — Design Spec
_Date: 2026-06-22_

## Overview

A Node.js interactive CLI tool for macOS storage cleanup. Scans disk usage across known cache/temp locations, presents a checkbox list with live sizes and safety labels, and runs selected cleanups with confirmations for risky operations.

## Goals

- Let the user see exactly how much each category occupies before deciding
- Group by safety level so the risk of each action is obvious
- Run safe items immediately; prompt separately for situational ones
- Print a clear summary of space freed after each run

## Non-Goals

- Cross-platform support (macOS only)
- Plugin/extension system (add new categories directly in `categories.js`)
- GUI or web interface

---

## Architecture

Single Node.js project, plain JavaScript (no TypeScript, no build step). Entry point registered as a global binary via `npm link`.

```
mac-cleaner/
├── package.json         # name: "mac-cleaner", bin: "./index.js"
├── index.js             # CLI entry point: orchestrates scan → select → clean → summary
├── src/
│   ├── categories.js    # array of category definitions
│   ├── scanner.js       # du-based size detection (runs all scans in parallel)
│   └── cleaners.js      # one async clean() function per category
└── README.md
```

---

## Category Definition

Each cleanup target is a plain object:

```js
{
  id: 'npm',
  label: 'npm cache',
  safetyLevel: 'safe',          // 'safe' | 'situational'
  description: '~/.npm/_cacache — regenerated automatically on next install',
  paths: ['~/.npm/_cacache'],   // used by scanner
  clean: async () => { ... },   // called by cleaners.js
}
```

### Safety Levels

| Level | Color | Behavior |
|---|---|---|
| `safe` | green | Runs immediately after checkbox confirm |
| `situational` | yellow | Shows warning + separate `y/N` confirm before running |

---

## Categories

| ID | Label | Safety | Command / Path |
|---|---|---|---|
| `npm` | npm cache | safe | `rm -rf ~/.npm/_cacache` |
| `yarn` | Yarn cache | safe | `yarn cache clean` |
| `pnpm` | pnpm store | safe | `pnpm store prune` |
| `cocoapods` | CocoaPods cache | safe | `pod cache clean --all` |
| `typescript` | TypeScript cache | safe | `rm -rf ~/Library/Caches/typescript` |
| `cypress` | Cypress cache | safe | `npx cypress cache clear` |
| `playwright` | Playwright cache | safe | `rm -rf ~/Library/Caches/ms-playwright-go` |
| `node-gyp` | node-gyp cache | safe | `rm -rf ~/Library/Caches/node-gyp` |
| `pip` | pip cache | safe | `pip cache purge` |
| `homebrew` | Homebrew old versions | safe | `brew cleanup` |
| `docker` | Docker images & volumes | situational | `docker system prune -a` (requires Docker running) |
| `simulators` | iOS Simulators | situational | `xcrun simctl delete unavailable` |
| `chrome` | Chrome cache | situational | `rm -rf ~/Library/Caches/Google/Chrome/Default/Cache` |
| `brave` | Brave cache | situational | `rm -rf ~/Library/Caches/BraveSoftware` |
| `rambox` | Rambox partitions | situational | `rm -rf ~/Library/Application Support/rambox/Partitions` |

---

## Data Flow

```
1. Startup
   └─ print banner (mac-cleaner v1.0.0)

2. Scan phase
   └─ run all category scan() functions in parallel (Promise.all)
   └─ each scan() returns { id, bytes } using `du -sk <path>`
   └─ show "Scanning..." spinner (ora) during this phase

3. Select phase
   └─ render Inquirer checkbox list
   └─ each item shows: [safety badge]  label  size
   └─ items ordered: safe first, situational below a separator
   └─ pre-check all "safe" items by default

4. Clean phase
   └─ for each selected item (in order):
       ├─ if safe → run clean() with ora spinner
       └─ if situational → print warning, prompt y/N, then run if confirmed
   └─ on error: print error message, mark item as failed, continue

5. Summary
   └─ print table: item | status (✔ cleared / ✗ failed / — skipped) | freed
   └─ print total freed
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `inquirer` | Checkbox multi-select prompt |
| `ora` | Spinner during scan and clean phases |
| `chalk` | Color output (safety labels, summary) |
| `execa` | Run shell commands safely (no shell injection) |

All are well-maintained, widely used npm packages.

---

## Error Handling

- **Command not found** (e.g. `pod`, `pip`, `docker` not installed): catch error, mark category as unavailable, skip silently — do not show in list.
- **Scan fails**: show `? B` (unknown) as size, still allow selection.
- **Clean fails**: print error inline, mark as failed in summary, continue with next item.
- **Docker not running**: detect before prompting, show warning "Docker is not running — start it first."

---

## Installation

```bash
cd ~/projects/mac-cleaner
npm install
npm link          # makes `mac-cleaner` available globally
mac-cleaner       # run it
```

Optional: publish a Homebrew tap later for install on other machines.

---

## UX Reference

```
mac-cleaner v1.0.0
Scanning disk usage... ✔

? Select items to clean: (Space to toggle, Enter to confirm)
❯ ◉  [safe]         npm cache              6.2 GB
  ◉  [safe]         Yarn cache             2.7 GB
  ◉  [safe]         pnpm store             855 MB
  ◉  [safe]         CocoaPods cache        2.4 GB
  ◉  [safe]         TypeScript cache       587 MB
  ◉  [safe]         Cypress cache          502 MB
  ◉  [safe]         Playwright cache       365 MB
  ◉  [safe]         node-gyp cache         122 MB
  ◉  [safe]         Homebrew cleanup       228 MB
  ─────────────────────────────────────────────────
  ◯  [situational]  Docker images         ~30 GB
  ◯  [situational]  iOS Simulators         5.3 GB
  ◯  [situational]  Rambox partitions      9.3 GB
  ◯  [situational]  Chrome cache           2.1 GB
  ◯  [situational]  Brave cache            987 MB

⚠  Docker prune removes ALL unused images and volumes. Continue? (y/N) y

  ✔  npm cache          6.2 GB freed
  ✔  Yarn cache         2.7 GB freed
  ✔  Docker images     28.1 GB freed
  ✗  pip cache          failed (pip not found)

Total freed: 37.0 GB
```
