import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export function parsePs(output) {
  return output.trim().split('\n')
    .filter(Boolean)
    .map(line => {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 3) return null
      const pid = parseInt(parts[0], 10)
      const rss = parseInt(parts[1], 10)
      // parts[2..] is command name (clean, no path, no args due to -c flag)
      const name = parts.slice(2).join(' ')
      if (isNaN(pid) || pid <= 0 || isNaN(rss) || rss === 0) return null
      return { pid, name, memMB: Math.round(rss / 1024) }
    })
    .filter(Boolean)
    .slice(0, 8)
}

export async function getTopProcesses() {
  // -c: show clean command name (no path, no args); = suffix: no header
  const { stdout } = await execAsync('ps -ax -c -o pid=,rss=,command= | sort -k2 -rn | head -9')
  return parsePs(stdout)
}
