// src/lib/api.js — FINAL VERSION v3 (with real-time)
// Replace your existing api.js with this

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // ── Health ─────────────────────────────────────────────────
  health: () => fetchJSON('/health'),
  status: () => fetchJSON('/status'),

  // ── ML Predictions ─────────────────────────────────────────
  predict: (data) =>
    fetchJSON('/predict', { method: 'POST', body: JSON.stringify(data) }),

  predictBatch: (events) =>
    fetchJSON('/predict/batch', { method: 'POST', body: JSON.stringify({ events }) }),

  // ── Regions ────────────────────────────────────────────────
  getRegions: () => fetchJSON('/regions'),
  getRegion: (name) => fetchJSON(`/regions/${encodeURIComponent(name)}`),
  getModelStats: () => fetchJSON('/model/stats'),

  // ── LIVE USGS FEEDS (new) ──────────────────────────────────

  /**
   * Get live USGS earthquake feed.
   * feed options: 'past_hour_all', 'past_day_m2.5', 'past_week_m4.5', etc.
   */
  getLiveFeed: (feed = 'past_day_m2.5') =>
    fetchJSON(`/live?feed=${encodeURIComponent(feed)}`),

  /** Get past 24h significant earthquakes */
  getSignificant: () => fetchJSON('/live/significant'),

  /** Get past week M4.5+ earthquakes */
  getMajor: () => fetchJSON('/live/major'),

  /**
   * Live earthquakes WITH AI predictions.
   * @param {string} feed - Feed key
   * @param {number} limit - Max events to predict (each takes ~50ms)
   */
  getLivePredictions: (feed = 'past_day_m4.5', limit = 20) =>
    fetchJSON(`/live/predict?feed=${encodeURIComponent(feed)}&limit=${limit}`),

  /**
   * Search USGS catalog for any date range.
   * @param {string} startTime - e.g. "2026-01-01"
   * @param {string} endTime - e.g. "2026-01-31"
   * @param {number} minMagnitude - min magnitude filter
   */
  searchCatalog: (startTime, endTime, minMagnitude = 2.5, maxResults = 500) =>
    fetchJSON(
      `/live/search?start_time=${startTime}&end_time=${endTime}&min_magnitude=${minMagnitude}&max_results=${maxResults}`
    ),

  /** Get real-time poller status */
  getPollerStatus: () => fetchJSON('/poller/status'),

  /** Manually trigger a USGS sync */
  triggerPoll: () => fetchJSON('/poller/trigger', { method: 'POST' }),

  // ── Yearly Forecast ────────────────────────────────────────
  getForecast: (year) => fetchJSON(`/forecast/${year}`),

  // ── Algorithm Benchmark ────────────────────────────────────
  getBenchmark: () => fetchJSON('/benchmark'),
  clearBenchmarkCache: () => fetchJSON('/benchmark/cache', { method: 'DELETE' }),
}

export default api