// src/hooks/useSeismoData.js
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

// ─── Regions hook ───────────────────────────────────────────
export function useRegions() {
  const [regions, setRegions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      // Try ML API first, fall back to Supabase
      let data
      try {
        data = await api.getRegions()
      } catch {
        const { data: rows } = await supabase
          .from('region_stats')
          .select('*')
          .order('avg_risk_score', { ascending: false })
        data = rows || []
      }
      setRegions(data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    // Refresh every 5 minutes
    const interval = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetch])

  return { regions, loading, error, refetch: fetch }
}

// ─── Predictions hook with realtime ─────────────────────────
export function usePredictions(limit = 20) {
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial fetch
    supabase
      .from('predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setPredictions(data || [])
        setLoading(false)
      })

    // Realtime subscription
    const channel = supabase
      .channel('predictions-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'predictions' },
        (payload) => {
          setPredictions((prev) => [payload.new, ...prev].slice(0, limit))
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [limit])

  return { predictions, loading }
}

// ─── Alerts hook with realtime ───────────────────────────────
export function useAlerts() {
  const [alerts, setAlerts] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    supabase
      .from('alerts')
      .select('*')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        const rows = data || []
        setAlerts(rows)
        setUnreadCount(rows.length)
      })

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          setAlerts((prev) => [payload.new, ...prev].slice(0, 10))
          setUnreadCount((n) => n + 1)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const resolveAlert = async (id) => {
    await supabase
      .from('alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    setUnreadCount((n) => Math.max(0, n - 1))
  }

  const clearAll = () => {
    setUnreadCount(0)
  }

  return { alerts, unreadCount, resolveAlert, clearAll }
}

// ─── Predict hook ────────────────────────────────────────────
export function usePredict() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const predict = useCallback(async (formData) => {
    setLoading(true)
    setError(null)
    try {
      const prediction = await api.predict(formData)
      setResult(prediction)

      // Save to Supabase
      await supabase.from('predictions').insert({
        region: prediction.region,
        latitude: prediction.latitude,
        longitude: prediction.longitude,
        risk_score: prediction.risk_score,
        risk_level: prediction.risk_level,
        predicted_magnitude: prediction.predicted_magnitude,
        confidence: prediction.confidence,
        cnn_score: prediction.model_contributions.cnn_spatial,
        lstm_score: prediction.model_contributions.lstm_temporal,
        gnn_score: prediction.model_contributions.gnn_regional,
        alert_triggered: prediction.alert,
        explanation: prediction.explanation,
        input_depth: formData.depth,
      })

      // If high risk, create alert
      if (prediction.alert) {
        await supabase.from('alerts').insert({
          region: prediction.region,
          risk_level: prediction.risk_level,
          risk_score: prediction.risk_score,
          magnitude_est: prediction.predicted_magnitude,
          latitude: prediction.latitude,
          longitude: prediction.longitude,
          message: `High seismic risk detected in ${prediction.region}. Predicted M${prediction.predicted_magnitude} — ${prediction.risk_level} risk (score: ${prediction.risk_score.toFixed(2)})`,
        })
      }

      return prediction
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { predict, result, loading, error }
}

// ─── Model stats hook ────────────────────────────────────────
export function useModelStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getModelStats()
      .then((s) => { setStats(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return { stats, loading }
}

// ─── Live seismograph simulation ─────────────────────────────
export function useSeismograph(active = true) {
  const [points, setPoints] = useState([])
  const frameRef = useRef(0)

  useEffect(() => {
    if (!active) return
    let t = 0
    const id = setInterval(() => {
      t += 0.15
      setPoints((prev) => {
        const next = [...prev, {
          x: t,
          y: Math.sin(t * 2.1) * 10
            + Math.sin(t * 5.3) * 4
            + (Math.random() - 0.5) * 6,
        }]
        return next.slice(-80)
      })
    }, 50)
    return () => clearInterval(id)
  }, [active])

  return points
}