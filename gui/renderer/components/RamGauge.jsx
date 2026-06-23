import React, { useState, useEffect, useRef } from 'react'

const PRESSURE_COLOR = { normal: '#30d158', warn: '#ffd60a', critical: '#ff453a' }

function fmtGB(bytes) {
  if (bytes == null) return '--'
  return `${(bytes / (1024 ** 3)).toFixed(1)} GB`
}

export default function RamGauge() {
  const [stats, setStats] = useState(null)
  const [processes, setProcesses] = useState([])
  const [processesLoaded, setProcessesLoaded] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [result, setResult] = useState(null)  // actual result, shows for 10s then clears
  const statsRef = useRef(null)

  useEffect(() => {
    window.api.onRamStats((data) => { setStats(data); statsRef.current = data })
    window.api.onRamProcesses((data) => { setProcesses(data); setProcessesLoaded(true) })
    return () => { window.api.offRamStats(); window.api.offRamProcesses() }
  }, [])

  async function handleClean() {
    const usedBefore = statsRef.current?.used ?? stats.used
    const cacheBefore = statsRef.current?.reclaimable ?? 0

    setCleaning(true)
    setResult(null)
    try {
      await window.api.cleanRam()
      // Stay in "cleaning" state until stats refresh so the estimate doesn't flash back
      setTimeout(() => {
        const usedAfter = statsRef.current?.used ?? usedBefore
        const ramFreed  = Math.max(0, usedBefore - usedAfter)
        setResult({ ramFreed, cacheFreed: cacheBefore })
        setCleaning(false)
        setTimeout(() => setResult(null), 10000)
      }, 2500)
    } catch {
      setResult({ error: true })
      setCleaning(false)
      setTimeout(() => setResult(null), 3000)
    }
  }

  if (!stats) return <div className="loading">Waiting for data...</div>

  const usedPct = Math.round((stats.used / stats.total) * 100)
  const topApps = processes.slice(0, 5)
  const maxMem  = topApps[0]?.memMB || 1

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

      <div className="ram-apps">
        <div className="disk-section-label" style={{ marginTop: 0, marginBottom: 8 }}>Top Apps</div>
        {!processesLoaded ? (
          <div className="apps-spinner"><div className="spinner" /></div>
        ) : topApps.map(p => (
          <div key={p.pid} className="ram-app-row">
            <span className="ram-app-name">{p.name}</span>
            <div className="ram-app-bar">
              <div style={{ width: `${(p.memMB / maxMem) * 100}%` }} />
            </div>
            <span className="ram-app-mem">{p.memMB >= 1024 ? `${(p.memMB/1024).toFixed(1)}G` : `${p.memMB}M`}</span>
          </div>
        ))}
      </div>

      <div className="optimize-hint">
        {cleaning
          ? null
          : result?.error
            ? <span style={{ color: '#ff453a' }}>Cancelled</span>
            : result
              ? <>
                  <span style={{ color: '#30d158' }}>✓</span>
                  {result.ramFreed > 20 * 1024 * 1024
                    ? <><strong>{fmtGB(result.ramFreed)}</strong> RAM freed</>
                    : 'RAM freed: minimal'}
                  {result.cacheFreed > 50 * 1024 * 1024 &&
                    <span className="optimize-hint-sub">+ {fmtGB(result.cacheFreed)} cache flushed</span>}
                </>
              : stats.compressed > 20 * 1024 * 1024
                ? <span>~<strong>{fmtGB(stats.compressed)}</strong> may be freed</span>
                : null}
      </div>
      <button className="clean-btn" onClick={handleClean} disabled={cleaning}>
        {cleaning ? 'Optimizing...' : 'Optimize Memory'}
      </button>
    </div>
  )
}
