// Conexión de Bubi con la app: señales de eventos reales (acierto, fallo, logro…) e inactividad del usuario.
import { useSyncExternalStore } from 'react'
import type { BubiSignal } from '@shared/mascot'

// ---------- Señales ----------
type Listener = (signal: BubiSignal) => void
const listeners = new Set<Listener>()

/** Avisa a todos los Bubi visibles de algo que acaba de pasar en la app. */
export function bubiSignal(signal: BubiSignal): void {
  for (const l of listeners) l(signal)
}

export function onBubiSignal(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

// ---------- Inactividad (un solo detector para todos los Bubi) ----------
/** Tiempo sin tocar ratón ni teclado tras el que Bubi se queda dormido. */
export const IDLE_AFTER_MS = 75_000

let idle = false
let timer: number | undefined
let lastMove = 0
const idleSubs = new Set<() => void>()

function setIdle(v: boolean): void {
  if (idle === v) return
  idle = v
  for (const s of idleSubs) s()
}

function arm(): void {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => setIdle(true), IDLE_AFTER_MS)
}

function onActivity(e: Event): void {
  // pointermove llega muchas veces por segundo: basta con mirar una vez cada 500 ms.
  if (e.type === 'pointermove') {
    const now = performance.now()
    if (now - lastMove < 500) return
    lastMove = now
  }
  setIdle(false)
  arm()
}

const EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const

function subscribeIdle(cb: () => void): () => void {
  if (idleSubs.size === 0) {
    for (const ev of EVENTS) window.addEventListener(ev, onActivity, { passive: true, capture: true })
    arm()
  }
  idleSubs.add(cb)
  return () => {
    idleSubs.delete(cb)
    if (idleSubs.size === 0) {
      for (const ev of EVENTS) window.removeEventListener(ev, onActivity, { capture: true })
      window.clearTimeout(timer)
      idle = false
    }
  }
}

/** true si el usuario lleva un rato sin interactuar. */
export function useUserIdle(): boolean {
  return useSyncExternalStore(subscribeIdle, () => idle, () => false)
}

// ---------- Movimiento reducido ----------
const mq = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined

function subscribeMotion(cb: () => void): () => void {
  mq?.addEventListener('change', cb)
  return () => mq?.removeEventListener('change', cb)
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, () => !!mq?.matches, () => false)
}

// ---------- Saludo de bienvenida: solo una vez por sesión ----------
let welcomed = false
/** Devuelve true la primera vez que se llama en esta sesión de la app. */
export function takeWelcome(): boolean {
  if (welcomed) return false
  welcomed = true
  return true
}
