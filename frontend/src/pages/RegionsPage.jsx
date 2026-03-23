// src/pages/RegionsPage.jsx
import { useRegions } from '../hooks/useSeismoData'
import { Card, RiskBadge, ProgressBar, PageHeader, Spinner, EmptyState } from '../components/shared'

const RISK_COLORS = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444', Critical: '#a855f7' }

export default function RegionsPage() {
  const { regions, loading, refetch } = useRegions()

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <PageHeader
          title="Regional Analysis"
          subtitle="Spatial and regional dependency analysis across all monitored seismic zones"
        />
        <button
          onClick={refetch}
          style={{
            marginTop: 28, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 16px', color: '#aaa', cursor: 'pointer', fontSize: 12,
          }}
        >↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>
      ) : regions.length === 0 ? (
        <EmptyState icon="🌍" message="No region data available. Make sure your ML API is running." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {regions.map((r, i) => (
            <RegionCard key={i} region={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function RegionCard({ region: r }) {
  const color = RISK_COLORS[r.current_risk_level] || '#f97316'
  const score = parseFloat(r.avg_risk_score || 0)

  return (
    <Card>
      <div style={{ padding: '20px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Syne'", fontWeight: 700, fontSize: 16, color: '#fff' }}>{r.region}</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>
              {parseFloat(r.latitude).toFixed(1)}°, {parseFloat(r.longitude).toFixed(1)}°
            </div>
          </div>
          <RiskBadge level={r.current_risk_level} />
        </div>

        {/* Risk score bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
            <span style={{ color: '#555' }}>Risk Score</span>
            <span style={{ color }}>{score.toFixed(3)}</span>
          </div>
          <ProgressBar value={score} color={color} height={8} />
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            ['Est. Magnitude', `M${parseFloat(r.predicted_magnitude || 0).toFixed(1)}`],
            ['Recent Events', (r.recent_event_count || 0).toLocaleString()],
            ['Max Score', parseFloat(r.max_risk_score || 0).toFixed(3)],
          ].map(([label, val]) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: '#444', marginBottom: 4, letterSpacing: '0.5px' }}>{label.toUpperCase()}</div>
              <div style={{ fontSize: 13, color: '#ccc', fontFamily: "'Syne'", fontWeight: 700 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Trend */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
          <span style={{ color: '#555' }}>Trend:</span>
          <span style={{ color: r.trend === 'increasing' ? '#ef4444' : r.trend === 'decreasing' ? '#22c55e' : '#888' }}>
            {r.trend === 'increasing' ? '↑ Increasing' : r.trend === 'decreasing' ? '↓ Decreasing' : '→ Stable'}
          </span>
          {r.last_updated && (
            <span style={{ color: '#333', marginLeft: 'auto' }}>
              Updated {new Date(r.last_updated).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}