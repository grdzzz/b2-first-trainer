// Estadísticas de progreso y selección de preguntas para el modo repaso.
import type { Attempt, Exam, PaperType } from './types'
import { PAPER_ORDER } from './types'

function finished(attempts: Attempt[]): Attempt[] {
  return attempts
    .filter((a) => a.status === 'finished' && a.result)
    .sort((a, b) => (a.finishedAt ?? a.startedAt).localeCompare(b.finishedAt ?? b.startedAt))
}

/**
 * Preguntas falladas pendientes de un paper: aquellas cuyo último resultado corregido fue incorrecto.
 * Si se aciertan en un repaso posterior, dejan de estar pendientes.
 */
export function pendingMistakes(exam: Exam, paperId: string, attempts: Attempt[]): string[] {
  const paper = exam.papers.find((p) => p.id === paperId)
  if (!paper) return []
  const valid = new Set(paper.parts.flatMap((p) => p.questions.filter((q) => (q.answers?.length ?? 0) > 0).map((q) => q.id)))
  const last = new Map<string, boolean>()
  for (const a of finished(attempts)) {
    if (a.examId !== exam.id || a.paperId !== paperId) continue
    for (const r of a.result!.questions) {
      if (r.correct === null) continue
      last.set(r.questionId, r.correct)
    }
  }
  const order = paper.parts.flatMap((p) => p.questions.map((q) => q.id))
  return order.filter((id) => valid.has(id) && last.get(id) === false)
}

export interface PaperAverage {
  type: PaperType
  attempts: number
  average: number | null
}

export interface CategoryStat {
  category: string
  wrong: number
  total: number
  errorRate: number
}

export interface SeriesPoint {
  date: string
  percent: number
  attemptId: string
}

export interface ProgressSummary {
  finishedCount: number
  examsPracticed: number
  totalMinutes: number
  averages: PaperAverage[]
  series: Record<PaperType, SeriesPoint[]>
  weakCategories: CategoryStat[]
}

export function progressSummary(attempts: Attempt[]): ProgressSummary {
  const done = finished(attempts)
  const series = { reading: [], writing: [], listening: [], speaking: [] } as Record<PaperType, SeriesPoint[]>
  const sums = new Map<PaperType, { sum: number; n: number; count: number }>()
  const cats = new Map<string, { wrong: number; total: number }>()

  for (const a of done) {
    const s = sums.get(a.paperType) ?? { sum: 0, n: 0, count: 0 }
    s.count++
    const pct = a.result!.percent
    if (pct !== null && a.mode !== 'review') {
      s.sum += pct
      s.n++
      series[a.paperType].push({ date: a.finishedAt ?? a.startedAt, percent: pct, attemptId: a.id })
    }
    sums.set(a.paperType, s)
    for (const q of a.result!.questions) {
      if (q.correct === null) continue
      const c = cats.get(q.category) ?? { wrong: 0, total: 0 }
      c.total++
      if (!q.correct) c.wrong++
      cats.set(q.category, c)
    }
  }

  const averages = PAPER_ORDER.map((type) => {
    const s = sums.get(type)
    return { type, attempts: s?.count ?? 0, average: s && s.n > 0 ? Math.round((s.sum / s.n) * 10) / 10 : null }
  })
  const weakCategories = Array.from(cats.entries())
    .map(([category, c]) => ({ category, ...c, errorRate: c.total ? c.wrong / c.total : 0 }))
    .filter((c) => c.wrong > 0)
    .sort((a, b) => b.errorRate - a.errorRate || b.wrong - a.wrong)

  return {
    finishedCount: done.length,
    examsPracticed: new Set(done.map((a) => a.examId)).size,
    totalMinutes: Math.round(done.reduce((acc, a) => acc + a.durationSec, 0) / 60),
    averages,
    series,
    weakCategories
  }
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  const ss = String(sec).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
