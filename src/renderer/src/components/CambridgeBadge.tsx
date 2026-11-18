import { cambridgeResult } from '@shared/cambridge'
import { t } from '../i18n'

/** Nota estimada en la Cambridge English Scale con su banda (A/B/C) y nivel. */
export function CambridgeBadge({ percent, size = 'md' }: { percent: number; size?: 'sm' | 'md' }) {
  const r = cambridgeResult(percent)
  const label = r.band === 'none' ? t('cambridge.none') : r.band === 'B1' ? t('cambridge.b1') : t('cambridge.grade', { band: r.band, cefr: r.cefr })
  return (
    <span className={`cam-badge cam-${r.band} cam-${size}`} title={t('cambridge.hint')}>
      <span className="cam-scale tabular">{r.scale}</span>
      <span className="cam-label">{label}</span>
    </span>
  )
}
