import type { PaperType } from '@shared/types'
import type { SeriesPoint } from '@shared/stats'
import { formatDate, t } from '../i18n'
import { paperLabel } from './PaperBadge'

interface Props {
  series: Partial<Record<PaperType, SeriesPoint[]>>
  height?: number
}

/** Gráfico de líneas simple en SVG: % por intento a lo largo del tiempo, una línea por paper. */
export function LineChart({ series, height = 220 }: Props) {
  const entries = (Object.entries(series) as [PaperType, SeriesPoint[]][]).filter(([, pts]) => pts.length > 0)
  const all = entries.flatMap(([, pts]) => pts.map((p) => new Date(p.date).getTime()))
  if (all.length === 0) return <p className="text-muted">{t('home.chartEmpty')}</p>

  const W = 640
  const H = height
  const pad = { l: 40, r: 16, t: 14, b: 28 }
  const minX = Math.min(...all)
  const maxX = Math.max(...all)
  const span = maxX - minX || 1
  const x = (d: string) => (all.length === 1 || maxX === minX ? (pad.l + W - pad.r) / 2 : pad.l + ((new Date(d).getTime() - minX) / span) * (W - pad.l - pad.r))
  const y = (pct: number) => pad.t + (1 - pct / 100) * (H - pad.t - pad.b)

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('home.chartLabel')} preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={pad.l - 8} y={y(v)} className="chart-axis" textAnchor="end" dominantBaseline="middle">{v}</text>
          </g>
        ))}
        <text x={pad.l} y={H - 6} className="chart-axis">{formatDate(new Date(minX).toISOString())}</text>
        {maxX !== minX && <text x={W - pad.r} y={H - 6} className="chart-axis" textAnchor="end">{formatDate(new Date(maxX).toISOString())}</text>}
        {entries.map(([type, pts]) => (
          <g key={type} style={{ color: `var(--paper-${type})` }}>
            {pts.length > 1 && <polyline fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" points={pts.map((p) => `${x(p.date)},${y(p.percent)}`).join(' ')} />}
            {pts.map((p) => (
              <circle key={p.attemptId} cx={x(p.date)} cy={y(p.percent)} r={3.5} fill="var(--surface)" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke">
                <title>{`${paperLabel(type)} · ${formatDate(p.date)} · ${Math.round(p.percent)}%`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="chart-legend">
        {entries.map(([type, pts]) => (
          <span key={type} className="chart-key">
            <span className="chart-swatch" style={{ background: `var(--paper-${type})` }} aria-hidden />
            {paperLabel(type)} <span className="text-subtle">({pts.length})</span>
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>{t('home.chartLabel')}</caption>
        <thead><tr><th>{t('common.paper')}</th><th>{t('common.date')}</th><th>%</th></tr></thead>
        <tbody>
          {entries.flatMap(([type, pts]) => pts.map((p) => (
            <tr key={p.attemptId}><td>{paperLabel(type)}</td><td>{formatDate(p.date)}</td><td>{Math.round(p.percent)}</td></tr>
          )))}
        </tbody>
      </table>
    </figure>
  )
}
