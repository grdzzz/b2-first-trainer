// Perfil de competencias a partir del registro de actividad (y, como punto de partida, la prueba de nivel).
// Diferencia «sin evaluar» (0 datos), «pocos datos» (no se puede sacar una conclusión) y rendimiento bajo.
// No inventa puntuaciones: si no hay datos, la precisión es null.
import type { ActivityEntry } from './game'
import type { PlacementResult } from '../placement'
import { STUDY_SKILLS, skillOfPart, competency, type StudySkill } from './taxonomy'
import { daysUntil } from './plan'
import type { ErrorRecord } from './notebook'

export type CompetencyStatus = 'unassessed' | 'insufficient' | 'weak' | 'developing' | 'strong'

export interface Measure {
  /** Respuestas corregidas (sin ponderar). */
  n: number
  /** Precisión ponderada por actualidad (0..1) o null si no hay datos. */
  accuracy: number | null
  status: CompetencyStatus
  lastAt?: string
  /** Diferencia de precisión reciente frente a la anterior (puntos 0..1) si hay datos para compararla. */
  trend: number | null
  /** Solo hay datos de la prueba de nivel. */
  placementOnly?: boolean
}

export interface Profile {
  skills: Record<StudySkill, Measure>
  comps: Record<string, Measure>
  parts: Record<string, Measure>
}

/** Mínimo de respuestas para sacar conclusiones. */
export const MIN_EVIDENCE = { skill: 10, comp: 5, part: 6 }
/** Vida media de un dato (días): lo reciente pesa más. */
export const HALF_LIFE_DAYS = 45
/** Equivalencia de una tarea de Writing/Speaking puntuada (autoevaluación o IA) en «respuestas». */
export const TASK_WEIGHT = 10

export function statusOf(n: number, accuracy: number | null, min: number): CompetencyStatus {
  if (n === 0 || accuracy === null) return 'unassessed'
  if (n < min) return 'insufficient'
  if (accuracy < 0.6) return 'weak'
  if (accuracy < 0.75) return 'developing'
  return 'strong'
}

interface Acc {
  n: number
  wc: number
  wt: number
  last?: string
  recent: [number, number]
  older: [number, number]
  placement: number
}

const blank = (): Acc => ({ n: 0, wc: 0, wt: 0, recent: [0, 0], older: [0, 0], placement: 0 })

function add(acc: Acc, correct: number, total: number, w: number, at: string | undefined, age: number, placement = false): void {
  if (total <= 0) return
  acc.n += total
  acc.wc += correct * w
  acc.wt += total * w
  if (placement) acc.placement += total
  if (at && (!acc.last || at > acc.last)) acc.last = at
  if (!placement) {
    if (age <= 14) {
      acc.recent[0] += correct
      acc.recent[1] += total
    } else if (age <= 60) {
      acc.older[0] += correct
      acc.older[1] += total
    }
  }
}

function measure(acc: Acc, min: number): Measure {
  const accuracy = acc.wt > 0 ? acc.wc / acc.wt : null
  const trend = acc.recent[1] >= 5 && acc.older[1] >= 5 ? acc.recent[0] / acc.recent[1] - acc.older[0] / acc.older[1] : null
  return { n: acc.n, accuracy, status: statusOf(acc.n, accuracy, min), lastAt: acc.last, trend, ...(acc.n > 0 && acc.placement === acc.n ? { placementOnly: true } : {}) }
}

export function computeProfile(activity: ActivityEntry[], placement: PlacementResult | null, today: string): Profile {
  const skills = Object.fromEntries(STUDY_SKILLS.map((s) => [s, blank()])) as Record<StudySkill, Acc>
  const comps = new Map<string, Acc>()
  const parts = new Map<string, Acc>()
  const get = (m: Map<string, Acc>, k: string) => {
    let a = m.get(k)
    if (!a) m.set(k, (a = blank()))
    return a
  }

  for (const e of activity) {
    const age = Math.max(0, daysUntil(e.day, today))
    const w = 0.5 ** (age / HALF_LIFE_DAYS)
    if (e.parts) {
      for (const [part, [c, t]] of Object.entries(e.parts)) {
        add(get(parts, part), c, t, w, e.at, age)
        add(skills[skillOfPart(part)], c, t, w, e.at, age)
      }
    } else if (e.kind === 'exam' && (e.paperType === 'writing' || e.paperType === 'speaking') && typeof e.percent === 'number') {
      // Writing/Speaking: la nota (autoevaluación o IA) como evidencia de la destreza.
      add(skills[e.paperType], (e.percent / 100) * TASK_WEIGHT, TASK_WEIGHT, w, e.at, age)
    }
    if (e.comp) for (const [id, [c, t]] of Object.entries(e.comp)) add(get(comps, id), c, t, w, e.at, age)
  }

  // Prueba de nivel: punto de partida con poco peso que se diluye con los datos reales.
  if (placement && placement.date && placement.date.slice(0, 4) !== '1970') {
    const day = placement.date.slice(0, 10)
    const age = Math.max(0, daysUntil(day, today))
    const w = 0.4 * 0.5 ** (age / HALF_LIFE_DAYS)
    const g = placement.skills.grammar / 100
    const v = placement.skills.vocabulary / 100
    const r = placement.skills.reading / 100
    add(skills.useOfEnglish, (g + v) * 8, 16, w, placement.date, age, true)
    add(skills.reading, r * 8, 8, w, placement.date, age, true)
  }

  const out: Profile = {
    skills: Object.fromEntries(STUDY_SKILLS.map((s) => [s, measure(skills[s], s === 'writing' || s === 'speaking' ? TASK_WEIGHT : MIN_EVIDENCE.skill)])) as Record<StudySkill, Measure>,
    comps: {},
    parts: {}
  }
  for (const [k, a] of comps) out.comps[k] = measure(a, MIN_EVIDENCE.comp)
  for (const [k, a] of parts) out.parts[k] = measure(a, MIN_EVIDENCE.part)
  return out
}

/** Competencias dominadas (con datos suficientes y precisión alta). */
export function masteredCompetencies(p: Profile): string[] {
  return Object.entries(p.comps)
    .filter(([, m]) => m.status === 'strong')
    .map(([id]) => id)
    .filter((id) => !!competency(id))
}

// ---------- Patrones ----------

export type PatternKind = 'category' | 'part' | 'confusion' | 'writing'

export interface Pattern {
  id: string
  kind: PatternKind
  skill: StudySkill
  category?: string
  part?: string
  /** Errores en la ventana analizada. */
  count: number
  /** Sesiones analizadas. */
  window: number
  accuracy?: number
  total?: number
  words?: [string, string]
  severity: number
}

const CONFUSABLE: Array<[string[], string[]]> = [
  [['make', 'makes', 'made', 'making'], ['do', 'does', 'did', 'done', 'doing']],
  [['say', 'says', 'said', 'saying'], ['tell', 'tells', 'told', 'telling']],
  [['borrow', 'borrowed', 'borrowing'], ['lend', 'lent', 'lending']],
  [['rob', 'robbed'], ['steal', 'stole', 'stolen']],
  [['rise', 'rose', 'risen'], ['raise', 'raised']],
  [['bring', 'brought'], ['take', 'took', 'taken']],
  [['look', 'looked'], ['see', 'saw', 'seen', 'watch', 'watched']],
  [['remember', 'remembered'], ['remind', 'reminded']],
  [['affect', 'affected'], ['effect', 'effects']],
  [['since'], ['for']],
  [['few', 'fewer'], ['little', 'less']]
]

function familyOf(word: string): number {
  return CONFUSABLE.findIndex(([a, b]) => a.includes(word) || b.includes(word))
}

function sideOf(idx: number, word: string): 0 | 1 {
  return CONFUSABLE[idx][0].includes(word) ? 0 : 1
}

function clean(s: string | undefined): string {
  return (s ?? '').toLowerCase().replace(/^[a-h]\s*·\s*/, '').trim()
}

/**
 * Patrones a partir de los errores y del perfil. Solo con datos reales: un patrón necesita al menos
 * 3 errores en la ventana (o 8 respuestas en una parte con menos del 50 % de aciertos).
 */
export function detectPatterns(records: ErrorRecord[], activity: ActivityEntry[], profile: Profile, windowSessions = 5): Pattern[] {
  const out: Pattern[] = []
  const recent = activity.filter((a) => a.kind === 'sheet' || a.kind === 'exam' || a.kind === 'review').slice(-windowSessions)
  const window = recent.length
  const ids = new Set(recent.map((a) => a.id))
  const live = records.filter((r) => !r.deleted)

  // 1. Categorías con varios errores en las últimas sesiones.
  if (window > 0) {
    const byCat = new Map<string, number>()
    for (const r of live) {
      if (!r.category) continue
      const n = r.occurrences.filter((o) => ids.has(o)).length
      if (n) byCat.set(r.category, (byCat.get(r.category) ?? 0) + n)
    }
    for (const [cat, count] of byCat) {
      if (count < 3) continue
      const c = competency(cat)!
      out.push({ id: `cat:${cat}`, kind: c.skill === 'writing' ? 'writing' : 'category', skill: c.skill, category: cat, count, window, severity: count * 2 })
    }
  }

  // 2. Partes del examen con baja precisión (datos suficientes).
  for (const [part, m] of Object.entries(profile.parts)) {
    if (m.n >= 8 && m.accuracy !== null && m.accuracy < 0.5) {
      out.push({ id: `part:${part}`, kind: 'part', skill: skillOfPart(part), part, count: Math.round(m.n * (1 - m.accuracy)), window, accuracy: m.accuracy, total: m.n, severity: (0.6 - m.accuracy) * 30 + 3 })
    }
  }
  // Competencias de Reading (actitud, inferencia…) con baja precisión.
  for (const [id, m] of Object.entries(profile.comps)) {
    const c = competency(id)
    if (!c || c.group !== 'reading') continue
    if (m.n >= 6 && m.accuracy !== null && m.accuracy < 0.5 && !out.some((p) => p.category === id)) {
      out.push({ id: `cat:${id}`, kind: 'category', skill: 'reading', category: id, count: Math.round(m.n * (1 - m.accuracy)), window, accuracy: m.accuracy, total: m.n, severity: (0.6 - m.accuracy) * 25 + 2 })
    }
  }

  // 3. Confusión entre palabras parecidas (make/do, say/tell…).
  const conf = new Map<number, number>()
  for (const r of live) {
    const given = clean(r.given)
    const expected = r.expected.map(clean)
    const fg = familyOf(given)
    if (fg === -1) continue
    if (expected.some((e) => familyOf(e) === fg && sideOf(fg, e) !== sideOf(fg, given))) conf.set(fg, (conf.get(fg) ?? 0) + Math.max(1, r.fails))
  }
  for (const [idx, count] of conf) {
    if (count < 2) continue
    out.push({ id: `conf:${idx}`, kind: 'confusion', skill: 'useOfEnglish', count, window, words: [CONFUSABLE[idx][0][0], CONFUSABLE[idx][1][0]], severity: count * 2.5, category: 'vocabulary.confusingWords' })
  }

  return out.sort((a, b) => b.severity - a.severity || a.id.localeCompare(b.id))
}
