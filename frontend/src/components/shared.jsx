// src/components/shared.jsx
// Reusable UI building blocks

export const RISK_COLORS = {
  Low:      { bg: 'rgba(34,197,94,0.12)',  text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
  Medium:   { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  High:     { bg: 'rgba(239,68,68,0.12)',  text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  Critical: { bg: 'rgba(168,85,247,0.12)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' },
}

export function RiskBadge({ level }) {
  const c = RISK_COLORS[level] || RISK_COLORS.Low
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
      letterSpacing: '0.5px',
    }}>{level?.toUpperCase()}</span>
  )
}

export function ProgressBar({ value, color, height = 5 }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 3, height, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.round(value * 100)}%`, height: '100%',
        background: color, borderRadius: 3,
        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  )
}

export function Card({ children, style = {}, ...props }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      ...style,
    }} {...props}>{children}</div>
  )
}

export function CardHeader({ title, subtitle, right }) {
  return (
    <div style={{
      padding: '18px 24px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: '#555', letterSpacing: '1.5px', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}

export function StatCard({ label, value, sub, color = '#f97316', icon }) {
  return (
    <Card style={{ padding: '20px 24px' }}>
      <div style={{ fontSize: 10, color: '#555', letterSpacing: '2px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <span>{icon}</span>}
        {label.toUpperCase()}
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#555', marginTop: 8 }}>{sub}</div>}
    </Card>
  )
}

export function LiveDot({ color = '#22c55e' }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, animation: 'pulse 2s infinite',
    }} />
  )
}

export function PageHeader({ title, subtitle }) {
  return (
    <div style={{ padding: '28px 32px 0', marginBottom: 24 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: '#fff' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: '#555', marginTop: 6 }}>{subtitle}</div>}
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{
      width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)',
      borderTop: '3px solid #f97316', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

export function EmptyState({ icon = '📭', message = 'No data yet' }) {
  return (
    <div style={{ padding: 48, textAlign: 'center', color: '#444' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  )
}