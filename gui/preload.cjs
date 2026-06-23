'use strict'
const { contextBridge, ipcRenderer } = require('electron')

// Named handlers so each component can remove only its own listener
const handlers = {}

function on(channel, id, cb) {
  const handler = (_e, d) => cb(d)
  handlers[`${channel}:${id}`] = handler
  ipcRenderer.on(channel, handler)
}

function off(channel, id) {
  const key = `${channel}:${id}`
  if (handlers[key]) {
    ipcRenderer.removeListener(channel, handlers[key])
    delete handlers[key]
  }
}

contextBridge.exposeInMainWorld('api', {
  onRamStats:        (cb) => on('ram:stats',     'stats', cb),
  onRamProcesses:    (cb) => on('ram:processes', 'gauge', cb),
  onRamProcessesList:(cb) => on('ram:processes', 'list',  cb),
  offRamStats:       () => off('ram:stats',     'stats'),
  offRamProcesses:   () => off('ram:processes', 'gauge'),
  offRamProcessesList: () => off('ram:processes', 'list'),
  cleanRam:          ()    => ipcRenderer.invoke('ram:clean'),
  killProcess:       (pid) => ipcRenderer.invoke('process:kill', { pid }),
  scanDisk:          ()    => ipcRenderer.invoke('disk:scan'),
  cleanDisk:         (ids) => ipcRenderer.invoke('disk:clean', { ids }),
  getDiskCategories: ()    => ipcRenderer.invoke('disk:categories'),
  getDiskInfo:       ()    => ipcRenderer.invoke('disk:info'),
  checkDisk:         ()    => ipcRenderer.invoke('disk:check'),
  openApp:           (name) => ipcRenderer.invoke('app:open', { name }),
  onDiskUpdate:      (cb) => on('disk:update', 'disk', cb),
  offDiskUpdate:     ()   => off('disk:update', 'disk'),
  getSettings:       ()    => ipcRenderer.invoke('settings:get'),
  setSettings:       (s)   => ipcRenderer.invoke('settings:set', s),
})
