# mac-cleaner

Interactive macOS storage cleanup CLI. Scans cache locations, shows sizes with safety labels, and runs selected cleanups.

## Quick run (no install)

```bash
npx @phamyqb/mac-cleaner
```

## Install globally

```bash
npm install -g @phamyqb/mac-cleaner
```

Then run anytime with:

```bash
mac-cleaner
```

## Usage

```
mac-cleaner [options]

Options:
  -h, --help    Show help
```

- Space to toggle items, Enter to confirm
- Green `[safe]` — runs immediately, caches are regenerated automatically
- Yellow `[situational]` — shows a warning and asks for confirmation

## Add a new category

Edit `src/categories.js` to add a category object, then add its cleaner function to `src/cleaners.js`.

## Uninstall

```bash
npm uninstall -g @phamyqb/mac-cleaner
```

## Development

```bash
git clone https://github.com/phamyqb/mac-cleaner
cd mac-cleaner
npm install
npm link        # install locally as global binary
npm test        # run tests
```
