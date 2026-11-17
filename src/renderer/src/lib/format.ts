import type { Attempt, AttemptMode } from '@shared/types'
import { formatNumber, t } from '../i18n'

export function modeLabel(mode: AttemptMode): string {
  return t(`modes.${mode}`)
}

export function scoreLabel(a: Attempt): string {
  const r = a.result
  if (!r) return '—'
  if (r.percent === null) return t('results.noScore')
  return `${formatNumber(r.percent, 0)}%`
}

export function scoreDetail(a: Attempt): string {
  const r = a.result
  if (!r || r.maxScore === 0) return ''
  return `${formatNumber(r.score, 1)} / ${formatNumber(r.maxScore, 1)}`
}
