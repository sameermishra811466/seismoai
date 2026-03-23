// src/components/Seismograph.jsx
import { useSeismograph } from '../hooks/useSeismoData'

export default function Seismograph({ active = true, width = 500, height = 70, color = '#f97316' }) {
  const points = useSeismograph(active)

  if (points.length < 2) {
    return <div style={{ width, height, background: 'transparent' }} />
  }

  const xScale = width / 80
  const midY = height / 2

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${i * xScale},${midY + p.y}`)
    .join(' ')

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {/* Grid lines */}
      {[-20, -10, 0, 10, 20].map(y => (
        <line
          key={y}
          x1={0} y1={midY + y} x2={width} y2={midY + y}
          stroke="rgba(255,255,255,0.04)" strokeWidth={1}
        />
      ))}
      {/* Center baseline */}
      <line x1={0} y1={midY} x2={width} y2={midY} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

      {/* Seismograph line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Glow effect */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.15}
      />

      {/* Current point dot */}
      {points.length > 0 && (
        <circle
          cx={(points.length - 1) * xScale}
          cy={midY + points[points.length - 1].y}
          r={3}
          fill={color}
        />
      )}
    </svg>
  )
}