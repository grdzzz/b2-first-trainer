// Calendario de estudio: vista semanal y mensual, actividades previstas y hechas, descansos, examen, hitos
// y progreso semanal. Las actividades pendientes se pueden mover arrastrándolas o con «Mover a…».
import { useMemo, useState } from 'react'
import { CalendarCheck, ChevronLeft, ChevronRight, Flag, GraduationCap, MoveRight, Moon } from 'lucide-react'
import { addDays } from '@shared/review'
import { weekStart, weekdayOf } from '@shared/learning/streaks'
import type { Milestone, PlanActivity } from '@shared/learning/plan'
import type { StudySkill } from '@shared/learning/taxonomy'
import { StudySkillIcon, StudySkillChip } from './StudySkill'
import { formatDate, t } from '../i18n'

export interface DayInfo {
  planned: PlanActivity[]
  done: Array<{ skill?: StudySkill; label: string; minutes: number }>
  rest: boolean
  exam: boolean
  milestones: Milestone[]
}

interface Props {
  today: string
  info(day: string): DayInfo
  onMove(activity: PlanActivity, to: string): void
  /** Abre una actividad (solo las de hoy). */
  onOpen?(activity: PlanActivity): void
}

function fmt(day: string, opts: Intl.DateTimeFormatOptions): string {
  return formatDate(`${day}T12:00:00`, opts)
}

export function StudyCalendar({ today, info, onMove, onOpen }: Props) {
  const [view, setView] = useState<'week' | 'month'>(() => {
    try {
      return localStorage.getItem('b2ft.calendar.view') === 'month' ? 'month' : 'week'
    } catch {
      return 'week'
    }
  })
  const [anchor, setAnchor] = useState(today)
  const [selected, setSelected] = useState(today)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const changeView = (v: 'week' | 'month') => {
    setView(v)
    try {
      localStorage.setItem('b2ft.calendar.view', v)
    } catch {
      /* sin almacenamiento local */
    }
  }

  const days = useMemo(() => {
    if (view === 'week') {
      const s = weekStart(anchor)
      return Array.from({ length: 7 }, (_, i) => addDays(s, i))
    }
    const first = `${anchor.slice(0, 7)}-01`
    const s = weekStart(first)
    return Array.from({ length: 42 }, (_, i) => addDays(s, i))
  }, [view, anchor])

  const byDay = useMemo(() => new Map(days.map((d) => [d, info(d)])), [days, info])
  const allPlanned = useMemo(() => new Map(Array.from(byDay.values()).flatMap((d) => d.planned.map((a) => [a.id, a] as const))), [byDay])
  const shift = (dir: 1 | -1) => {
    if (view === 'week') setAnchor(addDays(anchor, dir * 7))
    else {
      const [y, m] = anchor.split('-').map(Number)
      const d = new Date(y, m - 1 + dir, 1)
      setAnchor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
    }
  }
  const title = view === 'week' ? `${fmt(days[0], { day: 'numeric', month: 'short' })} – ${fmt(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}` : fmt(`${anchor.slice(0, 7)}-15`, { month: 'long', year: 'numeric' })
  const weekDays = view === 'week' ? days : days.filter((d) => weekStart(d) === weekStart(selected))
  const studied = weekDays.filter((d) => (byDay.get(d)?.done.length ?? 0) > 0).length
  const planDays = weekDays.filter((d) => !byDay.get(d)?.rest).length
  const weekMinutes = weekDays.reduce((n, d) => n + (byDay.get(d)?.done.reduce((m, x) => m + x.minutes, 0) ?? 0), 0)
  const sel = byDay.get(selected) ?? info(selected)
  const moveTargets = Array.from({ length: 14 }, (_, i) => addDays(today, i)).filter((d) => d !== selected)

  const drop = (day: string, e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(null)
    const id = e.dataTransfer.getData('text/plain')
    const a = allPlanned.get(id)
    if (a && day >= today) onMove(a, day)
  }

  return (
    <section className="card calendar" aria-labelledby="cal-title">
      <header className="calendar-head">
        <div className="row-gap">
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label={view === 'week' ? t('calendar.prevWeek') : t('calendar.prevMonth')}><ChevronLeft size={18} aria-hidden /></button>
          <h2 id="cal-title" className="h-small calendar-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label={view === 'week' ? t('calendar.nextWeek') : t('calendar.nextMonth')}><ChevronRight size={18} aria-hidden /></button>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => { setAnchor(today); setSelected(today) }}>{t('calendar.today')}</button>
        </div>
        <div className="seg seg-small" role="group" aria-label={t('calendar.view')}>
          <button type="button" className={`seg-btn${view === 'week' ? ' is-active' : ''}`} aria-pressed={view === 'week'} onClick={() => changeView('week')}>{t('calendar.week')}</button>
          <button type="button" className={`seg-btn${view === 'month' ? ' is-active' : ''}`} aria-pressed={view === 'month'} onClick={() => changeView('month')}>{t('calendar.month')}</button>
        </div>
      </header>

      <div className="week-progress text-sm" aria-live="polite">
        <span><CalendarCheck size={14} aria-hidden /> {t('calendar.weekProgress', { done: studied, planned: planDays })}</span>
        <span className="meter"><span style={{ width: `${planDays ? Math.min(100, (studied / planDays) * 100) : 0}%` }} /></span>
        <span className="text-subtle">{t('calendar.weekMinutes', { n: Math.round(weekMinutes) })}</span>
      </div>

      <div className={`calendar-grid view-${view}`} key={`${view}-${days[0]}`} role="grid" aria-labelledby="cal-title">
        <div className="calendar-weekdays" role="row">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <span key={d} role="columnheader" className="text-subtle text-xs">{t(`weekdays.short.${d}` as 'weekdays.short.0')}</span>
          ))}
        </div>
        <div className="calendar-cells">
          {days.map((day) => {
            const d = byDay.get(day)!
            const outside = view === 'month' && day.slice(0, 7) !== anchor.slice(0, 7)
            const past = day < today
            const skills = Array.from(new Set([...d.done.map((x) => x.skill), ...d.planned.map((x) => x.skill)].filter((x): x is StudySkill => !!x)))
            return (
              <div
                key={day}
                role="gridcell"
                aria-selected={selected === day}
                className={`cal-day${day === today ? ' is-today' : ''}${past ? ' is-past' : ''}${outside ? ' is-outside' : ''}${d.rest ? ' is-rest' : ''}${d.exam ? ' is-exam' : ''}${selected === day ? ' is-selected' : ''}${dragOver === day ? ' is-drop' : ''}`}
                onDragOver={(e) => {
                  if (day >= today) {
                    e.preventDefault()
                    setDragOver(day)
                  }
                }}
                onDragLeave={() => setDragOver((v) => (v === day ? null : v))}
                onDrop={(e) => drop(day, e)}
              >
                <button type="button" className="cal-day-head" onClick={() => setSelected(day)} aria-label={`${fmt(day, { weekday: 'long', day: 'numeric', month: 'long' })}${d.rest ? ` · ${t('calendar.rest')}` : ''}${d.exam ? ` · ${t('calendar.exam')}` : ''}`}>
                  <span className="cal-num tabular">{Number(day.slice(8))}</span>
                  {d.exam && <GraduationCap size={13} aria-hidden className="cal-exam-icon" />}
                  {d.rest && !d.exam && <Moon size={12} aria-hidden className="cal-rest-icon" />}
                  {d.milestones.some((m) => m.kind !== 'exam') && <Flag size={12} aria-hidden className="cal-ms-icon" />}
                </button>
                {view === 'week' ? (
                  <ul className="cal-items">
                    {d.done.map((x, i) => (
                      <li key={`d${i}`} className={`cal-item is-done sk-${x.skill ?? 'useOfEnglish'}`}>
                        {x.skill && <StudySkillIcon skill={x.skill} size={12} />} <span>{x.label}</span>
                      </li>
                    ))}
                    {d.planned.filter((a) => a.status === 'todo').map((a) => (
                      <li key={a.id} className={`cal-item sk-${a.skill}`} draggable={day >= today} onDragStart={(e) => e.dataTransfer.setData('text/plain', a.id)} title={`${a.title} · ${t('plan.minutes', { n: a.minutes })}`}>
                        <StudySkillIcon skill={a.skill} size={12} /> <span>{a.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="cal-dots" aria-hidden>
                    {skills.slice(0, 5).map((s) => (
                      <span key={s} className={`cal-dot sk-${s}${d.done.some((x) => x.skill === s) ? ' is-done' : ''}`} />
                    ))}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="cal-detail" aria-live="polite">
        <h3 className="h-small">{fmt(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        {sel.exam && <p className="cal-detail-exam"><GraduationCap size={15} aria-hidden /> {t('calendar.examDay')}</p>}
        {sel.milestones.filter((m) => m.kind !== 'exam').map((m) => <p key={m.kind + m.date} className="text-sm"><Flag size={13} aria-hidden /> {t(`milestones.${m.kind}`)}</p>)}
        {sel.rest && <p className="text-muted text-sm"><Moon size={13} aria-hidden /> {t('calendar.restText')}</p>}
        {sel.done.length === 0 && sel.planned.length === 0 && !sel.rest && <p className="text-muted text-sm">{selected < today ? t('calendar.nothingPast') : t('calendar.nothingPlanned')}</p>}
        <ul className="cal-detail-list">
          {sel.done.map((x, i) => (
            <li key={`d${i}`}>
              {x.skill ? <StudySkillChip skill={x.skill} compact /> : null}
              <span>{x.label}</span>
              <span className="pill pill-success">{t('calendar.done')}</span>
            </li>
          ))}
          {sel.planned.map((a) => (
            <li key={a.id}>
              <StudySkillChip skill={a.skill} compact />
              <span>{a.title}</span>
              <span className="text-subtle text-sm">{t('plan.minutes', { n: a.minutes })}</span>
              {a.status === 'done' ? (
                <span className="pill pill-success">{t('calendar.done')}</span>
              ) : selected >= today ? (
                <span className="row-gap">
                  {selected === today && onOpen && <button type="button" className="btn btn-secondary btn-xs" onClick={() => onOpen(a)}>{t('plan.start')}</button>}
                  <label className="move-select">
                    <MoveRight size={13} aria-hidden />
                    <span className="sr-only">{t('calendar.moveTo', { name: a.title })}</span>
                    <select className="input input-sm" value="" onChange={(e) => e.target.value && onMove(a, e.target.value)}>
                      <option value="">{t('calendar.move')}</option>
                      {moveTargets.map((d) => (
                        <option key={d} value={d}>{fmt(d, { weekday: 'short', day: 'numeric', month: 'short' })}{weekdayOf(d) >= 5 ? ' ·' : ''}</option>
                      ))}
                    </select>
                  </label>
                </span>
              ) : (
                <span className="text-subtle text-sm">{t('calendar.notDone')}</span>
              )}
            </li>
          ))}
        </ul>
        <p className="text-subtle text-xs">{t('calendar.dragHint')}</p>
      </div>
    </section>
  )
}
