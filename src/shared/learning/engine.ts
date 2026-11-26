// Motor adaptativo: prioridades por destreza y generación de sesiones. Local, determinista y puro.
//
// 1. Prioridad de cada destreza (useOfEnglish, reading, writing, listening, speaking):
//      distancia al objetivo (si hay datos suficientes) · destreza sin evaluar o con pocos datos ·
//      tiempo sin practicarla · prioridad elegida por el alumno · errores recientes · patrones detectados ·
//      cercanía del examen · penalización si fue la principal ayer (equilibrio).
// 2. Sesión: primero el repaso que toca (si lo hay) y, si hay un patrón claro, una tanda de errores de esa
//    competencia; después, por prioridad, una actividad por destreza con contenido disponible hasta llenar
//    el tiempo (nunca se supera). La elección de contenido evita lo hecho recientemente.
// 3. Desempates con un número pseudoaleatorio estable (día + id): misma entrada → misma salida.
import type { PracticeSkill, PracticeTaskType } from '../practice'
import type { PaperType } from '../types'
import type { PlacementResult } from '../placement'
import type { ActivityEntry } from './game'
import { computeProfile, detectPatterns, type Measure, type Pattern, type Profile } from './competency'
import type { ErrorRecord } from './notebook'
import { examPartId, SHEET_TASK_PART, skillOfPart, skillOfPracticeSkill, STUDY_SKILLS, type StudySkill } from './taxonomy'
import { addDays } from '../review'
import { percentToScale } from '../cambridge'
import {
  budgetFor,
  daysUntil,
  fingerprint,
  isRestDay,
  seeded,
  type Difficulty,
  type PlanActivity,
  type PlanConfig,
  type PlanSession,
  type Reason
} from './plan'

// ---------- Entrada ----------

export interface CatalogSheet {
  id: string
  title: string
  number?: number
  skill: PracticeSkill
  minutes: number
  taskTypes: PracticeTaskType[]
  builtIn: boolean
}

export interface CatalogPart {
  id: string
  number: number
  title: string
  questions: number
  /** Tiene clave (se corrige sola) o es Writing/Speaking (autoevaluación). */
  gradable: boolean
  /** Tiene el material necesario (PDF/audio/vídeo) para hacerla. */
  playable: boolean
}

export interface CatalogPaper {
  id: string
  type: PaperType
  title: string
  timeLimitMin?: number
  parts: CatalogPart[]
}

export interface CatalogExam {
  id: string
  name: string
  isExample: boolean
  papers: CatalogPaper[]
}

export interface SheetState {
  times: number
  best?: number
  total?: number
  lastAt?: string
  inProgress: boolean
}

export interface AttemptLite {
  id: string
  examId: string
  paperId: string
  paperType: PaperType
  mode: 'exam' | 'practice' | 'review'
  status: 'in-progress' | 'finished'
  startedAt: string
  finishedAt?: string
  partIds: string[]
  percent: number | null
  full: boolean
}

export interface EngineInput {
  today: string
  config: PlanConfig
  sheets: CatalogSheet[]
  sheetStates: Record<string, SheetState>
  exams: CatalogExam[]
  attempts: AttemptLite[]
  activity: ActivityEntry[]
  placement: PlacementResult | null
  errors: ErrorRecord[]
  /** Preguntas para repasar hoy (todas las fuentes, sin las de examen). */
  dueReviews: number
  /** Errores de examen que tocaría repasar (se repasan dentro del examen). */
  dueExamErrors: number
  /** Sesiones anteriores (para no repetir lo mismo). */
  history: Record<string, PlanSession>
  /** Contenido a no proponer (para previsiones de varios días). */
  exclude?: Set<string>
}

export interface SkillPriority {
  skill: StudySkill
  score: number
  measure: Measure
  available: boolean
  reasons: Reason[]
}

export interface EngineContext {
  input: EngineInput
  profile: Profile
  patterns: Pattern[]
  priorities: SkillPriority[]
  /** Días desde la última actividad (null si nunca). */
  inactiveDays: number | null
  examInDays: number | null
}

// ---------- Utilidades ----------

/** Porcentaje equivalente a una puntuación de la escala (inversa aproximada de percentToScale). */
export function percentForScale(scale: number): number {
  for (let p = 0; p <= 100; p++) if (percentToScale(p) >= scale) return p
  return 100
}

function lastPracticed(activity: ActivityEntry[], skill: StudySkill): string | undefined {
  for (let i = activity.length - 1; i >= 0; i--) {
    const a = activity[i]
    if (a.skill === skill || (a.parts && Object.keys(a.parts).some((p) => skillOfPart(p) === skill))) return a.day
  }
  return undefined
}

const SHEET_SKILLS_FOR: Record<StudySkill, PracticeSkill[]> = {
  useOfEnglish: ['vocabulary', 'grammar', 'wordFormation', 'mixed'],
  reading: ['reading'],
  writing: [],
  listening: [],
  speaking: []
}

function sheetPercent(st: SheetState | undefined): number | null {
  if (!st || !st.times || !st.total) return null
  return ((st.best ?? 0) / st.total) * 100
}

function examParts(input: EngineInput, skill: StudySkill): Array<{ exam: CatalogExam; paper: CatalogPaper; part: CatalogPart }> {
  const out: Array<{ exam: CatalogExam; paper: CatalogPaper; part: CatalogPart }> = []
  for (const exam of input.exams) {
    for (const paper of exam.papers) {
      for (const part of paper.parts) {
        if (!part.playable || !part.gradable || part.questions === 0) continue
        if (skillOfPart(examPartId(paper.type, part.number)) !== skill) continue
        out.push({ exam, paper, part })
      }
    }
  }
  return out
}

export function hasContent(input: EngineInput, skill: StudySkill): boolean {
  if (SHEET_SKILLS_FOR[skill].length && input.sheets.some((s) => SHEET_SKILLS_FOR[skill].includes(s.skill))) return true
  return examParts(input, skill).length > 0
}

/** Minutos estimados de una parte de examen. */
export function partMinutes(paper: CatalogPaper, part: CatalogPart): number {
  const byType: Record<PaperType, number> = { reading: 10, writing: 40, listening: 8, speaking: 4 }
  if (paper.timeLimitMin && paper.parts.length) {
    const share = Math.round(paper.timeLimitMin / paper.parts.length)
    if (share > 0) return Math.max(3, Math.min(60, share))
  }
  // Use of English: partes cortas.
  return paper.type === 'reading' && part.number <= 4 ? 8 : byType[paper.type]
}

export function paperMinutes(paper: CatalogPaper): number {
  return paper.timeLimitMin && paper.timeLimitMin > 0 ? paper.timeLimitMin : paper.parts.reduce((n, p) => n + partMinutes(paper, p), 0)
}

function difficultyFrom(pct: number | null): Difficulty | undefined {
  if (pct === null) return undefined
  return pct < 50 ? 'demanding' : pct < 75 ? 'suitable' : 'accessible'
}

// ---------- Contexto y prioridades ----------

export function buildContext(input: EngineInput): EngineContext {
  const profile = computeProfile(input.activity, input.placement, input.today)
  const patterns = detectPatterns(input.errors, input.activity, profile)
  const target = percentForScale(input.config.targetScore) / 100
  const last = input.activity.length ? input.activity[input.activity.length - 1].day : null
  const inactiveDays = last ? Math.max(0, daysUntil(last, input.today)) : null
  const examInDays = input.config.examDate ? daysUntil(input.today, input.config.examDate) : null
  const yesterday = input.history[addDays(input.today, -1)]
  const yesterdayMain = yesterday?.activities.find((a) => a.kind !== 'review' && a.kind !== 'errors')?.skill
  const recentErrors = new Map<StudySkill, number>()
  const since = addDays(input.today, -14)
  for (const r of input.errors) if (!r.deleted && !r.mastered && r.lastAt.slice(0, 10) >= since) recentErrors.set(r.skill, (recentErrors.get(r.skill) ?? 0) + 1)

  const priorities: SkillPriority[] = STUDY_SKILLS.map((skill) => {
    const m = profile.skills[skill]
    const reasons: Reason[] = []
    let score = 10
    if (m.status === 'unassessed') {
      score += 24
      reasons.push({ code: 'unassessed', vars: { skill } })
    } else if (m.status === 'insufficient') {
      score += 14
      reasons.push({ code: 'insufficient', vars: { skill } })
    }
    if (m.accuracy !== null && m.status !== 'unassessed' && !m.placementOnly) {
      const gap = Math.max(0, target - m.accuracy)
      score += gap * 110
      if (m.status === 'weak' || (m.status === 'developing' && gap > 0.05)) reasons.push({ code: 'weakSkill', vars: { skill, pct: Math.round(m.accuracy * 100) } })
    }
    const lp = lastPracticed(input.activity, skill)
    const stale = lp ? daysUntil(lp, input.today) : null
    if (stale !== null && stale >= 5) {
      score += Math.min(20, stale * 1.5)
      reasons.push({ code: 'stale', vars: { skill, days: stale } })
    }
    if (input.config.prioritySkills.includes(skill)) {
      score += 16
      reasons.push({ code: 'priority', vars: { skill } })
    }
    score += Math.min(15, (recentErrors.get(skill) ?? 0) * 1.2)
    const pat = patterns.find((p) => p.skill === skill)
    if (pat) {
      score += Math.min(12, pat.severity)
      reasons.push({ code: 'pattern', vars: { pattern: pat.id, count: pat.count, window: pat.window } })
    }
    if (examInDays !== null && examInDays >= 0 && examInDays <= 30 && (skill === 'writing' || skill === 'speaking' || skill === 'listening')) {
      // Cerca del examen, que ninguna parte se quede sin tocar.
      score += 6
    }
    if (yesterdayMain === skill) score -= 12
    const available = hasContent(input, skill)
    return { skill, score: Math.round(score * 10) / 10, measure: m, available, reasons }
  }).sort((a, b) => b.score - a.score || seeded(input.today + a.skill) - seeded(input.today + b.skill))

  return { input, profile, patterns, priorities, inactiveDays, examInDays }
}

// ---------- Candidatos de contenido ----------

interface Candidate {
  key: string
  activity: Omit<PlanActivity, 'id' | 'status'>
  score: number
}

function recentlyUsed(input: EngineInput, days: number): Set<string> {
  const out = new Set<string>()
  const since = addDays(input.today, -days)
  for (const a of input.activity) {
    if (a.day < since || !a.ref) continue
    out.add(a.ref)
    if (a.paperId) out.add(a.paperId)
  }
  for (const [date, s] of Object.entries(input.history)) {
    if (date < since || date >= input.today) continue
    for (const act of s.activities) out.add(contentKey(act))
  }
  return out
}

export function contentKey(a: Pick<PlanActivity, 'target'>): string {
  const t = a.target
  if (t.kind === 'sheet') return t.sheetId
  if (t.kind === 'exam') return `${t.paperId}:${t.partIds.join('+')}`
  return `review:${t.session.kind}:${t.session.value ?? ''}`
}

function sheetCandidates(ctx: EngineContext, skill: StudySkill, maxMinutes: number, used: Set<string>): Candidate[] {
  const { input, profile } = ctx
  const kinds = SHEET_SKILLS_FOR[skill]
  if (!kinds.length) return []
  // Parte más floja de esa destreza (para elegir el tipo de hoja que la trabaja).
  const weakParts = Object.entries(profile.parts)
    .filter(([p, m]) => skillOfPart(p) === skill && m.accuracy !== null && m.n >= 4)
    .sort((a, b) => (a[1].accuracy ?? 1) - (b[1].accuracy ?? 1))
    .map(([p, m]) => ({ part: p, pct: Math.round((m.accuracy ?? 0) * 100) }))
  const weakest = weakParts[0] && weakParts[0].pct < 70 ? weakParts[0] : undefined
  const prefersShort = input.config.preferences.includes('short')
  const out: Candidate[] = []
  for (const s of input.sheets) {
    if (!kinds.includes(s.skill) || s.minutes > maxMinutes || input.exclude?.has(s.id)) continue
    const st = input.sheetStates[s.id]
    const pct = sheetPercent(st)
    const reasons: Reason[] = []
    let score = 0
    if (st?.inProgress) score += 30
    if (!st || !st.times) {
      score += 20
      reasons.push({ code: 'neverDone' })
    } else if (pct !== null && pct < 70) {
      score += 12 + (70 - pct) / 4
      reasons.push({ code: 'lowScore', vars: { pct: Math.round(pct) } })
    } else score -= 15
    if (weakest && s.taskTypes.some((t) => SHEET_TASK_PART[t] === weakest.part)) {
      score += 14
      reasons.unshift({ code: 'weakPart', vars: { part: weakest.part, pct: weakest.pct } })
    }
    if (used.has(s.id)) score -= 40
    if (prefersShort) score -= Math.max(0, s.minutes - 10)
    score += seeded(input.today + s.id) * 6
    const difficulty = difficultyFrom(pct ?? partAccuracy(profile, s.taskTypes))
    out.push({
      key: s.id,
      score,
      activity: { kind: 'sheet', skill, title: s.number ? `Sheet ${s.number} · ${s.title}` : s.title, minutes: s.minutes, ...(difficulty ? { difficulty } : {}), reasons, target: { kind: 'sheet', sheetId: s.id } }
    })
  }
  return out
}

function partAccuracy(profile: Profile, types: PracticeTaskType[]): number | null {
  const ms = types.map((t) => profile.parts[SHEET_TASK_PART[t]]).filter((m): m is Measure => !!m && m.accuracy !== null && m.n >= 4)
  if (!ms.length) return null
  return (ms.reduce((n, m) => n + (m.accuracy ?? 0), 0) / ms.length) * 100
}

function examCandidates(ctx: EngineContext, skill: StudySkill, maxMinutes: number, used: Set<string>): Candidate[] {
  const { input, profile } = ctx
  const out: Candidate[] = []
  const doneParts = new Map<string, number>()
  for (const a of input.attempts) if (a.status === 'finished') for (const p of a.partIds) doneParts.set(p, (doneParts.get(p) ?? 0) + 1)
  const examFormat = input.config.preferences.includes('examFormat')
  for (const { exam, paper, part } of examParts(input, skill)) {
    const minutes = partMinutes(paper, part)
    const key = `${paper.id}:${part.id}`
    if (minutes > maxMinutes || input.exclude?.has(key)) continue
    const pid = examPartId(paper.type, part.number)
    const m = profile.parts[pid]
    const reasons: Reason[] = []
    let score = 4
    const times = doneParts.get(part.id) ?? 0
    if (!times) {
      score += 14
      reasons.push({ code: 'neverDone' })
    } else score -= times * 8
    if (m && m.accuracy !== null && m.n >= 4 && m.accuracy < 0.7) {
      score += 10
      reasons.push({ code: 'weakPart', vars: { part: pid, pct: Math.round(m.accuracy * 100) } })
    }
    if (examFormat) score += 8
    if (ctx.examInDays !== null && ctx.examInDays >= 0 && ctx.examInDays <= 30) {
      score += 6
      reasons.push({ code: 'examSoon', vars: { days: ctx.examInDays } })
    }
    if (exam.isExample) score -= 2
    if (used.has(key) || used.has(paper.id)) score -= 30
    score += seeded(input.today + key) * 5
    const difficulty = difficultyFrom(m && m.accuracy !== null && m.n >= 4 ? m.accuracy * 100 : null)
    out.push({
      key,
      score,
      activity: {
        kind: 'examPart',
        skill,
        title: `${exam.name} · ${paper.title} · Part ${part.number}`,
        minutes,
        ...(difficulty ? { difficulty } : {}),
        reasons,
        target: { kind: 'exam', examId: exam.id, paperId: paper.id, partIds: [part.id], mode: 'practice' }
      }
    })
  }
  return out
}

/** Simulacro (paper completo en modo examen): cerca del examen, con tiempo suficiente, como mucho uno por semana. */
function mockCandidate(ctx: EngineContext, budget: number, used: Set<string>): Candidate | null {
  const { input } = ctx
  const intense = input.config.intensity === 'intense'
  const soon = ctx.examInDays !== null && ctx.examInDays >= 2 && ctx.examInDays <= (intense ? 45 : 30)
  if (!soon) return null
  const weekAgo = addDays(input.today, -7)
  if (input.attempts.some((a) => a.mode === 'exam' && a.full && (a.finishedAt ?? a.startedAt).slice(0, 10) >= weekAgo)) return null
  if (Object.entries(input.history).some(([d, s]) => d >= weekAgo && d < input.today && s.activities.some((x) => x.kind === 'mock'))) return null
  let best: Candidate | null = null
  for (const exam of input.exams) {
    for (const paper of exam.papers) {
      const playable = paper.parts.length > 0 && paper.parts.every((p) => p.playable && p.gradable && p.questions > 0)
      const minutes = paperMinutes(paper)
      if (!playable || minutes > budget || input.exclude?.has(paper.id)) continue
      const done = input.attempts.filter((a) => a.paperId === paper.id && a.mode === 'exam' && a.status === 'finished').length
      const score = 20 - done * 10 - (used.has(paper.id) ? 30 : 0) + seeded(input.today + paper.id) * 4
      if (!best || score > best.score) {
        best = {
          key: paper.id,
          score,
          activity: { kind: 'mock', skill: paper.type === 'reading' ? 'reading' : paper.type, title: `${exam.name} · ${paper.title}`, minutes, reasons: [{ code: 'mock', vars: { days: ctx.examInDays ?? 0 } }], target: { kind: 'exam', examId: exam.id, paperId: paper.id, partIds: paper.parts.map((p) => p.id), mode: 'exam' } }
        }
      }
    }
  }
  return best
}

export function candidatesFor(ctx: EngineContext, skill: StudySkill, maxMinutes: number, used: Set<string>): Candidate[] {
  const preferExam = ctx.input.config.preferences.includes('examFormat') || (ctx.examInDays !== null && ctx.examInDays <= 21 && ctx.examInDays >= 0)
  const all = [...sheetCandidates(ctx, skill, maxMinutes, used), ...examCandidates(ctx, skill, maxMinutes, used).map((c) => ({ ...c, score: c.score + (preferExam ? 6 : 0) }))]
  return all.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
}

// ---------- Sesión ----------

export interface GeneratedSession {
  session: PlanSession
  context: EngineContext
}

/** Datos que, si cambian, obligan a rehacer una sesión aún no empezada. */
export function sessionFingerprint(input: EngineInput): string {
  return fingerprint({
    c: { ...input.config, updatedAt: undefined, startedAt: undefined },
    d: input.today,
    a: input.activity.length,
    l: input.activity[input.activity.length - 1]?.id,
    e: input.errors.filter((r) => !r.deleted && !r.mastered).length,
    r: input.dueReviews,
    s: input.sheets.length,
    x: input.exams.map((e) => e.id + e.papers.length).join(','),
    p: input.placement?.score ?? null
  })
}

export function generateSession(input: EngineInput, now = new Date()): GeneratedSession {
  const ctx = buildContext(input)
  const { config, today } = input
  const at = now.toISOString()
  const fp = sessionFingerprint(input)
  const base: PlanSession = { date: today, generatedAt: at, fingerprint: fp, activities: [], budget: 0, restDay: false, gaps: [], updatedAt: at }

  if (isRestDay(config, today)) return { session: { ...base, restDay: true }, context: ctx }

  let budget = budgetFor(config, today)
  const welcomeBack = ctx.inactiveDays !== null && ctx.inactiveDays >= 4 ? ctx.inactiveDays : undefined
  // Vuelta tras unos días: sesión algo más ligera para retomar sin agobio.
  if (welcomeBack) budget = Math.max(10, Math.round((budget * 0.75) / 5) * 5)
  let left = budget
  const acts: Array<Omit<PlanActivity, 'id' | 'status'>> = []
  const used = recentlyUsed(input, 6)
  const reviewFirst = config.preferences.includes('reviewFirst')

  // 1. Repaso espaciado (lo que toca hoy).
  if (input.dueReviews > 0) {
    const share = reviewFirst ? 0.45 : 0.35
    const minutes = Math.max(5, Math.min(Math.ceil(input.dueReviews * 0.6), Math.floor(budget * share), 15))
    if (minutes <= left) {
      acts.push({ kind: 'review', skill: 'useOfEnglish', title: 'Spaced review', minutes, reasons: [{ code: 'reviewDue', vars: { n: input.dueReviews } }, ...(welcomeBack ? [{ code: 'welcomeBack' as const, vars: { days: welcomeBack } }] : [])], target: { kind: 'review', session: { kind: 'due' } } })
      left -= minutes
    }
  }

  // 2. Corrección de errores: el patrón más claro (si hay tiempo).
  const pattern = ctx.patterns.find((p) => p.category)
  if (pattern?.category && left >= 15 && budget >= 20) {
    const liveInCat = input.errors.filter((r) => !r.deleted && !r.mastered && r.category === pattern.category).length
    if (liveInCat >= 3) {
      acts.push({ kind: 'errors', skill: pattern.skill, title: 'Error clinic', minutes: 5, reasons: [{ code: 'pattern', vars: { pattern: pattern.id, count: pattern.count, window: pattern.window } }], target: { kind: 'review', session: { kind: 'competency', value: pattern.category } } })
      left -= 5
    }
  }

  // 3. Simulacro si toca y cabe.
  const mock = mockCandidate(ctx, left, used)
  if (mock && left >= mock.activity.minutes) {
    acts.push(mock.activity)
    left -= mock.activity.minutes
    used.add(mock.key)
  }

  // 4. Una actividad por destreza, por prioridad, mientras quede tiempo.
  const gaps: StudySkill[] = []
  const picked = new Set<StudySkill>(acts.filter((a) => a.kind !== 'review' && a.kind !== 'errors').map((a) => a.skill))
  for (const pr of ctx.priorities) {
    if (left < 5) break
    if (picked.has(pr.skill)) continue
    if (!pr.available) {
      gaps.push(pr.skill)
      continue
    }
    const cand = candidatesFor(ctx, pr.skill, left, used)[0]
    if (!cand) continue
    acts.push({ ...cand.activity, reasons: [...cand.activity.reasons, ...pr.reasons].slice(0, 3) })
    left -= cand.activity.minutes
    used.add(cand.key)
    picked.add(pr.skill)
    if (acts.length >= 5) break
  }
  // Si sobra bastante tiempo y solo hay contenido de una destreza, otra actividad de la más prioritaria.
  if (left >= 10 && acts.length < 5) {
    for (const pr of ctx.priorities) {
      if (!pr.available) continue
      const cand = candidatesFor(ctx, pr.skill, left, used)[0]
      if (cand) {
        acts.push({ ...cand.activity, reasons: [...cand.activity.reasons, { code: 'balance' as const, vars: { skill: pr.skill } }].slice(0, 3) })
        left -= cand.activity.minutes
        used.add(cand.key)
        break
      }
    }
  }
  for (const pr of ctx.priorities) if (!pr.available && !gaps.includes(pr.skill)) gaps.push(pr.skill)

  const activities: PlanActivity[] = acts.map((a, i) => ({ ...a, id: `${today}:${i}:${fingerprint(contentKey(a)).slice(0, 5)}`, status: 'todo' }))
  return { session: { ...base, activities, budget, gaps, ...(welcomeBack ? { welcomeBack } : {}) }, context: ctx }
}

/** Alternativas equivalentes a una actividad: misma destreza y duración parecida. */
export function alternativesFor(input: EngineInput, activity: PlanActivity, session: PlanSession, limit = 3): PlanActivity[] {
  if (activity.kind === 'review' || activity.kind === 'errors') return []
  const ctx = buildContext(input)
  const used = recentlyUsed(input, 6)
  for (const a of session.activities) used.add(contentKey(a))
  const max = Math.max(activity.minutes + 10, Math.round(activity.minutes * 1.5))
  return candidatesFor(ctx, activity.skill, max, used)
    .filter((c) => c.key !== contentKey(activity))
    .slice(0, limit)
    .map((c, i) => ({ ...c.activity, reasons: [{ code: 'replaced' as const }, ...c.activity.reasons].slice(0, 3), id: `${activity.id}:alt${i}:${fingerprint(c.key).slice(0, 4)}`, status: 'todo' as const, replacedFrom: activity.id }))
}

/**
 * Previsión de los próximos días (para el calendario). Cada día evita el contenido de los anteriores,
 * así la previsión rota entre destrezas como lo haría el plan real.
 */
export function forecast(input: EngineInput, from: string, days: number, now = new Date()): PlanSession[] {
  const out: PlanSession[] = []
  const exclude = new Set(input.exclude ?? [])
  const history = { ...input.history }
  for (let i = 0; i < days; i++) {
    const day = addDays(from, i)
    const { session } = generateSession({ ...input, today: day, exclude, history, dueReviews: i === 0 ? input.dueReviews : 0 }, now)
    for (const a of session.activities) exclude.add(contentKey(a))
    history[day] = session
    out.push(session)
  }
  return out
}

/** ¿Hay que rehacer la sesión de hoy? Solo si no se ha empezado y han cambiado los datos. */
export function needsReplan(existing: PlanSession | undefined, input: EngineInput): boolean {
  if (!existing) return true
  if (existing.startedAt || existing.activities.some((a) => a.status === 'done')) return false
  return existing.fingerprint !== sessionFingerprint(input)
}

/** Marca como hechas las actividades que corresponden a lo que se acaba de hacer. */
export function markDone(session: PlanSession, match: (a: PlanActivity) => boolean, at: string): { session: PlanSession; changed: string[]; completed: boolean } {
  const changed: string[] = []
  const activities = session.activities.map((a) => {
    if (a.status === 'done' || !match(a)) return a
    changed.push(a.id)
    return { ...a, status: 'done' as const, doneAt: at }
  })
  if (!changed.length) return { session, changed, completed: false }
  const all = activities.length > 0 && activities.every((a) => a.status === 'done')
  return { session: { ...session, activities, startedAt: session.startedAt ?? at, completedAt: all ? (session.completedAt ?? at) : session.completedAt, updatedAt: at }, changed, completed: all && !session.completedAt }
}

export function sessionMinutes(s: PlanSession): { planned: number; done: number } {
  return s.activities.reduce((acc, a) => ({ planned: acc.planned + a.minutes, done: acc.done + (a.status === 'done' ? a.minutes : 0) }), { planned: 0, done: 0 })
}

export { skillOfPracticeSkill }
