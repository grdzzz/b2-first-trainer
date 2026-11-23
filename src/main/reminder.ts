// Recordatorio diario: un aviso del sistema a la hora elegida si ese día aún no se ha practicado.
// Para poder avisar con la ventana cerrada, la app puede seguir en segundo plano con un icono junto al reloj.
import { app, Menu, nativeImage, Notification, Tray } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Settings } from '../shared/types'
import { localDay, type PracticeProgress } from '../shared/practice'
import { reminderDue, reminderMessage, type ReminderRoute } from '../shared/reminder'

export type { ReminderRoute }

interface Deps {
  getSettings(): Settings
  listProgress(): Promise<PracticeProgress[]>
  showWindow(route?: ReminderRoute): void
  quit(): void
}

/** Argumento con el que se abre la app al iniciar sesión (sin mostrar la ventana). */
export const BACKGROUND_ARG = '--en-segundo-plano'

let deps: Deps | null = null
let timer: NodeJS.Timeout | undefined
let tray: Tray | null = null

const stateFile = () => path.join(app.getPath('userData'), 'recordatorio.json')

function lastNotifiedDay(): string | null {
  try {
    const v = JSON.parse(readFileSync(stateFile(), 'utf8')) as { lastDay?: unknown }
    return typeof v.lastDay === 'string' ? v.lastDay : null
  } catch {
    return null
  }
}

function setLastNotifiedDay(day: string): void {
  try {
    writeFileSync(stateFile(), JSON.stringify({ lastDay: day }))
  } catch {
    /* sin disco: como mucho se repetiría el aviso */
  }
}

async function tick(): Promise<void> {
  if (!deps) return
  const s = deps.getSettings().reminder
  if (!s.enabled || !Notification.isSupported()) return
  const now = new Date()
  const today = localDay(now)
  if (!reminderDue(s.time, now) || lastNotifiedDay() === today) return
  const progress = await deps.listProgress().catch(() => [] as PracticeProgress[])
  // Si hoy ya has practicado, no hace falta avisar.
  if (progress.some((p) => p.days?.includes(today))) {
    setLastNotifiedDay(today)
    return
  }
  setLastNotifiedDay(today)
  const { body, route } = reminderMessage(progress, now)
  const n = new Notification({ title: 'Bubi · B2 First Trainer', body, icon: iconPath() ?? undefined, silent: false })
  n.on('click', () => deps?.showWindow(route))
  n.show()
}

function iconPath(): string | null {
  const p = app.isPackaged ? path.join(process.resourcesPath, 'icon.png') : path.join(app.getAppPath(), 'build', 'icon.png')
  return existsSync(p) ? p : null
}

/** ¿Debe la app seguir en segundo plano al cerrar la ventana? */
export function staysInBackground(settings: Settings): boolean {
  return settings.reminder.enabled && settings.reminder.background
}

function ensureTray(): void {
  if (tray || !deps) return
  const file = iconPath()
  const image = file ? nativeImage.createFromPath(file).resize({ width: process.platform === 'darwin' ? 18 : 16, height: process.platform === 'darwin' ? 18 : 16 }) : nativeImage.createEmpty()
  tray = new Tray(image)
  tray.setToolTip('B2 First Trainer: recordatorio diario activado')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir B2 First Trainer', click: () => deps?.showWindow() },
      { label: 'Practicar ahora', click: () => deps?.showWindow('practice') },
      { type: 'separator' },
      { label: 'Salir', click: () => deps?.quit() }
    ])
  )
  tray.on('click', () => deps?.showWindow())
}

function destroyTray(): void {
  tray?.destroy()
  tray = null
}

/** Aplica los ajustes: icono junto al reloj y abrir al iniciar sesión. */
export function applyReminderSettings(settings: Settings): void {
  if (staysInBackground(settings)) ensureTray()
  else destroyTray()
  // Abrir al iniciar sesión (Windows y macOS; en Linux depende del escritorio y no se ofrece).
  if (app.isPackaged && process.platform !== 'linux') {
    try {
      const open = settings.reminder.enabled && settings.reminder.openAtLogin
      // En Windows se abre oculta (con el argumento); en macOS se abre con la ventana visible.
      app.setLoginItemSettings({ openAtLogin: open, args: [BACKGROUND_ARG] })
    } catch {
      /* el sistema no lo permite */
    }
  }
}

/** ¿Se ha abierto la app en segundo plano al iniciar sesión? */
export function startedInBackground(): boolean {
  return process.argv.includes(BACKGROUND_ARG)
}

export function initReminder(d: Deps): void {
  deps = d
  applyReminderSettings(d.getSettings())
  if (timer) clearInterval(timer)
  // Primera comprobación al poco de abrir; después cada minuto.
  setTimeout(() => void tick(), 15_000)
  timer = setInterval(() => void tick(), 60_000)
}

export function stopReminder(): void {
  if (timer) clearInterval(timer)
  destroyTray()
}
