// src/pages/AlertsPage.jsx
import { RiskBadge, Card, PageHeader, EmptyState } from '../components/shared'

const RISK_COLORS = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444', Critical: '#a855f7' }

export default function AlertsPage({ alerts = [], onResolve }) {
  const active = alerts.filter(a => !a.is_resolved)

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      <PageHeader
        title="Seismic Alerts"
        subtitle="Real-time alerts triggered when ensemble risk score exceeds 0.70"
      />

      {active.length === 0 ? (
        <EmptyState icon="✅" message="No active alerts. All regions within normal parameters." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {active.map((alert, i) => (
            <AlertCard key={alert.id || i} alert={alert} onResolve={onResolve} />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertCard({ alert, onResolve }) {
  const color = RISK_COLORS[alert.risk_level] || '#ef4444'

  return (
    <Card style={{ borderColor: `${color}30` }}>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, animation: 'pulse 1.5s infinite' }} />
            <div>
              <div style={{ fontFamily: "'Syne'", fontWeight: 700, fontSize: 15, color: '#fff' }}>{alert.region}</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                {new Date(alert.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <RiskBadge level={alert.risk_level} />
            <button
              onClick={() => onResolve?.(alert.id)}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6, padding: '4px 12px', color: '#888', cursor: 'pointer', fontSize: 11,
              }}
            >Resolve</button>
          </div>
        </div>

        <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6, marginBottom: 14 }}>
          {alert.message}
        </div>

        <div style={{ display: 'flex', gap: 20, fontSize: 11 }}>
          <span style={{ color: '#555' }}>Risk Score: <span style={{ color }}>{parseFloat(alert.risk_score).toFixed(3)}</span></span>
          {alert.magnitude_est && <span style={{ color: '#555' }}>Est. Magnitude: <span style={{ color: '#f97316' }}>M{parseFloat(alert.magnitude_est).toFixed(1)}</span></span>}
          {alert.latitude && <span style={{ color: '#555' }}>Location: <span style={{ color: '#888' }}>{parseFloat(alert.latitude).toFixed(2)}°, {parseFloat(alert.longitude).toFixed(2)}°</span></span>}
        </div>
      </div>
    </Card>
  )
}