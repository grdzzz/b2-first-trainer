import type { ReactNode } from 'react'
import type { MascotMood } from './Mascot'
import { MascotSvg } from './Mascot'
import { useApp } from '../lib/store'

interface Props {
  /** Qué contiene la sección. */
  title: string
  /** Por qué todavía no hay datos y qué puede hacer el usuario. */
  text: ReactNode
  mood?: MascotMood
  /** Acción principal (y, opcionalmente, secundarias). */
  actions?: ReactNode
  className?: string
}

/** Estado vacío de una sección, con Bubi (si está visible) y una acción principal. */
export function EmptyState({ title, text, mood = 'wave', actions, className = '' }: Props) {
  const { settings } = useApp()
  return (
    <section className={`card empty-v2 ${className}`} aria-label={title}>
      {settings.mascot && (
        <div className="empty-v2-art" aria-hidden>
          <MascotSvg mood={mood} size={104} />
        </div>
      )}
      <div className="empty-v2-text">
        <h2 className="h2">{title}</h2>
        <div className="text-muted measure">{text}</div>
        {actions && <div className="row-gap empty-v2-actions">{actions}</div>}
      </div>
    </section>
  )
}
