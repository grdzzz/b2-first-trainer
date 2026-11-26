// Progresión: registro de actividad, experiencia (XP), niveles y rangos.
//
// Todo se guarda como conjuntos de entradas con identificador estable (unión al fusionar copias de
// carpetas sincronizadas): la XP total es la suma de las entradas del registro, así dos equipos que
// procesan el mismo intento producen la misma entrada y no se cuenta dos veces.
// Los niveles de la app son independientes de los niveles de inglés (A1…C2).
import type { AttemptMode, PaperType } from '../types'
import type { PracticeSkill } from '../practice'
import { STUDY_SKILLS, type StudySkill } from './taxonomy'

// ---------- Recompensas (valores centralizados: cámbialos aquí) ----------

export const XP_REWARDS = {
  /** Primera vez que se completa una hoja. */
  sheetCompleted: 30,
  /** Repetir una hoja mejorando la nota (además del récord). */
  sheetImproved: 15,
  /** Repetir una hoja sin mejorar: poco, y como mucho una vez al día por hoja. */
  sheetRepeat: 5,
  reviewSession: 20,
  questionMastered: 15,
  planSession: 50,
  /** Paper completo (modo examen o práctica). */
  examPaper: 100,
  /** Una o varias partes de un paper. */
  examPart: 40,
  /** Repaso de las preguntas falladas de un examen. */
  examReview: 20,
  personalRecord: 25,
  recurringMastered: 30,
  missionDaily: 15,
  missionWeekly: 40,
  /** Importar y revisar una corrección de IA de Writing/Speaking. */
  aiFeedback: 10
} as const

export const ACHIEVEMENT_XP = { common: 10, rare: 25, epic: 50, legendary: 100 } as const

export type XpReason =
  | 'sheet'
  | 'sheetImproved'
  | 'sheetRepeat'
  | 'review'
  | 'mastered'
  | 'recurringMastered'
  | 'plan'
  | 'exam'
  | 'examPart'
  | 'examReview'
  | 'record'
  | 'mission'
  | 'achievement'
  | 'aiFeedback'

export interface XpEntry {
  xp: number
  reason: XpReason
  at: string
  /** Referencia legible (id de hoja, intento, logro…). */
  ref?: string
  /** Concedida al inicializar 2.0 con el historial anterior. */
  retro?: boolean
}

// ---------- Niveles ----------

/** XP necesaria para pasar del nivel `level` al siguiente (curva progresiva, sin tope de niveles). */
export function xpToNext(level: number): number {
  return Math.round(100 + 30 * (level - 1) + 2 * (level - 1) ** 2)
}

/** XP acumulada para alcanzar un nivel. */
export function xpForLevel(level: number): number {
  let total = 0
  for (let l = 1; l < level; l++) total += xpToNext(l)
  return total
}

export interface LevelInfo {
  level: number
  xp: number
  /** XP dentro del nivel actual. */
  into: number
  /** XP del nivel actual al siguiente. */
  needed: number
  progress: number
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1
  let rest = Math.max(0, Math.floor(xp))
  while (rest >= xpToNext(level) && level < 10_000) {
    rest -= xpToNext(level)
    level++
  }
  const needed = xpToNext(level)
  return { level, xp: Math.max(0, Math.floor(xp)), into: rest, needed, progress: rest / needed }
}

/** Rangos (nombres originales en inglés). */
export const RANKS: Array<{ from: number; name: string }> = [
  { from: 1, name: 'Newcomer' },
  { from: 3, name: 'Word Seeker' },
  { from: 6, name: 'Sentence Builder' },
  { from: 10, name: 'Grammar Scout' },
  { from: 15, name: 'Fluent Explorer' },
  { from: 20, name: 'Text Navigator' },
  { from: 26, name: 'Phrase Artisan' },
  { from: 33, name: 'Clause Commander' },
  { from: 40, name: 'Lexicon Keeper' },
  { from: 50, name: 'Grand Linguist' },
  { from: 65, name: 'Polyglot Sage' },
  { from: 80, name: 'Legend of the Lexicon' }
]

export function rankOf(level: number): { name: string; index: number; next?: { from: number; name: string } } {
  let index = 0
  for (let i = 0; i < RANKS.length; i++) if (level >= RANKS[i].from) index = i
  return { name: RANKS[index].name, index, next: RANKS[index + 1] }
}

// ---------- Registro de actividad ----------

export type ActivityKind = 'sheet' | 'exam' | 'review' | 'planSession' | 'aiFeedback'

export interface ActivityEntry {
  id: string
  kind: ActivityKind
  at: string
  /** Día local AAAA-MM-DD. */
  day: string
  skill?: StudySkill
  practiceSkill?: PracticeSkill
  paperType?: PaperType
  mode?: AttemptMode
  /** Paper completo. */
  full?: boolean
  examId?: string
  paperId?: string
  /** Minutos de estudio (estimados para hojas y repasos; reales en exámenes). */
  minutes: number
  correct?: number
  total?: number
  percent?: number | null
  /** Hoja o intento. */
  ref?: string
  /** Competencia → [aciertos, total]. */
  comp?: Record<string, [number, number]>
  /** Parte del examen → [aciertos, total]. */
  parts?: Record<string, [number, number]>
  perfect?: boolean
  /** Mejoró su récord personal. */
  record?: boolean
  /** Primera vez (hoja nunca hecha). */
  first?: boolean
  mastered?: number
  /** Errores nuevos o repetidos registrados. */
  errors?: number
  retro?: boolean
}

export type CosmeticSlot = 'head' | 'eyes' | 'ears' | 'neck' | 'accessory' | 'color'
export const COSMETIC_SLOTS: CosmeticSlot[] = ['color', 'head', 'eyes', 'ears', 'neck', 'accessory']

export interface AvatarConfig {
  kind: 'bubi' | 'initials'
  color: string
}

export interface GameDoc {
  schemaVersion: number
  ledger: Record<string, XpEntry>
  achievements: Record<string, { at: string; retro?: boolean }>
  activity: Record<string, ActivityEntry>
  /** Funciones usadas (exploración, Bubi…): primera vez y contador. */
  flags: Record<string, { at: string; count: number }>
  /** Fuentes ya procesadas (idempotencia): clave → marca (fecha o versión). */
  processed: Record<string, string>
  missionsDone: Record<string, string>
  /** Misiones elegidas por periodo (día, o «w» + lunes de la semana). */
  missionPicks: Record<string, string[]>
  cosmetics: { equipped: Partial<Record<CosmeticSlot, string>>; updatedAt: string }
  profile: { avatar: AvatarConfig; favorites: string[]; updatedAt: string }
  /** Primera inicialización con el historial anterior (2.0). */
  initializedAt?: string
  updatedAt: string
}

export const GAME_VERSION = 2

export function emptyGame(now = new Date(0)): GameDoc {
  const at = now.toISOString()
  return {
    schemaVersion: GAME_VERSION,
    ledger: {},
    achievements: {},
    activity: {},
    flags: {},
    processed: {},
    missionsDone: {},
    missionPicks: {},
    cosmetics: { equipped: {}, updatedAt: at },
    profile: { avatar: { kind: 'bubi', color: 'indigo' }, favorites: [], updatedAt: at },
    updatedAt: at
  }
}

export function totalXp(doc: GameDoc): number {
  let s = 0
  for (const e of Object.values(doc.ledger)) s += e.xp
  return s
}

/** Concede XP una sola vez por id. */
export function grantXp(doc: GameDoc, id: string, entry: XpEntry): { doc: GameDoc; granted: boolean } {
  if (doc.ledger[id] || entry.xp <= 0) return { doc, granted: false }
  return { doc: { ...doc, ledger: { ...doc.ledger, [id]: entry }, updatedAt: entry.at }, granted: true }
}

export function addActivity(doc: GameDoc, entry: ActivityEntry): GameDoc {
  if (doc.activity[entry.id]) return doc
  return { ...doc, activity: { ...doc.activity, [entry.id]: entry }, updatedAt: entry.at > doc.updatedAt ? entry.at : doc.updatedAt }
}

export function useFlag(doc: GameDoc, flag: string, at: string): GameDoc {
  const prev = doc.flags[flag]
  return { ...doc, flags: { ...doc.flags, [flag]: { at: prev?.at ?? at, count: (prev?.count ?? 0) + 1 } }, updatedAt: at }
}

export function sortedActivity(doc: GameDoc): ActivityEntry[] {
  return Object.values(doc.activity).sort((a, b) => a.at.localeCompare(b.at))
}

export function xpHistory(doc: GameDoc, limit = 50): Array<XpEntry & { id: string }> {
  return Object.entries(doc.ledger)
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
}

/** XP ganada por día (para gráficos y récords). */
export function xpByDay(doc: GameDoc): Map<string, number> {
  const m = new Map<string, number>()
  for (const e of Object.values(doc.ledger)) {
    if (e.retro) continue
    const d = new Date(e.at)
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    m.set(day, (m.get(day) ?? 0) + e.xp)
  }
  return m
}

// ---------- Validación y fusión ----------

const isoOr = (v: unknown, fallback: string): string => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : fallback)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const pair = (v: unknown): [number, number] | null => (Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0) ? [v[0], v[1]] : null)

function pairs(v: unknown): Record<string, [number, number]> | undefined {
  const o = obj(v)
  const out: Record<string, [number, number]> = {}
  for (const [k, p] of Object.entries(o)) {
    const pp = pair(p)
    if (pp && k.length < 60) out[k] = pp
  }
  return Object.keys(out).length ? out : undefined
}

const REASONS: XpReason[] = ['sheet', 'sheetImproved', 'sheetRepeat', 'review', 'mastered', 'recurringMastered', 'plan', 'exam', 'examPart', 'examReview', 'record', 'mission', 'achievement', 'aiFeedback']
const KINDS: ActivityKind[] = ['sheet', 'exam', 'review', 'planSession', 'aiFeedback']

function parseActivity(id: string, v: unknown): ActivityEntry | null {
  const a = obj(v)
  if (!KINDS.includes(a.kind as ActivityKind) || typeof a.at !== 'string' || typeof a.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.day)) return null
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : undefined)
  const s = (x: unknown) => (typeof x === 'string' ? x : undefined)
  return {
    id,
    kind: a.kind as ActivityKind,
    at: isoOr(a.at, new Date(0).toISOString()),
    day: a.day,
    skill: STUDY_SKILLS.includes(a.skill as StudySkill) ? (a.skill as StudySkill) : undefined,
    practiceSkill: s(a.practiceSkill) as PracticeSkill | undefined,
    paperType: s(a.paperType) as PaperType | undefined,
    mode: s(a.mode) as AttemptMode | undefined,
    full: a.full === true ? true : undefined,
    examId: s(a.examId),
    paperId: s(a.paperId),
    minutes: Math.max(0, Math.min(600, num(a.minutes) ?? 0)),
    correct: num(a.correct),
    total: num(a.total),
    percent: a.percent === null ? null : num(a.percent),
    ref: s(a.ref),
    comp: pairs(a.comp),
    parts: pairs(a.parts),
    perfect: a.perfect === true ? true : undefined,
    record: a.record === true ? true : undefined,
    first: a.first === true ? true : undefined,
    mastered: num(a.mastered),
    errors: num(a.errors),
    retro: a.retro === true ? true : undefined
  }
}

export function parseGame(raw: unknown): GameDoc {
  const r = obj(raw)
  const base = emptyGame()
  const ledger: Record<string, XpEntry> = {}
  for (const [id, v] of Object.entries(obj(r.ledger))) {
    const e = obj(v)
    if (typeof e.xp !== 'number' || !Number.isFinite(e.xp) || e.xp <= 0 || e.xp > 1000 || !REASONS.includes(e.reason as XpReason)) continue
    ledger[id] = { xp: Math.round(e.xp), reason: e.reason as XpReason, at: isoOr(e.at, base.updatedAt), ...(typeof e.ref === 'string' ? { ref: e.ref } : {}), ...(e.retro === true ? { retro: true } : {}) }
  }
  const achievements: GameDoc['achievements'] = {}
  for (const [id, v] of Object.entries(obj(r.achievements))) {
    const e = obj(v)
    if (typeof e.at === 'string') achievements[id] = { at: isoOr(e.at, base.updatedAt), ...(e.retro === true ? { retro: true } : {}) }
  }
  const activity: GameDoc['activity'] = {}
  for (const [id, v] of Object.entries(obj(r.activity))) {
    const a = parseActivity(id, v)
    if (a) activity[id] = a
  }
  const flags: GameDoc['flags'] = {}
  for (const [id, v] of Object.entries(obj(r.flags))) {
    const f = obj(v)
    if (typeof f.at === 'string') flags[id] = { at: f.at, count: typeof f.count === 'number' && f.count > 0 ? Math.round(f.count) : 1 }
  }
  const processed: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj(r.processed))) if (typeof v === 'string') processed[k] = v
  const missionsDone: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj(r.missionsDone))) if (typeof v === 'string') missionsDone[k] = v
  const missionPicks: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(obj(r.missionPicks))) if (Array.isArray(v)) missionPicks[k] = v.filter((x): x is string => typeof x === 'string').slice(0, 6)
  const cos = obj(r.cosmetics)
  const equipped: GameDoc['cosmetics']['equipped'] = {}
  for (const [slot, id] of Object.entries(obj(cos.equipped))) if (COSMETIC_SLOTS.includes(slot as CosmeticSlot) && typeof id === 'string') equipped[slot as CosmeticSlot] = id
  const prof = obj(r.profile)
  const av = obj(prof.avatar)
  return {
    schemaVersion: GAME_VERSION,
    ledger,
    achievements,
    activity,
    flags,
    processed,
    missionsDone,
    missionPicks,
    cosmetics: { equipped, updatedAt: isoOr(cos.updatedAt, base.updatedAt) },
    profile: {
      avatar: { kind: av.kind === 'initials' ? 'initials' : 'bubi', color: typeof av.color === 'string' ? av.color.slice(0, 20) : 'indigo' },
      favorites: Array.isArray(prof.favorites) ? prof.favorites.filter((x): x is string => typeof x === 'string').slice(0, 3) : [],
      updatedAt: isoOr(prof.updatedAt, base.updatedAt)
    },
    initializedAt: typeof r.initializedAt === 'string' ? r.initializedAt : undefined,
    updatedAt: isoOr(r.updatedAt, base.updatedAt)
  }
}

/** Fusión de copias: unión de registros; lo editable (cosméticos, perfil), el más reciente. Conmutativa. */
export function mergeGames(a: GameDoc, b: GameDoc): GameDoc {
  const pick = <T extends { updatedAt: string }>(x: T, y: T): T => (y.updatedAt > x.updatedAt || (y.updatedAt === x.updatedAt && JSON.stringify(y) > JSON.stringify(x)) ? y : x)
  const achievements = { ...a.achievements }
  for (const [id, v] of Object.entries(b.achievements)) {
    const prev = achievements[id]
    achievements[id] = !prev || v.at < prev.at ? v : prev
  }
  const flags = { ...a.flags }
  for (const [id, v] of Object.entries(b.flags)) {
    const prev = flags[id]
    flags[id] = prev ? { at: prev.at < v.at ? prev.at : v.at, count: Math.max(prev.count, v.count) } : v
  }
  const processed = { ...a.processed }
  for (const [k, v] of Object.entries(b.processed)) if (!processed[k] || v > processed[k]) processed[k] = v
  const missionsDone = { ...a.missionsDone }
  for (const [k, v] of Object.entries(b.missionsDone)) if (!missionsDone[k] || v < missionsDone[k]) missionsDone[k] = v
  // Misiones elegidas: si dos equipos eligieron distinto el mismo día, se queda la elección menor (estable).
  const missionPicks = { ...a.missionPicks }
  for (const [k, v] of Object.entries(b.missionPicks)) if (!missionPicks[k] || v.join() < missionPicks[k].join()) missionPicks[k] = v
  const init = [a.initializedAt, b.initializedAt].filter((x): x is string => !!x).sort()[0]
  return {
    schemaVersion: GAME_VERSION,
    ledger: { ...b.ledger, ...a.ledger },
    achievements,
    activity: { ...b.activity, ...a.activity },
    flags,
    processed,
    missionsDone,
    missionPicks,
    cosmetics: pick(a.cosmetics, b.cosmetics),
    profile: pick(a.profile, b.profile),
    initializedAt: init,
    updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt
  }
}
