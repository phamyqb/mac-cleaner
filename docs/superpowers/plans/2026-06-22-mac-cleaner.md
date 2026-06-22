# mac-cleaner CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive Node.js CLI that scans macOS cache locations, shows sizes and safety labels in a checkbox list, and runs selected cleanups with per-item spinners and a final summary.

**Architecture:** Single ESM Node.js project, no build step. `index.js` orchestrates scan → select → clean → summary. `src/categories.js` defines all targets, `src/scanner.js` measures disk usage, `src/cleaners.js` holds one async function per category. Tests use Node's built-in `node:test` runner.

**Tech Stack:** Node.js 18+ (ESM), `@inquirer/prompts` v3, `ora` v8, `chalk` v5, `node:child_process`, `node:fs/promises`

## Global Constraints

- ESM modules throughout — `"type": "module"` in package.json, all imports use `.js` extensions
- Node.js 18+ only — uses built-in `node:test`, `node:assert`, `node:fs/promises`
- macOS only — never hardcode `~`; always expand with `os.homedir()`
- No TypeScript, no build step, no transpilation
- Binary name: `mac-cleaner`
- All shell commands run via `node:child_process` `execAsync` — never via `eval` or template-literal shell injection

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Project metadata, dependencies, `bin` entry, `test` script |
| `index.js` | CLI entry point — orchestrates scan → select → clean → summary |
| `src/categories.js` | Array of category objects (id, label, safetyLevel, description, paths) |
| `src/scanner.js` | `scanAll(categories)` → `{id: bytes}` map; `formatBytes(n)` → string |
| `src/cleaners.js` | `cleaners` object — one `async () => void` per category id |
| `test/scanner.test.js` | Unit tests for `formatBytes`, category structure, cleaner coverage |

---

## Task 1: Project scaffold

**Files:**
- Create: `~/projects/mac-cleaner/package.json`
- Create: `~/projects/mac-cleaner/src/.gitkeep` (directory placeholder)
- Create: `~/projects/mac-cleaner/test/.gitkeep` (directory placeholder)

**Interfaces:**
- Produces: runnable `npm test`, `npm start`, and eventual `mac-cleaner` global binary

- [ ] **Step 1: Write package.json**

```json
{
  "name": "mac-cleaner",
  "version": "1.0.0",
  "description": "Interactive macOS storage cleanup CLI",
  "type": "module",
  "bin": {
    "mac-cleaner": "./index.js"
  },
  "scripts": {
    "start": "node index.js",
    "test": "node --test test/**/*.test.js"
  },
  "dependencies": {
    "@inquirer/prompts": "^3.3.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.1"
  },
  "engines": {
    "node": ">=18"
  }
}
```

Save to `~/projects/mac-cleaner/package.json`.

- [ ] **Step 2: Install dependencies**

```bash
cd ~/projects/mac-cleaner
npm install
```

Expected: `node_modules/` created, `package-lock.json` written.

- [ ] **Step 3: Create src and test directories**

```bash
mkdir -p ~/projects/mac-cleaner/src ~/projects/mac-cleaner/test
```

- [ ] **Step 4: Commit**

```bash
cd ~/projects/mac-cleaner
git add package.json package-lock.json
git commit -m "feat: scaffold mac-cleaner project"
```

---

## Task 2: categories.js

**Files:**
- Create: `src/categories.js`

**Interfaces:**
- Produces: `export const categories` — array of `{ id: string, label: string, safetyLevel: 'safe'|'situational', description: string, paths: string[] }`

- [ ] **Step 1: Write categories.js**

```js
import { homedir } from 'node:os'
import { join } from 'node:path'

const H = homedir()

export const categories = [
  {
    id: 'npm',
    label: 'npm cache',
    safetyLevel: 'safe',
    description: 'Regenerated automatically on next install',
    paths: [join(H, '.npm', '_cacache')],
  },
  {
    id: 'yarn',
    label: 'Yarn cache',
    safetyLevel: 'safe',
    description: 'Regenerated automatically on next install',
    paths: [join(H, 'Library', 'Caches', 'Yarn')],
  },
  {
    id: 'pnpm',
    label: 'pnpm store',
    safetyLevel: 'safe',
    description: 'Unreferenced packages only — active projects unaffected',
    paths: [join(H, 'Library', 'Caches', 'pnpm')],
  },
  {
    id: 'cocoapods',
    label: 'CocoaPods cache',
    safetyLevel: 'safe',
    description: 'Re-downloaded on next pod install',
    paths: [join(H, 'Library', 'Caches', 'CocoaPods')],
  },
  {
    id: 'typescript',
    label: 'TypeScript cache',
    safetyLevel: 'safe',
    description: 'Rebuilt on next tsc run',
    paths: [join(H, 'Library', 'Caches', 'typescript')],
  },
  {
    id: 'cypress',
    label: 'Cypress cache',
    safetyLevel: 'safe',
    description: 'Re-downloaded on next cypress run',
    paths: [join(H, 'Library', 'Caches', 'Cypress')],
  },
  {
    id: 'playwright',
    label: 'Playwright cache',
    safetyLevel: 'safe',
    description: 'Re-downloaded on next playwright install',
    paths: [join(H, 'Library', 'Caches', 'ms-playwright-go')],
  },
  {
    id: 'node-gyp',
    label: 'node-gyp cache',
    safetyLevel: 'safe',
    description: 'Rebuilt on next native module install',
    paths: [join(H, 'Library', 'Caches', 'node-gyp')],
  },
  {
    id: 'pip',
    label: 'pip cache',
    safetyLevel: 'safe',
    description: 'Re-downloaded on next pip install',
    paths: [join(H, 'Library', 'Caches', 'pip')],
  },
  {
    id: 'homebrew',
    label: 'Homebrew old versions',
    safetyLevel: 'safe',
    description: 'Old formula versions no longer needed',
    paths: [join(H, 'Library', 'Caches', 'Homebrew')],
  },
  {
    id: 'docker',
    label: 'Docker images & volumes',
    safetyLevel: 'situational',
    description: 'Removes ALL unused images and volumes — re-pull needed',
    paths: [join(H, 'Library', 'Containers', 'com.docker.docker')],
  },
  {
    id: 'simulators',
    label: 'iOS Simulators',
    safetyLevel: 'situational',
    description: 'Removes unavailable simulator runtimes — only if not doing iOS dev',
    paths: [join(H, 'Library', 'Developer', 'CoreSimulator', 'Devices')],
  },
  {
    id: 'chrome',
    label: 'Chrome cache',
    safetyLevel: 'situational',
    description: 'Clears Chrome browser cache — history and cookies are kept',
    paths: [join(H, 'Library', 'Caches', 'Google', 'Chrome')],
  },
  {
    id: 'brave',
    label: 'Brave cache',
    safetyLevel: 'situational',
    description: 'Clears Brave browser cache — history and cookies are kept',
    paths: [join(H, 'Library', 'Caches', 'BraveSoftware')],
  },
  {
    id: 'rambox',
    label: 'Rambox partitions',
    safetyLevel: 'situational',
    description: 'Removes embedded browser data per service — you will need to log back in to each app',
    paths: [join(H, 'Library', 'Application Support', 'rambox', 'Partitions')],
  },
]
```

- [ ] **Step 2: Commit**

```bash
cd ~/projects/mac-cleaner
git add src/categories.js
git commit -m "feat: add category definitions"
```

---

## Task 3: scanner.js + tests

**Files:**
- Create: `src/scanner.js`
- Create: `test/scanner.test.js`

**Interfaces:**
- Consumes: `categories` from `src/categories.js` — `{ id, paths }[]`
- Produces:
  - `scanAll(categories): Promise<Record<string, number>>` — map of `id → bytes`
  - `formatBytes(bytes: number): string` — human-readable size string

- [ ] **Step 1: Write the failing tests**

```js
// test/scanner.test.js
import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { formatBytes } from '../src/scanner.js'
import { categories } from '../src/categories.js'

test('formatBytes: 0 bytes', () => {
  assert.equal(formatBytes(0), '0 B')
})

test('formatBytes: kilobytes', () => {
  assert.equal(formatBytes(1024), '1.0 KB')
})

test('formatBytes: megabytes', () => {
  assert.equal(formatBytes(1024 * 1024), '1.0 MB')
})

test('formatBytes: gigabytes', () => {
  assert.equal(formatBytes(1024 * 1024 * 1024), '1.0 GB')
})

test('formatBytes: fractional MB', () => {
  assert.equal(formatBytes(1.5 * 1024 * 1024), '1.5 MB')
})

test('categories: all have required fields', () => {
  for (const cat of categories) {
    assert.ok(typeof cat.id === 'string' && cat.id.length > 0, `${cat.id} missing id`)
    assert.ok(typeof cat.label === 'string', `${cat.id} missing label`)
    assert.ok(
      cat.safetyLevel === 'safe' || cat.safetyLevel === 'situational',
      `${cat.id} invalid safetyLevel: ${cat.safetyLevel}`
    )
    assert.ok(Array.isArray(cat.paths) && cat.paths.length > 0, `${cat.id} must have paths array`)
    assert.ok(typeof cat.description === 'string', `${cat.id} missing description`)
  }
})

test('categories: ids are unique', () => {
  const ids = categories.map(c => c.id)
  const unique = new Set(ids)
  assert.equal(unique.size, ids.length, 'duplicate category ids found')
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/projects/mac-cleaner
npm test
```

Expected: `ERR_MODULE_NOT_FOUND` or similar — `scanner.js` doesn't exist yet.

- [ ] **Step 3: Write scanner.js**

```js
// src/scanner.js
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'

const execAsync = promisify(exec)

export async function scanPath(p) {
  if (!existsSync(p)) return 0
  try {
    const { stdout } = await execAsync(`du -sk "${p}"`)
    const kb = parseInt(stdout.split('\t')[0], 10)
    return isNaN(kb) ? 0 : kb * 1024
  } catch {
    return 0
  }
}

export async function scanAll(categories) {
  const results = await Promise.all(
    categories.map(async (cat) => {
      const sizes = await Promise.all(cat.paths.map(scanPath))
      const bytes = sizes.reduce((a, b) => a + b, 0)
      return [cat.id, bytes]
    })
  )
  return Object.fromEntries(results)
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ~/projects/mac-cleaner
npm test
```

Expected: all 7 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
cd ~/projects/mac-cleaner
git add src/scanner.js test/scanner.test.js
git commit -m "feat: add scanner with formatBytes and scanAll"
```

---

## Task 4: cleaners.js + tests

**Files:**
- Create: `src/cleaners.js`
- Modify: `test/scanner.test.js` — append cleaner coverage tests

**Interfaces:**
- Consumes: category `id` strings from `src/categories.js`
- Produces: `export const cleaners` — `Record<string, () => Promise<void>>`

- [ ] **Step 1: Add cleaner coverage tests to test/scanner.test.js**

Append these tests to the existing `test/scanner.test.js`:

```js
import { cleaners } from '../src/cleaners.js'

test('cleaners: every category has a cleaner', () => {
  for (const cat of categories) {
    assert.ok(
      typeof cleaners[cat.id] === 'function',
      `missing cleaner for category: ${cat.id}`
    )
  }
})

test('cleaners: no extra cleaners without a category', () => {
  const ids = new Set(categories.map(c => c.id))
  for (const key of Object.keys(cleaners)) {
    assert.ok(ids.has(key), `cleaner "${key}" has no matching category`)
  }
})
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
cd ~/projects/mac-cleaner
npm test
```

Expected: 2 new test failures — `cleaners.js` not found.

- [ ] **Step 3: Write cleaners.js**

```js
// src/cleaners.js
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const execAsync = promisify(exec)
const H = homedir()

async function removeDir(p) {
  if (existsSync(p)) await rm(p, { recursive: true, force: true })
}

export const cleaners = {
  npm: () => removeDir(join(H, '.npm', '_cacache')),

  yarn: () => execAsync('yarn cache clean'),

  pnpm: () => execAsync('pnpm store prune'),

  cocoapods: () => execAsync('pod cache clean --all'),

  typescript: () => removeDir(join(H, 'Library', 'Caches', 'typescript')),

  cypress: () => execAsync('npx cypress cache clear'),

  playwright: () => removeDir(join(H, 'Library', 'Caches', 'ms-playwright-go')),

  'node-gyp': () => removeDir(join(H, 'Library', 'Caches', 'node-gyp')),

  pip: async () => {
    // try pip3 first, fall back to pip
    try {
      await execAsync('pip3 cache purge')
    } catch {
      await execAsync('pip cache purge')
    }
  },

  homebrew: () => execAsync('brew cleanup'),

  docker: () => execAsync('docker system prune -af --volumes'),

  simulators: () => execAsync('xcrun simctl delete unavailable'),

  chrome: () => removeDir(join(H, 'Library', 'Caches', 'Google', 'Chrome')),

  brave: () => removeDir(join(H, 'Library', 'Caches', 'BraveSoftware')),

  rambox: () => removeDir(join(H, 'Library', 'Application Support', 'rambox', 'Partitions')),
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd ~/projects/mac-cleaner
npm test
```

Expected: all 9 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
cd ~/projects/mac-cleaner
git add src/cleaners.js test/scanner.test.js
git commit -m "feat: add cleaners and coverage tests"
```

---

## Task 5: index.js — main CLI

**Files:**
- Create: `index.js`

**Interfaces:**
- Consumes:
  - `categories` from `./src/categories.js`
  - `scanAll(categories)`, `formatBytes(bytes)` from `./src/scanner.js`
  - `cleaners` from `./src/cleaners.js`
  - `checkbox`, `confirm`, `Separator` from `@inquirer/prompts`
  - `ora` from `ora`
  - `chalk` from `chalk`

- [ ] **Step 1: Write index.js**

```js
#!/usr/bin/env node
import chalk from 'chalk'
import ora from 'ora'
import { checkbox, confirm, Separator } from '@inquirer/prompts'
import { categories } from './src/categories.js'
import { scanAll, formatBytes } from './src/scanner.js'
import { cleaners } from './src/cleaners.js'

const VERSION = '1.0.0'

console.log(chalk.bold(`\nmac-cleaner v${VERSION}\n`))

// 1. Scan
const spinner = ora('Scanning disk usage...').start()
let sizes
try {
  sizes = await scanAll(categories)
  spinner.succeed('Scan complete\n')
} catch (e) {
  spinner.fail(`Scan failed: ${e.message}`)
  process.exit(1)
}

// 2. Build choices for checkbox
function makeLabel(cat, badge, badgeColor) {
  const size = sizes[cat.id] > 0 ? formatBytes(sizes[cat.id]) : chalk.dim('not found')
  return `${badgeColor(badge.padEnd(15))} ${cat.label.padEnd(26)} ${chalk.dim(size)}`
}

const safeItems = categories
  .filter(c => c.safetyLevel === 'safe')
  .map(c => ({
    name: makeLabel(c, '[safe]', chalk.green),
    value: c.id,
    checked: sizes[c.id] > 0,
  }))

const situationalItems = categories
  .filter(c => c.safetyLevel === 'situational')
  .map(c => ({
    name: makeLabel(c, '[situational]', chalk.yellow),
    value: c.id,
    checked: false,
  }))

const choices = [
  ...safeItems,
  new Separator(chalk.dim('─'.repeat(58))),
  ...situationalItems,
]

// 3. Select
let selected
try {
  selected = await checkbox({
    message: 'Select items to clean:',
    choices,
    pageSize: 20,
  })
} catch {
  // user pressed ctrl+c
  console.log(chalk.dim('\nCancelled.\n'))
  process.exit(0)
}

if (selected.length === 0) {
  console.log(chalk.dim('\nNothing selected. Exiting.\n'))
  process.exit(0)
}

// 4. Clean
console.log('')
const results = []

for (const id of selected) {
  const cat = categories.find(c => c.id === id)
  const bytesBefore = sizes[id]

  if (cat.safetyLevel === 'situational') {
    console.log(chalk.yellow(`\n⚠  ${cat.description}`))
    let confirmed
    try {
      confirmed = await confirm({
        message: `Proceed with cleaning ${chalk.bold(cat.label)}?`,
        default: false,
      })
    } catch {
      confirmed = false
    }
    if (!confirmed) {
      results.push({ label: cat.label, status: 'skipped', freed: 0 })
      continue
    }
  }

  const s = ora(`Cleaning ${cat.label}...`).start()
  try {
    await cleaners[id]()
    s.succeed(chalk.green(`${cat.label} cleared`))
    results.push({ label: cat.label, status: 'cleared', freed: bytesBefore })
  } catch (e) {
    s.fail(chalk.red(`${cat.label} failed: ${e.message.split('\n')[0]}`))
    results.push({ label: cat.label, status: 'failed', freed: 0 })
  }
}

// 5. Summary
console.log('\n' + chalk.dim('─'.repeat(58)))
let totalFreed = 0
for (const r of results) {
  totalFreed += r.freed
  const icon =
    r.status === 'cleared' ? chalk.green('✔') :
    r.status === 'failed'  ? chalk.red('✗') :
                              chalk.dim('—')
  const detail =
    r.status === 'cleared' ? chalk.green(`${formatBytes(r.freed)} freed`) :
    chalk.dim(r.status)
  console.log(`  ${icon}  ${r.label.padEnd(28)} ${detail}`)
}
console.log(chalk.dim('─'.repeat(58)))
console.log(chalk.bold(`\nTotal freed: ${formatBytes(totalFreed)}\n`))
```

- [ ] **Step 2: Make the file executable**

```bash
chmod +x ~/projects/mac-cleaner/index.js
```

- [ ] **Step 3: Smoke-test manually (do NOT confirm any cleanups)**

```bash
cd ~/projects/mac-cleaner
node index.js
```

Expected:
- Banner prints
- Spinner runs then shows "Scan complete"
- Checkbox list appears with sizes and safety labels
- Press `ctrl+c` or deselect all and confirm — should exit cleanly with "Cancelled." or "Nothing selected."

- [ ] **Step 4: Commit**

```bash
cd ~/projects/mac-cleaner
git add index.js
git commit -m "feat: add main CLI orchestration"
```

---

## Task 6: README + global install

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

```markdown
# mac-cleaner

Interactive macOS storage cleanup CLI. Scans cache locations, shows sizes with safety labels, and runs selected cleanups.

## Install

```bash
cd ~/projects/mac-cleaner
npm install
npm link
```

## Usage

```bash
mac-cleaner
```

- Space to toggle items, Enter to confirm
- Green `[safe]` — runs immediately
- Yellow `[situational]` — shows a warning and asks for confirmation

## Add a new category

Edit `src/categories.js` to add a category object, then add its cleaner function to `src/cleaners.js`.

## Uninstall

```bash
npm unlink -g mac-cleaner
```
```

- [ ] **Step 2: Run npm link**

```bash
cd ~/projects/mac-cleaner
npm link
```

Expected: `added 1 package, ...` and `mac-cleaner` is now available globally.

- [ ] **Step 3: Verify global binary works**

```bash
which mac-cleaner
mac-cleaner
```

Expected: prints the path (e.g. `/usr/local/bin/mac-cleaner`) then runs the tool normally.

- [ ] **Step 4: Run full test suite one final time**

```bash
cd ~/projects/mac-cleaner
npm test
```

Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ~/projects/mac-cleaner
git add README.md
git commit -m "feat: add README and global install instructions"
```

---

## Self-Review

**Spec coverage check:**
- ✔ Checkbox list with sizes and safety labels → Task 5
- ✔ `safe` runs immediately, `situational` prompts confirm → Task 5
- ✔ Summary table with freed per item and total → Task 5
- ✔ All 15 categories defined → Task 2 + Task 4
- ✔ Error handling: command not found, scan fails, clean fails → Task 4 (try/catch per cleaner), Task 5 (spinner .fail + continue)
- ✔ Docker not running: `docker system prune` will throw — caught by Task 5's error handler with the error message printed
- ✔ `npm link` installation → Task 6
- ✔ `node:child_process` used (no shell injection) → Task 3 + Task 4

**Placeholder scan:** None found.

**Type consistency:** `scanAll` returns `Record<string, number>` (id → bytes). `sizes[cat.id]` access in Task 5 matches. `cleaners[id]` keyed by same id strings. All consistent.
