import { useId, type ReactNode } from 'react'
import { useApp } from '../lib/store'

/**
 * Bubi, la mascota de la app: una burbuja de diálogo (hablar inglés) con los colores de la marca.
 * Dibujo original en SVG, sin imágenes externas. Se puede ocultar en Ajustes.
 */
export type MascotMood = 'happy' | 'wave' | 'celebrate' | 'think' | 'sleep' | 'cheer' | 'oops'

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
}

export function Mascot({ mood = 'happy', size = 96, message, layout = 'side', className = '', force }: Props) {
  const { settings } = useApp()
  if (!settings.mascot && !force) return message ? <div className={`mascot-msg-only ${className}`}>{message}</div> : null
  return (
    <div className={`mascot mascot-${layout} ${className}`}>
      <MascotSvg mood={mood} size={size} />
      {message && (
        <div className="mascot-bubble" role="status">
          {message}
        </div>
      )}
    </div>
  )
}

export function MascotSvg({ mood = 'happy', size = 96 }: { mood?: MascotMood; size?: number }) {
  const uid = useId().replace(/:/g, '')
  const g = `bubi-g-${uid}`
  const closedEyes = mood === 'celebrate' || mood === 'sleep'
  const ink = '#141a3a'
  return (
    <svg className={`bubi bubi-${mood}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden focusable="false">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6b80ff" />
          <stop offset="1" stopColor="#2f3fae" />
        </linearGradient>
      </defs>

      {/* Sombra en el suelo */}
      <ellipse className="bubi-shadow" cx="60" cy="112" rx="30" ry="4" fill="#000" opacity="0.12" />

      <g className="bubi-body">
        {/* Brazos (detrás del cuerpo) */}
        <g className="bubi-arm bubi-arm-left">
          <path d={mood === 'celebrate' || mood === 'cheer' ? 'M24 56 C 14 46, 10 36, 12 28' : 'M24 62 C 14 66, 10 72, 12 80'} stroke="#3448c4" strokeWidth="8" strokeLinecap="round" fill="none" />
        </g>
        <g className="bubi-arm bubi-arm-right">
          <path
            d={mood === 'celebrate' || mood === 'wave' ? 'M96 56 C 106 46, 110 36, 108 28' : mood === 'think' ? 'M96 66 C 88 76, 76 80, 70 78' : 'M96 62 C 106 66, 110 72, 108 80'}
            stroke="#3448c4"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Cuerpo: burbuja de diálogo con su colita */}
        <path d="M60 14 C 86 14, 100 28, 100 52 C 100 76, 86 90, 60 90 C 54 90, 49 89.4, 44.5 88.2 L 30 100 L 33.5 84.2 C 24.6 78.4, 20 67, 20 52 C 20 28, 34 14, 60 14 Z" fill={`url(#${g})`} />
        {/* Brillo */}
        <ellipse cx="44" cy="30" rx="13" ry="7" fill="#fff" opacity="0.22" transform="rotate(-24 44 30)" />
        {/* Mechón */}
        <path d="M58 14 C 56 7, 62 4, 66 7" stroke="#6b80ff" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* Ojos */}
        <g className="bubi-eyes">
          {closedEyes ? (
            mood === 'sleep' ? (
              <>
                <path d="M40 50 Q 46 54 52 50" stroke={ink} strokeWidth="3.2" strokeLinecap="round" fill="none" />
                <path d="M68 50 Q 74 54 80 50" stroke={ink} strokeWidth="3.2" strokeLinecap="round" fill="none" />
              </>
            ) : (
              <>
                <path d="M40 52 Q 46 44 52 52" stroke={ink} strokeWidth="3.4" strokeLinecap="round" fill="none" />
                <path d="M68 52 Q 74 44 80 52" stroke={ink} strokeWidth="3.4" strokeLinecap="round" fill="none" />
              </>
            )
          ) : (
            <g className="bubi-open-eyes">
              <ellipse cx="46" cy="49" rx="8" ry="9.5" fill="#fff" />
              <ellipse cx="74" cy="49" rx="8" ry="9.5" fill="#fff" />
              <g className="bubi-pupils" transform={mood === 'think' ? 'translate(2 -3)' : mood === 'oops' ? 'translate(0 2)' : undefined}>
                <circle cx="47" cy="50" r="4.6" fill={ink} />
                <circle cx="75" cy="50" r="4.6" fill={ink} />
                <circle cx="48.6" cy="48.2" r="1.6" fill="#fff" />
                <circle cx="76.6" cy="48.2" r="1.6" fill="#fff" />
              </g>
            </g>
          )}
        </g>

        {/* Mejillas */}
        <ellipse cx="36" cy="63" rx="6" ry="3.6" fill="#ff8fb8" opacity="0.6" />
        <ellipse cx="84" cy="63" rx="6" ry="3.6" fill="#ff8fb8" opacity="0.6" />

        {/* Boca */}
        {mood === 'celebrate' || mood === 'cheer' ? (
          <path d="M51 63 Q 60 76 69 63 Z" fill={ink} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
        ) : mood === 'oops' ? (
          <path d="M52 69 Q 56 65 60 68 Q 64 71 68 67" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : mood === 'sleep' ? (
          <ellipse cx="60" cy="67" rx="3.4" ry="2.6" fill={ink} />
        ) : mood === 'think' ? (
          <path d="M54 67 Q 60 69 66 66" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M52 64 Q 60 72 68 64" stroke={ink} strokeWidth="3.2" strokeLinecap="round" fill="none" />
        )}
      </g>

      {/* Detalles según el ánimo */}
      {mood === 'sleep' && (
        <g className="bubi-zzz" fill="#8fa1ff" fontFamily="var(--font-serif)" fontWeight="700">
          <text x="94" y="30" fontSize="14">z</text>
          <text x="103" y="18" fontSize="10">z</text>
        </g>
      )}
      {mood === 'think' && (
        <text className="bubi-q" x="100" y="26" fontSize="20" fontWeight="700" fill="#8fa1ff" fontFamily="var(--font-serif)">?</text>
      )}
      {mood === 'oops' && <path d="M98 30 C 94 36, 94 40, 98 41 C 102 40, 102 36, 98 30 Z" fill="#8fd3ff" />}
      {mood === 'celebrate' && (
        <g className="bubi-sparks">
          <path d="M14 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#f0c36a" />
          <path d="M104 6 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 z" fill="#5ccf94" />
          <circle cx="112" cy="42" r="2.6" fill="#ff8fb8" />
          <circle cx="8" cy="44" r="2.2" fill="#8fa1ff" />
        </g>
      )}
    </svg>
  )
}
