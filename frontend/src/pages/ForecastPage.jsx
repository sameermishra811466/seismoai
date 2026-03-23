// src/pages/ForecastPage.jsx
// Yearly Earthquake Forecast — Top 10 predicted locations for any year

import { useState, useEffect } from 'react'
import { api } from '../lib/api'

// ── Helpers ────────────────────────────────────────────────────────────────

const RISK_COLORS = {
  Low:      { bg: 'rgba(34,197,94,0.1)',   text: '#22c55e', border: 'rgba(34,197,94,0.25)' },
  Medium:   { bg: 'rgba(245,158,11,0.1)',  text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  High:     { bg: 'rgba(239,68,68,0.1)',   text: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  Critical: { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.25)' },
}

const ALERT_COLORS = {
  Advisory: { bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
  Watch:    { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  Warning:  { bg: 'rgba(239,68,68,0.12)',  text: '#f87171', border: 'rgba(239,68,68,0.25)' },
}

const SEASON_ICONS = { Spring: '🌸', Summer: '☀️', Autumn: '🍂', Winter: '❄️' }

function probBar(prob) {
  const pct = Math.round(prob * 100)
  const color = pct > 85 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 1s ease' }} />
      </div>
      <span style={{ fontSize: 12, color, minWidth: 36, textAlign: 'right', fontWeight: 700 }}>{pct}%</span>
    </div>
  )
}

// ── Mini World Map ─────────────────────────────────────────────────────────
function WorldDotMap({ hotspots, selected, onSelect }) {
  const latToY = (lat) => ((90 - lat) / 180) * 100
  const lngToX = (lng) => ((lng + 180) / 360) * 100

  return (
    <div style={{
      position: 'relative', width: '100%', paddingBottom: '42%',
      background: 'rgba(255,255,255,0.02)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
    }}>
      {/* Grid lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Latitude lines */}
        {[-60, -30, 0, 30, 60].map(lat => (
          <line key={lat} x1="0%" y1={`${latToY(lat)}%`} x2="100%" y2={`${latToY(lat)}%`}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {/* Longitude lines */}
        {[-120, -60, 0, 60, 120].map(lng => (
          <line key={lng} x1={`${lngToX(lng)}%`} y1="0%" x2={`${lngToX(lng)}%`} y2="100%"
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {/* Equator */}
        <line x1="0%" y1={`${latToY(0)}%`} x2="100%" y2={`${latToY(0)}%`}
          stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4,4" />
      </svg>

      {/* Hotspot dots */}
      {hotspots.map((h, i) => {
        const x = lngToX(h.longitude)
        const y = latToY(h.latitude)
        const isSelected = selected?.rank === h.rank
        const rc = RISK_COLORS[h.risk_level] || RISK_COLORS.Medium
        const size = isSelected ? 16 : 10 + (10 - h.rank) * 1.2

        return (
          <div
            key={h.rank}
            onClick={() => onSelect(isSelected ? null : h)}
            style={{
              position: 'absolute',
              left: `${x}%`, top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              width: size, height: size,
              borderRadius: '50%',
              background: rc.text,
              border: `2px solid ${isSelected ? '#fff' : rc.text}`,
              opacity: isSelected ? 1 : 0.75,
              cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: isSelected ? `0 0 14px ${rc.text}` : `0 0 6px ${rc.text}50`,
              zIndex: isSelected ? 10 : 5,
              animation: h.alert_level === 'Warning' ? 'pulse 1.5s infinite' : 'none',
            }}
            title={`#${h.rank} ${h.region}`}
          >
            {isSelected && (
              <div style={{
                position: 'absolute', bottom: '120%', left: '50%',
                transform: 'translateX(-50%)',
                background: '#111', border: `1px solid ${rc.border}`,
                borderRadius: 6, padding: '4px 8px', fontSize: 10, color: rc.text,
                whiteSpace: 'nowrap', zIndex: 20,
              }}>
                #{h.rank} {h.region}
              </div>
            )}
          </div>
        )
      })}

      {/* Rank labels */}
      {hotspots.map(h => (
        <div key={`label-${h.rank}`} style={{
          position: 'absolute',
          left: `${lngToX(h.longitude)}%`, top: `${latToY(h.latitude)}%`,
          transform: 'translate(8px, -50%)',
          fontSize: 9, color: 'rgba(255,255,255,0.5)',
          pointerEvents: 'none',
        }}>#{h.rank}</div>
      ))}
    </div>
  )
}

// ── Hotspot Card ────────────────────────────────────────────────────────────
function HotspotCard({ hotspot: h, isSelected, onClick }) {
  const rc = RISK_COLORS[h.risk_level] || RISK_COLORS.Medium
  const ac = ALERT_COLORS[h.alert_level] || ALERT_COLORS.Advisory

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? 'rgba(249,115,22,0.07)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${isSelected ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        animation: 'fadeIn 0.4s ease forwards',
        animationDelay: `${h.rank * 0.06}s`,
        opacity: 0,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${rc.bg}`, border: `1px solid ${rc.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, color: rc.text,
          }}>
            {h.rank}
          </div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: '#fff', lineHeight: 1.2 }}>
              {h.region}
            </div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
              {h.latitude.toFixed(1)}°, {h.longitude.toFixed(1)}°
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <span style={{
            background: rc.bg, color: rc.text, border: `1px solid ${rc.border}`,
            borderRadius: 20, padding: '2px 8px', fontSize: 9, letterSpacing: '0.5px',
          }}>{h.risk_level.toUpperCase()}</span>
          <span style={{
            background: ac.bg, color: ac.text, border: `1px solid ${ac.border}`,
            borderRadius: 20, padding: '2px 8px', fontSize: 9, letterSpacing: '0.5px',
          }}>{h.alert_level}</span>
        </div>
      </div>

      {/* Probability bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: '#555', marginBottom: 5, letterSpacing: '0.5px' }}>
          PROBABILITY OF M5.0+ EVENT
        </div>
        {probBar(h.probability)}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '7px 10px' }}>
          <div style={{ fontSize: 9, color: '#444', marginBottom: 2 }}>EST. MAG</div>
          <div style={{ fontSize: 13, color: '#f97316', fontFamily: "'Syne'", fontWeight: 700 }}>
            {h.predicted_magnitude}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '7px 10px' }}>
          <div style={{ fontSize: 9, color: '#444', marginBottom: 2 }}>PEAK SEASON</div>
          <div style={{ fontSize: 11, color: '#ccc' }}>
            {SEASON_ICONS[h.season_peak]} {h.season_peak}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '7px 10px' }}>
          <div style={{ fontSize: 9, color: '#444', marginBottom: 2 }}>HIST. EVENTS</div>
          <div style={{ fontSize: 12, color: '#ccc', fontFamily: "'Syne'", fontWeight: 700 }}>
            {h.historical_events.toLocaleString()}+
          </div>
        </div>
      </div>

      {/* Confidence interval */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#555', marginBottom: 8 }}>
        <span>Confidence Interval: <span style={{ color: '#888' }}>{h.confidence_interval}</span></span>
        <span>Depth: ~{h.depth_estimate} km</span>
      </div>

      {/* Reasoning (expanded on select) */}
      {isSelected && (
        <div style={{
          marginTop: 10, padding: '10px 12px',
          background: 'rgba(249,115,22,0.06)', borderRadius: 8,
          border: '1px solid rgba(249,115,22,0.15)',
          fontSize: 11, color: '#aaa', lineHeight: 1.7,
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ fontSize: 9, color: '#f97316', marginBottom: 5, letterSpacing: '1px' }}>AI REASONING</div>
          {h.reasoning}
        </div>
      )}
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ForecastPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  const fetchForecast = async (y) => {
    setLoading(true)
    setError(null)
    setSelected(null)
    try {
      const result = await api.getForecast(y)
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchForecast(year) }, [year])

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#fff' }}>
            Yearly Earthquake Forecast
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 5 }}>
            Top 10 predicted hotspots · CNN + LSTM + GNN ensemble · Solar & ENSO correlations
          </div>
        </div>

        {/* Year selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setYear(y => Math.max(2020, y - 1))}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 36, height: 36, color: '#aaa', cursor: 'pointer', fontSize: 18 }}
          >‹</button>
          <div style={{
            background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
            borderRadius: 10, padding: '8px 20px',
            fontFamily: "'Syne'", fontWeight: 800, fontSize: 22, color: '#f97316',
            minWidth: 90, textAlign: 'center',
          }}>
            {year}
          </div>
          <button
            onClick={() => setYear(y => Math.min(2050, y + 1))}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 36, height: 36, color: '#aaa', cursor: 'pointer', fontSize: 18 }}
          >›</button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, gap: 14 }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: '#555', fontSize: 13 }}>Running ensemble forecast for {year}...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 24, textAlign: 'center', color: '#ef4444' }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>⚠</div>
          <div style={{ fontSize: 13 }}>{error}</div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>Make sure your ML backend is running</div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary banner */}
          <div style={{
            background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)',
            borderRadius: 12, padding: '14px 20px', marginBottom: 20, fontSize: 12, color: '#aaa', lineHeight: 1.7,
          }}>
            <span style={{ color: '#f97316', fontWeight: 700 }}>📊 {year} Summary: </span>
            {data.summary}
          </div>

          {/* World Map */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: '1.5px', marginBottom: 10 }}>
              GLOBAL HOTSPOT MAP — CLICK DOTS TO EXPLORE
            </div>
            <WorldDotMap
              hotspots={data.hotspots}
              selected={selected}
              onSelect={setSelected}
            />
          </div>

          {/* Top stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              {
                label: 'Top Hotspot',
                value: data.hotspots[0]?.region.split(' ')[0] + '...',
                sub: `${Math.round(data.hotspots[0]?.probability * 100)}% probability`,
                color: '#ef4444',
              },
              {
                label: 'Highest Est. Mag',
                value: `M${Math.max(...data.hotspots.map(h => h.predicted_magnitude))}`,
                sub: data.hotspots.find(h => h.predicted_magnitude === Math.max(...data.hotspots.map(h => h.predicted_magnitude)))?.region.split(' - ')[0],
                color: '#f97316',
              },
              {
                label: 'Warning Zones',
                value: data.hotspots.filter(h => h.alert_level === 'Warning').length,
                sub: 'risk score > 0.85',
                color: '#a855f7',
              },
              {
                label: 'Candidates Analyzed',
                value: data.total_candidate_locations,
                sub: 'seismic zones screened',
                color: '#38bdf8',
              },
            ].map((s, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 9, color: '#444', letterSpacing: '1.5px', marginBottom: 8 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 5 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Hotspot grid */}
          <div style={{ fontSize: 10, color: '#444', letterSpacing: '1.5px', marginBottom: 14 }}>
            TOP 10 PREDICTED LOCATIONS — {year} · CLICK CARD FOR AI REASONING
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 28 }}>
            {data.hotspots.map((h) => (
              <HotspotCard
                key={h.rank}
                hotspot={h}
                isSelected={selected?.rank === h.rank}
                onClick={() => setSelected(selected?.rank === h.rank ? null : h)}
              />
            ))}
          </div>

          {/* Methodology */}
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '16px 20px',
          }}>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: '1.5px', marginBottom: 8 }}>METHODOLOGY</div>
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.8 }}>{data.methodology}</div>
          </div>
        </>
      )}
    </div>
  )
}