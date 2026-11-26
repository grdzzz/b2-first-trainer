// Plan de estudio: configuración, sesiones guardadas, actividades movidas e hitos.
import { addDays } from '../review'
import { STUDY_SKILLS, type StudySkill } from './taxonomy'
import { weekdayOf } from './streaks'
import type { ReviewSessionSpec } from './notebook'

export type PlanIntensity = 'light' | 'balanced' | 'intense'
export type StudyPreference = 'short' | 'examFormat' | 'variety' | 'reviewFirst'
export const STUDY_PREFERENCES: StudyPreference[] = ['short', 'examFormat', 'variety', 'reviewFirst']
export type TargetLevel = 'B1' | 'B2' | 'C1'

export interface PlanConfig {
  /** Fecha del examen (AAAA-MM-DD) o null para un plan continuo. */
  examDate: string | null
  /** Puntuación objetivo en la escala Cambridge English (140–190). */
  targetScore: number
  targetLevel: TargetLevel
  /** Minutos por sesión: tope que nunca se supera. */
  minutesPerSession: number
  /** Días de la semana con estudio (0 = lunes … 6 = domingo). El resto son descanso. */
  studyDays: number[]
  /** Días concretos de descanso (vacaciones, días ocupados…). */
  restDates: string[]
  preferences: StudyPreference[]
  prioritySkills: StudySkill[]
  intensity: PlanIntensity
  startedAt: string
  updatedAt: string
}

export type ActivityKind = 'review' | 'errors' | 'sheet' | 'examPart' | 'mock'

export type ActivityTarget =
  | { kind: 'review'; session: ReviewSessionSpec }
  | { kind: 'sheet'; sheetId: string }
  | { kind: 'exam'; examId: string; paperId: string; partIds: string[]; mode: 'practice' | 'exam' }

export type ReasonCode =
  | 'reviewDue'
  | 'pattern'
  | 'weakSkill'
  | 'weakPart'
  | 'unassessed'
  | 'insufficient'
  | 'stale'
  | 'priority'
  | 'examSoon'
  | 'mock'
  | 'neverDone'
  | 'lowScore'
  | 'balance'
  | 'welcomeBack'
  | 'replaced'
  | 'moved'

export interface Reason {
  code: ReasonCode
  vars?: Record<string, string | number>
}

export type Difficulty = 'accessible' | 'suitable' | 'demanding'

export interface PlanActivity {
  id: string
  kind: ActivityKind
  skill: StudySkill
  /** Título (contenido en inglés: «Sheet 12 · Travel»; o descriptivo en español). */
  title: string
  minutes: number
  /** Solo si hay datos del alumno en ese tipo de contenido. */
  difficulty?: Difficulty
  reasons: Reason[]
  target: ActivityTarget
  status: 'todo' | 'done'
  doneAt?: string
  /** Sustituye a otra actividad (id). */
  replacedFrom?: string
}

export interface PlanSession {
  date: string
  generatedAt: string
  /** Huella de los datos con los que se generó (para saber si hay que replanificar). */
  fingerprint: string
  /** Primera vez que se empezó una actividad: a partir de ahí la sesión no se rehace sola. */
  startedAt?: string
  activities: PlanActivity[]
  /** Minutos disponibles ese día (0 = descanso). */
  budget: number
  restDay: boolean
  /** Destrezas sin contenido disponible (se explican en la interfaz). */
  gaps: StudySkill[]
  welcomeBack?: number
  completedAt?: string
  updatedAt: string
}

export interface PlanDoc {
  schemaVersion: number
  config: PlanConfig | null
  sessions: Record<string, PlanSession>
  /** Actividades previstas movidas a otro día: id → nuevo día. */
  moves: Record<string, { date: string; updatedAt: string }>
  updatedAt: string
}

export const PLAN_VERSION = 2
export const MIN_SESSION = 10
export const MAX_SESSION = 180

export function emptyPlan(now = new Date(0)): PlanDoc {
  return { schemaVersion: PLAN_VERSION, config: null, sessions: {}, moves: {}, updatedAt: now.toISOString() }
}

export function levelForScore(score: number): TargetLevel {
  return score >= 180 ? 'C1' : score >= 160 ? 'B2' : 'B1'
}

export function scoreForLevel(level: TargetLevel): number {
  return level === 'C1' ? 180 : level === 'B2' ? 160 : 140
}

/** Configuración propuesta (usa la prueba de nivel si existe). */
export function defaultPlanConfig(now = new Date(), placementScore?: number | null): PlanConfig {
  const at = now.toISOString()
  // Objetivo por defecto: aprobar el B2 (160); si la prueba de nivel ya da B2 alto, se propone 173 (Grade B).
  const target = placementScore && placementScore >= 170 ? 180 : placementScore && placementScore >= 160 ? 173 : 160
  return {
    examDate: null,
    targetScore: target,
    targetLevel: levelForScore(target),
    minutesPerSession: 30,
    studyDays: [0, 1, 2, 3, 4],
    restDates: [],
    preferences: ['variety'],
    prioritySkills: [],
    intensity: 'balanced',
    startedAt: at,
    updatedAt: at
  }
}

const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))

export function parsePlanConfig(raw: unknown): PlanConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const now = new Date(0).toISOString()
  const score = typeof r.targetScore === 'number' && Number.isFinite(r.targetScore) ? Math.min(190, Math.max(140, Math.round(r.targetScore))) : 160
  const minutes = typeof r.minutesPerSession === 'number' && Number.isFinite(r.minutesPerSession) ? Math.min(MAX_SESSION, Math.max(MIN_SESSION, Math.round(r.minutesPerSession / 5) * 5)) : 30
  const days = Array.isArray(r.studyDays) ? Array.from(new Set(r.studyDays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))).sort() : [0, 1, 2, 3, 4]
  return {
    examDate: isDay(r.examDate) ? r.examDate : null,
    targetScore: score,
    targetLevel: r.targetLevel === 'B1' || r.targetLevel === 'B2' || r.targetLevel === 'C1' ? r.targetLevel : levelForScore(score),
    minutesPerSession: minutes,
    studyDays: days.length ? days : [0, 1, 2, 3, 4],
    restDates: Array.isArray(r.restDates) ? Array.from(new Set(r.restDates.filter(isDay))).sort().slice(-200) : [],
    preferences: Array.isArray(r.preferences) ? r.preferences.filter((p): p is StudyPreference => STUDY_PREFERENCES.includes(p as StudyPreference)) : [],
    prioritySkills: Array.isArray(r.prioritySkills) ? r.prioritySkills.filter((s): s is StudySkill => STUDY_SKILLS.includes(s as StudySkill)).slice(0, 3) : [],
    intensity: r.intensity === 'light' || r.intensity === 'intense' ? r.intensity : 'balanced',
    startedAt: typeof r.startedAt === 'string' ? r.startedAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now
  }
}

function parseActivity(raw: unknown): PlanActivity | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  const kinds: ActivityKind[] = ['review', 'errors', 'sheet', 'examPart', 'mock']
  if (typeof a.id !== 'string' || !kinds.includes(a.kind as ActivityKind) || !STUDY_SKILLS.includes(a.skill as StudySkill)) return null
  const t = (a.target && typeof a.target === 'object' ? a.target : {}) as Record<string, unknown>
  let target: ActivityTarget | null = null
  if (t.kind === 'sheet' && typeof t.sheetId === 'string') target = { kind: 'sheet', sheetId: t.sheetId }
  else if (t.kind === 'exam' && typeof t.examId === 'string' && typeof t.paperId === 'string') target = { kind: 'exam', examId: t.examId, paperId: t.paperId, partIds: Array.isArray(t.partIds) ? t.partIds.filter((x): x is string => typeof x === 'string') : [], mode: t.mode === 'exam' ? 'exam' : 'practice' }
  else if (t.kind === 'review' && t.session && typeof t.session === 'object') {
    const s = t.session as Record<string, unknown>
    const kindsS = ['due', 'today', 'recurring', 'competency', 'exam', 'old', 'custom']
    if (kindsS.includes(s.kind as string)) target = { kind: 'review', session: { kind: s.kind as ReviewSessionSpec['kind'], ...(typeof s.value === 'string' ? { value: s.value } : {}) } }
  }
  if (!target) return null
  const reasons = Array.isArray(a.reasons)
    ? a.reasons
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && typeof (x as Reason).code === 'string')
        .map((x) => ({ code: x.code as ReasonCode, ...(x.vars && typeof x.vars === 'object' ? { vars: x.vars as Record<string, string | number> } : {}) }))
        .slice(0, 4)
    : []
  return {
    id: a.id,
    kind: a.kind as ActivityKind,
    skill: a.skill as StudySkill,
    title: typeof a.title === 'string' ? a.title.slice(0, 160) : '',
    minutes: typeof a.minutes === 'number' && a.minutes > 0 ? Math.min(240, Math.round(a.minutes)) : 10,
    ...(a.difficulty === 'accessible' || a.difficulty === 'suitable' || a.difficulty === 'demanding' ? { difficulty: a.difficulty } : {}),
    reasons,
    target,
    status: a.status === 'done' ? 'done' : 'todo',
    ...(typeof a.doneAt === 'string' ? { doneAt: a.doneAt } : {}),
    ...(typeof a.replacedFrom === 'string' ? { replacedFrom: a.replacedFrom } : {})
  }
}

function parseSession(date: string, raw: unknown): PlanSession | null {
  if (!isDay(date) || !raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const now = new Date(0).toISOString()
  return {
    date,
    generatedAt: typeof s.generatedAt === 'string' ? s.generatedAt : now,
    fingerprint: typeof s.fingerprint === 'string' ? s.fingerprint : '',
    startedAt: typeof s.startedAt === 'string' ? s.startedAt : undefined,
    activities: Array.isArray(s.activities) ? s.activities.map(parseActivity).filter((a): a is PlanActivity => !!a).slice(0, 8) : [],
    budget: typeof s.budget === 'number' ? Math.max(0, Math.min(MAX_SESSION, s.budget)) : 0,
    restDay: s.restDay === true,
    gaps: Array.isArray(s.gaps) ? s.gaps.filter((g): g is StudySkill => STUDY_SKILLS.includes(g as StudySkill)) : [],
    welcomeBack: typeof s.welcomeBack === 'number' ? s.welcomeBack : undefined,
    completedAt: typeof s.completedAt === 'string' ? s.completedAt : undefined,
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : now
  }
}

export function parsePlan(raw: unknown): PlanDoc {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const sessions: Record<string, PlanSession> = {}
  for (const [date, v] of Object.entries((r.sessions && typeof r.sessions === 'object' ? r.sessions : {}) as Record<string, unknown>)) {
    const s = parseSession(date, v)
    if (s) sessions[date] = s
  }
  const moves: PlanDoc['moves'] = {}
  for (const [id, v] of Object.entries((r.moves && typeof r.moves === 'object' ? r.moves : {}) as Record<string, unknown>)) {
    const m = v as Record<string, unknown>
    if (m && isDay(m.date)) moves[id] = { date: m.date as string, updatedAt: typeof m.updatedAt === 'string' ? m.updatedAt : new Date(0).toISOString() }
  }
  return { schemaVersion: PLAN_VERSION, config: parsePlanConfig(r.config), sessions, moves, updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : new Date(0).toISOString() }
}

export function mergePlans(a: PlanDoc, b: PlanDoc): PlanDoc {
  const config = !a.config ? b.config : !b.config ? a.config : b.config.updatedAt > a.config.updatedAt ? b.config : a.config
  const sessions = { ...a.sessions }
  for (const [d, s] of Object.entries(b.sessions)) {
    const prev = sessions[d]
    sessions[d] = !prev || s.updatedAt > prev.updatedAt ? s : prev
  }
  const moves = { ...a.moves }
  for (const [id, m] of Object.entries(b.moves)) if (!moves[id] || m.updatedAt > moves[id].updatedAt) moves[id] = m
  return { schemaVersion: PLAN_VERSION, config, sessions, moves, updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt }
}

/** Borra sesiones muy antiguas (el historial real está en la actividad). */
export function prunePlan(doc: PlanDoc, today: string, keepDays = 120): PlanDoc {
  const limit = addDays(today, -keepDays)
  const sessions = Object.fromEntries(Object.entries(doc.sessions).filter(([d]) => d >= limit))
  const moves = Object.fromEntries(Object.entries(doc.moves).filter(([, m]) => m.date >= limit))
  return Object.keys(sessions).length === Object.keys(doc.sessions).length && Object.keys(moves).length === Object.keys(doc.moves).length ? doc : { ...doc, sessions, moves }
}

// ---------- Días ----------

export function isRestDay(config: PlanConfig, day: string): boolean {
  return !config.studyDays.includes(weekdayOf(day)) || config.restDates.includes(day)
}

export function daysUntil(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000)
}

/** Minutos disponibles un día (0 si es descanso). Nunca más que el máximo configurado. */
export function budgetFor(config: PlanConfig, day: string): number {
  if (isRestDay(config, day)) return 0
  const factor = config.intensity === 'light' ? 0.85 : 1
  return Math.max(MIN_SESSION, Math.min(config.minutesPerSession, Math.round((config.minutesPerSession * factor) / 5) * 5))
}

// ---------- Hitos ----------

export type MilestoneKind = 'start' | 'exam' | 'halfway' | 'twoWeeks' | 'oneWeek' | 'mockSuggested' | 'checkpoint'

export interface Milestone {
  date: string
  kind: MilestoneKind
}

export function planMilestones(config: PlanConfig, today: string, horizonDays = 120): Milestone[] {
  const out: Milestone[] = []
  const start = config.startedAt.slice(0, 10)
  if (isDay(start)) out.push({ date: start, kind: 'start' })
  const end = addDays(today, horizonDays)
  if (config.examDate) {
    const exam = config.examDate
    out.push({ date: exam, kind: 'exam' })
    const total = daysUntil(start, exam)
    if (total > 20) out.push({ date: addDays(start, Math.floor(total / 2)), kind: 'halfway' })
    if (total > 14) out.push({ date: addDays(exam, -14), kind: 'twoWeeks' })
    if (total > 7) out.push({ date: addDays(exam, -7), kind: 'oneWeek' })
    // Simulacro sugerido: cada dos semanas en las 6 semanas previas, en un día de estudio.
    for (const back of [42, 28, 14, 4]) {
      let d = addDays(exam, -back)
      for (let i = 0; i < 6 && isRestDay(config, d); i++) d = addDays(d, -1)
      if (d > start && d < exam) out.push({ date: d, kind: 'mockSuggested' })
    }
  } else {
    // Plan continuo: un punto de control cada 4 semanas para medir la evolución.
    for (let k = 1; k <= 12; k++) {
      const d = addDays(start, 28 * k)
      if (d > end) break
      out.push({ date: d, kind: 'checkpoint' })
    }
  }
  return out.filter((m) => m.date <= end).sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind))
}

/** Huella estable de un objeto (para detectar cambios que obligan a replanificar). */
export function fingerprint(value: unknown): string {
  const s = JSON.stringify(value)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** Número pseudoaleatorio estable (0..1) a partir de un texto: variedad determinista. */
export function seeded(text: string): number {
  return parseInt(fingerprint(text), 36) / 0xffffffff
}
