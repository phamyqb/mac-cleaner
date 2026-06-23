import React, { useState, useEffect } from 'react'

function fmtGB(bytes) {
  if (!bytes) return null
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  return `${(bytes / (1024 ** 3)).toFixed(1)} GB`
}

function fmtSize(bytes) {
  if (!bytes || bytes === 0) return null
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default function DiskCleaner() {
  const [cats, setCats] = useState([])
  const [sizes, setSizes] = useState({})
  const [diskInfo, setDiskInfo] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [cleaning, setCleaning] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => {
    Promise.all([
      window.api.getDiskCategories(),
      window.api.scanDisk(),
      window.api.getDiskInfo(),
    ]).then(([categories, sizeMap, info]) => {
      setCats(categories)
      setSizes(sizeMap)
      setDiskInfo(info)
      const preChecked = new Set(
        categories
          .filter(c => c.safetyLevel === 'safe' && sizeMap[c.id] > 0)
          .map(c => c.id)
      )
      setSelected(preChecked)
    })
  }, [])

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleClean() {
    setCleaning(true)
    setResults([])
    try {
      const res = await window.api.cleanDisk([...selected])
      setResults(res)
      const [newSizes, newInfo] = await Promise.all([window.api.scanDisk(), window.api.getDiskInfo()])
      setSizes(newSizes)
      setDiskInfo(newInfo)
    } finally {
      setCleaning(false)
    }
  }

  // Only show items that have actual cached data
  const safe = cats.filter(c => c.safetyLevel === 'safe' && sizes[c.id] > 0)
  const situational = cats.filter(c => c.safetyLevel === 'situational' && sizes[c.id] > 0)

  function renderList(items) {
    if (items.length === 0) return null
    return (
      <div className="disk-list">
        {items.map(c => {
          const res = results.find(r => r.id === c.id)
          const size = fmtSize(sizes[c.id])
          return (
            <label key={c.id} className="disk-item">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
              />
              <span className="disk-item-label">
                {c.label}
                {c.description && <span className="disk-item-desc">{c.description}</span>}
              </span>
              <span className="disk-item-size">
                {res ? (res.status === 'cleared' ? '✓ cleared' : '✗ failed') : size}
              </span>
            </label>
          )
        })}
      </div>
    )
  }

  if (cats.length === 0) return <div className="loading">Scanning...</div>

  const usedPct = diskInfo ? Math.round((diskInfo.used / diskInfo.total) * 100) : 0
  return (
    <div>
      {diskInfo && (
        <div style={{ marginBottom: 16 }}>
          <div className="ram-hero" style={{ marginBottom: 6 }}>
            <span className="ram-used" style={{ fontSize: 22 }}>{fmtGB(diskInfo.used)}</span>
            <span className="ram-meta">of {fmtGB(diskInfo.total)} · {usedPct}% used</span>
          </div>
          <div className="gauge-bar">
            <div className="gauge-fill" style={{ width: `${usedPct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
            <span>Used: {fmtGB(diskInfo.used)}</span>
            <span>Free: {fmtGB(diskInfo.free)}</span>
          </div>
        </div>
      )}

      {safe.length > 0 && (
        <>
          <div className="disk-section-label">Safe to Clean</div>
          {renderList(safe)}
        </>
      )}
      {situational.length > 0 && (
        <>
          <div className="disk-section-label">Situational</div>
          {renderList(situational)}
        </>
      )}
      {safe.length === 0 && situational.length === 0 && (
        <div className="empty" style={{ marginTop: 20 }}>Nothing to clean — disk caches are empty</div>
      )}

      <button
        className="clean-btn"
        style={{ marginTop: 14 }}
        onClick={handleClean}
        disabled={cleaning || selected.size === 0}
      >
        {cleaning ? 'Cleaning...' : `Clean Selected (${selected.size})`}
      </button>
    </div>
  )
}
