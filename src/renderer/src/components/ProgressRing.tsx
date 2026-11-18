import { useEffect, useState } from 'react'

interface Props {
  /** 0..100 */
  value: number
  size?: number
  stroke?: number
  /** Color CSS del arco (por defecto el de acento). */
  color?: string
  label: string
  children?: React.ReactNode
}

/** Anillo de progreso en SVG; se anima al aparecer (respeta «reducir movimiento» vía CSS). */
export function ProgressRing({ value, size = 168, stroke = 12, color = 'var(--accent)', label, children }: Props) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, value))))
    return () => cancelAnimationFrame(id)
  }, [value])
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth={stroke} />
        <circle
          className="ring-arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}
