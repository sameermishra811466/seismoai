// src/pages/BenchmarkPage.jsx
// Algorithm Benchmark — Compare SeismoAI vs 16 ML algorithms

import { useState, useEffect } from 'react'
import { api } from '../lib/api'

// ── Color helpers ──────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  'Deep Learning Ensemble': '#f97316',
  'Boosting':               '#a78bfa',
  'Ensemble':               '#38bdf8',
  'Neural Network':         '#34d399',
  'Kernel Method':          '#f59e0b',
  'Instance-Based':         '#fb7185',
  'Linear':                 '#94a3b8',
  'Tree':                   '#86efac',
  'Probabilistic':          '#c084fc',
}

const categoryColor = (cat) => CATEGORY_COLORS[cat] || '#888'

// ── Horizontal bar chart ─────────────────────────────────────────────────

function MetricBar({ value, max = 1, color, width = 200 }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 4,
          transition: 'width 1s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
      <span style={{ fontSize: 11, color, minWidth: 40, textAlign: 'right' }}>
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  )
}

// ── Radar mini-chart ───────────────────────────────────────────────────────

function RadarChart({ result, size = 120 }) {
  const metrics = [
    { label: 'ACC', value: result.accuracy },
    { label: 'F1',  value: result.f1_score },
    { label: 'PREC', value: result.precision },
    { label: 'REC', value: result.recall },
    { label: 'AUC', value: result.auc_roc || 0.5 },
  ]
  const n = metrics.length
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38

  const getXY = (i, v) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    return {
      x: cx + r * v * Math.cos(angle),
      y: cy + r * v * Math.sin(angle),
    }
  }

  const points = metrics.map((m, i) => getXY(i, m.value))
  const poly = points.map(p => `${p.x},${p.y}`).join(' ')

  const color = result.is_seismoai ? '#f97316' : categoryColor(result.category)

  return (
    <svg width={size} height={size}>
      {/* Grid circles */}
      {[0.25, 0.5, 0.75, 1].map(v => (
        <polygon
          key={v}
          points={metrics.map((_, i) => {
            const { x, y } = getXY(i, v)
            return `${x},${y}`
          }).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}
      {/* Spokes */}
      {metrics.map((_, i) => {
        const { x, y } = getXY(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      })}
      {/* Data polygon */}
      <polygon points={poly} fill={`${color}20`} stroke={color} strokeWidth="1.5" />
      {/* Data dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
      ))}
      {/* Labels */}
      {metrics.map((m, i) => {
        const { x, y } = getXY(i, 1.25)
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#555">{m.label}</text>
      })}
    </svg>
  )
}

// ── Main Benchmark Table Row ───────────────────────────────────────────────

function AlgoRow({ result, metric, maxAcc, isExpanded, onToggle }) {
  const color = result.is_seismoai ? '#f97316' : categoryColor(result.category)
  const metricValue = result[metric] || 0

  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: result.is_seismoai
            ? 'rgba(249,115,22,0.07)'
            : isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {/* Rank */}
        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: result.is_seismoai ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: result.is_seismoai ? '#f97316' : '#666',
            fontFamily: "'Syne'", fontWeight: 700,
          }}>
            {result.rank}
          </div>
        </td>

        {/* Name */}
        <td style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {result.is_seismoai && <span style={{ fontSize: 14 }}>✦</span>}
            <div>
              <div style={{ fontSize: 12, color: result.is_seismoai ? '#fff' : '#ccc', fontWeight: result.is_seismoai ? 600 : 400 }}>
                {result.name}
              </div>
              <span style={{
                display: 'inline-block', marginTop: 3,
                background: `${color}18`, border: `1px solid ${color}30`,
                borderRadius: 10, padding: '1px 7px', fontSize: 9, color,
              }}>
                {result.category}
              </span>
            </div>
          </div>
        </td>

        {/* Metric bar */}
        <td style={{ padding: '12px 16px' }}>
          <MetricBar value={metricValue} color={color} width={180} />
        </td>

        {/* Accuracy */}
        <td style={{ padding: '12px 16px', fontSize: 12, color: '#888', textAlign: 'center' }}>
          {(result.accuracy * 100).toFixed(1)}%
        </td>

        {/* F1 */}
        <td style={{ padding: '12px 16px', fontSize: 12, color: '#888', textAlign: 'center' }}>
          {result.f1_score.toFixed(3)}
        </td>

        {/* CV */}
        <td style={{ padding: '12px 16px', fontSize: 11, color: '#666', textAlign: 'center' }}>
          {(result.cv_mean * 100).toFixed(1)}% ±{(result.cv_std * 100).toFixed(1)}
        </td>

        {/* Train time */}
        <td style={{ padding: '12px 16px', fontSize: 11, color: '#555', textAlign: 'center' }}>
          {result.training_time_ms < 1000
            ? `${result.training_time_ms.toFixed(0)}ms`
            : `${(result.training_time_ms / 1000).toFixed(1)}s`}
        </td>

        {/* Expand arrow */}
        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#444', fontSize: 14 }}>
          {isExpanded ? '▲' : '▼'}
        </td>
      </tr>

      {/* Expanded row */}
      {isExpanded && (
        <tr style={{ background: 'rgba(255,255,255,0.015)' }}>
          <td colSpan={8} style={{ padding: '0 16px 16px 60px' }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {/* Radar chart */}
              <div style={{ flexShrink: 0 }}>
                <RadarChart result={result} size={110} />
              </div>
              {/* Details */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
                  {[
                    ['Precision', `${(result.precision * 100).toFixed(1)}%`],
                    ['Recall', `${(result.recall * 100).toFixed(1)}%`],
                    ['AUC-ROC', result.auc_roc ? `${(result.auc_roc * 100).toFixed(1)}%` : 'N/A'],
                    ['MCC', result.mcc.toFixed(3)],
                    ['Inference', `${result.inference_time_us.toFixed(1)}µs`],
                    ['CV Mean', `${(result.cv_mean * 100).toFixed(1)}%`],
                    ['CV Std', `±${(result.cv_std * 100).toFixed(1)}%`],
                    ['5-Fold', `${(result.cv_mean * 100).toFixed(1)}±${(result.cv_std * 100).toFixed(1)}%`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 9, color: '#444', marginBottom: 3 }}>{k.toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 9, color: '#22c55e', marginBottom: 3 }}>✓ STRENGTHS</div>
                    <div style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>{result.strengths}</div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 6, padding: '8px 12px' }}>
                    <div style={{ fontSize: 9, color: '#ef4444', marginBottom: 3 }}>✗ WEAKNESSES</div>
                    <div style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>{result.weaknesses}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                  {result.verdict}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

const METRICS = [
  { key: 'accuracy',  label: 'Accuracy' },
  { key: 'f1_score',  label: 'F1 Score' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall',    label: 'Recall' },
  { key: 'auc_roc',   label: 'AUC-ROC' },
  { key: 'mcc',       label: 'MCC' },
]

export default function BenchmarkPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)
  const [error, setError] = useState(null)
  const [metric, setMetric] = useState('accuracy')
  const [expanded, setExpanded] = useState(null)
  const [sortBy, setSortBy] = useState('accuracy')
  const [filterCat, setFilterCat] = useState('All')
  const [progress, setProgress] = useState(0)

  const runBenchmark = async () => {
    setLoading(true)
    setError(null)
    setProgress(0)

    // Fake progress while waiting for long computation
    const iv = setInterval(() => {
      setProgress(p => Math.min(p + 2, 90))
    }, 1200)

    try {
      const result = await api.getBenchmark()
      clearInterval(iv)
      setProgress(100)
      setTimeout(() => { setData(result); setLoading(false); setRan(true) }, 500)
    } catch (e) {
      clearInterval(iv)
      setError(e.message)
      setLoading(false)
    }
  }

  const sortedResults = data
    ? [...data.results]
        .filter(r => filterCat === 'All' || r.category === filterCat)
        .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
    : []

  const categories = data
    ? ['All', ...new Set(data.results.map(r => r.category))]
    : ['All']

  const maxVal = sortedResults.length ? Math.max(...sortedResults.map(r => r[metric] || 0)) : 1

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        tr:hover td { background: rgba(255,255,255,0.015); }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#fff' }}>
          Algorithm Benchmark
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 5 }}>
          Compare SeismoAI vs 16 ML algorithms on 6,200 USGS earthquake records
        </div>
      </div>

      {/* Pre-run state */}
      {!ran && !loading && (
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '56px 40px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🧪</div>
          <div style={{ fontFamily: "'Syne'", fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
            Ready to Benchmark
          </div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8, marginBottom: 24, maxWidth: 520, margin: '0 auto 24px' }}>
            This will train and evaluate 16 ML algorithms on your earthquake dataset.
            Takes approximately <strong style={{ color: '#f97316' }}>30–60 seconds</strong> on first run.
            Results are cached afterward for instant access.
          </div>

          {/* Algorithm preview pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
            {['SeismoAI ✦', 'GBM', 'Random Forest', 'Extra Trees', 'AdaBoost', 'MLP', 'SVM (RBF)', 'KNN', 'Logistic Reg', 'Decision Tree', 'Naive Bayes', 'LDA', 'Ridge', 'SGD', 'Bagging', 'SVM (Linear)'].map(n => (
              <span key={n} style={{
                background: n.includes('✦') ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${n.includes('✦') ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 20, padding: '4px 12px',
                fontSize: 11, color: n.includes('✦') ? '#f97316' : '#666',
              }}>{n}</span>
            ))}
          </div>

          <button
            onClick={runBenchmark}
            style={{
              background: 'linear-gradient(135deg, #f97316, #ef4444)',
              border: 'none', borderRadius: 12, padding: '14px 36px',
              color: '#fff', fontFamily: "'Syne'", fontWeight: 700, fontSize: 15,
              cursor: 'pointer', letterSpacing: '0.5px',
            }}
          >
            🚀 Run Benchmark
          </button>
        </div>
      )}

      {/* Loading progress */}
      {loading && (
        <div style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '56px 40px', textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            border: '4px solid rgba(255,255,255,0.08)', borderTop: '4px solid #f97316',
            animation: 'spin 0.9s linear infinite', margin: '0 auto 24px',
          }} />
          <div style={{ fontFamily: "'Syne'", fontSize: 16, color: '#fff', marginBottom: 8 }}>
            Training & Evaluating {progress < 90 ? Math.round(progress / 5.6) : 16}/16 Algorithms
          </div>
          <div style={{ width: 340, height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, margin: '0 auto 12px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #f97316, #ef4444)', borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: '#555' }}>
            {progress < 30 ? 'Loading dataset & building features...' :
             progress < 60 ? 'Training ensemble and boosting models...' :
             progress < 80 ? 'Running linear and kernel methods...' :
             progress < 95 ? 'Computing cross-validation scores...' :
             'Finalizing results...'}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 24, textAlign: 'center', color: '#ef4444' }}>
          <div style={{ marginBottom: 8 }}>⚠ {error}</div>
          <button onClick={runBenchmark} style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '8px 20px', color: '#ef4444', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'SeismoAI Rank', value: `#${data.seismoai_rank}`, sub: 'of 16 algorithms', color: '#f97316' },
              { label: 'SeismoAI Accuracy', value: `${(data.seismoai_accuracy * 100).toFixed(1)}%`, sub: 'on test set', color: '#f97316' },
              { label: 'Best Algorithm', value: data.best_algorithm.split('(')[0].trim().split(' ').slice(-1)[0], sub: `${(data.best_accuracy * 100).toFixed(1)}% accuracy`, color: '#22c55e' },
              { label: 'Dataset Size', value: `${data.dataset_size.toLocaleString()}`, sub: `${data.test_size} test samples`, color: '#38bdf8' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 9, color: '#444', letterSpacing: '1.5px', marginBottom: 8 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 5 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Visual bar comparison */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: '1.5px', marginBottom: 16 }}>ACCURACY COMPARISON — ALL ALGORITHMS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...data.results].sort((a, b) => b.accuracy - a.accuracy).map(r => {
                const color = r.is_seismoai ? '#f97316' : categoryColor(r.category)
                return (
                  <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 110, fontSize: 10, color: r.is_seismoai ? '#f97316' : '#666', textAlign: 'right', flexShrink: 0 }}>
                      {r.is_seismoai ? '✦ ' : ''}{r.short_name}
                    </div>
                    <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${r.accuracy * 100}%`, height: '100%',
                        background: r.is_seismoai ? 'linear-gradient(90deg,#f97316,#ef4444)' : color,
                        opacity: r.is_seismoai ? 1 : 0.6,
                        borderRadius: 3, transition: 'width 1s ease',
                        display: 'flex', alignItems: 'center', paddingLeft: 6,
                      }}>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' }}>
                          {(r.accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Interpretation */}
          <div style={{
            background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
            borderRadius: 12, padding: '14px 20px', marginBottom: 20,
            fontSize: 12, color: '#aaa', lineHeight: 1.7,
          }}>
            <span style={{ color: '#f97316', fontWeight: 700 }}>📊 Interpretation: </span>
            {data.interpretation}
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Metric selector */}
            <div style={{ display: 'flex', gap: 4 }}>
              {METRICS.map(m => (
                <button key={m.key} onClick={() => { setMetric(m.key); setSortBy(m.key) }}
                  style={{
                    background: metric === m.key ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${metric === m.key ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 6, padding: '5px 12px', fontSize: 11,
                    color: metric === m.key ? '#f97316' : '#666', cursor: 'pointer',
                  }}
                >{m.label}</button>
              ))}
            </div>

            {/* Category filter */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  style={{
                    background: filterCat === cat ? `${categoryColor(cat)}20` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${filterCat === cat ? `${categoryColor(cat)}50` : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 20, padding: '3px 10px', fontSize: 10,
                    color: filterCat === cat ? categoryColor(cat) : '#555', cursor: 'pointer',
                  }}
                >{cat}</button>
              ))}
            </div>
          </div>

          {/* Full table */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  {['#', 'Algorithm', `${METRICS.find(m=>m.key===metric)?.label} ↑`, 'Accuracy', 'F1 Score', 'Cross-Val', 'Train Time', ''].map((h, i) => (
                    <th key={i} style={{ padding: '12px 16px', textAlign: i < 2 ? 'left' : 'center', fontSize: 9, color: '#444', fontWeight: 400, letterSpacing: '1px' }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedResults.map(r => (
                  <AlgoRow
                    key={r.name}
                    result={r}
                    metric={metric}
                    maxAcc={maxVal}
                    isExpanded={expanded === r.name}
                    onToggle={() => setExpanded(expanded === r.name ? null : r.name)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#444' }}>
            <span>Generated: {new Date(data.generated_at).toLocaleString()}</span>
            <button
              onClick={() => { setData(null); setRan(false); api.clearBenchmarkCache?.() }}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 10 }}
            >↻ Re-run Benchmark</button>
          </div>
        </div>
      )}
    </div>
  )
}