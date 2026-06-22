#!/usr/bin/env node
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import chalk from 'chalk'
import ora from 'ora'
import { checkbox, confirm, Separator } from '@inquirer/prompts'
import { categories } from './src/categories.js'
import { scanAll, formatBytes, commandExists } from './src/scanner.js'
import { cleaners } from './src/cleaners.js'

const execAsync = promisify(exec)

const VERSION = '1.0.0'

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${chalk.bold(`mac-cleaner v${VERSION}`)} — Interactive macOS storage cleanup

${chalk.bold('Usage:')} mac-cleaner [options]

${chalk.bold('Options:')}
  -h, --help    Show this help message

${chalk.bold('Controls:')}
  Space         Toggle item on/off
  ↑ / ↓         Navigate list
  Enter         Confirm selection
  Ctrl+C        Cancel

${chalk.bold('Safety levels:')}
  ${chalk.green('[safe]')}         Runs immediately — caches are regenerated automatically
  ${chalk.yellow('[situational]')}  Asks for confirmation — may require re-login or re-download

${chalk.bold('Install:')}
  npx @phamyqb/mac-cleaner
`)
  process.exit(0)
}

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

// 2. Filter out categories whose required command isn't installed
const available = await Promise.all(
  categories.map(async (cat) => ({
    cat,
    ok: cat.requires ? await commandExists(cat.requires) : true,
  }))
)
const visibleCategories = available.filter(({ ok }) => ok).map(({ cat }) => cat)

// 3. Build choices for checkbox
function makeLabel(cat, badge, badgeColor) {
  const size = sizes[cat.id] > 0 ? formatBytes(sizes[cat.id]) : chalk.dim('not found')
  return `${badgeColor(badge.padEnd(15))} ${cat.label.padEnd(26)} ${chalk.dim(size)}`
}

const safeItems = visibleCategories
  .filter(c => c.safetyLevel === 'safe')
  .map(c => ({
    name: makeLabel(c, '[safe]', chalk.green),
    value: c.id,
    checked: sizes[c.id] > 0,
  }))

const situationalItems = visibleCategories
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

// 4. Select
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

// 5. Clean
console.log('')
const results = []

for (const id of selected) {
  const cat = visibleCategories.find(c => c.id === id)
  const bytesBefore = sizes[id]

  if (cat.safetyLevel === 'situational') {
    if (cat.id === 'docker') {
      try {
        await execAsync('docker info')
      } catch {
        console.log(chalk.yellow('\n⚠  Docker is not running — start it first.'))
        results.push({ label: cat.label, status: 'skipped', freed: 0 })
        continue
      }
    }

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
    // freed is the pre-clean scan size — an approximation for tool-based cleaners (yarn, brew, etc.)
    results.push({ label: cat.label, status: 'cleared', freed: bytesBefore })
  } catch (e) {
    s.fail(chalk.red(`${cat.label} failed: ${e.message.split('\n')[0]}`))
    results.push({ label: cat.label, status: 'failed', freed: 0 })
  }
}

// 6. Summary
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
