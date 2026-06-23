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
        <span className="title">mac-cleaner</span>
        <nav className="tabs">
          {[['ram','RAM'],['proc','Proc'],['disk','Disk'],['settings','⚙']].map(([key, label]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div className="content">
        {tab === 'ram'      && <RamGauge />}
        {tab === 'proc'     && <ProcessList />}
        {tab === 'disk'     && <DiskCleaner />}
        {tab === 'settings' && <Settings />}
      </div>
    </div>
  )
}
