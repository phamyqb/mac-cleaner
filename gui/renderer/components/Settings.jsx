import React, { useState, useEffect } from 'react'

export default function Settings() {
  const [s, setS] = useState({ threshold: 75, autoclean: true, notifications: true })
  const [loaded, setLoaded] = useState(false)
  const [passwordless, setPasswordless] = useState(false)
  const [setupStatus, setSetupStatus] = useState(null)

  useEffect(() => {
    window.api.getSettings().then(v => { setS(v); setLoaded(true) })
    window.api.isPasswordless().then(setPasswordless)
  }, [])

  function update(key, value) {
    const next = { ...s, [key]: value }
    setS(next)
    window.api.setSettings(next)
  }

  async function handleSetup() {
    setSetupStatus('setting up...')
    try {
      await window.api.setupPasswordless()
      setPasswordless(true)
      setSetupStatus('done — no more password prompts')
    } catch {
      setSetupStatus('cancelled')
    }
    setTimeout(() => setSetupStatus(null), 4000)
  }

  if (!loaded) return <div className="loading">Loading...</div>

  return (
    <div className="settings">
      <div className="setting-row">
        <div>
          <div className="setting-label">Auto-trigger threshold</div>
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
      <div style={{ marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
        <div className="setting-label" style={{ marginBottom: 8 }}>Optimize without password</div>
        {passwordless
          ? <div style={{ fontSize: 12, color: '#30d158' }}>✓ Passwordless mode active</div>
          : <button className="clean-btn" onClick={handleSetup} style={{ fontSize: 12, padding: '7px 0' }}>
              Setup once (requires password once)
            </button>
        }
        {setupStatus && <div className="toast" style={{ marginTop: 8 }}>{setupStatus}</div>}
      </div>
    </div>
  )
}
