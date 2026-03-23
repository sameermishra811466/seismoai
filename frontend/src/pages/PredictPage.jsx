// src/pages/PredictPage.jsx
import { useState } from 'react'
import { usePredict } from '../hooks/useSeismoData'
import { Card, CardHeader, RiskBadge, ProgressBar, PageHeader, Spinner } from '../components/shared'

const REGIONS = [
  'Pacific Ring', 'Himalayan Belt', 'Cascadia Zone', 'Anatolian Fault',
  'Sumatra Fault', 'New Madrid Zone', 'Aleutian Arc', 'Caribbean Arc',
]

const inputStyle = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
  padding: '10px 14px', color: '#e2e8f0', fontSize: 13,
  fontFamily: "'DM Mono', monospace", outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle = { fontSize: 11, color: '#666', letterSpacing: '1px', display: 'block', marginBottom: 6 }

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label.toUpperCase()}</label>
      {children}
    </div>
  )
}

const MODEL_COLORS = {
  cnn_spatial: '#a78bfa',
  lstm_temporal: '#38bdf8',
  gnn_regional: '#34d399',
  ensemble: '#f97316',
}

export default function PredictPage() {
  const { predict, result, loading, error } = usePredict()
  const [form, setForm] = useState({
    latitude: '35.6',
    longitude: '139.7',
    depth: '32',
    region: 'Pacific Ring',
    rms: '0.4',
    gap: '85',
    dmin: '0.8',
    nst: '45',
  })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = () => {
    predict({
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      depth: parseFloat(form.depth),
      region: form.region || undefined,
      rms: parseFloat(form.rms),
      gap: parseFloat(form.gap),
      dmin: parseFloat(form.dmin),
      nst: parseInt(form.nst),
    })
  }

  const riskColor = {
    Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444', Critical: '#a855f7'
  }

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      <PageHeader
        title="Run Prediction"
        subtitle="Input seismic parameters to get CNN + LSTM + GNN + GAN ensemble risk assessment"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Input Form */}
        <Card>
          <CardHeader title="Seismic Parameters" subtitle="INPUT FEATURES" />
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Latitude (-90 to 90)">
                <input style={inputStyle} value={form.latitude} onChange={set('latitude')} type="number" step="0.0001" />
              </Field>
              <Field label="Longitude (-180 to 180)">
                <input style={inputStyle} value={form.longitude} onChange={set('longitude')} type="number" step="0.0001" />
              </Field>
              <Field label="Depth (km)">
                <input style={inputStyle} value={form.depth} onChange={set('depth')} type="number" min="0" max="700" />
              </Field>
              <Field label="Region">
                <select style={inputStyle} value={form.region} onChange={set('region')}>
                  <option value="">Auto-detect</option>
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, color: '#444', letterSpacing: '1px', marginBottom: 14 }}>
                STATION PARAMETERS (OPTIONAL)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="RMS Residual">
                  <input style={inputStyle} value={form.rms} onChange={set('rms')} type="number" step="0.01" />
                </Field>
                <Field label="Azimuthal Gap (°)">
                  <input style={inputStyle} value={form.gap} onChange={set('gap')} type="number" />
                </Field>
                <Field label="Min Station Dist">
                  <input style={inputStyle} value={form.dmin} onChange={set('dmin')} type="number" step="0.01" />
                </Field>
                <Field label="Station Count">
                  <input style={inputStyle} value={form.nst} onChange={set('nst')} type="number" />
                </Field>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#ef4444', marginBottom: 16 }}>
                ⚠ {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? 'rgba(249,115,22,0.3)' : 'linear-gradient(135deg, #f97316, #ef4444)',
                border: 'none', borderRadius: 10, color: '#fff',
                fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? <><Spinner /><span>Running ensemble...</span></> : '🔮 Run Prediction'}
            </button>
          </div>
        </Card>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {result ? (
            <>
              {/* Risk score */}
              <Card style={{ padding: '24px' }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: '#555', letterSpacing: '2px', marginBottom: 8 }}>ENSEMBLE RISK SCORE</div>
                  <div style={{
                    fontFamily: "'Syne'", fontSize: 64, fontWeight: 800,
                    color: riskColor[result.risk_level],
                    lineHeight: 1, marginBottom: 8,
                  }}>
                    {result.risk_score.toFixed(2)}
                  </div>
                  <RiskBadge level={result.risk_level} />
                  {result.alert && (
                    <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px', fontSize: 11, color: '#ef4444' }}>
                      🚨 ALERT TRIGGERED — High seismic risk
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {[
                    ['Region', result.region],
                    ['Predicted Mag', `M${result.predicted_magnitude}`],
                    ['Confidence', `${(result.confidence * 100).toFixed(0)}%`],
                    ['Coordinates', `${result.latitude.toFixed(2)}, ${result.longitude.toFixed(2)}`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>{k.toUpperCase()}</div>
                      <div style={{ fontSize: 13, color: '#ccc' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Model contributions */}
              <Card style={{ padding: '20px 24px' }}>
                <div style={{ fontFamily: "'Syne'", fontWeight: 700, color: '#fff', marginBottom: 18 }}>Model Contributions</div>
                {Object.entries(result.model_contributions).map(([model, score]) => (
                  <div key={model} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                      <span style={{ color: '#888', textTransform: 'capitalize' }}>{model.replace(/_/g, ' ')}</span>
                      <span style={{ color: MODEL_COLORS[model] }}>{(score * 100).toFixed(1)}%</span>
                    </div>
                    <ProgressBar value={score} color={MODEL_COLORS[model]} height={6} />
                  </div>
                ))}
              </Card>

              {/* Explanation */}
              <Card style={{ padding: '20px 24px' }}>
                <div style={{ fontFamily: "'Syne'", fontWeight: 700, color: '#fff', marginBottom: 12 }}>AI Explanation</div>
                <div style={{ fontSize: 12, color: '#888', lineHeight: 1.7 }}>{result.explanation}</div>
              </Card>
            </>
          ) : (
            <Card style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🌍</div>
              <div style={{ fontFamily: "'Syne'", fontSize: 16, color: '#fff', marginBottom: 8 }}>Ready to Predict</div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                Enter seismic parameters on the left and click<br />"Run Prediction" to get your risk assessment.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}