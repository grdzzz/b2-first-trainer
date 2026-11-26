// Celebraciones moderadas: subir de nivel, desbloquear un logro o completar la sesión del plan.
// No bloquean: tarjeta en una esquina que se cierra sola (o con Escape / el botón), con Bubi celebrando.
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { ACHIEVEMENT_BY_ID } from '@shared/learning/achievements'
import { rankOf } from '@shared/learning/game'
import { useLearning, type Celebration } from '../lib/learning'
import { useApp } from '../lib/store'
import { MascotSvg } from './Mascot'
import { AchievementBadge } from './AchievementBadge'
import { t, tn } from '../i18n'

const DURATION = 6500

function Card({ c, onClose }: { c: Celebration; onClose(): void }) {
  const { settings, navigate } = useApp()
  useEffect(() => {
    const id = window.setTimeout(onClose, DURATION)
    return () => window.clearTimeout(id)
  }, [onClose])
  let title = ''
  let body = ''
  let art = null
  let go: (() => void) | null = null
  if (c.kind === 'level') {
    title = t('celebrate.levelTitle', { level: c.level })
    body = t('celebrate.levelBody', { rank: rankOf(c.level).name })
    art = settings.mascot ? <MascotSvg mood="trophy" react="levelUp" size={72} /> : <span className="celebrate-level tabular">{c.level}</span>
    go = () => navigate({ name: 'profile' })
  } else if (c.kind === 'achievement') {
    const def = ACHIEVEMENT_BY_ID.get(c.achievementId)
    if (!def) return null
    title = t('celebrate.achievementTitle')
    body = `${def.name} · ${def.description}`
    art = <AchievementBadge def={def} unlocked size={64} />
    go = () => navigate({ name: 'achievements' })
  } else {
    title = t('celebrate.sessionTitle')
    body = tn('celebrate.sessionBody', c.minutes)
    art = settings.mascot ? <MascotSvg mood="dance" react="celebration" size={72} /> : null
    go = () => navigate({ name: 'plan' })
  }
  return (
    <div className={`celebrate-card kind-${c.kind}`} role="status">
      {art && <div className="celebrate-art">{art}</div>}
      <div className="celebrate-text">
        <strong>{title}</strong>
        <span className="text-muted text-sm">{body}</span>
        {go && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => { go?.(); onClose() }}>
            {t('celebrate.see')}
          </button>
        )}
      </div>
      <button type="button" className="icon-btn icon-btn-sm" onClick={onClose} aria-label={t('common.close')}>
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}

export function Celebrations() {
  const { celebrations, dismissCelebration } = useLearning()
  useEffect(() => {
    if (!celebrations.length) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) dismissCelebration(celebrations[0].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [celebrations, dismissCelebration])
  if (!celebrations.length) return null
  return (
    <div className="celebrations" aria-live="polite">
      {celebrations.slice(-3).map((c) => (
        <Card key={c.id} c={c} onClose={() => dismissCelebration(c.id)} />
      ))}
    </div>
  )
}
