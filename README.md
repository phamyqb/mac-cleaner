# mac-cleaner

macOS storage and memory cleanup tool — available as a **menu bar GUI** or a **terminal CLI**.

<!-- Replace these with real screenshots once taken — see "Adding screenshots" below -->
<!--
![RAM tab](https://raw.githubusercontent.com/phamyqb/mac-cleaner/master/screenshots/ram.png)
![Disk tab](https://raw.githubusercontent.com/phamyqb/mac-cleaner/master/screenshots/disk.png)
-->

## Quick start (no install)

```bash
# CLI — interactive terminal cleaner
npx @phamyqb/mac-cleaner

# GUI — floating menu bar app
npx @phamyqb/mac-cleaner --gui
```

## Install globally

```bash
npm install -g @phamyqb/mac-cleaner
```

Then run any time:

```bash
mac-cleaner        # CLI
mac-cleaner --gui  # GUI
```

Global install works identically to `npx` — Electron and all dependencies are bundled with the package.

## GUI features

The menu bar icon shows live RAM usage (`9.2G 38%`). Click it to open the HUD:

| Tab | What it does |
|-----|-------------|
| **RAM** | Live memory gauge, pressure level, top apps by usage, one-click Optimize Memory |
| **Processes** | Process list sorted by memory, kill any process |
| **Disk** | Disk usage bar, cache categories with sizes, auto-rescan, one-click clean |
| **Settings** | Auto-clean threshold, auto-clean toggle, notifications, disk rescan interval |

The window appears below the menu bar icon and hides automatically when you click away.

On first Optimize, mac-cleaner prompts once for your password to enable passwordless `purge` — never asked again.

## CLI usage

```
mac-cleaner [options]

Options:
  -h, --help    Show help
      --gui     Launch the menu bar GUI
```

Space to toggle items, Enter to confirm.

- Green `[safe]` — caches regenerated automatically
- Yellow `[situational]` — asks for confirmation

## Adding screenshots

Screenshots must use absolute URLs to display on both GitHub and npmjs.com.

1. Take screenshots (Command+Shift+4 on macOS)
2. Create a `screenshots/` folder in the repo root
3. Commit and push the images to GitHub
4. Reference them with the raw GitHub URL:

```markdown
![RAM tab](https://raw.githubusercontent.com/phamyqb/mac-cleaner/master/screenshots/ram.png)
```

Replace `phamyqb/mac-cleaner` with your GitHub username/repo. Relative paths like `./screenshots/ram.png` work on GitHub but show broken images on npmjs.com.

## Development

```bash
git clone https://github.com/phamyqb/mac-cleaner
cd mac-cleaner
npm install
npm link              # install locally as global binary
npm test              # run unit tests
npm run build:renderer # build the React renderer (Vite)
npm run gui           # build + launch GUI locally
```

## Add a new disk category

Edit `src/categories.js` to add a category object, then add its cleaner function to `src/cleaners.js`.

## Uninstall

```bash
npm uninstall -g @phamyqb/mac-cleaner
```
