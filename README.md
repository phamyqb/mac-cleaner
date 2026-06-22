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
