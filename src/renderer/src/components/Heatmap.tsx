// Calendario de actividad estilo GitHub (semanas en columnas, lunes arriba).
import { useMemo } from 'react'
import { heatmapCells } from '@shared/learning/streaks'
import { formatDate, t } from '../i18n'

export function Heatmap({ minutesByDay, today, weeks = 26 }: { minutesByDay: Map<string, number>; today: string; weeks?: number }) {
  const cells = useMemo(() => heatmapCells(minutesByDay, today, weeks), [minutesByDay, today, weeks])
  const cols: (typeof cells)[] = []
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7))
  const months: Array<{ col: number; label: string }> = []
  cols.forEach((col, i) => {
    const first = col.find((c) => c.day.endsWith('-01') || (i === 0 && c === col[0]))
    if (first && (i === 0 || first.day.endsWith('-01'))) months.push({ col: i, label: formatDate(`${first.day}T12:00:00`, { month: 'short' }) })
  })
  const active = cells.filter((c) => c.minutes > 0).length
  return (
    <figure className="heatmap" aria-label={t('profile.heatmapLabel', { days: active, weeks })}>
      <div className="heatmap-months" aria-hidden style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {months.map((m) => (
          <span key={m.col} style={{ gridColumn: m.col + 1 }}>{m.label}</span>
        ))}
      </div>
      <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {cols.map((col, ci) => (
          <div key={ci} className="heatmap-col">
            {col.map((c) => (
              <span
                key={c.day}
                className={`heatmap-cell lvl-${c.level}${c.future ? ' is-future' : ''}${c.day === today ? ' is-today' : ''}`}
                title={c.future ? undefined : `${formatDate(`${c.day}T12:00:00`, { weekday: 'short', day: 'numeric', month: 'short' })} · ${c.minutes ? t('profile.minutesShort', { n: Math.round(c.minutes) }) : t('profile.noActivity')}`}
              />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="heatmap-legend text-subtle text-xs">
        <span>{t('profile.less')}</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heatmap-cell lvl-${l}`} aria-hidden />
        ))}
        <span>{t('profile.more')}</span>
      </figcaption>
    </figure>
  )
}

/** Minutos de estudio por día a partir de la actividad (y de los días de práctica antiguos, con 10 min). */
export function minutesByDay(activity: Array<{ day: string; minutes: number; kind: string }>, legacyDays: string[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const a of activity) if (a.kind !== 'planSession') m.set(a.day, (m.get(a.day) ?? 0) + a.minutes)
  for (const d of legacyDays) if (!m.has(d)) m.set(d, 10)
  return m
}
