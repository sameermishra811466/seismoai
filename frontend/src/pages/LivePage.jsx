// src/pages/LivePage.jsx
// Real-Time USGS Earthquake Feed with ML Predictions
// Fetches live data every 60 seconds, Supabase realtime for new events

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

// ── Constants ──────────────────────────────────────────────────────────────

const FEEDS = [
  { key: 'past_hour_all',      label: 'Past Hour — All' },
  { key: 'past_hour_m2.5',     label: 'Past Hour — M2.5+' },
  { key: 'past_day_all',       label: 'Past Day — All' },
  { key: 'past_day_m2.5',      label: 'Past Day — M2.5+' },
  { key: 'past_day_m4.5',      label: 'Past Day — M4.5+' },
  { key: 'past_day_significant', label: 'Past Day — Significant' },
  { key: 'past_week_m2.5',     label: 'Past Week — M2.5+' },
  { key: 'past_week_m4.5',     label: 'Past Week — M4.5+' },
  { key: 'past_week_significant', label: 'Past Week — Significant' },
  { key: 'past_month_m4.5',    label: 'Past Month — M4.5+' },
]

const MAG_COLOR = (mag) => {
  if (mag >= 7.0) return '#a855f7'
  if (mag >= 6.0) return '#ef4444'
  if (mag >= 5.0) return '#f97316'
  if (mag >= 4.0) return '#f59e0b'
  if (mag >= 3.0) return '#eab308'
  return '#22c55e'
}

const RISK_COLORS = {
  Low:      '#22c55e',
  Medium:   '#f59e0b',
  High:     '#ef4444',
  Critical: '#a855f7',
}

const ALERT_COLORS = {
  green:  '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red:    '#ef4444',
}

function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// ── Mini pulse dot ────────────────────────────────────────────────────────

function PulseDot({ color }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, animation: 'pulse 1.5s infinite',
      flexShrink: 0,
    }} />
  )
}

// ── World map with real dots ─────────────────────────────────────────────

function LiveMap({ earthquakes, onSelect, selected }) {
  const latToY = (lat) => ((90 - lat) / 180) * 100
  const lngToX = (lng) => ((lng + 180) / 360) * 100

  const MAX_DOTS = 300
  const visible = earthquakes.slice(0, MAX_DOTS)

  return (
    <div style={{
      position: 'relative', width: '100%', paddingBottom: '44%',
      background: '#0a0a14',
      borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Grid */}
        {[-60,-30,0,30,60].map(lat => (
          <line key={`lat${lat}`} x1="0%" y1={`${latToY(lat)}%`} x2="100%" y2={`${latToY(lat)}%`}
            stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
        {[-120,-60,0,60,120].map(lng => (
          <line key={`lng${lng}`} x1={`${lngToX(lng)}%`} y1="0%" x2={`${lngToX(lng)}%`} y2="100%"
            stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
        {/* Equator */}
        <line x1="0%" y1={`${latToY(0)}%`} x2="100%" y2={`${latToY(0)}%`}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3,5" />
      </svg>

      {/* Earthquake dots */}
      {visible.map((eq) => {
        const x = lngToX(eq.longitude)
        const y = latToY(eq.latitude)
        const color = MAG_COLOR(eq.magnitude)
        const size = Math.max(4, Math.min(18, eq.magnitude * 2.5))
        const isSelected = selected?.usgs_id === eq.usgs_id
        const isNew = eq.age_minutes < 60

        return (
          <div key={eq.usgs_id}
            onClick={() => onSelect(isSelected ? null : eq)}
            style={{
              position: 'absolute',
              left: `${x}%`, top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              width: size, height: size, borderRadius: '50%',
              background: color,
              opacity: isSelected ? 1 : (isNew ? 0.9 : 0.55),
              cursor: 'pointer', zIndex: isSelected ? 10 : 3,
              boxShadow: isSelected ? `0 0 14px ${color}` : isNew ? `0 0 6px ${color}80` : 'none',
              border: isSelected ? `2px solid #fff` : 'none',
              transition: 'all 0.2s',
              animation: isNew && eq.magnitude >= 5.0 ? 'pulse 1.5s infinite' : 'none',
            }}
            title={`M${eq.magnitude} — ${eq.place}`}
          />
        )
      })}

      {/* Selected popup */}
      {selected && (() => {
        const x = lngToX(selected.longitude)
        const y = latToY(selected.latitude)
        const color = MAG_COLOR(selected.magnitude)
        return (
          <div style={{
            position: 'absolute',
            left: `${Math.min(75, Math.max(5, x))}%`,
            top: `${Math.min(80, Math.max(5, y - 15))}%`,
            transform: 'translate(-50%, -100%)',
            background: '#111', border: `1px solid ${color}`,
            borderRadius: 8, padding: '8px 12px', fontSize: 11, zIndex: 20,
            whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            <div style={{ color, fontWeight: 700, marginBottom: 2 }}>M{selected.magnitude}</div>
            <div style={{ color: '#aaa' }}>{selected.place}</div>
            <div style={{ color: '#555', marginTop: 2 }}>{timeAgo(selected.event_time)} · {selected.depth}km deep</div>
            {selected.tsunami && <div style={{ color: '#38bdf8', marginTop: 2 }}>🌊 Tsunami potential</div>}
          </div>
        )
      })()}

      {/* Magnitude legend */}
      <div style={{
        position: 'absolute', bottom: 10, right: 12,
        background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '8px 12px',
        fontSize: 9, display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {[['M7+', '#a855f7'], ['M6+', '#ef4444'], ['M5+', '#f97316'], ['M4+', '#f59e0b'], ['M3-', '#22c55e']].map(([label, c]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
            <span style={{ color: '#888' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Count badge */}
      <div style={{
        position: 'absolute', top: 10, left: 12,
        background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 10px',
        fontSize: 10, color: '#888',
      }}>
        {visible.length} events shown
      </div>
    </div>
  )
}

// ── Event row ─────────────────────────────────────────────────────────────

function EventRow({ eq, aiData, isSelected, onClick }) {
  const magColor = MAG_COLOR(eq.magnitude)
  const isNew = eq.age_minutes < 60
  const isRecent = eq.age_minutes < 360

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '52px 1fr 80px 70px 65px 70px',
        alignItems: 'center',
        gap: 0,
        padding: '11px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: isSelected ? 'rgba(249,115,22,0.07)'
          : isNew ? 'rgba(255,255,255,0.02)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
        borderLeft: isNew ? `3px solid ${magColor}40` : '3px solid transparent',
      }}
    >
      {/* Magnitude */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <div style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: 16, color: magColor, lineHeight: 1,
        }}>
          {eq.magnitude.toFixed(1)}
        </div>
        {isNew && <PulseDot color={magColor} />}
      </div>

      {/* Place */}
      <div style={{ paddingLeft: 8 }}>
        <div style={{ fontSize: 12, color: isNew ? '#ddd' : '#aaa', marginBottom: 2, lineHeight: 1.3 }}>
          {eq.place || eq.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#555' }}>
          <span>{timeAgo(eq.event_time)}</span>
          <span>·</span>
          <span>{eq.depth}km</span>
          {eq.tsunami && <span style={{ color: '#38bdf8' }}>🌊</span>}
          {eq.status === 'reviewed' && <span style={{ color: '#22c55e', fontSize: 9 }}>✓ reviewed</span>}
        </div>
      </div>

      {/* Region */}
      <div style={{ fontSize: 10, color: '#555', textAlign: 'center', lineHeight: 1.3 }}>
        {eq.region?.split(' ').slice(0,2).join(' ')}
      </div>

      {/* AI Risk */}
      {aiData ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: RISK_COLORS[aiData.ai_risk_level], fontWeight: 600 }}>
            {aiData.ai_risk_level}
          </div>
          <div style={{ fontSize: 10, color: '#555' }}>
            {(aiData.ai_risk_score * 100).toFixed(0)}%
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: 10, color: '#333' }}>—</div>
      )}

      {/* USGS Alert */}
      <div style={{ textAlign: 'center' }}>
        {eq.alert ? (
          <span style={{
            background: `${ALERT_COLORS[eq.alert]}20`,
            color: ALERT_COLORS[eq.alert],
            borderRadius: 10, padding: '2px 7px', fontSize: 10,
          }}>
            {eq.alert}
          </span>
        ) : eq.sig > 600 ? (
          <span style={{ fontSize: 10, color: '#f59e0b' }}>sig:{eq.sig}</span>
        ) : (
          <span style={{ fontSize: 10, color: '#333' }}>—</span>
        )}
      </div>

      {/* Felt */}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#555' }}>
        {eq.felt ? `${eq.felt.toLocaleString()} felt` : '—'}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function LivePage() {
  const [feed, setFeed] = useState('past_day_m2.5')
  const [data, setData] = useState(null)
  const [aiData, setAiData] = useState([])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [lastFetch, setLastFetch] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [minMag, setMinMag] = useState(0)
  const [realtimeEvents, setRealtimeEvents] = useState([])
  const intervalRef = useRef(null)

  // ── Fetch USGS live data ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.getLiveFeed(feed)
      setData(result)
      setLastFetch(new Date().toISOString())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [feed])

  // ── Run AI predictions on top events ────────────────────────────────
  const fetchAiPredictions = useCallback(async () => {
    if (!data?.earthquakes) return
    setAiLoading(true)
    try {
      const result = await api.getLivePredictions(feed, 30)
      setAiData(result.earthquakes_with_predictions || [])
    } catch (e) {
      // AI predictions are optional — don't block UI
      console.warn('AI predictions unavailable:', e.message)
    } finally {
      setAiLoading(false)
    }
  }, [feed, data])

  // ── Supabase realtime for new events synced by backend ──────────────
  useEffect(() => {
    const channel = supabase
      .channel('live-earthquakes-rt')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'live_earthquakes',
      }, (payload) => {
        setRealtimeEvents(prev => [payload.new, ...prev].slice(0, 20))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // ── Auto refresh every 60 seconds ───────────────────────────────────
  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 60_000)
    }
    return () => clearInterval(intervalRef.current)
  }, [autoRefresh, fetchData])

  // ── Run AI predictions after data loads ─────────────────────────────
  useEffect(() => {
    if (data) fetchAiPredictions()
  }, [data])

  // ── Filtered + sorted events ─────────────────────────────────────────
  const aiMap = {}
  aiData.forEach(a => { aiMap[a.usgs_id] = a })

  const filtered = (data?.earthquakes || []).filter(eq => eq.magnitude >= minMag)

  // Stats
  const stats = {
    total: filtered.length,
    m5plus: filtered.filter(e => e.magnitude >= 5).length,
    m6plus: filtered.filter(e => e.magnitude >= 6).length,
    tsunami: filtered.filter(e => e.tsunami).length,
    newest: filtered[0],
    largest: [...filtered].sort((a, b) => b.magnitude - a.magnitude)[0],
  }

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 26, color: '#fff' }}>
            Live USGS Feed
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
            <PulseDot color="#22c55e" />
            <span>Real-time data from USGS Earthquake Hazards Program</span>
            {lastFetch && <span style={{ color: '#333' }}>· Updated {timeAgo(lastFetch)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Auto refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${autoRefresh ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8, padding: '7px 14px', fontSize: 11,
              color: autoRefresh ? '#22c55e' : '#666', cursor: 'pointer',
            }}
          >
            {autoRefresh ? '⟳ Auto' : '⏸ Paused'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
              borderRadius: 8, padding: '7px 14px', fontSize: 11, color: '#f97316',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⟳ Fetching...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Feed selector */}
        <select
          value={feed}
          onChange={e => setFeed(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 14px', color: '#e2e8f0', fontSize: 12,
            fontFamily: "'DM Mono'", cursor: 'pointer', outline: 'none',
          }}
        >
          {FEEDS.map(f => (
            <option key={f.key} value={f.key} style={{ background: '#111' }}>{f.label}</option>
          ))}
        </select>

        {/* Min magnitude filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#666' }}>
          <span>Min mag:</span>
          {[0, 2.5, 4.0, 5.0, 6.0].map(m => (
            <button key={m}
              onClick={() => setMinMag(m)}
              style={{
                background: minMag === m ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${minMag === m ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6, padding: '4px 10px', fontSize: 11,
                color: minMag === m ? '#f97316' : '#666', cursor: 'pointer',
              }}
            >{m === 0 ? 'All' : `M${m}+`}</button>
          ))}
        </div>

        {/* AI status */}
        {aiLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#f97316' }}>
            <div style={{ width: 12, height: 12, border: '2px solid rgba(249,115,22,0.3)', borderTop: '2px solid #f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Running AI predictions...
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, fontSize: 12, color: '#ef4444' }}>
          ⚠ {error} — Make sure your backend is running at {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
        </div>
      )}

      {/* Realtime badge */}
      {realtimeEvents.length > 0 && (
        <div style={{
          background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
          animation: 'fadeIn 0.4s ease',
        }}>
          <PulseDot color="#a855f7" />
          <span style={{ color: '#a855f7', fontWeight: 600 }}>Supabase Realtime:</span>
          <span style={{ color: '#aaa' }}>
            {realtimeEvents.length} new event{realtimeEvents.length > 1 ? 's' : ''} synced by backend poller
          </span>
          <button onClick={() => setRealtimeEvents([])} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Stat cards */}
      {stats.total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Events', value: stats.total.toLocaleString(), color: '#e2e8f0' },
            { label: 'M5.0+', value: stats.m5plus, color: '#f97316' },
            { label: 'M6.0+', value: stats.m6plus, color: '#ef4444' },
            { label: 'Tsunami Potential', value: stats.tsunami, color: '#38bdf8' },
            { label: 'Largest', value: stats.largest ? `M${stats.largest.magnitude.toFixed(1)}` : '—', color: MAG_COLOR(stats.largest?.magnitude || 0) },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '13px 16px',
            }}>
              <div style={{ fontSize: 9, color: '#444', letterSpacing: '1px', marginBottom: 6 }}>{s.label.toUpperCase()}</div>
              <div style={{ fontFamily: "'Syne'", fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* World map */}
      {filtered.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: '1.5px', marginBottom: 10 }}>
            LIVE EVENT MAP — CLICK DOTS TO INSPECT
          </div>
          <LiveMap earthquakes={filtered} selected={selected} onSelect={setSelected} />
        </div>
      )}

      {/* Selected detail panel */}
      {selected && (
        <div style={{
          background: 'rgba(255,255,255,0.025)', border: `1px solid ${MAG_COLOR(selected.magnitude)}40`,
          borderRadius: 14, padding: '20px 24px', marginBottom: 20,
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Syne'", fontWeight: 800, fontSize: 20, color: MAG_COLOR(selected.magnitude) }}>
                M{selected.magnitude.toFixed(1)}
              </div>
              <div style={{ fontSize: 14, color: '#ccc', marginTop: 2 }}>{selected.place}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
                {new Date(selected.event_time).toUTCString()} · USGS ID: {selected.usgs_id}
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              ['Latitude', `${selected.latitude}°`],
              ['Longitude', `${selected.longitude}°`],
              ['Depth', `${selected.depth} km`],
              ['Region', selected.region],
              ['Status', selected.status],
              ['Network', selected.net],
              ['Mag Type', selected.mag_type],
              ['Significance', selected.sig],
              ['Gap', selected.gap ? `${selected.gap}°` : '—'],
              ['RMS', selected.rms || '—'],
              ['Tsunami', selected.tsunami ? '🌊 YES' : 'No'],
              ['Felt Reports', selected.felt?.toLocaleString() || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 9, color: '#444', marginBottom: 3 }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 12, color: '#ccc' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* AI data if available */}
          {aiMap[selected.usgs_id] && (() => {
            const ai = aiMap[selected.usgs_id]
            return (
              <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: '#f97316', marginBottom: 10, letterSpacing: '1px' }}>AI RISK ASSESSMENT</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>RISK SCORE</div>
                    <div style={{ fontSize: 20, color: RISK_COLORS[ai.ai_risk_level], fontFamily: "'Syne'", fontWeight: 800 }}>
                      {(ai.ai_risk_score * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>RISK LEVEL</div>
                    <div style={{ fontSize: 14, color: RISK_COLORS[ai.ai_risk_level], fontWeight: 700 }}>{ai.ai_risk_level}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>PRED. MAG</div>
                    <div style={{ fontSize: 14, color: '#f97316' }}>M{ai.ai_predicted_magnitude}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>CONFIDENCE</div>
                    <div style={{ fontSize: 14, color: '#aaa' }}>{(ai.ai_confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#777', lineHeight: 1.7 }}>{ai.ai_explanation}</div>
                <a href={selected.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 10, fontSize: 11, color: '#38bdf8', textDecoration: 'none' }}>
                  → View on USGS website ↗
                </a>
              </div>
            )
          })()}
        </div>
      )}

      {/* Event table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '52px 1fr 80px 70px 65px 70px',
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          {['MAG', 'LOCATION', 'REGION', 'AI RISK', 'USGS ALERT', 'REPORTS'].map(h => (
            <div key={h} style={{ fontSize: 9, color: '#444', letterSpacing: '1px', textAlign: h === 'MAG' ? 'center' : h !== 'LOCATION' ? 'center' : 'left', paddingLeft: h === 'LOCATION' ? 8 : 0 }}>
              {h}
            </div>
          ))}
        </div>

        {loading && !data && (
          <div style={{ padding: 40, textAlign: 'center', color: '#444', fontSize: 12 }}>
            <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Fetching live data from USGS...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#444', fontSize: 12 }}>
            No events found for current filter settings.
          </div>
        )}

        {filtered.slice(0, 200).map(eq => (
          <EventRow
            key={eq.usgs_id}
            eq={eq}
            aiData={aiMap[eq.usgs_id]}
            isSelected={selected?.usgs_id === eq.usgs_id}
            onClick={() => setSelected(selected?.usgs_id === eq.usgs_id ? null : eq)}
          />
        ))}

        {filtered.length > 200 && (
          <div style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, color: '#444', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            Showing 200 of {filtered.length} events. Increase min magnitude to filter.
          </div>
        )}
      </div>

      {/* USGS attribution */}
      <div style={{ marginTop: 16, fontSize: 10, color: '#333', textAlign: 'center' }}>
        Data sourced from{' '}
        <a href="https://earthquake.usgs.gov" target="_blank" rel="noopener noreferrer"
          style={{ color: '#555', textDecoration: 'none' }}>
          USGS Earthquake Hazards Program
        </a>
        {' '}· Updated every 1–5 minutes · SeismoAI auto-refreshes every 60 seconds
      </div>
    </div>
  )
}