// Eventos de dominio y su procesamiento (puro y determinista).
//
// Flujo de un evento (p. ej. PRACTICE_COMPLETED):
//   cuaderno de errores (fallos y aciertos) → repaso → actividad y competencias → XP (con anti-repetición)
//   → plan (actividad hecha, sesión completada) → logros → nivel → misiones.
// Cada efecto persistente tiene una clave estable: procesar dos veces el mismo evento no duplica nada.
// Los eventos derivados (XP_EARNED, LEVEL_UP, ACHIEVEMENT_UNLOCKED…) se devuelven para la interfaz
// (Bubi, avisos) y el bucle está acotado: no puede entrar en una cadena infinita.
import type { AttemptMode, PaperType } from '../types'
import type { PracticeSkill } from '../practice'
import { localDay } from '../practice'
import {
  addActivity,
  grantXp,
  levelInfo,
  totalXp,
  useFlag,
  XP_REWARDS,
  type ActivityEntry,
  type GameDoc,
  type XpReason
} from './game'
import {
  activeErrors,
  addManualError,
  isRecurring,
  recordFailure,
  recordSelfReview,
  recordSuccess,
  type ErrorDraft,
  type NotebookDoc,
  type ReviewSessionSpec
} from './notebook'
import type { PlanDoc, PlanActivity } from './plan'
import { markDone } from './engine'
import { ACHIEVEMENT_BY_ID, achievementXp, newlyUnlocked, type LearnerStats } from './achievements'
import { computeStreaks } from './streaks'
import { unlockedCosmetics } from './cosmetics'
import { buildMission } from './missions'
import type { StudySkill } from './taxonomy'
import { competency } from './taxonomy'

export interface ItemOutcome {
  errorId: string
  ok: boolean
  part?: string
  category?: string
  /** Pregunta de hoja: sigue en el repaso (Leitner) después de esta comprobación. */
  inReview?: boolean
  /** Datos del error si se ha fallado. */
  draft?: ErrorDraft
}

interface Base {
  /** Identificador estable (idempotencia). */
  id: string
  at: string
  /** Inicialización con el historial anterior: sin celebraciones. */
  retro?: boolean
}

export type DomainEvent =
  | (Base & { type: 'PRACTICE_COMPLETED'; sheetId: string; title: string; practiceSkill: PracticeSkill; skill: StudySkill; minutes: number; correct: number; total: number; times: number; prevBest?: number; items: ItemOutcome[] })
  | (Base & { type: 'EXAM_COMPLETED'; attemptId: string; examId: string; paperId: string; paperType: PaperType; partIds: string[]; mode: AttemptMode; full: boolean; percent: number | null; graded: number; minutes: number; items: ItemOutcome[] })
  | (Base & { type: 'ANSWER_INCORRECT'; errorId: string; occurrence: string; created: boolean })
  | (Base & { type: 'REVIEW_ANSWERED'; errorId: string; correct: boolean; /** Pregunta de hoja: lo decide su Leitner. */ sheetMastered?: boolean; draft?: ErrorDraft })
  | (Base & { type: 'REVIEW_COMPLETED'; session: ReviewSessionSpec; answered: number; correct: number; mastered: number; minutes: number })
  | (Base & { type: 'ERROR_MASTERED'; errorId: string; recurring: boolean })
  | (Base & { type: 'ERROR_ADDED'; input: Parameters<typeof addManualError>[1] })
  | (Base & { type: 'AI_FEEDBACK_IMPORTED'; key: string; attemptId: string; questionId: string; paperType: PaperType; errors: ErrorDraft[] })
  | (Base & { type: 'XP_EARNED'; amount: number; reason: XpReason; ref?: string })
  | (Base & { type: 'LEVEL_UP'; from: number; to: number })
  | (Base & { type: 'ACHIEVEMENT_UNLOCKED'; achievementId: string })
  | (Base & { type: 'STUDY_SESSION_COMPLETED'; date: string; minutes: number })
  | (Base & { type: 'PLAN_ACTIVITY_COMPLETED'; date: string; activityId: string })
  | (Base & { type: 'STUDY_PLAN_UPDATED'; reason: 'config' | 'replan' | 'move' | 'replace' })
  | (Base & { type: 'MISSION_COMPLETED'; missionId: string; xp: number })
  | (Base & { type: 'FEATURE_USED'; feature: string })

export type DomainEventType = DomainEvent['type']

export interface LearningState {
  notebook: NotebookDoc
  game: GameDoc
  plan: PlanDoc
}

/** Datos externos necesarios para evaluar logros (vienen de la app). */
export interface ProcessContext {
  today: string
  /** Días con práctica según el progreso de las hojas (incluye historial anterior a 2.0). */
  practiceDays: string[]
  /** Preguntas dominadas según el progreso de las hojas (contador anterior a 2.0). */
  legacyMastered: number
  customSheets: number
  readinessReached: boolean
}

// ---------- Utilidades ----------

function dayOf(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? localDay() : localDay(d)
}

function tally(items: ItemOutcome[], key: 'part' | 'category'): Record<string, [number, number]> | undefined {
  const out: Record<string, [number, number]> = {}
  for (const it of items) {
    const k = it[key]
    if (!k) continue
    const v = out[k] ?? [0, 0]
    out[k] = [v[0] + (it.ok ? 1 : 0), v[1] + 1]
  }
  return Object.keys(out).length ? out : undefined
}

function xp(state: LearningState, emitted: DomainEvent[], key: string, amount: number, reason: XpReason, at: string, retro: boolean | undefined, ref?: string): LearningState {
  const r = grantXp(state.game, key, { xp: amount, reason, at, ...(ref ? { ref } : {}), ...(retro ? { retro: true } : {}) })
  if (!r.granted) return state
  emitted.push({ type: 'XP_EARNED', id: `xp:${key}`, at, retro, amount, reason, ref })
  return { ...state, game: r.doc }
}

function processed(state: LearningState, key: string, value: string): LearningState {
  return { ...state, game: { ...state.game, processed: { ...state.game.processed, [key]: value } } }
}

/** Marca actividades del plan de ese día como hechas (solo eventos en vivo, el día de la sesión). */
function planMatch(state: LearningState, emitted: DomainEvent[], e: DomainEvent, match: (a: PlanActivity) => boolean): LearningState {
  if (e.retro) return state
  const day = dayOf(e.at)
  const session = state.plan.sessions[day]
  if (!session) return state
  const r = markDone(session, match, e.at)
  if (!r.changed.length) return state
  for (const id of r.changed) emitted.push({ type: 'PLAN_ACTIVITY_COMPLETED', id: `plan-act:${id}`, at: e.at, date: day, activityId: id })
  let next: LearningState = { ...state, plan: { ...state.plan, sessions: { ...state.plan.sessions, [day]: r.session }, updatedAt: e.at } }
  if (r.completed) {
    const minutes = r.session.activities.reduce((n: number, a: PlanActivity) => n + a.minutes, 0)
    emitted.push({ type: 'STUDY_SESSION_COMPLETED', id: `plan-session:${day}`, at: e.at, date: day, minutes })
    next = { ...next }
  }
  return next
}

// ---------- Manejadores ----------

function onPractice(state: LearningState, e: Extract<DomainEvent, { type: 'PRACTICE_COMPLETED' }>, emitted: DomainEvent[]): LearningState {
  const day = dayOf(e.at)
  let s = state
  let errors = 0
  let mastered = 0
  // 1. Cuaderno: fallos (con su ocurrencia) y aciertos de preguntas que ya estaban en el cuaderno.
  for (const it of e.items) {
    if (!it.ok && it.draft) {
      const r = recordFailure(s.notebook, it.draft, e.id, e.at, day)
      if (r.changed) {
        s = { ...s, notebook: r.doc }
        errors++
        emitted.push({ type: 'ANSWER_INCORRECT', id: `wrong:${it.errorId}@${e.id}`, at: e.at, retro: e.retro, errorId: it.errorId, occurrence: e.id, created: r.created })
      }
    } else if (it.ok && s.notebook.records[it.errorId]) {
      // La hoja ya actualiza su Leitner al comprobarla; si la pregunta ha salido del repaso, está dominada.
      const rec = s.notebook.records[it.errorId]
      const r = recordSuccess(s.notebook, it.errorId, e.id, e.at, day, { advanceOwnReview: false, masteredExternally: !e.retro && it.inReview === false })
      if (r.changed) s = { ...s, notebook: r.doc }
      if (r.mastered) {
        mastered++
        emitted.push({ type: 'ERROR_MASTERED', id: `mastered:${it.errorId}@${e.id}`, at: e.at, retro: e.retro, errorId: it.errorId, recurring: isRecurring(rec) })
      }
    }
  }
  // 2. Actividad y récord.
  const prevBest = e.prevBest
  const record = !e.retro && prevBest !== undefined && e.correct > prevBest
  const first = e.times <= 1 && prevBest === undefined
  const entry: ActivityEntry = {
    id: e.id,
    kind: 'sheet',
    at: e.at,
    day,
    skill: e.skill,
    practiceSkill: e.practiceSkill,
    minutes: e.minutes,
    correct: e.correct,
    total: e.total,
    percent: e.total ? Math.round((e.correct / e.total) * 100) : null,
    ref: e.sheetId,
    parts: tally(e.items, 'part'),
    comp: tally(e.items, 'category'),
    ...(e.total > 0 && e.correct === e.total ? { perfect: true } : {}),
    ...(record ? { record: true } : {}),
    ...(first ? { first: true } : {}),
    ...(mastered ? { mastered } : {}),
    ...(errors ? { errors } : {}),
    ...(e.retro ? { retro: true } : {})
  }
  s = { ...s, game: addActivity(s.game, entry) }
  // 3. XP: primera vez, mejora o repetición (limitada).
  const best = Math.max(prevBest ?? 0, e.correct)
  if (prevBest === undefined) s = xp(s, emitted, `sheet:${e.sheetId}`, XP_REWARDS.sheetCompleted, 'sheet', e.at, e.retro, e.sheetId)
  else if (e.correct > prevBest) {
    s = xp(s, emitted, `sheet-improved:${e.sheetId}:${e.correct}`, XP_REWARDS.sheetImproved, 'sheetImproved', e.at, e.retro, e.sheetId)
    s = xp(s, emitted, `record:sheet:${e.sheetId}:${e.correct}`, XP_REWARDS.personalRecord, 'record', e.at, e.retro, e.sheetId)
  } else s = xp(s, emitted, `sheet-repeat:${e.sheetId}:${day}`, XP_REWARDS.sheetRepeat, 'sheetRepeat', e.at, e.retro, e.sheetId)
  s = processed(s, `sheet:${e.sheetId}`, e.at)
  s = processed(s, `best:${e.sheetId}`, String(best))
  // 4. Plan.
  return planMatch(s, emitted, e, (a) => a.target.kind === 'sheet' && a.target.sheetId === e.sheetId)
}

function onExam(state: LearningState, e: Extract<DomainEvent, { type: 'EXAM_COMPLETED' }>, emitted: DomainEvent[]): LearningState {
  const day = dayOf(e.at)
  let s = state
  let errors = 0
  let mastered = 0
  for (const it of e.items) {
    if (!it.ok && it.draft) {
      const r = recordFailure(s.notebook, it.draft, e.id, e.at, day)
      if (r.changed) {
        s = { ...s, notebook: r.doc }
        errors++
        emitted.push({ type: 'ANSWER_INCORRECT', id: `wrong:${it.errorId}@${e.id}`, at: e.at, retro: e.retro, errorId: it.errorId, occurrence: e.id, created: r.created })
      }
    } else if (it.ok && s.notebook.records[it.errorId]) {
      const rec = s.notebook.records[it.errorId]
      // Acertar una pregunta de examen que tocaba repasar la hace avanzar en su Leitner.
      const due = !!rec.review && rec.review.due <= day
      const r = recordSuccess(s.notebook, it.errorId, e.id, e.at, day, { advanceOwnReview: due })
      if (r.changed) s = { ...s, notebook: r.doc }
      if (r.mastered) {
        mastered++
        emitted.push({ type: 'ERROR_MASTERED', id: `mastered:${it.errorId}@${e.id}`, at: e.at, retro: e.retro, errorId: it.errorId, recurring: isRecurring(rec) })
      }
    }
  }
  const prevBestRaw = s.game.processed[`bestExam:${e.paperId}`]
  const prevBest = prevBestRaw !== undefined ? Number(prevBestRaw) : undefined
  const record = !e.retro && e.mode !== 'review' && e.percent !== null && prevBest !== undefined && e.percent > prevBest
  const skill: StudySkill = e.paperType === 'reading' ? (e.items.some((i) => i.part && Number(i.part.split('.p')[1]) >= 5) ? 'reading' : 'useOfEnglish') : e.paperType
  s = {
    ...s,
    game: addActivity(s.game, {
      id: e.id,
      kind: 'exam',
      at: e.at,
      day,
      skill,
      paperType: e.paperType,
      mode: e.mode,
      ...(e.full ? { full: true } : {}),
      examId: e.examId,
      paperId: e.paperId,
      minutes: e.minutes,
      correct: e.items.filter((i) => i.ok).length,
      total: e.graded,
      percent: e.percent,
      ref: e.attemptId,
      parts: tally(e.items, 'part'),
      comp: tally(e.items, 'category'),
      ...(record ? { record: true } : {}),
      ...(mastered ? { mastered } : {}),
      ...(errors ? { errors } : {}),
      ...(e.retro ? { retro: true } : {})
    })
  }
  // XP: el primer paper/partes de cada día vale entero; repetir el mismo ese día, poco.
  if (e.mode === 'review') s = xp(s, emitted, `exam:${e.attemptId}`, XP_REWARDS.examReview, 'examReview', e.at, e.retro, e.attemptId)
  else {
    const dayKey = `examDay:${e.paperId}:${e.full ? 'full' : e.partIds.slice().sort().join('+')}:${day}`
    if (!s.game.ledger[dayKey]) s = xp(s, emitted, dayKey, e.full ? XP_REWARDS.examPaper : XP_REWARDS.examPart, e.full ? 'exam' : 'examPart', e.at, e.retro, e.attemptId)
    else s = xp(s, emitted, `exam:${e.attemptId}`, XP_REWARDS.examReview, 'examReview', e.at, e.retro, e.attemptId)
    if (record) s = xp(s, emitted, `record:exam:${e.paperId}:${Math.round(e.percent ?? 0)}`, XP_REWARDS.personalRecord, 'record', e.at, e.retro, e.attemptId)
    if (e.percent !== null && (prevBest === undefined || e.percent > prevBest)) s = processed(s, `bestExam:${e.paperId}`, String(e.percent))
  }
  s = processed(s, `attempt:${e.attemptId}`, e.at)
  const parts = new Set(e.partIds)
  return planMatch(s, emitted, e, (a) => a.target.kind === 'exam' && a.target.paperId === e.paperId && (a.target.partIds.length === 0 || a.target.partIds.some((p) => parts.has(p))))
}

function onReviewAnswered(state: LearningState, e: Extract<DomainEvent, { type: 'REVIEW_ANSWERED' }>, emitted: DomainEvent[]): LearningState {
  const day = dayOf(e.at)
  let s = state
  let rec = s.notebook.records[e.errorId]
  if (!rec && e.draft) {
    // Pregunta en repaso de antes de 2.0 que no estaba en el cuaderno: se añade con su historial mínimo.
    s = { ...s, notebook: recordFailure(s.notebook, e.draft, `legacy:${e.errorId}`, e.at, day).doc }
    rec = s.notebook.records[e.errorId]
  }
  if (!rec) return s
  const isSheet = rec.ref.kind === 'sheet'
  if (isSheet) {
    if (e.correct) {
      const r = recordSuccess(s.notebook, e.errorId, e.id, e.at, day, { advanceOwnReview: false, masteredExternally: !!e.sheetMastered })
      s = { ...s, notebook: r.doc }
      if (r.mastered) emitted.push({ type: 'ERROR_MASTERED', id: `mastered:${e.errorId}@${e.id}`, at: e.at, retro: e.retro, errorId: e.errorId, recurring: isRecurring(rec) })
    } else {
      const draft: ErrorDraft = e.draft ?? { id: rec.id, source: rec.source, ref: rec.ref, expected: rec.expected, skill: rec.skill, ownReview: false }
      s = { ...s, notebook: recordFailure(s.notebook, draft, e.id, e.at, day).doc }
    }
  } else {
    const r = recordSelfReview(s.notebook, e.errorId, e.correct, e.id, e.at, day)
    s = { ...s, notebook: r.doc }
    if (r.mastered) emitted.push({ type: 'ERROR_MASTERED', id: `mastered:${e.errorId}@${e.id}`, at: e.at, retro: e.retro, errorId: e.errorId, recurring: isRecurring(rec) })
  }
  return s
}

function onReviewCompleted(state: LearningState, e: Extract<DomainEvent, { type: 'REVIEW_COMPLETED' }>, emitted: DomainEvent[]): LearningState {
  if (e.answered <= 0) return state
  const day = dayOf(e.at)
  let s: LearningState = {
    ...state,
    game: addActivity(state.game, { id: e.id, kind: 'review', at: e.at, day, minutes: e.minutes, correct: e.correct, total: e.answered, percent: Math.round((e.correct / e.answered) * 100), ...(e.mastered ? { mastered: e.mastered } : {}), ...(e.retro ? { retro: true } : {}) })
  }
  // Una sesión de repaso cuenta si tiene sustancia (3 preguntas o todo lo que había); como mucho 3 al día.
  if (e.answered >= 3 || e.session.kind === 'custom') {
    const n = Object.keys(s.game.ledger).filter((k) => k.startsWith(`review:${day}:`)).length
    if (n < 3) s = xp(s, emitted, `review:${day}:${e.id}`, XP_REWARDS.reviewSession, 'review', e.at, e.retro)
  }
  return planMatch(s, emitted, e, (a) => a.target.kind === 'review' && ((a.target.session.kind === e.session.kind && (a.target.session.value ?? '') === (e.session.value ?? '')) || (a.kind === 'review' && e.session.kind === 'due')))
}

function onMastered(state: LearningState, e: Extract<DomainEvent, { type: 'ERROR_MASTERED' }>, emitted: DomainEvent[]): LearningState {
  // Una vez por error (si se vuelve a fallar y a dominar, no se cobra otra vez).
  let s = xp(state, emitted, `mastered:${e.errorId}`, XP_REWARDS.questionMastered, 'mastered', e.at, e.retro, e.errorId)
  if (e.recurring) s = xp(s, emitted, `recurring:${e.errorId}`, XP_REWARDS.recurringMastered, 'recurringMastered', e.at, e.retro, e.errorId)
  return s
}

function onAi(state: LearningState, e: Extract<DomainEvent, { type: 'AI_FEEDBACK_IMPORTED' }>, emitted: DomainEvent[]): LearningState {
  const day = dayOf(e.at)
  let s = state
  for (const d of e.errors) {
    const r = recordFailure(s.notebook, d, e.id, e.at, day)
    if (r.changed) {
      s = { ...s, notebook: r.doc }
      emitted.push({ type: 'ANSWER_INCORRECT', id: `wrong:${d.id}@${e.id}`, at: e.at, retro: e.retro, errorId: d.id, occurrence: e.id, created: r.created })
    }
  }
  s = { ...s, game: addActivity(s.game, { id: e.id, kind: 'aiFeedback', at: e.at, day, skill: e.paperType === 'speaking' ? 'speaking' : 'writing', paperType: e.paperType, minutes: 0, errors: e.errors.length, ref: e.attemptId, ...(e.retro ? { retro: true } : {}) }) }
  s = xp(s, emitted, `ai:${e.attemptId}:${e.questionId}`, XP_REWARDS.aiFeedback, 'aiFeedback', e.at, e.retro, e.attemptId)
  return processed(s, e.key, e.at)
}

function onSession(state: LearningState, e: Extract<DomainEvent, { type: 'STUDY_SESSION_COMPLETED' }>, emitted: DomainEvent[]): LearningState {
  let s: LearningState = { ...state, game: addActivity(state.game, { id: e.id, kind: 'planSession', at: e.at, day: e.date, minutes: 0, ...(e.retro ? { retro: true } : {}) }) }
  s = xp(s, emitted, `plan:${e.date}`, XP_REWARDS.planSession, 'plan', e.at, e.retro, e.date)
  return s
}

function applyEvent(state: LearningState, e: DomainEvent, emitted: DomainEvent[]): LearningState {
  switch (e.type) {
    case 'PRACTICE_COMPLETED':
      return onPractice(state, e, emitted)
    case 'EXAM_COMPLETED':
      return onExam(state, e, emitted)
    case 'REVIEW_ANSWERED':
      return onReviewAnswered(state, e, emitted)
    case 'REVIEW_COMPLETED':
      return onReviewCompleted(state, e, emitted)
    case 'ERROR_MASTERED':
      return onMastered(state, e, emitted)
    case 'ERROR_ADDED': {
      const day = dayOf(e.at)
      return { ...state, notebook: addManualError(state.notebook, e.input, e.at, day) }
    }
    case 'AI_FEEDBACK_IMPORTED':
      return onAi(state, e, emitted)
    case 'STUDY_SESSION_COMPLETED':
      return onSession(state, e, emitted)
    case 'MISSION_COMPLETED': {
      if (state.game.missionsDone[e.missionId]) return state
      const s = { ...state, game: { ...state.game, missionsDone: { ...state.game.missionsDone, [e.missionId]: e.at } } }
      return xp(s, emitted, `mission:${e.missionId}`, e.xp, 'mission', e.at, e.retro, e.missionId)
    }
    case 'FEATURE_USED':
      return { ...state, game: useFlag(state.game, e.feature, e.at) }
    case 'ANSWER_INCORRECT':
    case 'XP_EARNED':
    case 'LEVEL_UP':
    case 'ACHIEVEMENT_UNLOCKED':
    case 'PLAN_ACTIVITY_COMPLETED':
    case 'STUDY_PLAN_UPDATED':
      // Informativos: ya aplicados por quien los emite.
      return state
  }
}

// ---------- Estadísticas para logros ----------

export function learnerStats(state: LearningState, ctx: ProcessContext): LearnerStats {
  const acts = Object.values(state.game.activity)
  const sheetsBySkill = { vocabulary: new Set<string>(), grammar: new Set<string>(), wordFormation: new Set<string>(), reading: new Set<string>(), mixed: new Set<string>() } as Record<PracticeSkill, Set<string>>
  const distinct = new Set<string>()
  const perfect = new Set<string>()
  const partCorrect: Record<string, number> = {}
  const compCorrect: Record<string, number> = {}
  const papersDone = { reading: 0, writing: 0, listening: 0, speaking: 0 } as Record<PaperType, number>
  const examActivities = { reading: 0, writing: 0, listening: 0, speaking: 0 } as Record<PaperType, number>
  const byExam = new Map<string, Set<PaperType>>()
  const series = new Map<PaperType, number[]>()
  const minutesByDay = new Map<string, number>()
  let sheetChecks = 0
  let records = 0
  let fullMocks = 0
  let passPaper = false
  let gradeA = false
  let reviewAnswers = 0
  let reviewSessions = 0
  let aiFeedbacks = 0
  let planSessions = 0
  let nightOwl = false
  let earlyBird = false
  for (const a of acts.sort((x, y) => x.at.localeCompare(y.at))) {
    minutesByDay.set(a.day, (minutesByDay.get(a.day) ?? 0) + a.minutes)
    if (a.parts) for (const [k, [c]] of Object.entries(a.parts)) partCorrect[k] = (partCorrect[k] ?? 0) + c
    if (a.comp) for (const [k, [c]] of Object.entries(a.comp)) compCorrect[k] = (compCorrect[k] ?? 0) + c
    if (a.record) records++
    if (a.kind !== 'planSession' && a.kind !== 'aiFeedback') {
      const h = new Date(a.at).getHours()
      if (h < 5) nightOwl = true
      else if (h < 7) earlyBird = true
    }
    switch (a.kind) {
      case 'sheet':
        sheetChecks++
        if (a.ref) {
          distinct.add(a.ref)
          if (a.practiceSkill && sheetsBySkill[a.practiceSkill]) sheetsBySkill[a.practiceSkill].add(a.ref)
          if (a.perfect) perfect.add(a.ref)
        }
        break
      case 'exam':
        if (!a.paperType || a.mode === 'review') break
        examActivities[a.paperType]++
        if (a.full) {
          papersDone[a.paperType]++
          if (a.mode === 'exam') {
            fullMocks++
            if (a.examId) {
              const set = byExam.get(a.examId) ?? new Set<PaperType>()
              set.add(a.paperType)
              byExam.set(a.examId, set)
            }
          }
        }
        if (typeof a.percent === 'number') {
          const auto = a.paperType === 'reading' || a.paperType === 'listening'
          if (auto && (a.total ?? 0) >= 10 && a.percent >= 60) passPaper = true
          if (auto && (a.total ?? 0) >= 20 && a.percent >= 80) gradeA = true
          const list = series.get(a.paperType) ?? []
          list.push(a.percent)
          series.set(a.paperType, list)
        }
        break
      case 'review':
        reviewSessions++
        reviewAnswers += a.total ?? 0
        break
      case 'aiFeedback':
        aiFeedbacks++
        break
      case 'planSession':
        planSessions++
        break
    }
  }
  let paperImprovement = 0
  for (const list of series.values()) if (list.length >= 2) paperImprovement = Math.max(paperImprovement, Math.max(...list.slice(1)) - list[0])
  const days = new Set([...acts.filter((a) => a.kind !== 'planSession').map((a) => a.day), ...ctx.practiceDays])
  const sortedDays = Array.from(days).sort()
  let comeback = false
  for (let i = 1; i < sortedDays.length; i++) {
    const [y1, m1, d1] = sortedDays[i - 1].split('-').map(Number)
    const [y2, m2, d2] = sortedDays[i].split('-').map(Number)
    if ((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000 >= 8) comeback = true
  }
  const cfg = state.plan.config
  const restWeekdays = cfg ? [0, 1, 2, 3, 4, 5, 6].filter((d) => !cfg.studyDays.includes(d)) : []
  const level = levelInfo(totalXp(state.game)).level
  const live = activeErrors(state.notebook)
  const flags: Record<string, number> = {}
  for (const [k, v] of Object.entries(state.game.flags)) flags[k] = v.count
  const equipped = Object.entries(state.game.cosmetics.equipped).filter(([slot, id]) => !(slot === 'color' && id === 'classic') && !!id)
  return {
    sheetsDistinct: distinct.size,
    sheetsBySkill: Object.fromEntries(Object.entries(sheetsBySkill).map(([k, v]) => [k, v.size])) as Record<PracticeSkill, number>,
    sheetChecks,
    perfectSheets: perfect.size,
    records,
    partCorrect,
    compCorrect,
    papersDone,
    examActivities,
    fullMocks,
    passPaper,
    gradeA,
    allFourPapers: (Object.values(papersDone) as number[]).every((n) => n > 0),
    finalBoss: Array.from(byExam.values()).some((s) => s.size === 4),
    paperImprovement,
    reviewAnswers,
    reviewSessions,
    mastered: Math.max(live.filter((r) => r.mastered).length, ctx.legacyMastered),
    recurringMastered: Object.values(state.game.ledger).filter((e) => e.reason === 'recurringMastered').length,
    notesWritten: live.filter((r) => r.notes?.trim()).length,
    aiFeedbacks,
    customSheets: ctx.customSheets,
    streak: computeStreaks(days, restWeekdays, ctx.today),
    planSessions,
    comeback,
    level,
    readinessReached: ctx.readinessReached,
    flags,
    cosmeticsUnlocked: unlockedCosmetics(level, state.game.achievements).length,
    cosmeticEquipped: equipped.length > 0,
    nightOwl,
    earlyBird,
    maxMinutesDay: Math.max(0, ...minutesByDay.values())
  }
}

// ---------- Procesamiento ----------

export interface ProcessResult {
  state: LearningState
  /** Todos los eventos (los de entrada y los derivados), en orden. */
  emitted: DomainEvent[]
  changed: boolean
}

/** Límite de eventos derivados por lote: evita cualquier bucle. */
export const MAX_EVENTS = 2000

export function processEvents(state: LearningState, events: DomainEvent[], ctx: ProcessContext): ProcessResult {
  const emitted: DomainEvent[] = []
  const queue = [...events]
  const xpBefore = totalXp(state.game)
  let s = state
  let guard = 0
  while (queue.length && guard++ < MAX_EVENTS) {
    const e = queue.shift()!
    const derived: DomainEvent[] = []
    s = applyEvent(s, e, derived)
    emitted.push(e)
    // Los derivados que hacen algo (dominar un error, completar una sesión) se procesan a continuación.
    for (const d of derived) {
      if (d.type === 'ERROR_MASTERED' || d.type === 'STUDY_SESSION_COMPLETED') queue.push(d)
      else emitted.push(d)
    }
  }
  const retroOnly = events.length > 0 && events.every((e) => e.retro)
  const at = events.length ? events.reduce((m, e) => (e.at > m ? e.at : m), events[0].at) : new Date().toISOString()

  // Misiones (solo con actividad en vivo).
  if (!retroOnly) {
    const ids = [...(s.game.missionPicks[ctx.today] ?? []), ...Object.entries(s.game.missionPicks).filter(([k]) => k.startsWith('w')).flatMap(([, v]) => v)]
    for (const id of ids) {
      if (s.game.missionsDone[id]) continue
      const m = buildMission(id, Object.values(s.game.activity), s.game.missionsDone)
      if (m && m.done) {
        const ev: DomainEvent = { type: 'MISSION_COMPLETED', id: `mission:${id}`, at, missionId: id, xp: m.xp }
        const derived: DomainEvent[] = []
        s = applyEvent(s, ev, derived)
        emitted.push(ev, ...derived)
      }
    }
  }

  // Logros: se repite hasta que no aparezca ninguno nuevo (un logro da XP, que puede subir de nivel y
  // desbloquear otro logro o accesorio). Acotado por el número de logros.
  for (let round = 0; round < 10; round++) {
    const stats = learnerStats(s, ctx)
    const fresh = newlyUnlocked(stats, s.game.achievements)
    if (!fresh.length) break
    for (const def of fresh) {
      s = { ...s, game: { ...s.game, achievements: { ...s.game.achievements, [def.id]: { at, ...(retroOnly ? { retro: true } : {}) } } } }
      emitted.push({ type: 'ACHIEVEMENT_UNLOCKED', id: `achievement:${def.id}`, at, retro: retroOnly, achievementId: def.id })
      const derived: DomainEvent[] = []
      s = xp(s, derived, `achievement:${def.id}`, achievementXp(def), 'achievement', at, retroOnly, def.id)
      emitted.push(...derived)
    }
  }

  const before = levelInfo(xpBefore).level
  const after = levelInfo(totalXp(s.game)).level
  if (after > before) emitted.push({ type: 'LEVEL_UP', id: `level:${after}`, at, retro: retroOnly, from: before, to: after })
  return { state: s, emitted, changed: s !== state }
}

export function achievementName(id: string): string {
  return ACHIEVEMENT_BY_ID.get(id)?.name ?? id
}

export function competencyLabel(id: string | undefined): string | undefined {
  return competency(id)?.label
}
