import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Attempt, Exam, GradingOptions, ReminderSettings, Settings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import type { PracticeProgress, PracticeSheet } from '@shared/practice'
import { newId } from '@shared/ids'
import type { ReviewSessionSpec } from '@shared/learning/notebook'
import { notifyMotionChange } from './bubi'
import { t } from '../i18n'

export type TourName = 'intro' | 'v2'

export type Route =
  | { name: 'home' }
  | { name: 'library' }
  | { name: 'exam'; examId: string }
  | { name: 'attempt'; attemptId: string }
  | { name: 'results'; attemptId: string }
  | { name: 'history' }
  | { name: 'practice' }
  | { name: 'review'; session?: ReviewSessionSpec }
  | { name: 'sheet'; sheetId: string }
  | { name: 'settings'; section?: string }
  | { name: 'plan'; tab?: 'today' | 'calendar' | 'readiness' | 'setup' }
  | { name: 'notebook'; errorId?: string; add?: boolean }
  | { name: 'stats' }
  | { name: 'profile' }
  | { name: 'achievements' }
  | { name: 'wardrobe' }

/** Cambio parcial de ajustes (los grupos anidados también pueden ser parciales). */
export type SettingsPatch = Partial<Omit<Settings, 'grading' | 'reminder' | 'appearance' | 'dashboard'>> & { grading?: Partial<GradingOptions>; reminder?: Partial<ReminderSettings>; appearance?: Partial<Settings['appearance']>; dashboard?: Partial<Settings['dashboard']> }

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  message: string
  /** Acción opcional (p. ej. «Deshacer»). */
  action?: { label: string; run(): void }
}

export interface NotifyOptions {
  action?: Toast['action']
  /** Milisegundos visible (por defecto 4 s; errores 8 s; con acción 7 s). */
  duration?: number
}

interface AppState {
  ready: boolean
  loadError: string | null
  /** Carpeta de datos elegida que no está disponible (nube no montada…). */
  missingDataPath: string | null
  /** Motivo si la carpeta existe pero no se ha podido usar; y si es la carpeta por defecto. */
  dataProblem: { error?: string; isDefault: boolean } | null
  /** Otro ordenador tiene abierta la misma carpeta de datos. */
  lockConflict: { host: string; heartbeat: string } | null
  dismissLockConflict(): void
  /** Paso actual del recorrido guiado (null = cerrado). */
  tourStep: number | null
  /** Recorrido activo: el de bienvenida o el de los cambios de una versión. */
  tourName: TourName
  /** Empieza (o mueve) un recorrido. Sin nombre: el recorrido que ya estaba activo (o el de bienvenida). */
  setTourStep(step: number | null, name?: TourName): void
  createExample(): Promise<Exam>
  settings: Settings
  exams: Exam[]
  attempts: Attempt[]
  route: Route
  toasts: Toast[]
  navigate(route: Route): void
  notify(kind: Toast['kind'], message: string, opts?: NotifyOptions): void
  dismissToast(id: number): void
  updateSettings(patch: SettingsPatch): Promise<void>
  saveExam(exam: Exam): Promise<Exam>
  deleteExam(id: string): Promise<void>
  saveAttempt(attempt: Attempt): Promise<Attempt>
  deleteAttempt(id: string): Promise<void>
  /** Hojas de práctica creadas por el usuario (las 50 incluidas se cargan aparte). */
  customSheets: PracticeSheet[]
  practiceProgress: PracticeProgress[]
  savePracticeProgress(progress: PracticeProgress): Promise<void>
  resetPracticeProgress(sheetId: string): Promise<void>
  addPracticeSheets(sheets: Array<Omit<PracticeSheet, 'id'>>, source: PracticeSheet['source']): Promise<PracticeSheet[]>
  deletePracticeSheet(id: string): Promise<void>
  reload(): Promise<void>
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fuera de AppProvider')
  return v
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [missingDataPath, setMissingDataPath] = useState<string | null>(null)
  const [dataProblem, setDataProblem] = useState<{ error?: string; isDefault: boolean } | null>(null)
  const [lockConflict, setLockConflict] = useState<{ host: string; heartbeat: string } | null>(null)
  const [tourStep, setTourStepState] = useState<number | null>(null)
  const [tourName, setTourName] = useState<TourName>('intro')
  const setTourStep = useCallback((step: number | null, name?: TourName) => {
    if (name) setTourName(name)
    else if (step === 0) setTourName('intro')
    setTourStepState(step)
  }, [])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [exams, setExams] = useState<Exam[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [customSheets, setCustomSheets] = useState<PracticeSheet[]>([])
  const [practiceProgress, setPracticeProgress] = useState<PracticeProgress[]>([])
  const toastId = useRef(0)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((x) => x.id !== id)), [])
  const notify = useCallback(
    (kind: Toast['kind'], message: string, opts?: NotifyOptions) => {
      const id = ++toastId.current
      setToasts((ts) => [...ts.slice(-3), { id, kind, message, ...(opts?.action ? { action: opts.action } : {}) }])
      window.setTimeout(() => dismissToast(id), opts?.duration ?? (kind === 'error' ? 8000 : opts?.action ? 7000 : 4000))
    },
    [dismissToast]
  )

  const reload = useCallback(async () => {
    try {
      const location = await window.api.getDataLocation()
      if (!location.available) {
        setMissingDataPath(location.path)
        setDataProblem({ error: location.error, isDefault: location.isDefault })
        return
      }
      setMissingDataPath(null)
      setDataProblem(null)
      void window.api.getLockConflict().then(setLockConflict).catch(() => undefined)
      const [s, e, a, ps, pp] = await Promise.all([window.api.getSettings(), window.api.listExams(), window.api.listAttempts(), window.api.listPracticeSheets(), window.api.listPracticeProgress()])
      setSettings(s)
      setExams(e.items)
      setAttempts(a.items)
      setCustomSheets(ps.items)
      setPracticeProgress(pp.items)
      const corrupt = [...e.corrupt, ...a.corrupt, ...ps.corrupt, ...pp.corrupt]
      if (corrupt.length) notify('error', t('errors.corruptFiles', { files: corrupt.join(', ') }))
      const pending = [e, a, ps, pp].flatMap((r) => r.pending ?? [])
      if (pending.length) notify('info', t('errors.pendingFiles', { n: pending.length }))
      setLoadError(null)
    } catch (err) {
      setLoadError(errorMessage(err))
    } finally {
      setReady(true)
    }
  }, [notify])

  useEffect(() => {
    void reload()
  }, [reload])

  // El recordatorio diario abre la pantalla de práctica o de repaso.
  useEffect(() => window.api.onNavigate((name) => setRoute(name === 'review' ? { name: 'review' } : { name: 'practice' })), [])

  // Aviso en directo si otro ordenador abre la misma carpeta de datos mientras se usa la app.
  useEffect(() => window.api.onLockConflict((lock) => setLockConflict(lock)), [])

  const updateSettings = useCallback(async (patch: SettingsPatch) => {
    const next = { ...settingsRef.current, ...patch, grading: { ...settingsRef.current.grading, ...(patch.grading ?? {}) }, reminder: { ...settingsRef.current.reminder, ...(patch.reminder ?? {}) }, appearance: { ...settingsRef.current.appearance, ...(patch.appearance ?? {}) }, dashboard: { ...settingsRef.current.dashboard, ...(patch.dashboard ?? {}) } }
    setSettings(next)
    try {
      setSettings(await window.api.saveSettings(next))
    } catch (err) {
      notify('error', t('errors.saveFailed', { error: errorMessage(err) }))
    }
  }, [notify])

  const saveExam = useCallback(async (exam: Exam) => {
    const saved = await window.api.saveExam(exam)
    setExams((xs) => {
      const i = xs.findIndex((x) => x.id === saved.id)
      if (i === -1) return [saved, ...xs]
      const copy = xs.slice()
      copy[i] = saved
      return copy
    })
    return saved
  }, [])

  const deleteExam = useCallback(async (id: string) => {
    await window.api.deleteExam(id)
    setExams((xs) => xs.filter((x) => x.id !== id))
    setAttempts((xs) => xs.filter((x) => x.examId !== id))
  }, [])

  const saveAttempt = useCallback(async (attempt: Attempt) => {
    const saved = await window.api.saveAttempt(attempt)
    setAttempts((xs) => {
      const i = xs.findIndex((x) => x.id === saved.id)
      if (i === -1) return [saved, ...xs]
      const copy = xs.slice()
      copy[i] = saved
      return copy
    })
    return saved
  }, [])

  const deleteAttempt = useCallback(async (id: string) => {
    await window.api.deleteAttempt(id)
    setAttempts((xs) => xs.filter((x) => x.id !== id))
  }, [])

  const savePracticeProgress = useCallback(async (progress: PracticeProgress) => {
    setPracticeProgress((xs) => [progress, ...xs.filter((x) => x.id !== progress.id)])
    await window.api.savePracticeProgress({ ...progress, updatedAt: new Date().toISOString() })
  }, [])

  const resetPracticeProgress = useCallback(async (sheetId: string) => {
    setPracticeProgress((xs) => xs.filter((x) => x.id !== sheetId))
    await window.api.deletePracticeProgress(sheetId)
  }, [])

  const addPracticeSheets = useCallback(async (sheets: Array<Omit<PracticeSheet, 'id'>>, source: PracticeSheet['source']) => {
    const saved: PracticeSheet[] = []
    for (const s of sheets) saved.push(await window.api.savePracticeSheet({ ...s, id: newId('sheet'), source, builtIn: false }))
    setCustomSheets((xs) => [...saved.slice().reverse(), ...xs])
    return saved
  }, [])

  const deletePracticeSheet = useCallback(async (id: string) => {
    await window.api.deletePracticeSheet(id)
    setCustomSheets((xs) => xs.filter((x) => x.id !== id))
    setPracticeProgress((xs) => xs.filter((x) => x.id !== id))
  }, [])

  const createExample = useCallback(async () => {
    const exam = await window.api.createExampleExam()
    setExams((xs) => [exam, ...xs.filter((x) => x.id !== exam.id)])
    return exam
  }, [])

  const dismissLockConflict = useCallback(() => {
    setLockConflict(null)
    void window.api.ignoreLockConflict().catch(() => undefined)
  }, [])

  const navigate = useCallback((r: Route) => {
    setRoute(r)
    document.getElementById('main')?.scrollTo({ top: 0 })
  }, [])

  const value = useMemo<AppState>(
    () => ({ ready, loadError, missingDataPath, dataProblem, lockConflict, dismissLockConflict, tourStep, tourName, setTourStep, createExample, settings, exams, attempts, route, toasts, navigate, notify, dismissToast, updateSettings, saveExam, deleteExam, saveAttempt, deleteAttempt, customSheets, practiceProgress, savePracticeProgress, resetPracticeProgress, addPracticeSheets, deletePracticeSheet, reload }),
    [ready, loadError, missingDataPath, dataProblem, lockConflict, dismissLockConflict, tourStep, tourName, setTourStep, createExample, settings, exams, attempts, route, toasts, navigate, notify, dismissToast, updateSettings, saveExam, deleteExam, saveAttempt, deleteAttempt, customSheets, practiceProgress, savePracticeProgress, resetPracticeProgress, addPracticeSheets, deletePracticeSheet, reload]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Tema efectivo: claro u oscuro y, si es oscuro, su variante (OLED o Midnight Blue). */
export function resolveTheme(theme: Settings['theme'], systemDark: boolean): { base: 'light' | 'dark'; variant?: 'oled' | 'midnight' } {
  if (theme === 'oled' || theme === 'midnight') return { base: 'dark', variant: theme }
  return { base: theme === 'dark' || (theme === 'system' && systemDark) ? 'dark' : 'light' }
}

/** Aplica tema, acento, densidad, movimiento y tamaño de texto al documento. */
export function applyAppearance(theme: Settings['theme'], appearance: Settings['appearance'], systemDark: boolean): void {
  const root = document.documentElement
  const r = resolveTheme(theme, systemDark)
  root.dataset.theme = r.base
  if (r.variant) root.dataset.variant = r.variant
  else delete root.dataset.variant
  if (appearance.accent !== 'indigo') root.dataset.accent = appearance.accent
  else delete root.dataset.accent
  if (appearance.density === 'compact') root.dataset.density = 'compact'
  else delete root.dataset.density
  const motionChanged = (root.dataset.motion ?? 'full') !== appearance.motion
  if (appearance.motion !== 'full') root.dataset.motion = appearance.motion
  else delete root.dataset.motion
  if (motionChanged) notifyMotionChange()
  try {
    localStorage.setItem('b2ft.appearance', JSON.stringify({ theme: r.base, variant: r.variant ?? null, accent: appearance.accent, density: appearance.density, motion: appearance.motion }))
    localStorage.setItem('b2ft.theme', r.base)
  } catch {
    /* sin almacenamiento local */
  }
}

/** Aplica tema y tamaño de texto al documento. */
export function useThemeEffect(settings: Settings, ready = true): void {
  useEffect(() => {
    // Hasta tener los ajustes se mantiene el tema de la última vez (ver main.tsx).
    if (!ready) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => applyAppearance(settings.theme, settings.appearance, mq.matches)
    apply()
    void window.api.setThemeSource(settings.theme).catch(() => undefined)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme, settings.appearance, ready])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(settings.fontScale))
    document.documentElement.style.fontSize = `${settings.fontScale * 100}%`
  }, [settings.fontScale])
}
