// Cuaderno de errores: registro, estados, búsqueda, filtros, sesiones de repaso y exportación.
//
// Un error es una pregunta concreta (de una hoja, de un examen o escrita a mano) con su historial.
// Su identificador es estable (deriva de la pregunta): fallar otra vez la misma pregunta actualiza el
// mismo registro en lugar de duplicarlo. Cada fallo se registra con un identificador de «ocurrencia»
// (el intento o la comprobación concreta), así procesar dos veces el mismo resultado no cuenta doble.
//
// Repaso: las preguntas de las hojas ya tienen su estado Leitner en el progreso de la hoja
// (PracticeProgress.review) y se usa ese; aquí solo se guarda el estado Leitner de las preguntas que no
// tienen otro (exámenes, errores escritos a mano, Writing, Speaking, IA). Nunca hay dos sistemas para la
// misma pregunta.
import { addDays, answerReview, failedState, type ReviewState } from '../review'
import { competency, isCompetencyId, type StudySkill, STUDY_SKILLS } from './taxonomy'
import { fuzzyScore } from '../fuzzy'

export type ErrorSource = 'sheet' | 'exam' | 'review' | 'writing' | 'speaking' | 'manual' | 'ai'
export const ERROR_SOURCES: ErrorSource[] = ['sheet', 'exam', 'review', 'writing', 'speaking', 'manual', 'ai']

export type ErrorStatus = 'new' | 'learning' | 'due' | 'recurring' | 'mastered'
export const ERROR_STATUSES: ErrorStatus[] = ['new', 'learning', 'due', 'recurring', 'mastered']

/** Referencia al ejercicio original. */
export type ErrorRef =
  | { kind: 'sheet'; sheetId: string; key: string }
  | { kind: 'exam'; examId: string; paperId: string; questionId: string; attemptId: string }
  | { kind: 'attempt'; attemptId: string; questionId: string }
  | { kind: 'none' }

export interface ErrorRecord {
  id: string
  source: ErrorSource
  ref: ErrorRef
  /** Enunciado o consigna. */
  question?: string
  /** Contexto original (la frase con el hueco, el fragmento de texto…). */
  context?: string
  /** Respuesta del usuario. */
  given?: string
  /** Respuestas válidas. */
  expected: string[]
  explanation?: string
  skill: StudySkill
  /** Parte del examen («reading.p4»…). */
  part?: string
  category?: string
  subcategory?: string
  /** Quién puso la categoría: deducida, a mano o por una corrección de IA. */
  categorySource?: 'auto' | 'user' | 'ai'
  explanationSource?: 'auto' | 'user' | 'ai'
  firstAt: string
  lastAt: string
  fails: number
  /** Aciertos posteriores al primer fallo. */
  successes: number
  /** Ocurrencias ya contadas (idempotencia). Las más recientes primero; como mucho 40. */
  occurrences: string[]
  /** Estado Leitner propio (solo si la pregunta no tiene otro: ver cabecera). */
  review?: ReviewState
  /** Se puede comprobar automáticamente (hay respuesta correcta y forma de compararla). */
  autoCheck?: boolean
  mastered?: boolean
  masteredAt?: string
  favorite?: boolean
  notes?: string
  /** Borrado por el usuario (se conserva para que la sincronización no lo resucite). */
  deleted?: boolean
  updatedAt: string
}

/** Datos para registrar un fallo. */
export interface ErrorDraft {
  id: string
  source: ErrorSource
  ref: ErrorRef
  question?: string
  context?: string
  given?: string
  expected: string[]
  explanation?: string
  skill: StudySkill
  part?: string
  category?: string
  subcategory?: string
  categorySource?: ErrorRecord['categorySource']
  /** Si se guarda un estado Leitner propio (preguntas sin repaso en otro sitio). */
  ownReview: boolean
  autoCheck?: boolean
}

export interface NotebookDoc {
  schemaVersion: number
  records: Record<string, ErrorRecord>
  /** Lecciones personalizadas importadas de un chat de IA. */
  lessons: Record<string, Lesson>
  updatedAt: string
}

export interface Lesson {
  id: string
  title: string
  sections: Array<{ heading: string; text: string; examples: string[] }>
  errorIds: string[]
  createdAt: string
  updatedAt: string
  deleted?: boolean
}

export const NOTEBOOK_VERSION = 2
const MAX_OCCURRENCES = 40
/** Fallos a partir de los que un error se considera recurrente. */
export const RECURRING_FAILS = 3

export function emptyNotebook(now = new Date()): NotebookDoc {
  return { schemaVersion: NOTEBOOK_VERSION, records: {}, lessons: {}, updatedAt: now.toISOString() }
}

/** Id estable de un error a partir de su origen. */
export function errorIdFor(ref: ErrorRef, suffix = ''): string {
  switch (ref.kind) {
    case 'sheet':
      return `s:${ref.sheetId}:${ref.key}`
    case 'exam':
      return `e:${ref.examId}:${ref.paperId}:${ref.questionId}`
    case 'attempt':
      return `a:${ref.attemptId}:${ref.questionId}${suffix ? `:${suffix}` : ''}`
    case 'none':
      return `m:${suffix}`
  }
}

/** Registra un fallo (idempotente por `occurrence`). */
export function recordFailure(doc: NotebookDoc, draft: ErrorDraft, occurrence: string, at: string, today: string): { doc: NotebookDoc; created: boolean; changed: boolean } {
  const prev = doc.records[draft.id]
  if (prev && prev.occurrences.includes(occurrence)) return { doc, created: false, changed: false }
  const userCategory = prev?.categorySource === 'user'
  const userExplanation = prev?.explanationSource === 'user' || prev?.explanationSource === 'ai'
  const base: ErrorRecord = prev
    ? { ...prev }
    : {
        id: draft.id,
        source: draft.source,
        ref: draft.ref,
        expected: [],
        skill: draft.skill,
        firstAt: at,
        lastAt: at,
        fails: 0,
        successes: 0,
        occurrences: [],
        updatedAt: at
      }
  const next: ErrorRecord = {
    ...base,
    question: draft.question ?? base.question,
    context: draft.context ?? base.context,
    given: draft.given ?? base.given,
    expected: draft.expected.length ? draft.expected : base.expected,
    explanation: userExplanation ? base.explanation : (draft.explanation ?? base.explanation),
    explanationSource: userExplanation ? base.explanationSource : draft.explanation ? 'auto' : base.explanationSource,
    skill: draft.skill,
    part: draft.part ?? base.part,
    category: userCategory ? base.category : (draft.category ?? base.category),
    subcategory: userCategory ? base.subcategory : (draft.subcategory ?? base.subcategory),
    categorySource: userCategory ? 'user' : draft.category ? (draft.categorySource ?? 'auto') : base.categorySource,
    autoCheck: draft.autoCheck ?? base.autoCheck,
    ref: draft.ref.kind === 'exam' || draft.ref.kind === 'attempt' ? draft.ref : base.ref,
    lastAt: at > base.lastAt ? at : base.lastAt,
    fails: base.fails + 1,
    occurrences: [occurrence, ...base.occurrences].slice(0, MAX_OCCURRENCES),
    // Volver a fallar: deja de estar dominado y, si lo habías borrado, vuelve al cuaderno.
    mastered: false,
    masteredAt: undefined,
    deleted: false,
    review: draft.ownReview ? failedState(base.review, today, new Date(at)) : base.review,
    updatedAt: at
  }
  return { doc: { ...doc, records: { ...doc.records, [next.id]: next }, updatedAt: at }, created: !prev || !!prev.deleted, changed: true }
}

/** Acierto posterior (en una hoja, un examen o un repaso). Devuelve si con él queda dominado. */
export function recordSuccess(doc: NotebookDoc, id: string, occurrence: string, at: string, today: string, opts: { advanceOwnReview: boolean; masteredExternally?: boolean }): { doc: NotebookDoc; mastered: boolean; changed: boolean } {
  const prev = doc.records[id]
  if (!prev || prev.deleted || prev.occurrences.includes(occurrence)) return { doc, mastered: false, changed: false }
  let review = prev.review
  let mastered = !!prev.mastered
  let justMastered = false
  if (opts.advanceOwnReview && review) {
    const next = answerReview(review, true, today, new Date(at))
    if (next) review = next
    else {
      review = undefined
      if (!mastered) justMastered = true
      mastered = true
    }
  }
  if (opts.masteredExternally && !mastered) {
    mastered = true
    justMastered = true
  }
  const next: ErrorRecord = {
    ...prev,
    successes: prev.successes + 1,
    occurrences: [occurrence, ...prev.occurrences].slice(0, MAX_OCCURRENCES),
    review,
    mastered,
    masteredAt: justMastered ? at : prev.masteredAt,
    updatedAt: at
  }
  return { doc: { ...doc, records: { ...doc.records, [id]: next }, updatedAt: at }, mastered: justMastered, changed: true }
}

/** Repaso manual (autoevaluación) de un error sin corrección automática. */
export function recordSelfReview(doc: NotebookDoc, id: string, knew: boolean, occurrence: string, at: string, today: string): { doc: NotebookDoc; mastered: boolean; changed: boolean } {
  const prev = doc.records[id]
  if (!prev) return { doc, mastered: false, changed: false }
  if (knew) return recordSuccess(doc, id, occurrence, at, today, { advanceOwnReview: true })
  if (prev.occurrences.includes(occurrence)) return { doc, mastered: false, changed: false }
  const next: ErrorRecord = {
    ...prev,
    fails: prev.fails + 1,
    lastAt: at,
    occurrences: [occurrence, ...prev.occurrences].slice(0, MAX_OCCURRENCES),
    review: failedState(prev.review, today, new Date(at)),
    mastered: false,
    masteredAt: undefined,
    updatedAt: at
  }
  return { doc: { ...doc, records: { ...doc.records, [id]: next }, updatedAt: at }, mastered: false, changed: true }
}

export type ErrorPatch = Partial<Pick<ErrorRecord, 'favorite' | 'notes' | 'category' | 'subcategory' | 'explanation' | 'deleted' | 'question' | 'context' | 'expected' | 'given'>>

/** Cambios hechos a mano (categoría, explicación, notas, favorito, borrar). */
export function patchError(doc: NotebookDoc, id: string, patch: ErrorPatch, at: string): NotebookDoc {
  const prev = doc.records[id]
  if (!prev) return doc
  const next: ErrorRecord = { ...prev, ...patch, updatedAt: at }
  if ('category' in patch) {
    next.category = isCompetencyId(patch.category) ? patch.category : undefined
    next.categorySource = 'user'
    if (next.category && competency(next.category)) next.skill = competency(next.category)!.skill
  }
  if ('explanation' in patch) next.explanationSource = 'user'
  if (typeof next.notes === 'string') next.notes = next.notes.slice(0, 2000)
  return { ...doc, records: { ...doc.records, [id]: next }, updatedAt: at }
}

/** Error escrito a mano o importado (con estado Leitner propio). */
export function addManualError(doc: NotebookDoc, input: { id: string; skill: StudySkill; question?: string; context?: string; given?: string; expected: string[]; explanation?: string; category?: string; notes?: string; source?: 'manual' | 'ai' }, at: string, today: string): NotebookDoc {
  const draft: ErrorDraft = {
    id: input.id,
    source: input.source ?? 'manual',
    ref: { kind: 'none' },
    question: input.question?.trim() || undefined,
    context: input.context?.trim() || undefined,
    given: input.given?.trim() || undefined,
    expected: input.expected.map((e) => e.trim()).filter(Boolean),
    explanation: input.explanation?.trim() || undefined,
    skill: input.skill,
    category: isCompetencyId(input.category) ? input.category : undefined,
    categorySource: isCompetencyId(input.category) ? 'user' : undefined,
    ownReview: true,
    autoCheck: false
  }
  let next = recordFailure(doc, draft, `manual:${input.id}`, at, today).doc
  if (input.notes) next = patchError(next, input.id, { notes: input.notes }, at)
  if (draft.category) next.records[input.id] = { ...next.records[input.id], categorySource: 'user' }
  return next
}

// ---------- Estado ----------

export interface StatusContext {
  today: string
  /** Estado Leitner de las preguntas de hojas (clave = id del error). */
  sheetReview: Map<string, ReviewState>
}

/** Estado Leitner vigente de un error (el de la hoja o el propio). */
export function reviewStateOf(r: ErrorRecord, ctx: StatusContext): ReviewState | undefined {
  return r.ref.kind === 'sheet' ? ctx.sheetReview.get(r.id) : r.review
}

export function isRecurring(r: ErrorRecord): boolean {
  return r.fails >= RECURRING_FAILS || (r.fails >= 2 && r.successes >= 1)
}

export function errorStatus(r: ErrorRecord, ctx: StatusContext): ErrorStatus {
  if (r.mastered) return 'mastered'
  const rv = reviewStateOf(r, ctx)
  if (rv && rv.due <= ctx.today) return 'due'
  if (isRecurring(r)) return 'recurring'
  if (r.successes === 0 && r.fails === 1 && r.firstAt.slice(0, 10) >= addDays(ctx.today, -2)) return 'new'
  // Una pregunta de hoja que ya no está en el repaso (se dominó en una versión anterior o se borró el progreso).
  if (r.ref.kind === 'sheet' && !rv && r.successes > 0) return 'mastered'
  return 'learning'
}

export function nextReviewDate(r: ErrorRecord, ctx: StatusContext): string | null {
  if (r.mastered) return null
  return reviewStateOf(r, ctx)?.due ?? null
}

export function activeErrors(doc: NotebookDoc): ErrorRecord[] {
  return Object.values(doc.records).filter((r) => !r.deleted)
}

// ---------- Búsqueda, filtros y orden ----------

export type ErrorSort = 'recent' | 'oldest' | 'fails' | 'due' | 'category'

export interface ErrorFilter {
  query?: string
  skills?: StudySkill[]
  categories?: string[]
  statuses?: ErrorStatus[]
  sources?: ErrorSource[]
  /** Frecuencia: mínimo de fallos. */
  minFails?: number
  favorites?: boolean
  /** Solo los de un examen concreto. */
  examId?: string
}

function haystack(r: ErrorRecord): string {
  return [r.question, r.context, r.given, r.expected.join(' '), r.explanation, r.notes, competency(r.category)?.label, r.subcategory].filter(Boolean).join(' \u0001 ')
}

export function filterErrors(records: ErrorRecord[], f: ErrorFilter, ctx: StatusContext): ErrorRecord[] {
  const q = f.query?.trim() ?? ''
  const out: Array<{ r: ErrorRecord; score: number }> = []
  for (const r of records) {
    if (r.deleted) continue
    if (f.skills?.length && !f.skills.includes(r.skill)) continue
    if (f.categories?.length && !(r.category && f.categories.includes(r.category))) continue
    if (f.sources?.length && !f.sources.includes(r.source)) continue
    if (f.minFails && r.fails < f.minFails) continue
    if (f.favorites && !r.favorite) continue
    if (f.examId && !(r.ref.kind === 'exam' && r.ref.examId === f.examId)) continue
    if (f.statuses?.length) {
      const st = errorStatus(r, ctx)
      const ok = f.statuses.includes(st) || (f.statuses.includes('recurring') && !r.mastered && isRecurring(r))
      if (!ok) continue
    }
    let score = 0
    if (q) {
      score = fuzzyScore(q, haystack(r))
      if (score <= 0) continue
    }
    out.push({ r, score })
  }
  if (q) out.sort((a, b) => b.score - a.score)
  return out.map((x) => x.r)
}

export function sortErrors(records: ErrorRecord[], sort: ErrorSort, ctx: StatusContext): ErrorRecord[] {
  const copy = records.slice()
  switch (sort) {
    case 'recent':
      return copy.sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    case 'oldest':
      return copy.sort((a, b) => a.firstAt.localeCompare(b.firstAt))
    case 'fails':
      return copy.sort((a, b) => b.fails - a.fails || b.lastAt.localeCompare(a.lastAt))
    case 'due':
      return copy.sort((a, b) => (nextReviewDate(a, ctx) ?? '9999').localeCompare(nextReviewDate(b, ctx) ?? '9999') || b.fails - a.fails)
    case 'category':
      return copy.sort((a, b) => (competency(a.category)?.label ?? '~').localeCompare(competency(b.category)?.label ?? '~') || b.lastAt.localeCompare(a.lastAt))
  }
}

export interface NotebookSummary {
  total: number
  byStatus: Record<ErrorStatus, number>
  bySkill: Record<StudySkill, number>
  due: number
  recurring: number
  today: number
}

export function notebookSummary(records: ErrorRecord[], ctx: StatusContext): NotebookSummary {
  const byStatus = { new: 0, learning: 0, due: 0, recurring: 0, mastered: 0 } as Record<ErrorStatus, number>
  const bySkill = Object.fromEntries(STUDY_SKILLS.map((s) => [s, 0])) as Record<StudySkill, number>
  let total = 0
  let recurring = 0
  let today = 0
  for (const r of records) {
    if (r.deleted) continue
    total++
    byStatus[errorStatus(r, ctx)]++
    bySkill[r.skill]++
    if (!r.mastered && isRecurring(r)) recurring++
    if (r.lastAt.slice(0, 10) === ctx.today || localDayOf(r.lastAt) === ctx.today) today++
  }
  return { total, byStatus, bySkill, due: byStatus.due, recurring, today }
}

function localDayOf(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---------- Sesiones de repaso ----------

export type ReviewSessionKind = 'due' | 'today' | 'recurring' | 'competency' | 'exam' | 'old' | 'custom'

export interface ReviewSessionSpec {
  kind: ReviewSessionKind
  /** Competencia (kind = competency) o examen (kind = exam). */
  value?: string
  /** Errores elegidos a mano (kind = custom). */
  ids?: string[]
}

/** Errores de una sesión de repaso, en el orden en que se repasan (como mucho `size`). */
export function selectSessionErrors(records: ErrorRecord[], spec: ReviewSessionSpec, ctx: StatusContext, size = 15): ErrorRecord[] {
  const live = records.filter((r) => !r.deleted && !r.mastered)
  let pool: ErrorRecord[]
  switch (spec.kind) {
    case 'due':
      pool = live.filter((r) => {
        const rv = reviewStateOf(r, ctx)
        return rv && rv.due <= ctx.today
      })
      break
    case 'today':
      pool = live.filter((r) => localDayOf(r.lastAt) === ctx.today)
      break
    case 'recurring':
      pool = live.filter(isRecurring).sort((a, b) => b.fails - a.fails)
      break
    case 'competency':
      pool = live.filter((r) => r.category === spec.value)
      break
    case 'exam':
      pool = live.filter((r) => r.ref.kind === 'exam' && r.ref.examId === spec.value)
      break
    case 'old': {
      const limit = addDays(ctx.today, -21)
      pool = live.filter((r) => r.lastAt.slice(0, 10) < limit).sort((a, b) => a.lastAt.localeCompare(b.lastAt))
      break
    }
    case 'custom': {
      const ids = new Set(spec.ids ?? [])
      pool = records.filter((r) => ids.has(r.id) && !r.deleted)
      break
    }
  }
  if (spec.kind !== 'recurring' && spec.kind !== 'old') {
    pool = pool.slice().sort((a, b) => (reviewStateOf(a, ctx)?.due ?? a.lastAt).localeCompare(reviewStateOf(b, ctx)?.due ?? b.lastAt) || b.fails - a.fails)
  }
  return pool.slice(0, size)
}

// ---------- Exportación ----------

function csvCell(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportErrorsCsv(records: ErrorRecord[], ctx: StatusContext): string {
  const head = ['id', 'source', 'skill', 'part', 'category', 'subcategory', 'question', 'context', 'your_answer', 'correct_answers', 'explanation', 'fails', 'successes', 'status', 'first_error', 'last_error', 'next_review', 'favorite', 'notes']
  const rows = records.map((r) => [r.id, r.source, r.skill, r.part, competency(r.category)?.label ?? '', r.subcategory, r.question, r.context, r.given, r.expected.join(' / '), r.explanation, r.fails, r.successes, errorStatus(r, ctx), r.firstAt, r.lastAt, nextReviewDate(r, ctx) ?? '', r.favorite ? 'yes' : '', r.notes].map(csvCell).join(','))
  // BOM: Excel abre el CSV con tildes correctas.
  return '﻿' + [head.join(','), ...rows].join('\n') + '\n'
}

export function exportErrorsMarkdown(records: ErrorRecord[]): string {
  const lines = ['# Mis errores · B2 First Trainer', '']
  for (const r of records) {
    lines.push(`## ${r.question ?? competency(r.category)?.label ?? 'Error'}`)
    if (r.context) lines.push('', `> ${r.context.replace(/\n/g, ' ')}`)
    lines.push('', `- ✗ ${r.given || '(sin respuesta)'}`, `- ✓ ${r.expected.join(' / ') || '—'}`)
    if (r.explanation) lines.push(`- ${r.explanation}`)
    if (r.category) lines.push(`- ${competency(r.category)?.label}${r.subcategory ? ` · ${r.subcategory}` : ''}`)
    lines.push(`- Fallos: ${r.fails} · Aciertos después: ${r.successes}`)
    if (r.notes) lines.push(`- Notas: ${r.notes}`)
    lines.push('')
  }
  return lines.join('\n')
}

// ---------- Validación y fusión (copias en conflicto de carpetas sincronizadas) ----------

const str = (v: unknown, max = 4000): string | undefined => (typeof v === 'string' && v.trim() ? v.slice(0, max) : undefined)
const isoOr = (v: unknown, fallback: string): string => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : fallback)

function parseReview(v: unknown): ReviewState | undefined {
  if (!v || typeof v !== 'object') return undefined
  const r = v as Partial<ReviewState>
  if (typeof r.box !== 'number' || typeof r.due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.due)) return undefined
  return { box: Math.max(0, Math.min(3, Math.round(r.box))), due: r.due, lapses: typeof r.lapses === 'number' ? Math.max(0, Math.round(r.lapses)) : 1, addedAt: isoOr(r.addedAt, new Date(0).toISOString()), ...(typeof r.lastAt === 'string' ? { lastAt: r.lastAt } : {}) }
}

function parseRef(v: unknown): ErrorRef {
  const r = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  if (r.kind === 'sheet' && typeof r.sheetId === 'string' && typeof r.key === 'string') return { kind: 'sheet', sheetId: r.sheetId, key: r.key }
  if (r.kind === 'exam' && typeof r.examId === 'string' && typeof r.paperId === 'string' && typeof r.questionId === 'string') return { kind: 'exam', examId: r.examId, paperId: r.paperId, questionId: r.questionId, attemptId: typeof r.attemptId === 'string' ? r.attemptId : '' }
  if (r.kind === 'attempt' && typeof r.attemptId === 'string' && typeof r.questionId === 'string') return { kind: 'attempt', attemptId: r.attemptId, questionId: r.questionId }
  return { kind: 'none' }
}

export function parseErrorRecord(v: unknown): ErrorRecord | null {
  if (!v || typeof v !== 'object') return null
  const r = v as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id || r.id.length > 300) return null
  const now = new Date(0).toISOString()
  const source = ERROR_SOURCES.includes(r.source as ErrorSource) ? (r.source as ErrorSource) : 'manual'
  const skill = STUDY_SKILLS.includes(r.skill as StudySkill) ? (r.skill as StudySkill) : 'useOfEnglish'
  return {
    id: r.id,
    source,
    ref: parseRef(r.ref),
    question: str(r.question),
    context: str(r.context, 8000),
    given: str(r.given),
    expected: Array.isArray(r.expected) ? r.expected.filter((x): x is string => typeof x === 'string').slice(0, 20) : [],
    explanation: str(r.explanation),
    skill,
    part: str(r.part, 40),
    category: isCompetencyId(r.category) ? r.category : undefined,
    subcategory: str(r.subcategory, 80),
    categorySource: r.categorySource === 'user' || r.categorySource === 'ai' || r.categorySource === 'auto' ? r.categorySource : undefined,
    explanationSource: r.explanationSource === 'user' || r.explanationSource === 'ai' || r.explanationSource === 'auto' ? r.explanationSource : undefined,
    firstAt: isoOr(r.firstAt, now),
    lastAt: isoOr(r.lastAt, now),
    fails: typeof r.fails === 'number' && r.fails >= 0 ? Math.round(r.fails) : 1,
    successes: typeof r.successes === 'number' && r.successes >= 0 ? Math.round(r.successes) : 0,
    occurrences: Array.isArray(r.occurrences) ? r.occurrences.filter((x): x is string => typeof x === 'string').slice(0, MAX_OCCURRENCES) : [],
    review: parseReview(r.review),
    autoCheck: r.autoCheck === true ? true : undefined,
    mastered: r.mastered === true ? true : undefined,
    masteredAt: typeof r.masteredAt === 'string' ? r.masteredAt : undefined,
    favorite: r.favorite === true ? true : undefined,
    notes: str(r.notes, 2000),
    deleted: r.deleted === true ? true : undefined,
    updatedAt: isoOr(r.updatedAt, now)
  }
}

function parseLesson(v: unknown): Lesson | null {
  if (!v || typeof v !== 'object') return null
  const l = v as Record<string, unknown>
  if (typeof l.id !== 'string' || typeof l.title !== 'string' || !Array.isArray(l.sections)) return null
  const now = new Date(0).toISOString()
  return {
    id: l.id,
    title: l.title.slice(0, 160),
    sections: l.sections
      .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
      .map((s) => ({ heading: String(s.heading ?? '').slice(0, 160), text: String(s.text ?? '').slice(0, 6000), examples: Array.isArray(s.examples) ? s.examples.map(String).slice(0, 12) : [] }))
      .slice(0, 12),
    errorIds: Array.isArray(l.errorIds) ? l.errorIds.filter((x): x is string => typeof x === 'string').slice(0, 50) : [],
    createdAt: isoOr(l.createdAt, now),
    updatedAt: isoOr(l.updatedAt, now),
    deleted: l.deleted === true ? true : undefined
  }
}

export function parseNotebook(raw: unknown): NotebookDoc {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const records: Record<string, ErrorRecord> = {}
  const src = r.records && typeof r.records === 'object' ? (r.records as Record<string, unknown>) : {}
  for (const v of Object.values(src)) {
    const rec = parseErrorRecord(v)
    if (rec) records[rec.id] = rec
  }
  const lessons: Record<string, Lesson> = {}
  const ls = r.lessons && typeof r.lessons === 'object' ? (r.lessons as Record<string, unknown>) : {}
  for (const v of Object.values(ls)) {
    const l = parseLesson(v)
    if (l) lessons[l.id] = l
  }
  return { schemaVersion: NOTEBOOK_VERSION, records, lessons, updatedAt: isoOr(r.updatedAt, new Date(0).toISOString()) }
}

/** Fusión de dos copias: por registro, gana el modificado más tarde. Conmutativa e idempotente. */
export function mergeNotebooks(a: NotebookDoc, b: NotebookDoc): NotebookDoc {
  const records: Record<string, ErrorRecord> = { ...a.records }
  for (const [id, rb] of Object.entries(b.records)) {
    const ra = records[id]
    records[id] = !ra || rb.updatedAt > ra.updatedAt || (rb.updatedAt === ra.updatedAt && JSON.stringify(rb) > JSON.stringify(ra)) ? rb : ra
  }
  const lessons: Record<string, Lesson> = { ...a.lessons }
  for (const [id, lb] of Object.entries(b.lessons)) {
    const la = lessons[id]
    lessons[id] = !la || lb.updatedAt > la.updatedAt ? lb : la
  }
  return { schemaVersion: NOTEBOOK_VERSION, records, lessons, updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt }
}
