import React, { useState, useEffect } from 'react'

export default function Settings() {
  const [s, setS] = useState({ threshold: 75, autoclean: true, notifications: true, diskRescan: 60 })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    window.api.getSettings().then(v => { setS(v); setLoaded(true) })
  }, [])

  function update(key, value) {
    const next = { ...s, [key]: value }
    setS(next)
    window.api.setSettings(next)
  }

  if (!loaded) return <div className="loading">Loading...</div>

  return (
    <div className="settings">
      <div className="setting-row">
        <div>
          <div className="setting-label">Auto-clean threshold</div>
          <div className="setting-value">{s.threshold}% RAM used</div>
        </div>
        <input
          type="range" min="60" max="90" value={s.threshold}
          onChange={e => update('threshold', parseInt(e.target.value, 10))}
        />
      </div>
      <div className="setting-row">
        <div className="setting-label">Auto-clean when critical</div>
        <button
          className={`toggle ${s.autoclean ? 'on' : ''}`}
          onClick={() => update('autoclean', !s.autoclean)}
        />
      </div>
      <div className="setting-row">
        <div className="setting-label">Notifications</div>
        <button
          className={`toggle ${s.notifications ? 'on' : ''}`}
          onClick={() => update('notifications', !s.notifications)}
        />
      </div>
      <div className="setting-row">
        <div>
          <div className="setting-label">Disk auto-rescan</div>
          <div className="setting-value">Refresh disk sizes in background</div>
        </div>
        <select
          className="setting-select"
          value={s.diskRescan}
          onChange={e => update('diskRescan', parseInt(e.target.value, 10))}
        >
          <option value={0}>Off</option>
          <option value={30}>30s</option>
          <option value={60}>1 min</option>
          <option value={300}>5 min</option>
        </select>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
        First Optimize prompts once to enable passwordless mode
      </div>
    </div>
  )
}
