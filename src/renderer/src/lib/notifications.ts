// Centro de notificaciones locales: logros, niveles, misiones, plan… Solo en este equipo (localStorage),
// sin avisos del sistema ni presión: es un historial que se consulta cuando se quiere.
import { useSyncExternalStore } from 'react'

export type NotificationKind = 'achievement' | 'level' | 'mission' | 'plan' | 'info'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  /** Referencia (id de logro…). */
  ref?: string
  at: string
  read: boolean
}

const KEY = 'b2ft.notifications'
const MAX = 40

function load(): AppNotification[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(raw) ? (raw.filter((n) => n && typeof n === 'object' && typeof (n as AppNotification).id === 'string') as AppNotification[]).slice(0, MAX) : []
  } catch {
    return []
  }
}

let items: AppNotification[] | null = null
const subs = new Set<() => void>()

function get(): AppNotification[] {
  if (!items) items = load()
  return items
}

function set(next: AppNotification[]): void {
  items = next.slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* sin almacenamiento local */
  }
  for (const s of subs) s()
}

let seq = 0
export function pushNotification(n: Omit<AppNotification, 'id' | 'at' | 'read'>): void {
  set([{ ...n, id: `${Date.now().toString(36)}-${seq++}`, at: new Date().toISOString(), read: false }, ...get()])
}

export function markAllRead(): void {
  if (get().every((n) => n.read)) return
  set(get().map((n) => ({ ...n, read: true })))
}

export function clearNotifications(): void {
  set([])
}

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    get,
    get
  )
}
