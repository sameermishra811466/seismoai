// ============================================================
// src/App.jsx — FINAL VERSION (copy this, replace existing)
// ============================================================

import { useState } from 'react'
import Dashboard   from './pages/Dashboard'
import PredictPage from './pages/PredictPage'
import LivePage    from './pages/LivePage'        // NEW ← real-time
import ForecastPage from './pages/ForecastPage'   // from v2
import RegionsPage from './pages/RegionsPage'
import AlertsPage  from './pages/AlertsPage'
import BenchmarkPage from './pages/BenchmarkPage' // from v2
import ModelPage   from './pages/ModelPage'
import Sidebar     from './components/Sidebar'
import AlertBanner from './components/AlertBanner'
import { useAlerts } from './hooks/useSeismoData'

export default function App() {
  const [page, setPage] = useState('live')   // start on live page
  const { alerts, unreadCount, resolveAlert, clearAll } = useAlerts()

  const pages = {
    dashboard: <Dashboard onNavigate={setPage} />,
    live:      <LivePage />,
    predict:   <PredictPage />,
    forecast:  <ForecastPage />,
    regions:   <RegionsPage />,
    alerts:    <AlertsPage alerts={alerts} onResolve={resolveAlert} />,
    benchmark: <BenchmarkPage />,
    model:     <ModelPage />,
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080810', color: '#e2e8f0' }}>
      <Sidebar current={page} onNavigate={setPage} alertCount={unreadCount} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AlertBanner alerts={alerts} onClear={clearAll} />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {pages[page] || pages.live}
        </main>
      </div>
    </div>
  )
}


// ============================================================
// src/components/Sidebar.jsx — FINAL VERSION
// ============================================================

// PASTE THIS AS A SEPARATE FILE: src/components/Sidebar.jsx

/*
const navItems = [
  { id: 'dashboard', icon: '⚡', label: 'Dashboard' },
  { id: 'live',      icon: '🔴', label: 'Live Feed', isNew: true },
  { id: 'predict',   icon: '🔮', label: 'Predict' },
  { id: 'forecast',  icon: '🗓️', label: 'Forecast' },
  { id: 'regions',   icon: '🌍', label: 'Regions' },
  { id: 'alerts',    icon: '🚨', label: 'Alerts' },
  { id: 'benchmark', icon: '⚖️', label: 'Benchmark' },
  { id: 'model',     icon: '🧠', label: 'Model' },
]

export default function Sidebar({ current, onNavigate, alertCount }) {
  return (
    <aside style={{
      width: 72,
      background: '#0d0d1a',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 0', gap: 4,
      position: 'sticky', top: 0, height: '100vh', zIndex: 50,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'linear-gradient(135deg, #f97316, #ef4444)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 24, flexShrink: 0,
      }}>🌐</div>

      {navItems.map(item => {
        const active = current === item.id
        return (
          <button key={item.id} onClick={() => onNavigate(item.id)} title={item.label}
            style={{
              width: 48, height: 48, borderRadius: 12,
              background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
              border: active ? '1px solid rgba(249,115,22,0.4)' : '1px solid transparent',
              color: active ? '#f97316' : '#555',
              fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', transition: 'all 0.2s',
            }}
          >
            {item.icon}
            {item.id === 'alerts' && alertCount > 0 && (
              <span style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
            {item.isNew && !active && (
              <span style={{ position: 'absolute', top: 4, right: 2, background: '#ef4444', color: '#fff', fontSize: 7, borderRadius: 4, padding: '1px 4px', fontWeight: 700 }}>LIVE</span>
            )}
          </button>
        )
      })}

      <div style={{ marginTop: 'auto', fontSize: 9, color: '#333', letterSpacing: '1px' }}>v3.0</div>
    </aside>
  )
}
*/