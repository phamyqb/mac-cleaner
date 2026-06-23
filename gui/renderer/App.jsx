import React, { useState } from 'react'
import RamGauge from './components/RamGauge.jsx'
import ProcessList from './components/ProcessList.jsx'
import DiskCleaner from './components/DiskCleaner.jsx'
import Settings from './components/Settings.jsx'

export default function App() {
  const [tab, setTab] = useState('ram')
  return (
    <div className="app">
      <header className="header">
        <span className="title">Mac Optimizer</span>
        <nav className="tabs">
          {[['ram','RAM'],['proc','Processes'],['disk','Disk'],['settings','Settings']].map(([key, label]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div className="content">
        <div style={{ display: tab === 'ram'      ? 'block' : 'none' }}><RamGauge /></div>
        <div style={{ display: tab === 'proc'     ? 'block' : 'none' }}><ProcessList /></div>
        <div style={{ display: tab === 'disk'     ? 'block' : 'none' }}><DiskCleaner /></div>
        <div style={{ display: tab === 'settings' ? 'block' : 'none' }}><Settings /></div>
      </div>
    </div>
  )
}
