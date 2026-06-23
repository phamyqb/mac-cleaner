import React, { useState, useEffect } from 'react'

export default function ProcessList() {
  const [processes, setProcesses] = useState([])

  useEffect(() => {
    window.api.onRamProcessesList(setProcesses)
    return () => window.api.offRamProcessesList()
  }, [])

  async function handleKill(pid) {
    try {
      await window.api.killProcess(pid)
    } catch {}
  }

  if (processes.length === 0) return <div className="loading">Waiting for data...</div>

  return (
    <div className="process-list">
      {processes.map(p => (
        <div key={p.pid} className="process-row">
          <span className="process-name">{p.name}</span>
          <span className="process-mem">{p.memMB} MB</span>
          <button className="kill-btn" onClick={() => handleKill(p.pid)}>Kill</button>
        </div>
      ))}
    </div>
  )
}
