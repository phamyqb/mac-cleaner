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
  npm: () => removeDir(join(H, '.npm', '_cacache')),

  yarn: () => execAsync('yarn cache clean'),

  pnpm: () => execAsync('pnpm store prune'),

  cocoapods: () => execAsync('pod cache clean --all'),

  typescript: () => removeDir(join(H, 'Library', 'Caches', 'typescript')),

  cypress: () => execAsync('npx cypress cache clear'),

  playwright: () => removeDir(join(H, 'Library', 'Caches', 'ms-playwright-go')),

  'node-gyp': () => removeDir(join(H, 'Library', 'Caches', 'node-gyp')),

  pip: async () => {
    // try pip3 first, fall back to pip
    try {
      await execAsync('pip3 cache purge')
    } catch {
      await execAsync('pip cache purge')
    }
  },

  homebrew: () => execAsync('brew cleanup'),

  docker: () => execAsync('docker system prune -af --volumes'),

  simulators: () => execAsync('xcrun simctl delete unavailable'),

  chrome: () => removeDir(join(H, 'Library', 'Caches', 'Google', 'Chrome')),

  brave: () => removeDir(join(H, 'Library', 'Caches', 'BraveSoftware')),

  rambox: () => removeDir(join(H, 'Library', 'Application Support', 'rambox', 'Partitions')),
}
