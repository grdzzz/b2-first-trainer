// Rachas y constancia. Los días de descanso planificados no rompen la racha del plan.
// Nunca se quita nada por inactividad: solo se cuentan días.
import { addDays } from '../review'

export interface StreakStats {
  /** Días seguidos con estudio (hasta hoy o ayer). */
  current: number
  best: number
  /** Racha del plan: los días de descanso planificados cuentan como cumplidos. */
  planCurrent: number
  planBest: number
  totalDays: number
  /** Semanas (lunes a domingo) con al menos un día de estudio. */
  activeWeeks: number
  /** Días estudiados / días disponibles (sin descansos) en las últimas 4 semanas, 0..1. */
  consistency: number
  /** Días de descanso planificados en las últimas 4 semanas. */
  restDays28: number
  studiedLast7: number
}

/** Día de la semana (0 = lunes … 6 = domingo) de un día AAAA-MM-DD. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}

export function weekStart(day: string): string {
  return addDays(day, -weekdayOf(day))
}

function runs(days: Set<string>, isOk: (d: string) => boolean, today: string): { current: number; best: number } {
  const sorted = Array.from(days).sort()
  if (!sorted.length) return { current: 0, best: 0 }
  // Mejor racha: recorrer desde el primer día estudiado hasta hoy.
  let best = 0
  let run = 0
  for (let d = sorted[0]; d <= today; d = addDays(d, 1)) {
    if (days.has(d)) {
      run++
    } else if (isOk(d) && d !== today) {
      // Descanso planificado: no rompe, pero tampoco suma.
    } else if (d !== today) {
      run = 0
    }
    best = Math.max(best, run)
  }
  // Racha actual: hacia atrás desde hoy (si hoy aún no se ha estudiado, desde ayer).
  let current = 0
  let cursor = days.has(today) ? today : addDays(today, -1)
  for (let guard = 0; guard < 4000; guard++) {
    if (days.has(cursor)) current++
    else if (!isOk(cursor)) break
    cursor = addDays(cursor, -1)
    if (cursor < sorted[0]) break
  }
  return { current, best: Math.max(best, current) }
}

export function computeStreaks(studyDays: Iterable<string>, restWeekdays: number[], today: string): StreakStats {
  const days = new Set(Array.from(studyDays).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today))
  const rest = new Set(restWeekdays)
  const plain = runs(days, () => false, today)
  const plan = runs(days, (d) => rest.has(weekdayOf(d)), today)
  const weeks = new Set(Array.from(days, weekStart))
  let available = 0
  let studied = 0
  let restDays28 = 0
  let studiedLast7 = 0
  for (let i = 0; i < 28; i++) {
    const d = addDays(today, -i)
    const isRest = rest.has(weekdayOf(d))
    if (isRest) restDays28++
    if (days.has(d)) {
      studied++
      if (i < 7) studiedLast7++
    }
    if (!isRest || days.has(d)) available++
  }
  return {
    current: plain.current,
    best: plain.best,
    planCurrent: plan.current,
    planBest: plan.best,
    totalDays: days.size,
    activeWeeks: weeks.size,
    consistency: available ? studied / available : 0,
    restDays28,
    studiedLast7
  }
}

/** Celdas del calendario de actividad (estilo GitHub): semanas de lunes a domingo, la última incluye hoy. */
export function heatmapCells(minutesByDay: Map<string, number>, today: string, weeks = 26): Array<{ day: string; minutes: number; level: 0 | 1 | 2 | 3 | 4; future: boolean }> {
  const start = addDays(weekStart(today), -7 * (weeks - 1))
  const out: Array<{ day: string; minutes: number; level: 0 | 1 | 2 | 3 | 4; future: boolean }> = []
  for (let i = 0; i < weeks * 7; i++) {
    const day = addDays(start, i)
    const minutes = minutesByDay.get(day) ?? 0
    const level = minutes <= 0 ? 0 : minutes < 15 ? 1 : minutes < 30 ? 2 : minutes < 60 ? 3 : 4
    out.push({ day, minutes, level, future: day > today })
  }
  return out
}
