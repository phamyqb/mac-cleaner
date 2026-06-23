import React, { useState, useEffect } from 'react'

const PRESSURE_COLOR = { normal: '#30d158', warn: '#ffd60a', critical: '#ff453a' }

function fmtGB(bytes) {
  if (bytes == null) return '--'
  return `${(bytes / (1024 ** 3)).toFixed(1)} GB`
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
      <div className="ram-hero">
        <span className="ram-used">{fmtGB(stats.used)}</span>
        <span className="ram-meta">of {fmtGB(stats.total)} · {usedPct}% used</span>
      </div>
      <div className="gauge-bar">
        <div className="gauge-fill" style={{ width: `${usedPct}%` }} />
      </div>
      <div className="pressure" style={{ color: PRESSURE_COLOR[stats.pressureLevel] }}>
        ● {stats.pressureLevel} pressure
      </div>
      <div className="breakdown">
        <div><span>Wired</span><span title="Kernel memory, cannot be freed">{fmtGB(stats.wired)}</span></div>
        <div><span>Active</span><span title="Memory actively used by apps">{fmtGB(stats.active)}</span></div>
        <div><span>Compressed</span><span title="Memory compressed by macOS to save space">{fmtGB(stats.compressed)}</span></div>
        <div className="breakdown-separator" />
        <div><span>Available</span><span title="Free RAM — immediately usable">{fmtGB(stats.free)}</span></div>
      </div>
      <button className="clean-btn" onClick={handleClean} disabled={cleaning}>
        {cleaning ? 'Optimizing...' : 'Optimize Memory'}
      </button>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
