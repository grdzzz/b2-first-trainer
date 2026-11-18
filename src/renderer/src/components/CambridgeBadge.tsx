import { bandOfScale, cambridgeResult } from '@shared/cambridge'
import { t } from '../i18n'

function bandLabel(band: string, cefr: string): string {
  if (band === 'none') return t('cambridge.none')
  if (band === 'B1') return t('cambridge.b1')
  return t('cambridge.grade', { band, cefr })
}

/** Nota estimada en la Cambridge English Scale con su banda (A/B/C) y nivel. */
export function CambridgeBadge({ percent, scale, size = 'md', showScale = true }: { percent?: number; scale?: number; size?: 'sm' | 'md'; showScale?: boolean }) {
  const s = scale ?? cambridgeResult(percent ?? 0).scale
  const { band, cefr } = bandOfScale(s)
  return (
    <span className={`cam-badge cam-${band} cam-${size}`} title={t('cambridge.hint')}>
      {showScale && <span className="cam-scale tabular">{s}</span>}
      <span className="cam-label">{bandLabel(band, cefr)}</span>
    </span>
  )
}
