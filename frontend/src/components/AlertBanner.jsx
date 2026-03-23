// src/components/AlertBanner.jsx
import { useState } from 'react'

export default function AlertBanner({ alerts, onClear }) {
  const [visible, setVisible] = useState(true)

  const active = alerts.filter(a => !a.is_resolved)
  if (!visible || active.length === 0) return null

  const top = active[0]

  return (
    <div style={{
      background: 'rgba(239,68,68,0.1)',
      borderBottom: '1px solid rgba(239,68,68,0.25)',
      padding: '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          background: '#ef4444', color: '#fff', borderRadius: 4,
          padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '1px',
        }}>⚠ ALERT</span>
        <span style={{ color: '#fca5a5' }}>{top.message || `High seismic risk in ${top.region}`}</span>
        {active.length > 1 && (
          <span style={{ color: '#666', fontSize: 11 }}>+{active.length - 1} more</span>
        )}
      </div>
      <button
        onClick={() => { setVisible(false); onClear?.() }}
        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 }}
      >×</button>
    </div>
  )
}