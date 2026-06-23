import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export function parseVmStat(output) {
  const pageSize = parseInt(output.match(/page size of (\d+) bytes/)?.[1] ?? '16384', 10)
  const get = (label) => {
    const m = output.match(new RegExp(`${label}:\\s+(\\d+)\\.`))
    return m ? parseInt(m[1], 10) : 0
  }
  return {
    pageSize,
    freePages: get('Pages free'),
    activePages: get('Pages active'),
    wiredPages: get('Pages wired down'),
    compressedPages: get('Pages occupied by compressor'),
  }
}

export function parsePressure(output) {
  if (output.includes('critical')) return 'critical'
  if (output.includes('warn')) return 'warn'
  return 'normal'
}

export async function getRamStats() {
  const [vmStatOut, sysctlOut, pressureOut] = await Promise.all([
    execAsync('vm_stat').then(r => r.stdout),
    execAsync('sysctl -n hw.memsize').then(r => r.stdout.trim()),
    execAsync('memory_pressure').then(r => r.stdout),
  ])
  const { pageSize, freePages, activePages, wiredPages, compressedPages } = parseVmStat(vmStatOut)
  const total = parseInt(sysctlOut, 10)
  const wired = wiredPages * pageSize
  const compressed = compressedPages * pageSize
  const active = activePages * pageSize
  // Match Activity Monitor: used = wired + active + compressed
  const used = wired + active + compressed
  // Available = headroom before pressure — total minus what's actually in use
  // (macOS keeps free pages near-zero by using them for file cache)
  const free = total - used
  const pressureLevel = parsePressure(pressureOut)
  return { used, free, wired, active, compressed, total, pressureLevel }
}
