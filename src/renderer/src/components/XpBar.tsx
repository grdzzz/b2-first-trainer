import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useLearning } from '../lib/learning'
import { useApp } from '../lib/store'
import { t } from '../i18n'

/** Nivel, rango y barra de experiencia (animada al ganar XP). Se oculta si la gamificación está desactivada. */
export function XpBar({ compact = false, onClick }: { compact?: boolean; onClick?(): void }) {
  const { settings } = useApp()
  const { level, rank, lastGain, ready } = useLearning()
  const [gain, setGain] = useState<{ amount: number; key: number } | null>(null)
  useEffect(() => {
    if (!lastGain) return
    setGain(lastGain)
    const id = window.setTimeout(() => setGain(null), 1800)
    return () => window.clearTimeout(id)
  }, [lastGain])
  if (!settings.gamification || !ready) return null
  const pct = Math.round(level.progress * 100)
  const label = t('xp.barLabel', { level: level.level, into: level.into, needed: level.needed })
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} className={`xp-bar${compact ? ' is-compact' : ''}`} onClick={onClick} title={compact ? `${label} · ${rank.name}` : undefined} aria-label={compact ? `${label} · ${rank.name}` : undefined}>
      <span className="xp-level tabular" aria-hidden>{level.level}</span>
      {!compact && (
        <span className="xp-body">
          <span className="xp-head">
            <span className="xp-rank">{rank.name}</span>
            <span className="xp-num tabular">{level.into}/{level.needed} XP</span>
          </span>
          <span className="xp-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={level.needed} aria-valuenow={level.into}>
            <span className="xp-fill" style={{ transform: `scaleX(${pct / 100})` }} />
          </span>
        </span>
      )}
      {gain && (
        <span className="xp-gain" key={gain.key} aria-live="polite">
          <Sparkles size={12} aria-hidden /> +{gain.amount} XP
        </span>
      )}
    </Tag>
  )
}
