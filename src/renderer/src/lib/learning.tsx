// Proveedor de aprendizaje (2.0): une los datos de siempre con el cuaderno de errores, la progresión y el plan.
//
// - Contexto propio (separado de AppState): un cambio de XP no vuelve a pintar toda la app.
// - Reconciliación: cada vez que cambian el progreso de las hojas o los intentos, se generan los eventos de
//   dominio que falten (shared/learning/sources.ts) y se procesan (shared/learning/events.ts). La primera
//   vez (migración desde 1.x) se procesa el historial completo sin celebraciones.
// - Persistencia: escrituras agrupadas (cada ~0,7 s como mucho) y al cerrar la ventana.
// - Replanificación: la sesión de hoy se rehace sola si cambian los datos y aún no se ha empezado.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { localDay, type PracticeSheet } from '@shared/practice'
import type { LearningMetaInfo } from '@shared/api'
import { reconcile } from '@shared/learning/sources'
import { learnerStats, processEvents, type DomainEvent, type LearningState, type ProcessContext } from '@shared/learning/events'
import { emptyNotebook, mergeNotebooks, patchError, activeErrors, errorStatus, type ErrorPatch, type ErrorRecord, type Lesson, type StatusContext } from '@shared/learning/notebook'
import { emptyGame, levelInfo, mergeGames, rankOf, totalXp, xpForLevel, type AvatarConfig, type CosmeticSlot, type LevelInfo } from '@shared/learning/game'
import { emptyPlan, fingerprint, mergePlans, movedAway, movedTo, prunePlan, type PlanActivity, type PlanConfig, type PlanDoc, type PlanSession } from '@shared/learning/plan'
import { alternativesFor, generateSession, needsReplan, type EngineInput } from '@shared/learning/engine'
import { computeProfile, detectPatterns, type Pattern, type Profile } from '@shared/learning/competency'
import { computeReadiness, readinessReached, type Readiness } from '@shared/learning/readiness'
import { currentMissions, type Mission } from '@shared/learning/missions'
import { effectiveOutfit } from '@shared/learning/cosmetics'
import type { LearnerStats } from '@shared/learning/achievements'
import { STUDY_SKILLS, type StudySkill } from '@shared/learning/taxonomy'
import { addDays } from '@shared/review'
import type { PracticeSkill } from '@shared/practice'
import { errorMessage, useApp } from './store'
import { useAllSheets } from './practice'
import { dueCounts, engineInput, sheetReviewMap, type DueCounts } from './learningInput'
import { bubiSignal, setOutfit, setPokeHandler } from './bubi'
import { pushNotification } from './notifications'
import { t, tn } from '../i18n'

export type Celebration =
  | { id: string; kind: 'level'; level: number }
  | { id: string; kind: 'achievement'; achievementId: string }
  | { id: string; kind: 'session'; minutes: number }

export interface LearningApi {
  ready: boolean
  /** Modo administrador activo (nivel máximo y accesorios desbloqueados solo en pantalla). */
  admin: boolean
  error: string | null
  meta: LearningMetaInfo | null
  state: LearningState
  sheets: PracticeSheet[] | null
  today: string
  statusCtx: StatusContext
  errors: ErrorRecord[]
  due: DueCounts
  xp: number
  level: LevelInfo
  rank: ReturnType<typeof rankOf>
  profile: Profile
  patterns: Pattern[]
  readiness: Readiness
  stats: LearnerStats
  todaySession: PlanSession | undefined
  missions: Mission[]
  /** Entrada del motor (para alternativas y previsiones); null sin plan configurado. */
  engine: EngineInput | null
  celebrations: Celebration[]
  dismissCelebration(id: string): void
  /** Últimas XP ganadas (para la animación de la barra). */
  lastGain: { amount: number; key: number } | null
  emit(events: DomainEvent[]): void
  featureUsed(feature: string): void
  savePlanConfig(config: PlanConfig): void
  replaceActivity(activityId: string, replacement: PlanActivity): void
  alternatives(activity: PlanActivity): PlanActivity[]
  moveActivity(activity: PlanActivity, toDate: string): void
  markStarted(activityId: string): void
  /** Genera (sin guardar) la sesión de un día para verla en el calendario. */
  patchErrors(ids: string[], patch: ErrorPatch): void
  deleteErrors(ids: string[]): () => void
  /** Explicaciones (y competencias) importadas de un chat de IA, tras la vista previa. */
  applyExplanations(items: Array<{ id: string; explanation: string; category?: string }>): void
  addLesson(lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): void
  deleteLesson(id: string): void
  equip(slot: CosmeticSlot, id: string | null): void
  setProfile(patch: { avatar?: AvatarConfig; favorites?: string[] }): void
  forceSessionToday(): void
}

const Ctx = createContext<LearningApi | null>(null)

export function useLearning(): LearningApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLearning fuera de LearningProvider')
  return v
}

/** Para componentes que pueden pintarse fuera del proveedor (p. ej. el arranque). */
export function useLearningOptional(): LearningApi | null {
  return useContext(Ctx)
}

const EMPTY: LearningState = { notebook: emptyNotebook(new Date(0)), game: emptyGame(new Date(0)), plan: emptyPlan(new Date(0)) }
type DocName = keyof LearningState
const SAVE_DELAY = 700
/** Nivel que se muestra en modo administrador (desbloquea todos los rangos y accesorios por nivel). */
export const ADMIN_LEVEL = 100
/** Contraseña del modo administrador (no es una medida de seguridad: solo evita activarlo sin querer). */
export const ADMIN_PASSWORD = '4182'

function useToday(): string {
  const [today, setToday] = useState(() => localDay())
  useEffect(() => {
    const id = window.setInterval(() => setToday((d) => (d === localDay() ? d : localDay())), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return today
}

export function LearningProvider({ children }: { children: ReactNode }) {
  const app = useApp()
  const sheets = useAllSheets()
  const today = useToday()
  const [state, setState] = useState<LearningState>(EMPTY)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<LearningMetaInfo | null>(null)
  const [celebrations, setCelebrations] = useState<Celebration[]>([])
  const [lastGain, setLastGain] = useState<{ amount: number; key: number } | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state
  const dirty = useRef(new Set<DocName>())
  const saveTimer = useRef<number | undefined>(undefined)
  const gamificationRef = useRef(app.settings.gamification)
  gamificationRef.current = app.settings.gamification
  const notifyRef = useRef(app.notify)
  notifyRef.current = app.notify

  // ---------- Carga ----------
  useEffect(() => {
    let alive = true
    window.api
      .loadLearning()
      .then((b) => {
        if (!alive) return
        setState({ notebook: b.notebook, game: b.game, plan: b.plan })
        setMeta(b.meta)
        setReady(true)
        if (b.corrupt.length) app.notify('error', t('errors.corruptFiles', { files: b.corrupt.join(', ') }))
      })
      .catch((e) => alive && setError(errorMessage(e)))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- Guardado ----------
  const flush = useCallback(async () => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = undefined
    const names = Array.from(dirty.current)
    dirty.current.clear()
    for (const name of names) {
      const sent = stateRef.current[name]
      try {
        const saved = await window.api.saveLearning(name, sent as never)
        // Si en disco había algo más (otro equipo), se incorpora sin volver a guardar.
        if (fingerprint(saved) !== fingerprint(sent)) {
          setState((cur) => {
            const merged = name === 'notebook' ? mergeNotebooks(cur.notebook, saved as LearningState['notebook']) : name === 'game' ? mergeGames(cur.game, saved as LearningState['game']) : mergePlans(cur.plan, saved as LearningState['plan'])
            return { ...cur, [name]: merged }
          })
        }
      } catch (e) {
        dirty.current.add(name)
        notifyRef.current('error', t('errors.saveFailed', { error: errorMessage(e) }))
      }
    }
  }, [])

  const markDirty = useCallback(
    (names: DocName[]) => {
      for (const n of names) dirty.current.add(n)
      if (saveTimer.current === undefined) saveTimer.current = window.setTimeout(() => void flush(), SAVE_DELAY)
    },
    [flush]
  )

  useEffect(() => window.api.onBeforeClose(() => flush()), [flush])
  useEffect(() => () => void flush(), [flush])

  /** Aplica un cambio de estado y marca para guardar los documentos que han cambiado. */
  const commit = useCallback(
    (next: LearningState) => {
      const prev = stateRef.current
      if (next === prev) return
      const changed = (['notebook', 'game', 'plan'] as DocName[]).filter((n) => next[n] !== prev[n])
      stateRef.current = next
      setState(next)
      markDirty(changed)
    },
    [markDirty]
  )

  // ---------- Contexto para logros ----------
  const practiceDays = useMemo(() => Array.from(new Set(app.practiceProgress.flatMap((p) => p.days ?? []))), [app.practiceProgress])
  const legacyMastered = useMemo(() => app.practiceProgress.reduce((n, p) => n + (p.mastered ?? 0), 0), [app.practiceProgress])
  const activity = useMemo(() => Object.values(state.game.activity).sort((a, b) => a.at.localeCompare(b.at)), [state.game.activity])
  const profile = useMemo(() => computeProfile(activity, app.settings.placement, today), [activity, app.settings.placement, today])
  const target = state.plan.config?.targetScore ?? 160
  const readiness = useMemo(() => computeReadiness(activity, profile, app.settings.placement, target, today), [activity, profile, app.settings.placement, target, today])
  const processCtx = useCallback((): ProcessContext => ({ today: localDay(), practiceDays, legacyMastered, customSheets: app.customSheets.length, readinessReached: readinessReached(readiness) }), [practiceDays, legacyMastered, app.customSheets.length, readiness])
  const ctxRef = useRef(processCtx)
  ctxRef.current = processCtx

  /** Reacciones de la interfaz a lo que acaba de pasar (Bubi, avisos, celebraciones). */
  const react = useCallback((emitted: DomainEvent[]) => {
    const live = emitted.filter((e) => !e.retro)
    if (!live.length) return
    const game = gamificationRef.current
    let gained = 0
    const fresh: Celebration[] = []
    for (const e of live) {
      switch (e.type) {
        case 'XP_EARNED':
          gained += e.amount
          break
        case 'LEVEL_UP':
          if (game) fresh.push({ id: e.id, kind: 'level', level: e.to })
          pushNotification({ kind: 'level', title: t('celebrate.levelTitle', { level: e.to }), body: rankOf(e.to).name })
          break
        case 'ACHIEVEMENT_UNLOCKED':
          if (game) fresh.push({ id: e.id, kind: 'achievement', achievementId: e.achievementId })
          pushNotification({ kind: 'achievement', title: t('celebrate.achievementTitle'), body: e.achievementId, ref: e.achievementId })
          break
        case 'MISSION_COMPLETED':
          if (game) notifyRef.current('success', t('missions.completedToast', { xp: e.xp }))
          pushNotification({ kind: 'mission', title: t('missions.completedTitle'), body: e.missionId })
          break
        case 'STUDY_SESSION_COMPLETED':
          fresh.push({ id: e.id, kind: 'session', minutes: e.minutes })
          pushNotification({ kind: 'plan', title: t('plan.sessionDoneTitle'), body: tn('plan.sessionDoneBody', e.minutes) })
          break
      }
    }
    if (gained > 0 && game) setLastGain((g) => ({ amount: gained, key: (g?.key ?? 0) + 1 }))
    // Primero Bubi reacciona a lo que acaba de pasar en la pantalla (acierto, fallo…) y, después, celebra.
    const signal = live.some((e) => e.type === 'LEVEL_UP') ? 'levelUp' : live.some((e) => e.type === 'ACHIEVEMENT_UNLOCKED') ? 'achievement' : live.some((e) => e.type === 'STUDY_SESSION_COMPLETED') ? 'celebration' : null
    if (signal && game) window.setTimeout(() => bubiSignal(signal), 2300)
    if (fresh.length) setCelebrations((c) => [...c, ...fresh].slice(-6))
  }, [])

  const run = useCallback(
    (events: DomainEvent[], extra?: (s: LearningState) => LearningState) => {
      if (!events.length && !extra) return
      const r = processEvents(stateRef.current, events, ctxRef.current())
      commit(extra ? extra(r.state) : r.state)
      react(r.emitted)
      return r
    },
    [commit, react]
  )

  // ---------- Reconciliación (datos de siempre → eventos) ----------
  useEffect(() => {
    if (!ready || !sheets) return
    const s = stateRef.current
    const retro = !s.game.initializedAt
    const events = reconcile({ sheets, progress: app.practiceProgress, attempts: app.attempts, exams: app.exams }, s.game, retro)
    if (!events.length && !retro) return
    const before = activeErrors(s.notebook).length
    const r = run(events, retro ? (st) => ({ ...st, game: { ...st.game, initializedAt: new Date().toISOString() } }) : undefined)
    if (retro && r && events.length) {
      const errors = activeErrors(r.state.notebook).length - before
      app.notify('info', t('migration.imported', { errors, xp: totalXp(r.state.game) }))
      pushNotification({ kind: 'info', title: t('migration.title'), body: t('migration.imported', { errors, xp: totalXp(r.state.game) }) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sheets, app.practiceProgress, app.attempts, app.exams])

  // ---------- Estado derivado ----------
  const sheetReview = useMemo(() => (sheets ? sheetReviewMap(sheets, app.practiceProgress, today) : new Map()), [sheets, app.practiceProgress, today])
  const statusCtx = useMemo<StatusContext>(() => ({ today, sheetReview }), [today, sheetReview])
  const errors = useMemo(() => activeErrors(state.notebook), [state.notebook])
  const due = useMemo(() => dueCounts(errors, statusCtx), [errors, statusCtx])
  const xp = useMemo(() => totalXp(state.game), [state.game])
  // Modo administrador: nivel máximo y todo desbloqueado solo en pantalla (los datos reales no cambian).
  const admin = app.settings.admin.enabled
  const level = useMemo(() => (admin ? levelInfo(Math.max(xp, xpForLevel(ADMIN_LEVEL))) : levelInfo(xp)), [xp, admin])
  const patterns = useMemo(() => detectPatterns(errors, activity, profile), [errors, activity, profile])
  const stats = useMemo(() => learnerStats(state, processCtx()), [state, processCtx])

  const engine = useMemo<EngineInput | null>(() => {
    const config = state.plan.config
    if (!config || !sheets) return null
    return engineInput({ today, config, sheets, progress: app.practiceProgress, exams: app.exams, attempts: app.attempts, activity, placement: app.settings.placement, errors, due, history: state.plan.sessions })
  }, [state.plan.config, state.plan.sessions, sheets, today, app.practiceProgress, app.exams, app.attempts, activity, app.settings.placement, errors, due])

  // ---------- Replanificación automática ----------
  useEffect(() => {
    if (!ready || !engine) return
    const existing = stateRef.current.plan.sessions[today]
    if (!needsReplan(existing, engine)) return
    const generated = generateSession({ ...engine, history: Object.fromEntries(Object.entries(engine.history).filter(([d]) => d !== today)) }).session
    const s = stateRef.current
    // Lo que se movió a hoy desde otro día se añade a la sesión (y lo que se movió fuera, sale).
    const extra = movedTo(s.plan, today).filter((a) => !generated.activities.some((g) => g.id === a.id))
    const session = { ...generated, activities: [...generated.activities.filter((a) => !movedAway(s.plan, a.id, today)), ...extra] }
    const plan = prunePlan({ ...s.plan, sessions: { ...s.plan.sessions, [today]: session }, updatedAt: session.generatedAt }, today)
    commit({ ...s, plan })
  }, [ready, engine, today, commit])

  const todaySession = state.plan.sessions[today]

  // ---------- Misiones ----------
  const missionsResult = useMemo(() => {
    if (!sheets) return null
    const available = STUDY_SKILLS.filter((sk) => !!engine && !todaySession?.gaps.includes(sk))
    const neglected = STUDY_SKILLS.filter((sk) => available.includes(sk))
      .map((sk) => ({ sk, last: profile.skills[sk].lastAt ?? '' }))
      .sort((a, b) => a.last.localeCompare(b.last))[0]?.sk as StudySkill | undefined
    // Tipo de hoja más flojo según las partes de Use of English (sin datos: ninguno en concreto).
    const partSkill: Array<[string, PracticeSkill]> = [['reading.p1', 'vocabulary'], ['reading.p2', 'grammar'], ['reading.p3', 'wordFormation'], ['reading.p5', 'reading']]
    const weakSheetSkill = partSkill
      .map(([part, sk]) => ({ sk, acc: profile.parts[part]?.n >= 6 ? profile.parts[part].accuracy : null }))
      .filter((x): x is { sk: PracticeSkill; acc: number } => x.acc !== null)
      .sort((a, b) => a.acc - b.acc)[0]?.sk
    return currentMissions({
      today,
      activity,
      plan: todaySession,
      hasPlan: !!state.plan.config,
      sheetSkills: Array.from(new Set(sheets.map((s) => s.skill))),
      available: available.length ? available : ['useOfEnglish', 'reading'],
      dueReviews: due.sheet + due.own,
      liveErrors: errors.filter((e) => !e.mastered).length,
      neglected,
      weakSheetSkill,
      missionsDone: state.game.missionsDone,
      picks: state.game.missionPicks
    })
  }, [sheets, engine, todaySession, profile, state.game.missionsDone, state.game.missionPicks, state.plan.config, today, activity, due, errors])

  useEffect(() => {
    if (!ready || !missionsResult?.changed) return
    const s = stateRef.current
    commit({ ...s, game: { ...s.game, missionPicks: missionsResult.picks } })
  }, [ready, missionsResult, commit])

  // ---------- Bubi: accesorios y clics ----------
  useEffect(() => {
    setOutfit(admin ? effectiveOutfit(app.settings.admin.outfit, level.level, state.game.achievements, true) : effectiveOutfit(state.game.cosmetics.equipped, level.level, state.game.achievements))
  }, [admin, app.settings.admin.outfit, state.game.cosmetics.equipped, level.level, state.game.achievements])

  const pokeQueue = useRef(0)
  const pokeTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    setPokeHandler(() => {
      pokeQueue.current++
      window.clearTimeout(pokeTimer.current)
      pokeTimer.current = window.setTimeout(() => {
        const n = pokeQueue.current
        pokeQueue.current = 0
        const at = new Date().toISOString()
        run(Array.from({ length: n }, (_, i) => ({ type: 'FEATURE_USED' as const, id: `poke:${at}:${i}`, at, feature: 'bubi-poke' })))
      }, 1200)
    })
    return () => setPokeHandler(null)
  }, [run])

  // ---------- Acciones ----------
  const emit = useCallback((events: DomainEvent[]) => void run(events), [run])
  const featureUsed = useCallback(
    (feature: string) => {
      if (!ready) return
      const at = new Date().toISOString()
      run([{ type: 'FEATURE_USED', id: `feature:${feature}:${at}`, at, feature }])
    },
    [run, ready]
  )

  const savePlanConfig = useCallback(
    (config: PlanConfig) => {
      const s = stateRef.current
      const at = new Date().toISOString()
      const prevSession = s.plan.sessions[localDay()]
      // Cambiar la configuración rehace la sesión de hoy si aún no se ha empezado.
      const sessions = { ...s.plan.sessions }
      if (prevSession && !prevSession.startedAt && !prevSession.activities.some((a) => a.status === 'done')) delete sessions[localDay()]
      commit({ ...s, plan: { ...s.plan, config: { ...config, updatedAt: at }, sessions, updatedAt: at } })
      run([{ type: 'FEATURE_USED', id: `feature:plan-configured:${at}`, at, feature: 'plan-configured' }])
    },
    [commit, run]
  )

  const updateTodaySession = useCallback(
    (fn: (s: PlanSession) => PlanSession) => {
      const s = stateRef.current
      const day = localDay()
      const cur = s.plan.sessions[day]
      if (!cur) return
      const next = fn(cur)
      commit({ ...s, plan: { ...s.plan, sessions: { ...s.plan.sessions, [day]: { ...next, updatedAt: new Date().toISOString() } }, updatedAt: new Date().toISOString() } })
    },
    [commit]
  )

  const replaceActivity = useCallback(
    (activityId: string, replacement: PlanActivity) => updateTodaySession((cur) => ({ ...cur, startedAt: cur.startedAt ?? new Date().toISOString(), activities: cur.activities.map((a) => (a.id === activityId ? replacement : a)) })),
    [updateTodaySession]
  )

  const markStarted = useCallback((_activityId: string) => updateTodaySession((cur) => (cur.startedAt ? cur : { ...cur, startedAt: new Date().toISOString() })), [updateTodaySession])

  const alternatives = useCallback((activity: PlanActivity) => (engine && todaySession ? alternativesFor(engine, activity, todaySession) : []), [engine, todaySession])

  const moveActivity = useCallback(
    (activity: PlanActivity, toDate: string) => {
      const s = stateRef.current
      const at = new Date().toISOString()
      const day = localDay()
      let plan: PlanDoc = { ...s.plan, moves: { ...s.plan.moves, [activity.id]: { date: toDate, updatedAt: at, activity: { ...activity, status: 'todo' } } }, updatedAt: at }
      // Sale de la sesión de hoy si estaba en ella; entra si se mueve a hoy.
      const cur = plan.sessions[day]
      if (cur) {
        let acts = cur.activities.filter((a) => a.id !== activity.id || toDate === day)
        if (toDate === day && !acts.some((a) => a.id === activity.id)) acts = [...acts, ...movedTo(plan, day).filter((a) => a.id === activity.id)]
        if (acts !== cur.activities) plan = { ...plan, sessions: { ...plan.sessions, [day]: { ...cur, startedAt: cur.startedAt ?? at, activities: acts, updatedAt: at } } }
      }
      commit({ ...s, plan })
    },
    [commit]
  )

  const forceSessionToday = useCallback(() => {
    if (!engine) return
    const s = stateRef.current
    const day = localDay()
    // Día de descanso pero el alumno quiere estudiar: sesión como un día normal.
    const cfg = { ...engine.config, studyDays: Array.from(new Set([...engine.config.studyDays, 0, 1, 2, 3, 4, 5, 6])), restDates: engine.config.restDates.filter((d) => d !== day) }
    const { session } = generateSession({ ...engine, config: cfg })
    commit({ ...s, plan: { ...s.plan, sessions: { ...s.plan.sessions, [day]: { ...session, startedAt: new Date().toISOString() } }, updatedAt: session.generatedAt } })
  }, [engine, commit])

  const patchErrors = useCallback(
    (ids: string[], patch: ErrorPatch) => {
      const s = stateRef.current
      const at = new Date().toISOString()
      let nb = s.notebook
      for (const id of ids) nb = patchError(nb, id, patch, at)
      if (nb === s.notebook) return
      if (patch.notes?.trim()) run([], (st) => ({ ...st, notebook: nb }))
      else commit({ ...s, notebook: nb })
    },
    [commit, run]
  )

  const deleteErrors = useCallback(
    (ids: string[]) => {
      const s = stateRef.current
      const before = ids.map((id) => s.notebook.records[id]).filter((r): r is ErrorRecord => !!r)
      const at = new Date().toISOString()
      let nb = s.notebook
      for (const id of ids) nb = patchError(nb, id, { deleted: true }, at)
      commit({ ...s, notebook: nb })
      return () => {
        const cur = stateRef.current
        const undoAt = new Date().toISOString()
        let n = cur.notebook
        for (const r of before) n = patchError(n, r.id, { deleted: false }, undoAt)
        commit({ ...cur, notebook: n })
      }
    },
    [commit]
  )

  const applyExplanations = useCallback(
    (items: Array<{ id: string; explanation: string; category?: string }>) => {
      const s = stateRef.current
      const at = new Date().toISOString()
      const records = { ...s.notebook.records }
      for (const it of items) {
        const r = records[it.id]
        if (!r) continue
        // Lo que el alumno escribió a mano no se pisa.
        const keepCat = r.categorySource === 'user'
        records[it.id] = {
          ...r,
          explanation: r.explanationSource === 'user' ? r.explanation : it.explanation,
          explanationSource: r.explanationSource === 'user' ? 'user' : 'ai',
          ...(it.category && !keepCat ? { category: it.category, categorySource: 'ai' as const } : {}),
          updatedAt: at
        }
      }
      commit({ ...s, notebook: { ...s.notebook, records, updatedAt: at } })
    },
    [commit]
  )

  const addLesson = useCallback(
    (lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => {
      const s = stateRef.current
      const at = new Date().toISOString()
      const id = `lesson-${Date.now().toString(36)}`
      commit({ ...s, notebook: { ...s.notebook, lessons: { ...s.notebook.lessons, [id]: { ...lesson, id, createdAt: at, updatedAt: at } }, updatedAt: at } })
    },
    [commit]
  )

  const deleteLesson = useCallback(
    (id: string) => {
      const s = stateRef.current
      const l = s.notebook.lessons[id]
      if (!l) return
      const at = new Date().toISOString()
      commit({ ...s, notebook: { ...s.notebook, lessons: { ...s.notebook.lessons, [id]: { ...l, deleted: true, updatedAt: at } }, updatedAt: at } })
    },
    [commit]
  )

  const adminRef = useRef(app.settings.admin)
  adminRef.current = app.settings.admin
  const updateSettingsRef = useRef(app.updateSettings)
  updateSettingsRef.current = app.updateSettings
  const equip = useCallback(
    (slot: CosmeticSlot, id: string | null) => {
      // En modo administrador se viste aparte: no cuenta para logros ni cambia lo guardado.
      if (adminRef.current.enabled) {
        const outfit = { ...adminRef.current.outfit }
        if (id) outfit[slot] = id
        else delete outfit[slot]
        void updateSettingsRef.current({ admin: { enabled: true, outfit } })
        return
      }
      const at = new Date().toISOString()
      const s = stateRef.current
      const equipped = { ...s.game.cosmetics.equipped }
      if (id) equipped[slot] = id
      else delete equipped[slot]
      run([{ type: 'FEATURE_USED', id: `feature:wardrobe:${at}`, at, feature: 'wardrobe' }], (st) => ({ ...st, game: { ...st.game, cosmetics: { equipped, updatedAt: at } } }))
    },
    [run]
  )

  const setProfile = useCallback(
    (patch: { avatar?: AvatarConfig; favorites?: string[] }) => {
      const s = stateRef.current
      const at = new Date().toISOString()
      commit({ ...s, game: { ...s.game, profile: { ...s.game.profile, ...patch, favorites: (patch.favorites ?? s.game.profile.favorites).slice(0, 3), updatedAt: at } } })
    },
    [commit]
  )

  const dismissCelebration = useCallback((id: string) => setCelebrations((c) => c.filter((x) => x.id !== id)), [])

  const value = useMemo<LearningApi>(
    () => ({
      ready,
      admin,
      error,
      meta,
      state,
      sheets,
      today,
      statusCtx,
      errors,
      due,
      xp,
      level,
      rank: rankOf(level.level),
      profile,
      patterns,
      readiness,
      stats,
      todaySession,
      missions: missionsResult?.missions ?? [],
      engine,
      celebrations,
      dismissCelebration,
      lastGain,
      emit,
      featureUsed,
      savePlanConfig,
      replaceActivity,
      alternatives,
      moveActivity,
      markStarted,
      patchErrors,
      deleteErrors,
      applyExplanations,
      addLesson,
      deleteLesson,
      equip,
      setProfile,
      forceSessionToday
    }),
    [ready, admin, error, meta, state, sheets, today, statusCtx, errors, due, xp, level, profile, patterns, readiness, stats, todaySession, missionsResult, engine, celebrations, dismissCelebration, lastGain, emit, featureUsed, savePlanConfig, replaceActivity, alternatives, moveActivity, markStarted, patchErrors, deleteErrors, applyExplanations, addLesson, deleteLesson, equip, setProfile, forceSessionToday]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Estado de un error para la interfaz. */
export function useErrorStatus(r: ErrorRecord): ReturnType<typeof errorStatus> {
  const { statusCtx } = useLearning()
  return errorStatus(r, statusCtx)
}

/** Días entre hoy y una fecha (para textos). */
export function daysFromToday(today: string, day: string): number {
  let n = 0
  let d = today
  if (day >= today) {
    while (d < day && n < 4000) {
      d = addDays(d, 1)
      n++
    }
    return n
  }
  while (d > day && n < 4000) {
    d = addDays(d, -1)
    n--
  }
  return n
}
