// Preparación estimada: orientativa, con intervalo, confianza y los datos en que se basa.
// No es una nota oficial ni una probabilidad de aprobar.
import { Info, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'
import type { Readiness } from '@shared/learning/readiness'
import { competency, partLabel } from '@shared/learning/taxonomy'
import type { Profile } from '@shared/learning/competency'
import { PAPER_ORDER } from '@shared/types'
import { PaperIcon, paperLabel } from './PaperBadge'
import { StudySkillChip } from './StudySkill'
import { formatDate, t, tn } from '../i18n'

const MIN = 122
const MAX = 190
const pos = (v: number) => `${((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN)) * 100}%`

function nameOf(id: string): string {
  return competency(id)?.label ?? partLabel(id) ?? id
}

export function ReadinessGauge({ r, compact }: { r: Readiness; compact?: boolean }) {
  return (
    <div className={`readiness-gauge${compact ? ' is-compact' : ''}`}>
      <div className="scale-track readiness-track" aria-hidden>
        {r.estimate && <span className="readiness-range" style={{ left: pos(r.estimate.low), width: `calc(${pos(r.estimate.high)} - ${pos(r.estimate.low)})` }} />}
        {r.estimate && <span className="scale-mark" style={{ left: pos(r.estimate.scale) }} />}
        <span className="readiness-target" style={{ left: pos(r.target) }} />
        {!compact && [140, 160, 180].map((v) => <span key={v} className="scale-tick" style={{ left: pos(v) }}>{v}</span>)}
      </div>
    </div>
  )
}

export function ReadinessPanel({ r, profile }: { r: Readiness; profile: Profile }) {
  const fresh = r.newestAt ? formatDate(r.newestAt, { day: 'numeric', month: 'long' }) : null
  return (
    <div className="readiness">
      <section className="card readiness-main" aria-labelledby="ready-title">
        <div className="readiness-head">
          <div>
            <p className="eyebrow" id="ready-title">{t('readiness.title')}</p>
            {r.estimate ? (
              <p className="readiness-score">
                <span className="tabular">{r.estimate.scale}</span>
                <span className="text-muted text-sm">{t('readiness.range', { low: r.estimate.low, high: r.estimate.high })}</span>
              </p>
            ) : (
              <p className="readiness-score is-empty">{t('readiness.noEstimate')}</p>
            )}
          </div>
          <span className={`confidence conf-${r.confidence}`} title={t(`readiness.confHint.${r.confidence}`)}>
            <ShieldCheck size={14} aria-hidden /> {t(`readiness.conf.${r.confidence}`)}
          </span>
        </div>
        <ReadinessGauge r={r} />
        <p className="text-sm">
          {r.estimate === null ? t('readiness.howToStart') : r.pointsToTarget === 0 ? t('readiness.atTarget', { target: r.target }) : t('readiness.toTarget', { n: r.pointsToTarget ?? 0, target: r.target })}
        </p>
        {r.placementOnly && <p className="text-muted text-sm">{t('readiness.placementOnly')}</p>}
        <p className="readiness-data text-subtle text-sm">
          <Info size={13} aria-hidden /> {r.dataPoints ? tn('readiness.data', r.dataPoints, { date: fresh ?? '—' }) : t('readiness.noData')}
        </p>
        <p className="readiness-disclaimer text-subtle text-xs">{t('readiness.disclaimer')}</p>
      </section>

      <section className="card" aria-labelledby="ready-papers">
        <h2 id="ready-papers" className="section-title">{t('readiness.papers')}</h2>
        <ul className="readiness-papers">
          {PAPER_ORDER.map((type) => {
            const p = r.papers.find((x) => x.type === type)!
            return (
              <li key={type}>
                <PaperIcon type={type} />
                <span className="readiness-paper-name">{paperLabel(type)}</span>
                {p.scale === null ? (
                  <span className="text-subtle text-sm">{t('readiness.notAssessed')}</span>
                ) : (
                  <>
                    <span className="tabular">{p.scale}</span>
                    <span className="text-subtle text-sm">{tn('readiness.samples', p.samples, { source: t(`readiness.source.${p.source}`) })}</span>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <div className="two-col">
        <section className="card" aria-labelledby="ready-strong">
          <h2 id="ready-strong" className="section-title"><TrendingUp size={17} aria-hidden /> {t('readiness.strengths')}</h2>
          {r.strengths.length ? (
            <ul className="bar-list">
              {r.strengths.map((id) => {
                const m = profile.comps[id] ?? profile.parts[id]
                return (
                  <li key={id}>
                    <div className="bar-list-head"><span>{nameOf(id)}</span><span className="tabular text-muted">{Math.round((m.accuracy ?? 0) * 100)}%</span></div>
                    <div className="meter meter-success" aria-hidden><span style={{ width: `${Math.round((m.accuracy ?? 0) * 100)}%` }} /></div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-muted text-sm">{t('readiness.noStrengths')}</p>
          )}
        </section>
        <section className="card" aria-labelledby="ready-weak">
          <h2 id="ready-weak" className="section-title"><TrendingDown size={17} aria-hidden /> {t('readiness.weaknesses')}</h2>
          {r.weaknesses.length ? (
            <ul className="bar-list">
              {r.weaknesses.map((id) => {
                const m = profile.comps[id] ?? profile.parts[id]
                return (
                  <li key={id}>
                    <div className="bar-list-head"><span>{nameOf(id)}</span><span className="tabular text-muted">{Math.round((m.accuracy ?? 0) * 100)}%</span></div>
                    <div className="meter meter-danger" aria-hidden><span style={{ width: `${Math.round((m.accuracy ?? 0) * 100)}%` }} /></div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-muted text-sm">{t('readiness.noWeaknesses')}</p>
          )}
        </section>
      </div>

      {r.unassessed.length > 0 && (
        <section className="card" aria-labelledby="ready-un">
          <h2 id="ready-un" className="section-title">{t('readiness.unassessed')}</h2>
          <p className="text-muted text-sm">{t('readiness.unassessedText')}</p>
          <div className="chip-row">
            {r.unassessed.map((s) => <StudySkillChip key={s} skill={s} />)}
          </div>
        </section>
      )}
    </div>
  )
}
