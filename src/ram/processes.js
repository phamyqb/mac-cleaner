import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export function parsePs(output) {
  return output.trim().split('\n')
    .filter(line => !/^\s*PID/.test(line))
    .map(line => {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 3) return null
      const pid = parseInt(parts[0], 10)
      const name = parts[1]
      const rss = parseInt(parts[parts.length - 1], 10)
      if (isNaN(pid) || pid <= 0 || isNaN(rss) || rss === 0) return null
      return { pid, name, memMB: Math.round(rss / 1024) }
    })
    .filter(Boolean)
    .slice(0, 8)
}

export async function getTopProcesses() {
  const { stdout } = await execAsync('ps -axo pid,comm,rss | sort -k3 -rn | head -9')
  return parsePs(stdout)
}
