// src/pages/Dashboard.jsx
import { useRegions, usePredictions } from '../hooks/useSeismoData'
import { Card, CardHeader, StatCard, RiskBadge, ProgressBar, LiveDot, Spinner } from '../components/shared'
import Seismograph from '../components/Seismograph'

const RISK_COLORS = {
  Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444', Critical: '#a855f7'
}

export default function Dashboard({ onNavigate }) {
  const { regions, loading: rLoading } = useRegions()
  const { predictions, loading: pLoading } = usePredictions(5)

  const totalEvents = regions.reduce((s, r) => s + (r.recent_event_count || 0), 0)
  const avgScore = regions.length
    ? (regions.reduce((s, r) => s + parseFloat(r.avg_risk_score || 0), 0) / regions.length).toFixed(2)
    : '—'
  const highRisk = regions.filter(r => ['High', 'Critical'].includes(r.current_risk_level)).length

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#fff' }}>
            SeismoAI Dashboard
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveDot /> Real-time earthquake prediction system
          </div>
        </div>
        <button
          onClick={() => onNavigate('predict')}
          style={{
            background: 'linear-gradient(135deg, #f97316, #ef4444)',
            border: 'none', borderRadius: 10, padding: '10px 20px',
            color: '#fff', fontFamily: "'Syne'", fontWeight: 700,
            fontSize: 13, cursor: 'pointer',
          }}
        >+ New Prediction</button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard icon="📍" label="Monitored Regions" value={regions.length || '—'} sub="Globally tracked" color="#a78bfa" />
        <StatCard icon="📊" label="Avg Risk Score" value={avgScore} sub="Across all regions" color="#f59e0b" />
        <StatCard icon="⚠️" label="High Risk Zones" value={highRisk} sub="Need attention" color="#ef4444" />
        <StatCard icon="📈" label="Recent Events" value={totalEvents.toLocaleString()} sub="Past 24 hours M3+" color="#22c55e" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Region risk table */}
        <Card>
          <CardHeader title="Region Risk Overview" subtitle="CNN + LSTM + GNN OUTPUT" />
          {rLoading ? (
            <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Region', 'Risk', 'Score', 'Mag Est.', 'Trend'].map(h => (
                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', color: '#444', fontWeight: 400, fontSize: 10, letterSpacing: '1px' }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regions.slice(0, 8).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '13px 20px', color: '#ccc' }}>{r.region}</td>
                    <td style={{ padding: '13px 20px' }}>
                      <RiskBadge level={r.current_risk_level} />
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 50 }}>
                          <ProgressBar value={parseFloat(r.avg_risk_score || 0)} color={RISK_COLORS[r.current_risk_level]} />
                        </div>
                        <span style={{ color: RISK_COLORS[r.current_risk_level] }}>
                          {parseFloat(r.avg_risk_score || 0).toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '13px 20px', color: '#888' }}>
                      M{parseFloat(r.predicted_magnitude || 0).toFixed(1)}
                    </td>
                    <td style={{ padding: '13px 20px' }}>
                      <span style={{
                        color: r.trend === 'increasing' ? '#ef4444' : r.trend === 'decreasing' ? '#22c55e' : '#888',
                        fontSize: 11,
                      }}>
                        {r.trend === 'increasing' ? '↑' : r.trend === 'decreasing' ? '↓' : '→'} {r.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Seismograph */}
          <Card style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Syne'", fontWeight: 700, fontSize: 14, color: '#fff' }}>Live Seismograph</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#ef4444' }}>
                <LiveDot color="#ef4444" /> REAL-TIME
              </div>
            </div>
            <Seismograph active={true} width={340} height={65} />
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#444' }}>
              <span>0.1–10 Hz</span><span>Station: USGS-PAC</span><span>Gain: 1000×</span>
            </div>
          </Card>

          {/* Recent predictions */}
          <Card style={{ flex: 1 }}>
            <CardHeader title="Recent Predictions" />
            <div>
              {pLoading ? (
                <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
              ) : predictions.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#444', fontSize: 12 }}>
                  No predictions yet — run your first prediction!
                </div>
              ) : predictions.map((p, i) => (
                <div key={p.id || i} style={{
                  padding: '12px 20px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ color: '#ccc', fontSize: 12, marginBottom: 3 }}>{p.region}</div>
                    <div style={{ color: '#555', fontSize: 10 }}>
                      {new Date(p.created_at).toLocaleTimeString()} — {p.input_depth || '?'}km depth
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: RISK_COLORS[p.risk_level], fontWeight: 700, fontSize: 13 }}>
                      M{parseFloat(p.predicted_magnitude).toFixed(1)}
                    </div>
                    <RiskBadge level={p.risk_level} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}