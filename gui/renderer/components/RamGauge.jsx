import React, { useState, useEffect } from 'react'

const PRESSURE_COLOR = { normal: '#30d158', warn: '#ffd60a', critical: '#ff453a' }

function fmt(bytes) {
  if (!bytes && bytes !== 0) return '--'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default function RamGauge() {
  const [stats, setStats] = useState(null)
  const [cleaning, setCleaning] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    window.api.onRamStats(setStats)
    return () => window.api.offRamStats()
  }, [])

  async function handleClean() {
    setCleaning(true)
    setToast(null)
    try {
      await window.api.cleanRam()
      setToast('Memory optimized')
    } catch {
      setToast('Cancelled')
    } finally {
      setCleaning(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (!stats) return <div className="loading">Waiting for data...</div>

  const usedPct = Math.round((stats.used / stats.total) * 100)

  return (
    <div>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: `${usedPct}%` }} />
      </div>
      <div className="gauge-label">{fmt(stats.used)} / {fmt(stats.total)}</div>
      <div className="pressure" style={{ color: PRESSURE_COLOR[stats.pressureLevel] }}>
        ● {stats.pressureLevel}
      </div>
      <div className="breakdown">
        <div>Wired       <span>{fmt(stats.wired)}</span></div>
        <div>Compressed  <span>{fmt(stats.compressed)}</span></div>
        <div>Free        <span>{fmt(stats.free)}</span></div>
      </div>
      <button className="clean-btn" onClick={handleClean} disabled={cleaning}>
        {cleaning ? 'Optimizing...' : 'Optimize Memory'}
      </button>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
