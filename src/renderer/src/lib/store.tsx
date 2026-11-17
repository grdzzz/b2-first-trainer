import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Attempt, Exam, Settings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'
import { t } from '../i18n'

export type Route =
  | { name: 'home' }
  | { name: 'library' }
  | { name: 'exam'; examId: string }
  | { name: 'attempt'; attemptId: string }
  | { name: 'results'; attemptId: string }
  | { name: 'history' }
  | { name: 'settings' }

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  message: string
}

interface AppState {
  ready: boolean
  loadError: string | null
  settings: Settings
  exams: Exam[]
  attempts: Attempt[]
  route: Route
  toasts: Toast[]
  navigate(route: Route): void
  notify(kind: Toast['kind'], message: string): void
  dismissToast(id: number): void
  updateSettings(patch: Partial<Settings>): Promise<void>
  saveExam(exam: Exam): Promise<Exam>
  deleteExam(id: string): Promise<void>
  saveAttempt(attempt: Attempt): Promise<Attempt>
  deleteAttempt(id: string): Promise<void>
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
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [exams, setExams] = useState<Exam[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [route, setRoute] = useState<Route>({ name: 'home' })
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const dismissToast = useCallback((id: number) => setToasts((ts) => ts.filter((x) => x.id !== id)), [])
  const notify = useCallback(
    (kind: Toast['kind'], message: string) => {
      const id = ++toastId.current
      setToasts((ts) => [...ts.slice(-3), { id, kind, message }])
      window.setTimeout(() => dismissToast(id), kind === 'error' ? 8000 : 4000)
    },
    [dismissToast]
  )

  const reload = useCallback(async () => {
    try {
      const [s, e, a] = await Promise.all([window.api.getSettings(), window.api.listExams(), window.api.listAttempts()])
      setSettings(s)
      setExams(e.items)
      setAttempts(a.items)
      const corrupt = [...e.corrupt, ...a.corrupt]
      if (corrupt.length) notify('error', t('errors.corruptFiles', { files: corrupt.join(', ') }))
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

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch, grading: { ...settingsRef.current.grading, ...(patch.grading ?? {}) } }
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

  const navigate = useCallback((r: Route) => {
    setRoute(r)
    document.getElementById('main')?.scrollTo({ top: 0 })
  }, [])

  const value = useMemo<AppState>(
    () => ({ ready, loadError, settings, exams, attempts, route, toasts, navigate, notify, dismissToast, updateSettings, saveExam, deleteExam, saveAttempt, deleteAttempt, reload }),
    [ready, loadError, settings, exams, attempts, route, toasts, navigate, notify, dismissToast, updateSettings, saveExam, deleteExam, saveAttempt, deleteAttempt, reload]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Aplica tema y tamaño de texto al documento. */
export function useThemeEffect(settings: Settings): void {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mq.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()
    void window.api.setThemeSource(settings.theme).catch(() => undefined)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(settings.fontScale))
    document.documentElement.style.fontSize = `${settings.fontScale * 100}%`
  }, [settings.fontScale])
}
