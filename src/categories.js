import { homedir } from 'node:os'
import { join } from 'node:path'

const H = homedir()

export const categories = [
  {
    id: 'npm',
    label: 'npm cache',
    safetyLevel: 'safe',
    description: 'Regenerated automatically on next install',
    paths: [join(H, '.npm', '_cacache')],
  },
  {
    id: 'yarn',
    label: 'Yarn cache',
    safetyLevel: 'safe',
    description: 'Regenerated automatically on next install',
    paths: [join(H, 'Library', 'Caches', 'Yarn')],
  },
  {
    id: 'pnpm',
    label: 'pnpm store',
    safetyLevel: 'safe',
    description: 'Unreferenced packages only — active projects unaffected',
    paths: [join(H, 'Library', 'Caches', 'pnpm')],
  },
  {
    id: 'cocoapods',
    label: 'CocoaPods cache',
    safetyLevel: 'safe',
    description: 'Re-downloaded on next pod install',
    paths: [join(H, 'Library', 'Caches', 'CocoaPods')],
  },
  {
    id: 'typescript',
    label: 'TypeScript cache',
    safetyLevel: 'safe',
    description: 'Rebuilt on next tsc run',
    paths: [join(H, 'Library', 'Caches', 'typescript')],
  },
  {
    id: 'cypress',
    label: 'Cypress cache',
    safetyLevel: 'safe',
    description: 'Re-downloaded on next cypress run',
    paths: [join(H, 'Library', 'Caches', 'Cypress')],
  },
  {
    id: 'playwright',
    label: 'Playwright cache',
    safetyLevel: 'safe',
    description: 'Re-downloaded on next playwright install',
    paths: [join(H, 'Library', 'Caches', 'ms-playwright-go')],
  },
  {
    id: 'node-gyp',
    label: 'node-gyp cache',
    safetyLevel: 'safe',
    description: 'Rebuilt on next native module install',
    paths: [join(H, 'Library', 'Caches', 'node-gyp')],
  },
  {
    id: 'pip',
    label: 'pip cache',
    safetyLevel: 'safe',
    description: 'Re-downloaded on next pip install',
    paths: [join(H, 'Library', 'Caches', 'pip')],
  },
  {
    id: 'homebrew',
    label: 'Homebrew old versions',
    safetyLevel: 'safe',
    description: 'Old formula versions no longer needed',
    paths: [join(H, 'Library', 'Caches', 'Homebrew')],
  },
  {
    id: 'docker',
    label: 'Docker images & volumes',
    safetyLevel: 'situational',
    description: 'Removes ALL unused images and volumes — re-pull needed',
    paths: [join(H, 'Library', 'Containers', 'com.docker.docker')],
  },
  {
    id: 'simulators',
    label: 'iOS Simulators',
    safetyLevel: 'situational',
    description: 'Removes unavailable simulator runtimes — only if not doing iOS dev',
    paths: [join(H, 'Library', 'Developer', 'CoreSimulator', 'Devices')],
  },
  {
    id: 'chrome',
    label: 'Chrome cache',
    safetyLevel: 'situational',
    description: 'Clears Chrome browser cache — history and cookies are kept',
    paths: [join(H, 'Library', 'Caches', 'Google', 'Chrome')],
  },
  {
    id: 'brave',
    label: 'Brave cache',
    safetyLevel: 'situational',
    description: 'Clears Brave browser cache — history and cookies are kept',
    paths: [join(H, 'Library', 'Caches', 'BraveSoftware')],
  },
  {
    id: 'rambox',
    label: 'Rambox partitions',
    safetyLevel: 'situational',
    description: 'Removes embedded browser data per service — you will need to log back in to each app',
    paths: [join(H, 'Library', 'Application Support', 'rambox', 'Partitions')],
  },
]
