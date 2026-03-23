// src/components/Sidebar.jsx — UPDATED VERSION
// Added Forecast (🗓️) and Benchmark (⚖️) navigation items

const navItems = [
  { id: 'dashboard', icon: '⚡', label: 'Dashboard' },
  { id: 'predict',   icon: '🔮', label: 'Predict' },
  { id: 'forecast',  icon: '🗓️', label: 'Forecast' },    // ← NEW
  { id: 'regions',   icon: '🌍', label: 'Regions' },
  { id: 'alerts',    icon: '🚨', label: 'Alerts' },
  { id: 'benchmark', icon: '⚖️', label: 'Benchmark' },  // ← NEW
  { id: 'model',     icon: '🧠', label: 'Model' },
]

export default function Sidebar({ current, onNavigate, alertCount }) {
  return (
    <aside style={{
      width: 72,
      background: '#0d0d1a',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 0',
      gap: 4,
      position: 'sticky',
      top: 0,
      height: '100vh',
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'linear-gradient(135deg, #f97316, #ef4444)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, marginBottom: 24, flexShrink: 0,
      }}>🌐</div>

      {navItems.map(item => {
        const active = current === item.id
        const isNew = item.id === 'forecast' || item.id === 'benchmark'
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={item.label}
            style={{
              width: 48, height: 48, borderRadius: 12,
              background: active ? 'rgba(249,115,22,0.15)' : 'transparent',
              border: active ? '1px solid rgba(249,115,22,0.4)' : '1px solid transparent',
              color: active ? '#f97316' : '#555',
              fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              transition: 'all 0.2s',
            }}
          >
            {item.icon}

            {/* Alert badge */}
            {item.id === 'alerts' && alertCount > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 16, height: 16, borderRadius: '50%',
                background: '#ef4444', color: '#fff',
                fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700,
              }}>{alertCount > 9 ? '9+' : alertCount}</span>
            )}

            {/* "NEW" badge for new features */}
            {isNew && !active && (
              <span style={{
                position: 'absolute', top: 4, right: 2,
                background: '#f97316', color: '#fff',
                fontSize: 7, borderRadius: 4, padding: '1px 4px',
                fontWeight: 700, letterSpacing: '0.5px',
              }}>NEW</span>
            )}
          </button>
        )
      })}

      {/* Version */}
      <div style={{ marginTop: 'auto', fontSize: 9, color: '#333', textAlign: 'center', letterSpacing: '1px' }}>
        v2.0
      </div>
    </aside>
  )
}