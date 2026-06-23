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
  npm: async () => removeDir(join(H, '.npm', '_cacache')),

  yarn: async () => execAsync('yarn cache clean'),

  pnpm: async () => execAsync('pnpm store prune'),

  cocoapods: async () => execAsync('pod cache clean --all'),

  typescript: async () => removeDir(join(H, 'Library', 'Caches', 'typescript')),

  cypress: async () => execAsync('npx cypress cache clear'),

  playwright: async () => removeDir(join(H, 'Library', 'Caches', 'ms-playwright-go')),

  'node-gyp': async () => removeDir(join(H, 'Library', 'Caches', 'node-gyp')),

  pip: async () => {
    // try pip3 first, fall back to pip
    try {
      await execAsync('pip3 cache purge')
    } catch {
      await execAsync('pip cache purge')
    }
  },

  homebrew: async () => execAsync('brew cleanup'),

  docker: async () => {
    try { await execAsync('docker info', { timeout: 3000 }) }
    catch { throw new Error('Docker is not running — start Docker Desktop first') }
    await execAsync('docker system prune -af --volumes')
  },

  simulators: async () => execAsync('xcrun simctl delete unavailable'),

  chrome: async () => removeDir(join(H, 'Library', 'Caches', 'Google', 'Chrome', 'Default', 'Cache')),

  brave: async () => removeDir(join(H, 'Library', 'Caches', 'BraveSoftware')),

  rambox: async () => removeDir(join(H, 'Library', 'Application Support', 'rambox', 'Partitions')),
}
