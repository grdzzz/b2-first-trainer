import { useRef, type CSSProperties, type ReactNode } from 'react'
import { t } from '../i18n'

/*
 * Skeleton loading con brillo (shimmer).
 * Los bloques se dibujan DENTRO de los mismos contenedores y clases tipográficas que el contenido final,
 * así ocupan exactamente lo mismo y no hay saltos (layout shift) al terminar de cargar.
 * El brillo usa un único degradado fijo a la ventana: todos los bloques comparten la misma onda.
 */

type Size = number | string

/** Bloque genérico. */
export function Sk({ w, h, r, className = '', style }: { w?: Size; h?: Size; r?: Size; className?: string; style?: CSSProperties }) {
  return <span className={`sk ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden />
}

/** Línea de texto: se pone dentro del elemento tipográfico real (h1, p…) para heredar su altura de línea. */
export function SkText({ w = '100%', className = '' }: { w?: Size; className?: string }) {
  // El espacio de ancho cero da a la línea la misma altura que tendría con texto (también en contenedores flex).
  return (
    <span className="sk-text-line" aria-hidden>
      {'\u200b'}
      <span className={`sk sk-text ${className}`} style={{ width: w }} />
    </span>
  )
}

/** Varias líneas de párrafo (la última más corta). */
export function SkLines({ n = 3, last = '62%', className = '' }: { n?: number; last?: Size; className?: string }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`sk-line ${className}`}>
          <SkText w={i === n - 1 ? last : '100%'} />
        </span>
      ))}
    </>
  )
}

/** Círculo (anillos de progreso, avatares, iconos). */
export function SkCircle({ size }: { size: number }) {
  return <span className="sk sk-circle" style={{ width: size, height: size }} aria-hidden />
}

/** Botón con el mismo tamaño que el real (mismas clases y el mismo texto, invisible). */
export function SkButton({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span className={`btn ${className} sk sk-btn`} aria-hidden>
      {label}
    </span>
  )
}

/** Etiqueta (pill, insignia) del mismo tamaño que la real: mismas clases y texto invisible. */
export function SkChip({ label, className }: { label: string; className: string }) {
  return (
    <span className={`${className} sk sk-btn`} aria-hidden>
      {label}
    </span>
  )
}

/**
 * Zona que se está cargando: lo anuncia a los lectores de pantalla y aparece con un pequeño retraso
 * (si la carga es instantánea no se ve ningún parpadeo, pero el hueco ya tiene su tamaño).
 */
export function SkeletonRegion({ children, label = t('common.loading'), className = '', as: Tag = 'div' }: { children: ReactNode; label?: string; className?: string; as?: 'div' | 'section' | 'main' }) {
  return (
    <Tag className={`sk-region ${className}`} role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </Tag>
  )
}

/** Devuelve la clase de entrada suave para el contenido que sustituye a un skeleton (solo si llegó a mostrarse). */
export function useRevealClass(loading: boolean): string {
  const wasLoading = useRef(loading)
  if (loading) wasLoading.current = true
  return !loading && wasLoading.current ? 'sk-reveal' : ''
}
