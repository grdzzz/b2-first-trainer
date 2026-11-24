// Máquina de estados de las animaciones de Bubi (lógica pura, sin React ni DOM: se puede probar).
//
// Bubi tiene un estado «de fondo» (base) que decide la pantalla (contento, pensando, durmiendo…) y, encima,
// reacciones cortas a lo que pasa (acierto, fallo, logro, clic, volver tras estar inactivo…). Las reacciones
// tienen prioridad: una celebración no la interrumpe un clic, pero un logro sí interrumpe un saludo.

/** Estados de fondo que pide cada pantalla. */
export type BubiBase = 'idle' | 'welcome' | 'cheer' | 'sad' | 'thinking' | 'sleeping' | 'celebration'

/** Reacciones de un solo uso (vuelven al estado de fondo al terminar). */
export type BubiReaction = 'welcome' | 'happy' | 'sad' | 'surprised' | 'celebration' | 'wakeUp' | 'poke'

/** Lo que se dibuja en cada momento. */
export type BubiState = BubiBase | BubiReaction | 'hover'

/** Eventos de la app que llegan a Bubi. `achievement` = sorpresa seguida de celebración. */
export type BubiSignal = Exclude<BubiReaction, 'poke' | 'wakeUp'> | 'achievement'

export const REACTION_PRIORITY: Record<BubiReaction, number> = {
  welcome: 1,
  poke: 2,
  wakeUp: 2,
  happy: 3,
  sad: 3,
  surprised: 4,
  celebration: 5
}

/** Duración de cada reacción (ms); coincide con las animaciones CSS. */
export const REACTION_MS: Record<BubiReaction, number> = {
  welcome: 2400,
  poke: 900,
  wakeUp: 1300,
  happy: 1500,
  sad: 2000,
  surprised: 1200,
  celebration: 2600
}

/** Número de variantes de cada reacción (para que no se repita siempre igual). */
export const REACTION_VARIANTS: Record<BubiReaction, number> = {
  welcome: 2,
  poke: 3,
  wakeUp: 1,
  happy: 2,
  sad: 2,
  surprised: 2,
  celebration: 2
}

/** Clics seguidos (en esta ventana de tiempo) que «marean» a Bubi. */
export const DIZZY_CLICKS = 4
export const CLICK_WINDOW_MS = 1600

export interface ActiveReaction {
  name: BubiReaction
  variant: number
  /** Identificador para ignorar finales de reacciones anteriores. */
  seq: number
  /** Reacción que se encadena al terminar (sorpresa → celebración). */
  then?: BubiReaction
}

export interface BubiMachine {
  base: BubiBase
  reaction: ActiveReaction | null
  hovering: boolean
  /** Dormido por inactividad (distinto de un estado de fondo «durmiendo»). */
  dozing: boolean
  clicks: number[]
  seq: number
  /** Última variante usada de cada reacción (para no repetirla seguida). */
  last: Partial<Record<BubiReaction, number>>
}

export type BubiEvent =
  | { type: 'SET_BASE'; base: BubiBase }
  | { type: 'SIGNAL'; signal: BubiSignal; rnd: number }
  | { type: 'REACTION_END'; seq: number; rnd: number }
  | { type: 'POINTER_ENTER'; rnd: number }
  | { type: 'POINTER_LEAVE' }
  | { type: 'CLICK'; now: number; rnd: number }
  | { type: 'INACTIVE' }
  | { type: 'ACTIVE'; rnd: number }

export function initialMachine(base: BubiBase = 'idle'): BubiMachine {
  return { base, reaction: null, hovering: false, dozing: false, clicks: [], seq: 0, last: {} }
}

function variantOf(name: BubiReaction, rnd: number, avoid?: number): number {
  const n = REACTION_VARIANTS[name]
  let v = Math.min(n - 1, Math.max(0, Math.floor(rnd * n)))
  if (avoid !== undefined && n > 1 && v === avoid) v = (v + 1) % n
  return v
}

function start(m: BubiMachine, name: BubiReaction, rnd: number, then?: BubiReaction): BubiMachine {
  const current = m.reaction
  if (current && REACTION_PRIORITY[current.name] > REACTION_PRIORITY[name]) return m
  const variant = variantOf(name, rnd, m.last[name])
  const seq = m.seq + 1
  return { ...m, dozing: false, seq, last: { ...m.last, [name]: variant }, reaction: { name, variant, seq, then } }
}

/** Transiciones. Pura: el azar llega en el evento (`rnd` entre 0 y 1). */
export function bubiReducer(m: BubiMachine, e: BubiEvent): BubiMachine {
  switch (e.type) {
    case 'SET_BASE':
      return m.base === e.base ? m : { ...m, base: e.base }

    case 'SIGNAL':
      // Un logro: primero sorpresa y luego celebración.
      if (e.signal === 'achievement') return start(m, 'surprised', e.rnd, 'celebration')
      return start(m, e.signal, e.rnd)

    case 'REACTION_END': {
      if (!m.reaction || m.reaction.seq !== e.seq) return m
      const then = m.reaction.then
      const cleared = { ...m, reaction: null }
      return then ? start(cleared, then, e.rnd) : cleared
    }

    case 'POINTER_ENTER':
      if (m.dozing) return { ...start(m, 'wakeUp', e.rnd), hovering: true }
      return m.hovering ? m : { ...m, hovering: true }

    case 'POINTER_LEAVE':
      return m.hovering ? { ...m, hovering: false } : m

    case 'CLICK': {
      if (m.dozing) return start({ ...m, clicks: [] }, 'wakeUp', e.rnd)
      const clicks = [...m.clicks.filter((t) => e.now - t < CLICK_WINDOW_MS), e.now]
      if (clicks.length >= DIZZY_CLICKS) {
        // Demasiados clics: se marea (sorpresa, variante «mareo»).
        const seq = m.seq + 1
        if (m.reaction && REACTION_PRIORITY[m.reaction.name] > REACTION_PRIORITY.surprised) return { ...m, clicks: [] }
        return { ...m, clicks: [], seq, reaction: { name: 'surprised', variant: 1, seq } }
      }
      return { ...start(m, 'poke', e.rnd), clicks }
    }

    case 'INACTIVE':
      // No se duerme mientras piensa (se está cargando o procesando algo) ni en plena reacción importante.
      if (m.dozing || m.base === 'thinking' || m.base === 'sleeping') return m
      if (m.reaction && REACTION_PRIORITY[m.reaction.name] >= 3) return m
      return { ...m, dozing: true, reaction: null, hovering: false }

    case 'ACTIVE':
      return m.dozing ? start(m, 'wakeUp', e.rnd) : m
  }
}

/** Estado que se dibuja. */
export function bubiView(m: BubiMachine): { state: BubiState; variant: number } {
  if (m.dozing) return { state: 'sleeping', variant: 0 }
  if (m.reaction) return { state: m.reaction.name, variant: m.reaction.variant }
  if (m.hovering && m.base !== 'sleeping' && m.base !== 'celebration') return { state: 'hover', variant: 0 }
  return { state: m.base, variant: 0 }
}

// ---------- Expresión de cada estado (mismo dibujo, distintas caras) ----------

export type BubiEyes = 'open' | 'happy' | 'closed' | 'wide'
export type BubiMouth = 'smile' | 'grin' | 'open' | 'frown' | 'wavy' | 'o' | 'small' | 'sleep'
export type BubiArms = 'down' | 'up' | 'wave' | 'chin' | 'droop'
export type BubiExtra = 'zzz' | 'question' | 'sweat' | 'sparks' | 'bang' | 'stars' | null

export interface BubiExpression {
  eyes: BubiEyes
  mouth: BubiMouth
  arms: BubiArms
  /** Hacia dónde miran las pupilas (unidades del dibujo). */
  look: [number, number]
  extra: BubiExtra
}

export function bubiExpression(state: BubiState, variant = 0): BubiExpression {
  switch (state) {
    case 'idle':
      return { eyes: 'open', mouth: 'smile', arms: 'down', look: [0, 0], extra: null }
    case 'welcome':
      return { eyes: 'open', mouth: variant === 1 ? 'grin' : 'smile', arms: 'wave', look: [0, 0], extra: null }
    case 'cheer':
      return { eyes: 'open', mouth: 'open', arms: 'up', look: [0, 0], extra: null }
    case 'happy':
      return { eyes: 'happy', mouth: 'open', arms: 'up', look: [0, 0], extra: variant === 1 ? 'stars' : null }
    case 'sad':
      return { eyes: 'open', mouth: variant === 1 ? 'wavy' : 'frown', arms: 'droop', look: [0, 2.4], extra: variant === 1 ? 'sweat' : null }
    case 'thinking':
      return { eyes: 'open', mouth: 'small', arms: 'chin', look: [2, -3], extra: 'question' }
    case 'sleeping':
      return { eyes: 'closed', mouth: 'sleep', arms: 'down', look: [0, 0], extra: 'zzz' }
    case 'wakeUp':
      return { eyes: 'wide', mouth: 'o', arms: 'up', look: [0, 0], extra: null }
    case 'hover':
      return { eyes: 'open', mouth: 'grin', arms: 'down', look: [0, 0], extra: null }
    case 'poke':
      return variant === 0
        ? { eyes: 'happy', mouth: 'open', arms: 'up', look: [0, 0], extra: null }
        : variant === 1
          ? { eyes: 'wide', mouth: 'o', arms: 'down', look: [0, 0], extra: null }
          : { eyes: 'happy', mouth: 'grin', arms: 'down', look: [0, 0], extra: null }
    case 'surprised':
      return variant === 1
        ? { eyes: 'wide', mouth: 'wavy', arms: 'down', look: [0, 0], extra: 'stars' }
        : { eyes: 'wide', mouth: 'o', arms: 'up', look: [0, -1], extra: 'bang' }
    case 'celebration':
      return { eyes: 'happy', mouth: 'open', arms: 'up', look: [0, 0], extra: 'sparks' }
  }
}

/** Equivalencia con los ánimos que ya usaban las pantallas. */
export type LegacyMood = 'happy' | 'wave' | 'celebrate' | 'think' | 'sleep' | 'cheer' | 'oops'

export function baseFromMood(mood: LegacyMood | BubiBase): BubiBase {
  // «happy» (antiguo) es Bubi tranquilo y sonriente; la reacción «happy» se lanza con señales.
  switch (mood) {
    case 'happy':
      return 'idle'
    case 'wave':
      return 'welcome'
    case 'celebrate':
      return 'celebration'
    case 'think':
      return 'thinking'
    case 'sleep':
      return 'sleeping'
    case 'oops':
      return 'sad'
    default:
      return mood
  }
}
