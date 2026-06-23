import React, { useState, useEffect } from 'react'

function fmt(bytes) {
  if (!bytes || bytes === 0) return null
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default function DiskCleaner() {
  const [cats, setCats] = useState([])
  const [sizes, setSizes] = useState({})
  const [selected, setSelected] = useState(new Set())
  const [cleaning, setCleaning] = useState(false)
  const [results, setResults] = useState([])

  useEffect(() => {
    Promise.all([
      window.api.getDiskCategories(),
      window.api.scanDisk(),
    ]).then(([categories, sizeMap]) => {
      setCats(categories)
      setSizes(sizeMap)
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
      const newSizes = await window.api.scanDisk()
      setSizes(newSizes)
    } finally {
      setCleaning(false)
    }
  }

  const safe = cats.filter(c => c.safetyLevel === 'safe')
  const situational = cats.filter(c => c.safetyLevel === 'situational')

  function renderList(items) {
    return (
      <div className="disk-list">
        {items.map(c => {
          const res = results.find(r => r.id === c.id)
          const size = fmt(sizes[c.id])
          return (
            <label key={c.id} className="disk-item">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
              />
              <span className="disk-item-label">{c.label}</span>
              <span className="disk-item-size">
                {res ? (res.status === 'cleared' ? '✓' : '✗') : (size ?? 'not found')}
              </span>
            </label>
          )
        })}
      </div>
    )
  }

  if (cats.length === 0) return <div className="loading">Scanning...</div>

  return (
    <div>
      <div className="disk-section-label">Safe</div>
      {renderList(safe)}
      <div className="disk-section-label">Situational</div>
      {renderList(situational)}
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
