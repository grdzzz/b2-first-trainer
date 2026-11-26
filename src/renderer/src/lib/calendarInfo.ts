// Datos de cada día para el calendario (lo hecho, lo previsto, descansos, examen e hitos).
import { useCallback, useMemo } from 'react'
import { forecast } from '@shared/learning/engine'
import { isRestDay, movedAway, movedTo, planMilestones, type PlanActivity, type PlanSession } from '@shared/learning/plan'
import { addDays } from '@shared/review'
import { useLearning } from './learning'
import { useApp } from './store'
import type { DayInfo } from '../components/StudyCalendar'
import { t } from '../i18n'

const FORECAST_DAYS = 42

export function useCalendarInfo(): (day: string) => DayInfo {
  const learning = useLearning()
  const app = useApp()
  const { state, engine, today } = learning
  const config = state.plan.config

  // Previsión de los próximos días (calculada una vez por cambio de datos).
  const future = useMemo(() => {
    const m = new Map<string, PlanSession>()
    if (!engine) return m
    for (const s of forecast({ ...engine, history: { ...engine.history } }, addDays(today, 1), FORECAST_DAYS)) m.set(s.date, s)
    return m
  }, [engine, today])

  const doneByDay = useMemo(() => {
    const m = new Map<string, DayInfo['done']>()
    const sheets = new Map((learning.sheets ?? []).map((s) => [s.id, s]))
    for (const a of Object.values(state.game.activity)) {
      if (a.kind === 'planSession' || a.kind === 'aiFeedback') continue
      const label =
        a.kind === 'sheet'
          ? (sheets.get(a.ref ?? '')?.title ?? t('calendar.sheet'))
          : a.kind === 'review'
            ? t('calendar.reviewDone', { n: a.total ?? 0 })
            : (app.attempts.find((x) => x.id === a.ref)?.paperTitle ?? t(`papers.${a.paperType ?? 'reading'}`))
      const list = m.get(a.day) ?? []
      list.push({ skill: a.skill, label, minutes: a.minutes })
      m.set(a.day, list)
    }
    // Días de práctica anteriores a 2.0 (sin detalle).
    for (const p of app.practiceProgress) for (const d of p.days ?? []) if (!m.has(d)) m.set(d, [{ label: t('calendar.practiceDay'), minutes: 10 }])
    return m
  }, [state.game.activity, learning.sheets, app.attempts, app.practiceProgress])

  const milestones = useMemo(() => (config ? planMilestones(config, today, 180) : []), [config, today])

  return useCallback(
    (day: string): DayInfo => {
      const stored = state.plan.sessions[day]
      let planned: PlanActivity[] = []
      if (day <= today) planned = stored?.activities ?? []
      else {
        const f = future.get(day)
        planned = [...(f?.activities ?? []).filter((a) => !movedAway(state.plan, a.id, day)), ...movedTo(state.plan, day)]
      }
      // Lo que ya está hecho aparece en «hecho»: lo previsto que se hizo no se repite.
      if (day < today) planned = planned.filter((a) => a.status !== 'done')
      return {
        planned,
        done: doneByDay.get(day) ?? [],
        rest: config ? isRestDay(config, day) : false,
        exam: config?.examDate === day,
        milestones: milestones.filter((m) => m.date === day)
      }
    },
    [state.plan, today, future, doneByDay, config, milestones]
  )
}
