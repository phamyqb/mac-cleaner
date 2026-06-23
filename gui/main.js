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
let settings = { threshold: 75, autoclean: true, notifications: true }
let lastPressure = 'normal'
let lastAutoClean = 0  // timestamp — prevents repeated purge every 5s

app.dock?.hide()

app.whenReady().then(async () => {
  createTray()
  await createWindow()
  startPolling()
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
  win.setPosition(workArea.x + workArea.width - 380, workArea.y + 4)
}

function toggleWindow() {
  if (!win) return
  if (win.isVisible()) {
    win.hide()
  } else {
    win.show()
    win.focus()
  }
}

function startPolling() {
  setInterval(async () => {
    try {
      const stats = await getRamStats()
      const pct = Math.round((stats.used / stats.total) * 100)
      tray.setTitle(` ${pct}%`)
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

async function runPurge() {
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

  ipcMain.handle('disk:categories', () =>
    categories.map(({ id, label, description, safetyLevel }) => ({ id, label, description, safetyLevel }))
  )

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

  ipcMain.handle('settings:get', () => ({ ...settings }))

  ipcMain.handle('settings:set', (_e, incoming) => {
    const { threshold, autoclean, notifications } = incoming
    if (typeof threshold === 'number') settings.threshold = Math.min(90, Math.max(60, threshold))
    if (typeof autoclean === 'boolean') settings.autoclean = autoclean
    if (typeof notifications === 'boolean') settings.notifications = notifications
  })
}
