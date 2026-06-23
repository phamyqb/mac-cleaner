# mac-cleaner

macOS storage and memory cleanup tool — available as a menu bar GUI app or a terminal CLI.

## GUI (menu bar app)

Launch the floating HUD that lives in your menu bar:

```bash
npx @phamyqb/mac-cleaner --gui
```

Or if installed globally:

```bash
mac-cleaner --gui
```

Features:
- **RAM tab** — live memory gauge, pressure indicator, top apps by usage, one-click optimize
- **Processes tab** — sortable process list with kill button
- **Disk tab** — disk usage bar, cache categories with sizes, one-click clean selected
- **Settings tab** — auto-clean threshold, auto-clean toggle, notifications

The window appears below the menu bar icon and hides automatically when you click away.

On first use of "Optimize Memory", mac-cleaner asks for your password once to set up passwordless `purge` — you won't be asked again.

## CLI

```bash
npx @phamyqb/mac-cleaner
```

Interactive terminal UI. Space to toggle items, Enter to confirm.

- Green `[safe]` — caches regenerated automatically
- Yellow `[situational]` — ask for confirmation

## Install globally

```bash
npm install -g @phamyqb/mac-cleaner
```

Then run anytime:

```bash
mac-cleaner          # CLI
mac-cleaner --gui    # GUI
```

## Uninstall

```bash
npm uninstall -g @phamyqb/mac-cleaner
```

## Development

```bash
git clone https://github.com/phamyqb/mac-cleaner
cd mac-cleaner
npm install
npm link            # install locally as global binary
npm test            # run unit tests
npm run dev         # start Vite dev server for renderer
npm run build       # build renderer + package Electron app
```

## Add a new category

Edit `src/categories.js` to add a category object, then add its cleaner function to `src/cleaners.js`.
