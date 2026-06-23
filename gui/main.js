import {
  app, BrowserWindow, Tray, nativeImage,
  ipcMain, Notification, screen,
} from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { release } from 'node:os'
import { getRamStats } from '../src/ram/stats.js'
import { getTopProcesses } from '../src/ram/processes.js'
import { scanAll } from '../src/scanner.js'
import { cleaners } from '../src/cleaners.js'
import { categories } from '../src/categories.js'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))

let tray = null
let win = null
let settings = { threshold: 75, autoclean: true, notifications: true, diskRescan: 60 }
let lastPressure = 'normal'
let lastAutoClean = 0
let purgeSetupAttempted = false
let diskPollTimer = null

app.dock?.hide()

app.whenReady().then(async () => {
  createTray()
  await createWindow()
  startPolling()
  startDiskPoll()
  registerIpc()
})

app.on('window-all-closed', (e) => e.preventDefault())

function createTray() {
  tray = new Tray(nativeImage.createEmpty())
  tray.setTitle(' --')
  tray.on('click', toggleWindow)
}

async function createWindow() {
  const { workArea } = screen.getPrimaryDisplay()
  const darwinMajor = parseInt(release().split('.')[0], 10)

  const opts = {
    width: 360,
    height: 520,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  }

  if (darwinMajor >= 22) {
    opts.backgroundMaterial = 'under-window'
  } else {
    opts.vibrancy = 'under-window'
  }

  win = new BrowserWindow(opts)
  await win.loadFile(join(__dirname, '../dist/renderer/index.html'))
  win.setAlwaysOnTop(true, 'floating')

  // Hide when focus moves elsewhere (unless DevTools is open)
  win.on('blur', () => {
    if (!win.webContents.isDevToolsFocused()) win.hide()
  })
}

function toggleWindow() {
  if (!win) return
  if (win.isVisible()) {
    win.hide()
  } else {
    // Position window below the tray icon
    const { x, y, width, height } = tray.getBounds()
    const winW = win.getBounds().width
    const { workArea } = screen.getPrimaryDisplay()
    const newX = Math.round(x + width / 2 - winW / 2)
    const clampedX = Math.min(Math.max(newX, workArea.x), workArea.x + workArea.width - winW)
    win.setPosition(clampedX, y + height + 4)
    win.setAlwaysOnTop(true, 'floating')
    win.show()
    win.moveTop()
    win.focus()
  }
}

function startPolling() {
  setInterval(async () => {
    try {
      const stats = await getRamStats()
      const pct = Math.round((stats.used / stats.total) * 100)
      tray.setTitle(`Mem: ${pct}%`)
      win?.webContents.send('ram:stats', stats)
    } catch {}
  }, 2000)

  setInterval(async () => {
    try {
      const procs = await getTopProcesses()
      win?.webContents.send('ram:processes', procs)
    } catch {}
  }, 5000)

  setInterval(async () => {
    try {
      const stats = await getRamStats()
      const pct = Math.round((stats.used / stats.total) * 100)

      if (stats.pressureLevel !== lastPressure) {
        lastPressure = stats.pressureLevel

        if (settings.notifications) {
          if (stats.pressureLevel === 'warn') {
            new Notification({ title: 'mac-cleaner', body: 'Memory pressure is high' }).show()
          } else if (stats.pressureLevel === 'critical') {
            if (settings.autoclean) {
              try {
                lastAutoClean = Date.now()
                await runPurge()
                new Notification({ title: 'mac-cleaner', body: 'Memory cleaned automatically' }).show()
              } catch {
                new Notification({ title: 'mac-cleaner', body: 'Auto-clean failed — open mac-cleaner to clean manually' }).show()
              }
            } else {
              new Notification({
                title: 'mac-cleaner',
                body: 'Memory pressure is critical — open mac-cleaner to clean',
              }).show()
            }
          }
        }
      }

      const cooldown = 5 * 60 * 1000  // 5 minutes between auto-cleans
      if (pct >= settings.threshold && settings.autoclean && Date.now() - lastAutoClean > cooldown) {
        lastAutoClean = Date.now()
        try {
          await runPurge()
          if (settings.notifications) {
            new Notification({ title: 'mac-cleaner', body: 'Memory cleaned automatically' }).show()
          }
        } catch {}
      }
    } catch {}
  }, 5000)
}

async function fetchDiskInfo() {
  const { stdout } = await execAsync(`df -k "/System/Volumes/Data" 2>/dev/null || df -k /`)
  const parts = stdout.trim().split('\n').slice(-1)[0].trim().split(/\s+/)
  return {
    total: parseInt(parts[1], 10) * 1024,
    used:  parseInt(parts[2], 10) * 1024,
    free:  parseInt(parts[3], 10) * 1024,
  }
}

function startDiskPoll() {
  if (diskPollTimer) { clearInterval(diskPollTimer); diskPollTimer = null }
  if (!settings.diskRescan) return
  diskPollTimer = setInterval(async () => {
    try {
      const [sizes, diskInfo] = await Promise.all([scanAll(categories), fetchDiskInfo()])
      win?.webContents.send('disk:update', { sizes, diskInfo })
    } catch {}
  }, settings.diskRescan * 1000)
}

async function runPurge() {
  // Try passwordless first (works if sudoers entry already exists)
  try { await execAsync('sudo -n purge'); return } catch {}

  // Auto-setup passwordless on first need — one password prompt, then never again
  if (!purgeSetupAttempted) {
    purgeSetupAttempted = true
    try {
      const user = process.env.USER
      const line = `${user} ALL=(ALL) NOPASSWD: /usr/sbin/purge`
      await execAsync(`osascript -e 'do shell script "echo \\"${line}\\" > /etc/sudoers.d/mac-optimizer" with administrator privileges'`)
      await execAsync('sudo -n purge')
      return
    } catch {}
  }

  // Fallback: ask for password each time
  await execAsync(`osascript -e 'do shell script "purge" with administrator privileges'`)
}

function registerIpc() {
  ipcMain.handle('ram:clean', async () => {
    await runPurge()
  })

  ipcMain.handle('process:kill', (_e, { pid }) => {
    process.kill(Number(pid), 'SIGKILL')
  })

  ipcMain.handle('disk:scan', () => scanAll(categories))

  ipcMain.handle('disk:check', async () => {
    const checks = {}
    try { await execAsync('docker info', { timeout: 3000 }); checks.docker = true }
    catch { checks.docker = false }
    return checks
  })

  ipcMain.handle('disk:categories', () =>
    categories.map(({ id, label, description, safetyLevel }) => ({ id, label, description, safetyLevel }))
  )

  ipcMain.handle('disk:info', () => fetchDiskInfo())

  ipcMain.handle('disk:clean', async (_e, { ids }) => {
    const results = []
    for (const id of ids) {
      try {
        await cleaners[id]()
        results.push({ id, status: 'cleared' })
      } catch (e) {
        results.push({ id, status: 'failed', error: e.message.split('\n')[0] })
      }
    }
    return results
  })

  ipcMain.handle('app:open',    (_e, { name }) => execAsync(`open -a "${name}"`))
  ipcMain.handle('app:version', () => app.getVersion())

  const isNpx = __dirname.includes('_npx') || process.execPath.includes('_npx')

  ipcMain.handle('login-item:get', () => ({
    openAtLogin: app.getLoginItemSettings().openAtLogin,
    isNpx,
  }))

  ipcMain.handle('login-item:set', (_e, { enable }) => {
    if (isNpx) return
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true,
      path: process.execPath,
      args: [join(__dirname, 'main.js')],
    })
  })

  ipcMain.handle('settings:get', () => ({ ...settings }))

  ipcMain.handle('settings:set', (_e, incoming) => {
    const { threshold, autoclean, notifications, diskRescan } = incoming
    if (typeof threshold === 'number') settings.threshold = Math.min(90, Math.max(60, threshold))
    if (typeof autoclean === 'boolean') settings.autoclean = autoclean
    if (typeof notifications === 'boolean') settings.notifications = notifications
    if (typeof diskRescan === 'number') {
      settings.diskRescan = diskRescan
      startDiskPoll()
    }
  })
}
