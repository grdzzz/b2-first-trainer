import { memo, useCallback, useEffect, useId, useLayoutEffect, useReducer, useRef, type CSSProperties, type ReactNode } from 'react'
import {
  baseFromMood,
  bubiExpression,
  bubiReducer,
  bubiView,
  initialMachine,
  REACTION_MS,
  type BubiArms,
  type BubiBase,
  type BubiExtra,
  type BubiMouth,
  type BubiProp,
  type BubiSignal,
  type LegacyMood
} from '@shared/mascot'
import { BUBI_COLORS } from '@shared/learning/cosmetics'
import { useApp } from '../lib/store'
import { bubiPoked, onBubiSignal, takeWelcome, useOutfit, useReducedMotion, useUserIdle, type Outfit } from '../lib/bubi'

/**
 * Bubi, la mascota de la app: una burbuja de diálogo (hablar inglés) con los colores de la marca.
 * Dibujo original en SVG, sin imágenes externas. Se puede ocultar en Ajustes.
 *
 * Las animaciones las decide una máquina de estados (src/shared/mascot.ts): un estado de fondo según la
 * pantalla y reacciones cortas a lo que pasa (aciertos, fallos, logros, clics, inactividad…).
 */
export type MascotMood = LegacyMood | BubiBase

export const MASCOT_NAME = 'Bubi'

interface Props {
  mood?: MascotMood
  size?: number
  /** Texto del bocadillo (opcional). */
  message?: ReactNode
  /** Coloca el bocadillo a la derecha (por defecto) o debajo. */
  layout?: 'side' | 'below'
  className?: string
  /** Mostrar aunque el usuario haya ocultado la mascota (p. ej. en el ajuste para activarla). */
  force?: boolean
  /** Reacción al aparecer (y cada vez que cambia `reactKey`). */
  react?: BubiSignal
  reactKey?: string | number
  /** Saluda al aparecer (solo la primera vez en cada sesión de la app). */
  greet?: boolean
}

export function Mascot({ mood = 'happy', size = 96, message, layout = 'side', className = '', force, react, reactKey, greet }: Props) {
  const { settings } = useApp()
  if (!settings.mascot && !force) return message ? <div className={`mascot-msg-only ${className}`}>{message}</div> : null
  return (
    <div className={`mascot mascot-${layout} ${className}`}>
      <MascotSvg mood={mood} size={size} react={react} reactKey={reactKey} greet={greet} />
      {message && (
        <div className="mascot-bubble" role="status">
          {message}
        </div>
      )}
    </div>
  )
}

// ---------- Formas (mismo dibujo original; solo cambian brazos, ojos y boca) ----------
const ARMS: Record<BubiArms, { left: string; right: string }> = {
  down: { left: 'M24 62 C 14 66, 10 72, 12 80', right: 'M96 62 C 106 66, 110 72, 108 80' },
  up: { left: 'M24 56 C 14 46, 10 36, 12 28', right: 'M96 56 C 106 46, 110 36, 108 28' },
  wave: { left: 'M24 62 C 14 66, 10 72, 12 80', right: 'M96 56 C 106 46, 110 36, 108 28' },
  chin: { left: 'M24 62 C 14 66, 10 72, 12 80', right: 'M96 66 C 88 76, 76 80, 70 78' },
  droop: { left: 'M24 64 C 18 72, 16 80, 18 88', right: 'M96 64 C 102 72, 104 80, 102 88' },
  hold: { left: 'M24 62 C 20 74, 30 84, 42 86', right: 'M96 62 C 100 74, 90 84, 78 86' }
}

const INK = '#141a3a'

function Mouth({ kind }: { kind: BubiMouth }) {
  const common = { className: 'bubi-mouth', key: kind }
  switch (kind) {
    case 'open':
      return <path {...common} d="M51 63 Q 60 76 69 63 Z" fill={INK} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    case 'grin':
      return <path {...common} d="M50 63 Q 60 75 70 63" stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
    case 'frown':
      return <path {...common} d="M53 69 Q 60 64.5 67 69" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
    case 'wavy':
      return <path {...common} d="M52 69 Q 56 65 60 68 Q 64 71 68 67" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
    case 'o':
      return <ellipse {...common} cx="60" cy="67.5" rx="4.4" ry="5.2" fill={INK} />
    case 'small':
      return <path {...common} d="M54 67 Q 60 69 66 66" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
    case 'sleep':
      return <ellipse {...common} cx="60" cy="67" rx="3.4" ry="2.6" fill={INK} />
    default:
      return <path {...common} d="M52 64 Q 60 72 68 64" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
  }
}

function Extra({ kind }: { kind: BubiExtra }) {
  switch (kind) {
    case 'zzz':
      return (
        <g className="bubi-zzz" fill="#8fa1ff" fontFamily="var(--font-serif)" fontWeight="700">
          <text x="92" y="34" fontSize="11">z</text>
          <text x="99" y="24" fontSize="14">z</text>
          <text x="107" y="12" fontSize="10">z</text>
        </g>
      )
    case 'question':
      return <text className="bubi-q" x="100" y="26" fontSize="20" fontWeight="700" fill="#8fa1ff" fontFamily="var(--font-serif)">?</text>
    case 'bang':
      return <text className="bubi-bang" x="99" y="28" fontSize="22" fontWeight="800" fill="#f0c36a" fontFamily="var(--font-serif)">!</text>
    case 'sweat':
      return <path className="bubi-sweat" d="M98 30 C 94 36, 94 40, 98 41 C 102 40, 102 36, 98 30 Z" fill="#8fd3ff" />
    case 'stars':
      return (
        <g className="bubi-stars">
          <path d="M60 2 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4 z" fill="#f0c36a" />
          <path d="M60 2 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 z" fill="#ff8fb8" />
          <path d="M60 2 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 z" fill="#5ccf94" />
        </g>
      )
    case 'notes':
      return (
        <g className="bubi-notes" fill="#8fa1ff" fontFamily="var(--font-serif)" fontWeight="700">
          <text x="98" y="30" fontSize="14">♪</text>
          <text x="8" y="36" fontSize="12">♫</text>
          <text x="104" y="14" fontSize="10">♪</text>
        </g>
      )
    case 'sparks':
      return (
        <g className="bubi-sparks">
          <path d="M14 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#f0c36a" />
          <path d="M104 6 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 z" fill="#5ccf94" />
          <circle cx="112" cy="42" r="2.6" fill="#ff8fb8" />
          <circle cx="8" cy="44" r="2.2" fill="#8fa1ff" />
          <circle cx="20" cy="6" r="1.8" fill="#ff8fb8" />
          <circle cx="98" cy="28" r="1.8" fill="#f0c36a" />
        </g>
      )
    default:
      return null
  }
}

/** Objeto en las manos según la actividad (delante del cuerpo). */
function Prop({ kind }: { kind: BubiProp | undefined }) {
  switch (kind) {
    case 'book':
      return (
        <g className="bubi-prop bubi-prop-book">
          <path d="M38 84 Q49 79 60 84 Q71 79 82 84 L82 100 Q71 95 60 100 Q49 95 38 100 Z" fill="#fff" stroke="#c9cde0" strokeWidth="1.4" />
          <path d="M60 84 L60 100" stroke="#c9cde0" strokeWidth="1.4" />
          <path d="M43 88 L55 86 M43 92 L55 90 M65 86 L77 88 M65 90 L77 92" stroke="#8fa1ff" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )
    case 'pencil':
      return (
        <g className="bubi-prop bubi-prop-pencil">
          <rect x="40" y="84" width="38" height="17" rx="2" fill="#fff" stroke="#c9cde0" strokeWidth="1.4" transform="rotate(-4 59 92)" />
          <path d="M45 90 L66 89 M45 94 L60 93.4" stroke="#8fa1ff" strokeWidth="1.3" strokeLinecap="round" />
          <g className="bubi-pencil" transform="rotate(-38 76 88)">
            <rect x="66" y="85.5" width="20" height="5" rx="1" fill="#f2c14e" />
            <path d="M66 85.5 L61 88 L66 90.5 Z" fill="#f3d9b1" />
            <rect x="85" y="85.5" width="3" height="5" fill="#ff8fb8" />
          </g>
        </g>
      )
    case 'laptop':
      return (
        <g className="bubi-prop bubi-prop-laptop">
          <rect x="40" y="76" width="40" height="22" rx="2.5" fill="#2b2f45" />
          <rect x="43" y="79" width="34" height="16" rx="1.5" fill="#8fd3ff" />
          <path d="M47 83 L60 83 M47 87 L68 87 M47 91 L56 91" stroke="#2b2f45" strokeWidth="1.4" strokeLinecap="round" className="bubi-screen" />
          <path d="M34 98 L86 98 L82 103 L38 103 Z" fill="#41465f" />
        </g>
      )
    case 'calendar':
      return (
        <g className="bubi-prop bubi-prop-calendar">
          <rect x="43" y="78" width="34" height="24" rx="3" fill="#fff" stroke="#c9cde0" strokeWidth="1.4" />
          <rect x="43" y="78" width="34" height="7" rx="3" fill="#e45b5b" />
          {[0, 1, 2, 3].map((c) => [0, 1].map((r) => <circle key={`${c}-${r}`} cx={49 + c * 7.4} cy={90 + r * 6} r="1.6" fill={c === 2 && r === 0 ? '#e45b5b' : '#8fa1ff'} />))}
        </g>
      )
    case 'trophy':
      return (
        <g className="bubi-prop bubi-prop-trophy">
          <path d="M49 74 H71 V80 Q71 91 60 93 Q49 91 49 80 Z" fill="#f2c14e" stroke="#c99626" strokeWidth="1.2" />
          <path d="M49 77 Q42 77 43 82 Q44 86 50 86 M71 77 Q78 77 77 82 Q76 86 70 86" stroke="#c99626" strokeWidth="2" fill="none" />
          <rect x="57" y="92" width="6" height="5" fill="#c99626" />
          <rect x="51" y="97" width="18" height="5" rx="1.5" fill="#8a6a1d" />
          <path d="M55 80 L57 85" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        </g>
      )
    case 'puzzle':
      return (
        <g className="bubi-prop bubi-prop-puzzle">
          <path d="M48 82 H56 Q56 77 60 77 Q64 77 64 82 H72 V90 Q77 90 77 94 Q77 98 72 98 V102 H48 Z" fill="#5ccf94" stroke="#2f8f60" strokeWidth="1.3" />
        </g>
      )
    default:
      return null
  }
}

function starPath(cx: number, cy: number, r: number, inner = 0.48): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const rad = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 === 0 ? r : r * inner
    pts.push(`${(cx + Math.cos(rad) * rr).toFixed(1)} ${(cy + Math.sin(rad) * rr).toFixed(1)}`)
  }
  return `M${pts.join(' L')} Z`
}

/** Accesorios del armario (dentro del cuerpo: siguen todas sus animaciones y expresiones). */
function HeadItem({ id }: { id?: string }) {
  switch (id) {
    case 'beanie':
      return (
        <g className="bubi-acc">
          <path d="M37 24 C 37 5, 83 5, 83 24 Z" fill="#e45b5b" />
          <rect x="34" y="19" width="52" height="8" rx="4" fill="#c94141" />
          <circle cx="60" cy="5" r="4.5" fill="#fff" />
        </g>
      )
    case 'party-hat':
      return (
        <g className="bubi-acc">
          <path d="M47 21 L60 0 L73 21 Z" fill="#8fa1ff" />
          <path d="M51.5 14 L68.5 14 L66 18 L54 18 Z M55.5 7.5 L64.5 7.5 L63 10.5 L57 10.5 Z" fill="#f2c14e" />
          <circle cx="60" cy="1" r="3.2" fill="#ff8fb8" />
        </g>
      )
    case 'beret':
      return (
        <g className="bubi-acc">
          <ellipse cx="62" cy="15" rx="25" ry="8" fill="#3b3b58" transform="rotate(-8 62 15)" />
          <path d="M64 7 L66 2" stroke="#3b3b58" strokeWidth="3" strokeLinecap="round" />
        </g>
      )
    case 'mortarboard':
      return (
        <g className="bubi-acc">
          <path d="M42 20 Q60 26 78 20 L78 13 Q60 19 42 13 Z" fill="#1f2440" />
          <path d="M28 12 L60 1 L92 12 L60 23 Z" fill="#2a3157" />
          <path d="M60 12 L86 14 L88 26" stroke="#f2c14e" strokeWidth="1.6" fill="none" />
          <rect x="85.5" y="25" width="5" height="6" rx="1" fill="#f2c14e" />
        </g>
      )
    case 'cap':
      return (
        <g className="bubi-acc">
          <path d="M38 22 C 38 5, 82 5, 82 22 Z" fill="#2f9e75" />
          <path d="M78 19 Q 99 18 104 25 Q 88 26 78 23 Z" fill="#257d5c" />
          <circle cx="60" cy="7" r="2.4" fill="#257d5c" />
        </g>
      )
    case 'crown':
      return (
        <g className="bubi-acc">
          <path d="M42 21 L44 6 L52 14 L60 2 L68 14 L76 6 L78 21 Z" fill="#f2c14e" stroke="#c99626" strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="60" cy="15" r="2.4" fill="#e45b5b" />
          <circle cx="50" cy="17" r="1.8" fill="#5ccf94" />
          <circle cx="70" cy="17" r="1.8" fill="#8fa1ff" />
        </g>
      )
    default:
      return null
  }
}

function EyesItem({ id }: { id?: string }) {
  switch (id) {
    case 'round-glasses':
      return (
        <g className="bubi-acc" fill="rgba(255,255,255,0.14)" stroke="#1d2240" strokeWidth="2.6">
          <circle cx="46" cy="49" r="11" />
          <circle cx="74" cy="49" r="11" />
          <path d="M57 48 Q60 45 63 48 M35 47 L25 44 M85 47 L95 44" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'star-shades':
      return (
        <g className="bubi-acc">
          <path d={starPath(46, 49, 13)} fill="#ff5fa2" opacity="0.9" stroke="#b8336f" strokeWidth="1.4" strokeLinejoin="round" />
          <path d={starPath(74, 49, 13)} fill="#ff5fa2" opacity="0.9" stroke="#b8336f" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M57 47 Q60 44 63 47" stroke="#b8336f" strokeWidth="2.2" fill="none" />
        </g>
      )
    default:
      return null
  }
}

function EarsItem({ id }: { id?: string }) {
  if (id !== 'headphones') return null
  return (
    <g className="bubi-acc">
      <path d="M23 48 C 21 6, 99 6, 97 48" stroke="#2b2f45" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="13" y="40" width="13" height="22" rx="6" fill="#2b2f45" />
      <rect x="94" y="40" width="13" height="22" rx="6" fill="#2b2f45" />
      <rect x="16" y="44" width="7" height="14" rx="3.5" fill="#ff8fb8" />
      <rect x="97" y="44" width="7" height="14" rx="3.5" fill="#ff8fb8" />
    </g>
  )
}

function NeckItem({ id }: { id?: string }) {
  switch (id) {
    case 'scarf':
      return (
        <g className="bubi-acc">
          <path d="M28 78 Q60 92 92 78 L92 86 Q60 100 28 86 Z" fill="#e45b5b" />
          <path d="M70 88 L75 106 L84 104 L80 87 Z" fill="#c94141" />
          <path d="M36 82 L36 88 M46 85 L46 91 M56 86.5 L56 92.5" stroke="#f7b0b0" strokeWidth="1.6" />
        </g>
      )
    case 'bow-tie':
      return (
        <g className="bubi-acc">
          <path d="M60 84 L48 77 L48 91 Z M60 84 L72 77 L72 91 Z" fill="#8a3a8f" />
          <circle cx="60" cy="84" r="3" fill="#6b2a70" />
        </g>
      )
    case 'medal':
      return (
        <g className="bubi-acc">
          <path d="M51 70 L60 84 L69 70" stroke="#2e46c0" strokeWidth="4" fill="none" strokeLinejoin="round" />
          <circle cx="60" cy="89" r="7" fill="#f2c14e" stroke="#c99626" strokeWidth="1.4" />
          <path d={starPath(60, 89, 3.6)} fill="#fff8dc" />
        </g>
      )
    default:
      return null
  }
}

function AccessoryItem({ id }: { id?: string }) {
  switch (id) {
    case 'pencil':
      return (
        <g className="bubi-acc" transform="rotate(38 92 22)">
          <rect x="80" y="19.5" width="22" height="5" rx="1" fill="#f2c14e" />
          <path d="M102 19.5 L107 22 L102 24.5 Z" fill="#f3d9b1" />
          <rect x="78" y="19.5" width="3" height="5" fill="#ff8fb8" />
        </g>
      )
    case 'book-pin':
      return (
        <g className="bubi-acc">
          <circle cx="31" cy="72" r="6.5" fill="#fff" stroke="#c9cde0" strokeWidth="1.2" />
          <path d="M27 70 Q29 69 31 70 Q33 69 35 70 L35 75 Q33 74 31 75 Q29 74 27 75 Z" fill="#8fa1ff" />
        </g>
      )
    case 'star-pin':
      return (
        <g className="bubi-acc">
          <circle cx="31" cy="72" r="6.5" fill="#fff" stroke="#c9cde0" strokeWidth="1.2" />
          <path d={starPath(31, 72, 4.4)} fill="#f2c14e" />
        </g>
      )
    default:
      return null
  }
}

interface SvgProps {
  mood?: MascotMood
  size?: number
  react?: BubiSignal
  reactKey?: string | number
  greet?: boolean
  /** Ropa para la vista previa del armario (si no, la equipada). */
  outfit?: Outfit
}

export const MascotSvg = memo(function MascotSvg({ mood = 'happy', size = 96, react, reactKey, greet, outfit: preview }: SvgProps) {
  const equipped = useOutfit()
  const outfit = preview ?? equipped
  const color = BUBI_COLORS[outfit.color ?? 'classic'] ?? BUBI_COLORS.classic
  const uid = useId().replace(/:/g, '')
  const g = `bubi-g-${uid}`
  const base = baseFromMood(mood)
  const [machine, dispatch] = useReducer(bubiReducer, base, initialMachine)
  const reduced = useReducedMotion()
  const userIdle = useUserIdle()
  const svgRef = useRef<SVGSVGElement>(null)

  // Estado de fondo según la pantalla.
  useEffect(() => dispatch({ type: 'SET_BASE', base }), [base])

  // Reacción pedida por la pantalla (al aparecer o cuando cambia la clave).
  useEffect(() => {
    if (react) dispatch({ type: 'SIGNAL', signal: react, rnd: Math.random() })
  }, [react, reactKey])

  // Saludo al entrar en la app (una vez por sesión).
  useEffect(() => {
    if (greet && takeWelcome()) dispatch({ type: 'SIGNAL', signal: 'welcome', rnd: Math.random() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Señales globales de la app (acierto, fallo, logro…).
  useEffect(() => onBubiSignal((signal) => dispatch({ type: 'SIGNAL', signal, rnd: Math.random() })), [])

  // Se duerme si el usuario no hace nada durante un rato y se despierta al volver.
  useEffect(() => {
    dispatch(userIdle ? { type: 'INACTIVE' } : { type: 'ACTIVE', rnd: Math.random() })
  }, [userIdle])

  // Fin de cada reacción.
  useEffect(() => {
    const r = machine.reaction
    if (!r) return
    const id = window.setTimeout(() => dispatch({ type: 'REACTION_END', seq: r.seq, rnd: Math.random() }), REACTION_MS[r.name])
    return () => window.clearTimeout(id)
  }, [machine.reaction])

  // Vida «de fondo» sin renders de React: parpadeos al azar, miradas y gestos pequeños.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    // Cada Bubi respira a su ritmo (si hay varios en pantalla no van sincronizados).
    el.style.setProperty('--float-dur', `${(3.3 + Math.random() * 1.1).toFixed(2)}s`)
    el.style.setProperty('--float-delay', `${(-Math.random() * 3).toFixed(2)}s`)
    if (reduced) return
    const timers = new Set<number>()
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id)
        fn()
      }, ms)
      timers.add(id)
    }
    const blink = () => {
      el.dataset.blink = ''
      later(() => {
        delete el.dataset.blink
        // A veces, doble parpadeo.
        if (Math.random() < 0.2) later(() => {
          el.dataset.blink = ''
          later(() => delete el.dataset.blink, 110)
        }, 160)
      }, 120)
      later(blink, 2200 + Math.random() * 4300)
    }
    const FIDGETS = ['look-l', 'look-r', 'tilt', 'tuft', 'hop', 'look-up'] as const
    let lastFidget = ''
    const fidget = () => {
      let f: string = FIDGETS[Math.floor(Math.random() * FIDGETS.length)]
      if (f === lastFidget) f = FIDGETS[(FIDGETS.indexOf(f as (typeof FIDGETS)[number]) + 1) % FIDGETS.length]
      lastFidget = f
      el.dataset.fidget = f
      later(() => delete el.dataset.fidget, 1400)
      later(fidget, 5000 + Math.random() * 7000)
    }
    later(blink, 700 + Math.random() * 2500)
    later(fidget, 3500 + Math.random() * 5000)

    // Pausa las animaciones si Bubi no se ve (sale del área visible).
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) delete el.dataset.offscreen
      else el.dataset.offscreen = ''
    })
    io.observe(el)
    return () => {
      for (const id of timers) window.clearTimeout(id)
      io.disconnect()
      delete el.dataset.blink
      delete el.dataset.fidget
    }
  }, [reduced])

  // Mira hacia el cursor e inclina un poco el cuerpo mientras pasa por encima.
  const raf = useRef(0)
  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (reduced) return
      const el = e.currentTarget
      const { clientX, clientY } = e
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const dx = Math.max(-1, Math.min(1, (clientX - (r.left + r.width / 2)) / (r.width / 2)))
        const dy = Math.max(-1, Math.min(1, (clientY - (r.top + r.height * 0.42)) / (r.height / 2)))
        el.style.setProperty('--look-x', `${(dx * 2.6).toFixed(2)}px`)
        el.style.setProperty('--look-y', `${(dy * 2.2).toFixed(2)}px`)
        el.style.setProperty('--lean', `${(dx * 4).toFixed(2)}deg`)
      })
    },
    [reduced]
  )
  const onPointerEnter = useCallback(() => dispatch({ type: 'POINTER_ENTER', rnd: Math.random() }), [])
  const onPointerLeave = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    cancelAnimationFrame(raf.current)
    const el = e.currentTarget
    el.style.setProperty('--look-x', '0px')
    el.style.setProperty('--look-y', '0px')
    el.style.setProperty('--lean', '0deg')
    dispatch({ type: 'POINTER_LEAVE' })
  }, [])
  const onClick = useCallback(() => {
    dispatch({ type: 'CLICK', now: performance.now(), rnd: Math.random() })
    bubiPoked()
  }, [])
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  // Si se repite la misma reacción (dos clics seguidos…), sus animaciones vuelven a empezar.
  const reactionSeq = machine.reaction?.seq ?? 0
  useLayoutEffect(() => {
    const el = svgRef.current
    if (!el || !reactionSeq || typeof el.getAnimations !== 'function') return
    for (const a of el.getAnimations({ subtree: true })) {
      if ((a as CSSAnimation).animationName?.startsWith('bubi-r-')) a.currentTime = 0
    }
  }, [reactionSeq])

  const view = bubiView(machine)
  const exp = bubiExpression(view.state, view.variant)
  const arms = ARMS[exp.arms]
  const look = { '--exp-x': `${exp.look[0]}px`, '--exp-y': `${exp.look[1]}px` } as CSSProperties
  // El trazo de los brazos se anima con la propiedad CSS «d» (misma estructura de curva en todas las posturas).
  const armStyle = (d: string) => ({ d: `path("${d}")` }) as CSSProperties

  return (
    <svg
      ref={svgRef}
      className={`bubi bubi-${view.state}${exp.prop ? ' has-prop' : ''}`}
      data-state={view.state}
      data-variant={view.variant}
      data-reaction={machine.reaction ? '' : undefined}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden
      focusable="false"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      onClick={onClick}
    >
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color.from} />
          <stop offset="1" stopColor={color.to} />
        </linearGradient>
      </defs>

      {/* Sombra en el suelo */}
      <ellipse className="bubi-shadow" cx="60" cy="112" rx="30" ry="4" fill="#000" opacity="0.12" />

      <g className="bubi-root">
        <g className="bubi-lean">
          <g className="bubi-body bubi-breath">
            {/* Brazos (detrás del cuerpo) */}
            <g className="bubi-arm bubi-arm-left">
              <path d={arms.left} style={armStyle(arms.left)} stroke={color.limb} strokeWidth="8" strokeLinecap="round" fill="none" />
            </g>
            <g className="bubi-arm bubi-arm-right">
              <path d={arms.right} style={armStyle(arms.right)} stroke={color.limb} strokeWidth="8" strokeLinecap="round" fill="none" />
            </g>

            {/* Cuerpo: burbuja de diálogo con su colita */}
            <path d="M60 14 C 86 14, 100 28, 100 52 C 100 76, 86 90, 60 90 C 54 90, 49 89.4, 44.5 88.2 L 30 100 L 33.5 84.2 C 24.6 78.4, 20 67, 20 52 C 20 28, 34 14, 60 14 Z" fill={`url(#${g})`} />
            {/* Brillo */}
            <ellipse cx="44" cy="30" rx="13" ry="7" fill="#fff" opacity="0.22" transform="rotate(-24 44 30)" />
            {/* Mechón (oculto bajo un sombrero) */}
            {!outfit.head && <path className="bubi-tuft" d="M58 14 C 56 7, 62 4, 66 7" stroke={color.tuft} strokeWidth="4" strokeLinecap="round" fill="none" />}
            <EarsItem id={outfit.ears} />

            {/* Ojos */}
            <g className={`bubi-eyes bubi-eyes-${exp.eyes}`}>
              {exp.eyes === 'open' || exp.eyes === 'wide' ? (
                <g className="bubi-open-eyes">
                  <ellipse className="bubi-eye-white" cx="46" cy="49" rx="8" ry="9.5" fill="#fff" />
                  <ellipse className="bubi-eye-white" cx="74" cy="49" rx="8" ry="9.5" fill="#fff" />
                  <g className="bubi-pupils" style={look}>
                    <g className="bubi-pupil">
                      <circle cx="47" cy="50" r="4.6" fill={INK} />
                      <circle cx="48.6" cy="48.2" r="1.6" fill="#fff" />
                    </g>
                    <g className="bubi-pupil">
                      <circle cx="75" cy="50" r="4.6" fill={INK} />
                      <circle cx="76.6" cy="48.2" r="1.6" fill="#fff" />
                    </g>
                  </g>
                </g>
              ) : exp.eyes === 'closed' ? (
                <>
                  <path d="M40 50 Q 46 54 52 50" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
                  <path d="M68 50 Q 74 54 80 50" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
                </>
              ) : (
                <>
                  <path d="M40 52 Q 46 44 52 52" stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
                  <path d="M68 52 Q 74 44 80 52" stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
                </>
              )}
            </g>

            {/* Mejillas */}
            <g className="bubi-cheeks">
              <ellipse cx="36" cy="63" rx="6" ry="3.6" fill="#ff8fb8" opacity="0.6" />
              <ellipse cx="84" cy="63" rx="6" ry="3.6" fill="#ff8fb8" opacity="0.6" />
            </g>

            {/* Boca */}
            <Mouth kind={exp.mouth} />
            <EyesItem id={outfit.eyes} />
            <HeadItem id={outfit.head} />
            <NeckItem id={outfit.neck} />
            <AccessoryItem id={outfit.accessory} />
            <Prop kind={exp.prop} />
          </g>
        </g>
      </g>

      {/* Detalles según el estado */}
      <g className="bubi-extra">
        <Extra kind={exp.extra} />
      </g>
    </svg>
  )
})
