import { useMemo } from 'react'
import { BookOpenCheck, CheckCircle2, Flame, Minus, Timer, TrendingDown, TrendingUp } from 'lucide-react'
import { progressSummary } from '@shared/stats'
import { bandOfScale, overallScale } from '@shared/cambridge'
import { PAPER_ORDER } from '@shared/types'
import { COMPETENCY_GROUPS, competenciesOf, partLabel, PART_LABELS, STUDY_SKILLS } from '@shared/learning/taxonomy'
import type { Measure } from '@shared/learning/competency'
import { useApp } from '../lib/store'
import { useLearning } from '../lib/learning'
import { ProgressRing } from '../components/ProgressRing'
import { CountUp } from '../components/CountUp'
import { CambridgeBadge } from '../components/CambridgeBadge'
import { LineChart } from '../components/LineChart'
import { PaperIcon, paperLabel } from '../components/PaperBadge'
import { StudySkillIcon } from '../components/StudySkill'
import { EmptyState } from '../components/EmptyState'
import { StatsSkeleton } from '../components/ScreenSkeletons'
import { t, tn } from '../i18n'

function Trend({ m }: { m: Measure }) {
  if (m.trend === null) return null
  const pts = Math.round(m.trend * 100)
  if (Math.abs(pts) < 3) return <span className="trend is-flat" title={t('stats.trendFlat')}><Minus size={13} aria-hidden /><span className="sr-only">{t('stats.trendFlat')}</span></span>
  return pts > 0 ? (
    <span className="trend is-up" title={t('stats.trendUp', { n: pts })}><TrendingUp size={13} aria-hidden /> +{pts}<span className="sr-only"> {t('stats.trendUp', { n: pts })}</span></span>
  ) : (
    <span className="trend is-down" title={t('stats.trendDown', { n: -pts })}><TrendingDown size={13} aria-hidden /> {pts}<span className="sr-only"> {t('stats.trendDown', { n: -pts })}</span></span>
  )
}

export function MeasureBar({ m, label, icon }: { m: Measure; label: string; icon?: React.ReactNode }) {
  const pct = m.accuracy === null ? 0 : Math.round(m.accuracy * 100)
  return (
    <li className={`measure status-${m.status}`}>
      <div className="bar-list-head">
        <span className="measure-name">{icon} {label}</span>
        <span className="measure-val text-sm">
          {m.status === 'unassessed' ? <span className="text-subtle">{t('stats.unassessed')}</span> : <><span className="tabular">{pct}%</span> <span className="text-subtle">· {tn('stats.answers', m.n)}</span> <Trend m={m} /></>}
        </span>
      </div>
      <div className={`meter meter-${m.status}`} aria-hidden><span style={{ width: `${pct}%` }} /></div>
      {m.status !== 'unassessed' && <span className={`status-note text-xs st-${m.status}`}>{m.placementOnly ? t('stats.placementOnly') : t(`stats.status.${m.status}`)}</span>}
    </li>
  )
}

export function StatsScreen() {
  const app = useApp()
  const learning = useLearning()
  const summary = useMemo(() => progressSummary(app.attempts), [app.attempts])
  if (!learning.ready) return <StatsSkeleton />
  const overall = overallScale(summary.averages.map((a) => a.average))
  const { profile, stats } = learning
  const studyMinutes = Math.round(Object.values(learning.state.game.activity).reduce((n, a) => n + a.minutes, 0))
  const hasAny = summary.finishedCount > 0 || Object.keys(learning.state.game.activity).length > 0
  const parts = Object.keys(PART_LABELS).filter((p) => profile.parts[p])

  return (
    <div className="page stats-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('stats.eyebrow')}</p>
          <h1 className="h1">{t('stats.title')}</h1>
          <p className="text-muted">{t('stats.sub')}</p>
        </div>
      </header>

      {!hasAny ? (
        <EmptyState
          title={t('stats.emptyTitle')}
          mood="thinking"
          text={<><p>{t('stats.emptyWhat')}</p><p>{t('stats.emptyWhy')}</p></>}
          actions={<button type="button" className="btn btn-primary" onClick={() => app.navigate({ name: 'plan' })}>{t('stats.emptyGo')}</button>}
        />
      ) : (
        <>
          <section className="stats-row" aria-label={t('home.summary')}>
            <div className="stat">
              <span className="stat-icon" aria-hidden><CheckCircle2 size={20} /></span>
              <span className="stat-value"><CountUp value={summary.finishedCount} /></span>
              <span className="stat-label">{t('home.attemptsDone')}</span>
            </div>
            <div className="stat">
              <span className="stat-icon" aria-hidden><BookOpenCheck size={20} /></span>
              <span className="stat-value"><CountUp value={stats.sheetsDistinct} /></span>
              <span className="stat-label">{t('stats.sheetsDone')}</span>
            </div>
            <div className="stat">
              <span className="stat-icon" aria-hidden><Timer size={20} /></span>
              <span className="stat-value">{studyMinutes < 60 ? <><CountUp value={studyMinutes} /><span className="stat-unit"> min</span></> : <><CountUp value={studyMinutes / 60} decimals={1} /><span className="stat-unit"> h</span></>}</span>
              <span className="stat-label">{t('home.timeStudied')}</span>
            </div>
            <div className="stat">
              <span className="stat-icon" aria-hidden><Flame size={20} /></span>
              <span className="stat-value"><CountUp value={stats.streak.current} /><span className="stat-unit"> / {stats.streak.best}</span></span>
              <span className="stat-label">{t('stats.streak')}</span>
            </div>
          </section>

          {overall !== null && (
            <section className="card overall-card" aria-labelledby="overall-title">
              <ProgressRing value={((overall - 122) / 68) * 100} size={132} stroke={11} color={`var(--band-${bandOfScale(overall).band})`} label={t('cambridge.overall')}>
                <span className="overall-scale tabular"><CountUp value={overall} duration={1100} /></span>
                <span className="ring-caption">/ 190</span>
              </ProgressRing>
              <div className="overall-text">
                <p className="eyebrow" id="overall-title">{t('cambridge.overall')}</p>
                <CambridgeBadge scale={overall} showScale={false} />
                <p className="text-muted text-sm">{t('cambridge.overallHint')}</p>
              </div>
              <div className="overall-band">
                <div className="scale-track" aria-hidden>
                  <span className="scale-mark" style={{ left: `${((overall - 122) / 68) * 100}%` }} />
                  <span className="scale-tick" style={{ left: `${((160 - 122) / 68) * 100}%` }}>160</span>
                  <span className="scale-tick" style={{ left: `${((180 - 122) / 68) * 100}%` }}>180</span>
                </div>
              </div>
            </section>
          )}

          <section className="card" aria-labelledby="skills-title">
            <h2 id="skills-title" className="section-title">{t('stats.skills')}</h2>
            <ul className="bar-list measure-list">
              {STUDY_SKILLS.map((s) => <MeasureBar key={s} m={profile.skills[s]} label={t(`skills.${s}`)} icon={<StudySkillIcon skill={s} size={15} />} />)}
            </ul>
            <p className="text-subtle text-xs hint">{t('stats.skillsHint')}</p>
          </section>

          <section aria-labelledby="avg-title">
            <h2 id="avg-title" className="section-title">{t('home.averages')}</h2>
            <div className="paper-grid">
              {PAPER_ORDER.map((type) => {
                const a = summary.averages.find((x) => x.type === type)!
                return (
                  <div key={type} className={`card paper-card paper-${type}`}>
                    <div className="paper-card-head"><PaperIcon type={type} /><span>{paperLabel(type)}</span></div>
                    <div className="paper-card-value">{a.average === null ? <span className="text-subtle">—</span> : <><CountUp value={a.average} /><span className="stat-unit">%</span></>}</div>
                    <div className="meter" aria-hidden><span style={{ width: `${a.average ?? 0}%` }} /></div>
                    <div className="paper-card-foot">
                      {a.average !== null ? <CambridgeBadge percent={a.average} size="sm" /> : <span />}
                      <span className="text-subtle text-sm">{tn('home.attemptsCount', a.attempts)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="two-col">
            <section className="card" aria-labelledby="chart-title">
              <h2 id="chart-title" className="section-title">{t('home.evolution')}</h2>
              <LineChart series={summary.series} />
            </section>
            <section className="card" aria-labelledby="parts-title">
              <h2 id="parts-title" className="section-title">{t('stats.parts')}</h2>
              {parts.length ? (
                <ul className="bar-list measure-list">
                  {parts.map((p) => <MeasureBar key={p} m={profile.parts[p]} label={partLabel(p)!.replace(/^(Use of English|Reading|Writing|Listening|Speaking) · /, '')} />)}
                </ul>
              ) : (
                <p className="text-muted">{t('stats.noParts')}</p>
              )}
            </section>
          </div>

          <section className="card" aria-labelledby="comp-title">
            <h2 id="comp-title" className="section-title">{t('stats.competencies')}</h2>
            <div className="comp-groups">
              {COMPETENCY_GROUPS.map((g) => {
                const list = competenciesOf(g).filter((c) => profile.comps[c.id])
                return (
                  <div key={g} className="comp-group">
                    <h3 className="h-small">{t(`groups.${g}`)}</h3>
                    {list.length ? (
                      <ul className="bar-list measure-list">
                        {list.map((c) => <MeasureBar key={c.id} m={profile.comps[c.id]} label={c.label} />)}
                      </ul>
                    ) : (
                      <p className="text-subtle text-sm">{t('stats.noCompData')}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {summary.weakCategories.length > 0 && (
            <section className="card" aria-labelledby="weak-title">
              <h2 id="weak-title" className="section-title">{t('home.weak')}</h2>
              <ul className="bar-list">
                {summary.weakCategories.slice(0, 8).map((c) => (
                  <li key={c.category}>
                    <div className="bar-list-head"><span>{c.category}</span><span className="tabular text-muted">{t('home.wrongOf', { wrong: c.wrong, total: c.total })}</span></div>
                    <div className="meter meter-danger" aria-hidden><span style={{ width: `${Math.round(c.errorRate * 100)}%` }} /></div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
