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
