'use strict'
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  onRamStats:        (cb) => ipcRenderer.on('ram:stats',      (_e, d) => cb(d)),
  onRamProcesses:    (cb) => ipcRenderer.on('ram:processes',  (_e, d) => cb(d)),
  offRamStats:       () => ipcRenderer.removeAllListeners('ram:stats'),
  offRamProcesses:   () => ipcRenderer.removeAllListeners('ram:processes'),
  cleanRam:          ()    => ipcRenderer.invoke('ram:clean'),
  killProcess:       (pid) => ipcRenderer.invoke('process:kill', { pid }),
  scanDisk:          ()    => ipcRenderer.invoke('disk:scan'),
  cleanDisk:         (ids) => ipcRenderer.invoke('disk:clean', { ids }),
  getDiskCategories: ()    => ipcRenderer.invoke('disk:categories'),
  getSettings:       ()    => ipcRenderer.invoke('settings:get'),
  setSettings:       (s)   => ipcRenderer.invoke('settings:set', s),
})
