import { BookOpen, Headphones, Mic, PenLine } from 'lucide-react'
import type { PaperType } from '@shared/types'
import { t } from '../i18n'

export const PAPER_ICONS = { reading: BookOpen, writing: PenLine, listening: Headphones, speaking: Mic } as const

export function paperLabel(type: PaperType): string {
  return t(`papers.${type}`)
}

export function PaperIcon({ type, size = 18 }: { type: PaperType; size?: number }) {
  const Icon = PAPER_ICONS[type]
  return <Icon size={size} aria-hidden style={{ color: `var(--paper-${type})` }} />
}

export function PaperBadge({ type, label }: { type: PaperType; label?: string }) {
  return (
    <span className={`paper-badge paper-${type}`}>
      <PaperIcon type={type} size={14} />
      {label ?? paperLabel(type)}
    </span>
  )
}
