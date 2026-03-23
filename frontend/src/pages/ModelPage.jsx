// src/pages/ModelPage.jsx
import { useModelStats } from '../hooks/useSeismoData'
import { Card, CardHeader, ProgressBar, PageHeader, Spinner } from '../components/shared'

const MODELS = [
  {
    id: 'cnn',
    name: 'CNN — Spatial Analyzer',
    icon: '🗺️',
    color: '#a78bfa',
    description: 'Convolutional Neural Network that detects spatial patterns in earthquake distribution across latitude/longitude grids. Captures hotspots and fault line signatures.',
    metric: 'Accuracy',
  },
  {
    id: 'lstm',
    name: 'LSTM — Temporal Tracker',
    icon: '📈',
    color: '#38bdf8',
    description: 'Long Short-Term Memory network that models time-series sequences of seismic events. Learns periodicity, aftershock patterns, and temporal clustering.',
    metric: 'MAE',
  },
  {
    id: 'gnn',
    name: 'GNN — Regional Graph',
    icon: '🕸️',
    color: '#34d399',
    description: 'Graph Neural Network that models dependencies between regions as a graph. Captures how seismicity in one zone influences neighboring fault systems.',
    metric: 'MAE',
  },
  {
    id: 'gan',
    name: 'GAN — Data Generator',
    icon: '⚡',
    color: '#f59e0b',
    description: 'Generative Adversarial Network used to synthesize realistic rare high-magnitude earthquake scenarios for training data augmentation and class balancing.',
    metric: 'Purpose',
  },
]

export default function ModelPage() {
  const { stats, loading } = useModelStats()

  const getMetricValue = (modelId) => {
    if (!stats) return null
    if (modelId === 'cnn') return stats.cnn_accuracy ? `${(stats.cnn_accuracy * 100).toFixed(1)}%` : null
    if (modelId === 'lstm') return stats.lstm_mae ? `±${stats.lstm_mae.toFixed(3)} mag` : null
    if (modelId === 'gnn') return stats.gnn_mae ? `±${stats.gnn_mae.toFixed(3)} mag` : null
    if (modelId === 'gan') return 'Data Augmentation'
    return null
  }

  const getAccuracy = (modelId) => {
    if (!stats) return 0.8
    if (modelId === 'cnn') return stats.cnn_accuracy || 0.84
    if (modelId === 'lstm') return 1 - Math.min(stats.lstm_mae / 5, 1) || 0.78
    if (modelId === 'gnn') return 1 - Math.min(stats.gnn_mae / 5, 1) || 0.81
    if (modelId === 'gan') return 1.0
    return 0.8
  }

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      <PageHeader
        title="Model Architecture"
        subtitle="CNN + LSTM + GNN + GAN hybrid ensemble for earthquake risk prediction"
      />

      {/* Architecture diagram */}
      <Card style={{ padding: '24px', marginBottom: 24 }}>
        <div style={{ textAlign: 'center', fontFamily: "'Syne'", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#555', letterSpacing: '2px' }}>ENSEMBLE PIPELINE</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
          {[
            { label: 'Raw Input', sub: 'lat/lng/depth/time', color: '#555' },
            { arrow: true },
            { label: 'CNN', sub: 'Spatial', color: '#a78bfa', weight: '40%' },
            { label: 'LSTM', sub: 'Temporal', color: '#38bdf8', weight: '30%' },
            { label: 'GNN', sub: 'Regional', color: '#34d399', weight: '30%' },
            { arrow: true },
            { label: 'Ensemble', sub: 'Risk Score 0–1', color: '#f97316' },
          ].map((item, i) => item.arrow ? (
            <div key={i} style={{ color: '#333', fontSize: 20, margin: '0 8px' }}>→</div>
          ) : (
            <div key={i} style={{
              background: `${item.color}18`, border: `1px solid ${item.color}40`,
              borderRadius: 10, padding: '12px 16px', textAlign: 'center', minWidth: 90,
              margin: '4px',
            }}>
              <div style={{ color: item.color, fontFamily: "'Syne'", fontWeight: 700, fontSize: 13 }}>{item.label}</div>
              <div style={{ fontSize: 9, color: '#555', marginTop: 3 }}>{item.sub}</div>
              {item.weight && <div style={{ fontSize: 9, color: item.color, marginTop: 2 }}>{item.weight}</div>}
            </div>
          ))}
        </div>
      </Card>

      {/* Model cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 24 }}>
        {MODELS.map((m) => {
          const metricVal = getMetricValue(m.id)
          const acc = getAccuracy(m.id)
          return (
            <Card key={m.id} style={{ padding: '22px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 24 }}>{m.icon}</div>
                  <div>
                    <div style={{ fontFamily: "'Syne'", fontWeight: 700, color: '#fff', fontSize: 14 }}>{m.name}</div>
                  </div>
                </div>
                {metricVal && (
                  <div style={{ background: `${m.color}18`, border: `1px solid ${m.color}30`, borderRadius: 6, padding: '4px 10px', fontSize: 11, color: m.color }}>
                    {metricVal}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7, marginBottom: 14 }}>
                {m.description}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#444', marginBottom: 5 }}>
                  <span>Performance</span>
                  <span style={{ color: m.color }}>{(acc * 100).toFixed(0)}%</span>
                </div>
                <ProgressBar value={acc} color={m.color} height={5} />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Training stats */}
      <Card>
        <CardHeader title="Training Statistics" subtitle="DATASET & PERFORMANCE" />
        <div style={{ padding: '20px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
          ) : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                ['Dataset Size', `${stats.dataset_size?.toLocaleString()} records`],
                ['Feature Count', `${stats.features_count} features`],
                ['CNN Accuracy', stats.cnn_accuracy ? `${(stats.cnn_accuracy * 100).toFixed(1)}%` : '—'],
                ['LSTM MAE', stats.lstm_mae ? `±${stats.lstm_mae.toFixed(4)}` : '—'],
                ['GNN MAE', stats.gnn_mae ? `±${stats.gnn_mae.toFixed(4)}` : '—'],
                ['Trained At', stats.trained_at ? new Date(stats.trained_at).toLocaleDateString() : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: '#444', letterSpacing: '1px', marginBottom: 6 }}>{k.toUpperCase()}</div>
                  <div style={{ fontSize: 14, color: '#ccc', fontFamily: "'Syne'", fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#444', fontSize: 12, padding: 24 }}>
              Could not connect to ML API. Make sure the backend is running.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}