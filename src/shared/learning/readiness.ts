// Preparación estimada para el examen.
//
// NO es una nota oficial de Cambridge ni una probabilidad de aprobar: es una estimación orientativa en la
// escala Cambridge English a partir de tus resultados, con un intervalo y un nivel de confianza que
// dependen de cuántos datos hay, de lo recientes que son y de cuántos papers cubren.
import type { PaperType } from '../types'
import { PAPER_ORDER } from '../types'
import { percentToScale } from '../cambridge'
import type { ActivityEntry } from './game'
import type { PlacementResult } from '../placement'
import { daysUntil } from './plan'
import { HALF_LIFE_DAYS, type Profile } from './competency'
import { competency, STUDY_SKILLS, type StudySkill } from './taxonomy'

export type Confidence = 'none' | 'low' | 'medium' | 'high'

export interface PaperEstimate {
  type: PaperType
  /** Porcentaje ponderado por actualidad o null si no hay datos. */
  percent: number | null
  scale: number | null
  /** Datos usados (intentos de examen y, en Reading & Use of English, hojas). */
  samples: number
  lastAt?: string
  source: 'exams' | 'sheets' | 'mixed' | 'none'
}

export interface Readiness {
  estimate: { scale: number; low: number; high: number } | null
  confidence: Confidence
  target: number
  /** 0..1 hacia el objetivo (desde 140, el inicio de la banda B1). */
  progress: number | null
  pointsToTarget: number | null
  papers: PaperEstimate[]
  strengths: string[]
  weaknesses: string[]
  /** Destrezas sin datos o con muy pocos. */
  unassessed: StudySkill[]
  dataPoints: number
  newestAt?: string
  oldestAt?: string
  /** La estimación sale solo de la prueba de nivel. */
  placementOnly: boolean
}

function weight(day: string, today: string): number {
  return 0.5 ** (Math.max(0, daysUntil(day, today)) / HALF_LIFE_DAYS)
}

export function computeReadiness(activity: ActivityEntry[], profile: Profile, placement: PlacementResult | null, target: number, today: string): Readiness {
  const papers: PaperEstimate[] = PAPER_ORDER.map((type) => {
    let ws = 0
    let wsum = 0
    let samples = 0
    let lastAt: string | undefined
    let fromExams = 0
    let fromSheets = 0
    for (const e of activity) {
      if (e.kind === 'exam' && e.paperType === type && e.mode !== 'review' && typeof e.percent === 'number') {
        // Un paper completo vale más que unas partes sueltas.
        const w = weight(e.day, today) * (e.full ? 3 : 1)
        ws += e.percent * w
        wsum += w
        samples++
        fromExams++
        if (!lastAt || e.at > lastAt) lastAt = e.at
      } else if (type === 'reading' && e.kind === 'sheet' && e.total && e.total > 0 && typeof e.correct === 'number') {
        // Las hojas cuentan para Reading & Use of English, con menos peso (no son un paper real).
        const w = weight(e.day, today) * 0.35
        ws += (e.correct / e.total) * 100 * w
        wsum += w
        samples++
        fromSheets++
        if (!lastAt || e.at > lastAt) lastAt = e.at
      }
    }
    const percent = wsum > 0 ? ws / wsum : null
    return { type, percent, scale: percent === null ? null : percentToScale(percent), samples, lastAt, source: fromExams && fromSheets ? 'mixed' : fromExams ? 'exams' : fromSheets ? 'sheets' : 'none' }
  })

  const assessed = papers.filter((p) => p.scale !== null)
  const dataPoints = papers.reduce((n, p) => n + p.samples, 0)
  const dates = activity.map((a) => a.at).sort()
  let estimate: Readiness['estimate'] = null
  let confidence: Confidence = 'none'
  let placementOnly = false

  if (assessed.length) {
    const scale = Math.round(assessed.reduce((n, p) => n + (p.scale ?? 0), 0) / assessed.length)
    const examPapers = papers.filter((p) => p.source === 'exams' || p.source === 'mixed').length
    // Incertidumbre: menos datos y menos papers cubiertos → intervalo más ancho.
    const perPaper = assessed.map((p) => 14 / Math.sqrt(Math.max(1, p.samples)))
    const spread = perPaper.reduce((a, b) => a + b, 0) / perPaper.length + (4 - assessed.length) * 3
    const newest = papers.map((p) => p.lastAt).filter((x): x is string => !!x).sort().pop()
    const age = newest ? daysUntil(newest.slice(0, 10), today) : 999
    estimate = { scale, low: Math.max(122, Math.round(scale - spread)), high: Math.min(190, Math.round(scale + spread)) }
    if (examPapers >= 3 && dataPoints >= 8 && age <= 30) confidence = 'high'
    else if (examPapers >= 2 && dataPoints >= 4 && age <= 60) confidence = 'medium'
    else confidence = 'low'
  } else if (placement && placement.date.slice(0, 4) !== '1970') {
    // Solo la prueba de nivel: orientativa y con confianza baja.
    estimate = { scale: placement.score, low: Math.max(110, placement.score - 15), high: Math.min(190, placement.score + 15) }
    confidence = 'low'
    placementOnly = true
  }

  const strengths: string[] = []
  const weaknesses: string[] = []
  const all = [
    ...Object.entries(profile.comps).filter(([id]) => competency(id)),
    ...Object.entries(profile.parts)
  ]
  for (const [id, m] of all) {
    if (m.status === 'strong') strengths.push(id)
    if (m.status === 'weak') weaknesses.push(id)
  }
  const rank = (ids: string[], dir: 1 | -1) =>
    ids
      .sort((a, b) => dir * (((profile.comps[a] ?? profile.parts[a]).accuracy ?? 0) - ((profile.comps[b] ?? profile.parts[b]).accuracy ?? 0)))
      .slice(0, 4)
  const unassessed = STUDY_SKILLS.filter((s) => profile.skills[s].status === 'unassessed' || profile.skills[s].status === 'insufficient' || profile.skills[s].placementOnly)

  const scale = estimate?.scale ?? null
  return {
    estimate,
    confidence,
    target,
    progress: scale === null ? null : Math.max(0, Math.min(1, (scale - 140) / Math.max(1, target - 140))),
    pointsToTarget: scale === null ? null : Math.max(0, target - scale),
    papers,
    strengths: rank(strengths, -1),
    weaknesses: rank(weaknesses, 1),
    unassessed,
    dataPoints,
    newestAt: dates[dates.length - 1],
    oldestAt: dates[0],
    placementOnly
  }
}

/** ¿Se puede decir que se ha alcanzado el objetivo? Exige confianza media o alta (logro «Exam Ready»). */
export function readinessReached(r: Readiness): boolean {
  return !!r.estimate && !r.placementOnly && (r.confidence === 'medium' || r.confidence === 'high') && r.estimate.scale >= r.target
}
