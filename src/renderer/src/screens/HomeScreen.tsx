import { useMemo, useState } from 'react'
import { ArrowRight, BellRing, BookOpenCheck, CheckCircle2, Clock, Flame, FolderPlus, Play, PlayCircle, RotateCcw, Timer, Trash2 } from 'lucide-react'
import { countItems, localDay, nextSheet, practiceStats } from '@shared/practice'
import { reviewSummary } from '@shared/review'
import { Mascot } from '../components/Mascot'
import { useAllSheets } from '../lib/practice'
import { skillLabel } from '../components/SkillBadge'
import { progressSummary } from '@shared/stats'
import { bandOfScale, overallScale } from '@shared/cambridge'
import { ProgressRing } from '../components/ProgressRing'
import { CountUp } from '../components/CountUp'
import { CambridgeBadge } from '../components/CambridgeBadge'
import { PAPER_ORDER } from '@shared/types'
import { errorMessage, useApp } from '../lib/store'
import { ConfirmDialog } from '../components/Modal'
import { LineChart } from '../components/LineChart'
import { PaperBadge, PaperIcon, paperLabel } from '../components/PaperBadge'
import { formatDate, t, tn } from '../i18n'
import { modeLabel, scoreLabel } from '../lib/format'

export function HomeScreen() {
  const { attempts, exams, navigate, deleteAttempt, notify, settings } = useApp()
  const firstName = settings.userName.split(' ')[0]
  const [discard, setDiscard] = useState<string | null>(null)
  const summary = useMemo(() => progressSummary(attempts), [attempts])
  const inProgress = attempts.filter((a) => a.status === 'in-progress')
  const recent = attempts.filter((a) => a.status === 'finished').slice(0, 5)
  const maxWeak = summary.weakCategories.slice(0, 6)
  const overall = overallScale(summary.averages.map((a) => a.average))
  const lastExamId = attempts.find((a) => a.status === 'finished' && exams.some((e) => e.id === a.examId))?.examId ?? exams[0]?.id
  const hour = new Date().getHours()
  const greeting = hour < 6 ? t('home.greetNight') : hour < 14 ? t('home.greetMorning') : hour < 21 ? t('home.greetAfternoon') : t('home.greetNight')

  return (
    <div className="page">
      <header className="page-header home-header">
        <div>
          <p className="eyebrow">{formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="h1">{firstName ? `${greeting}, ${firstName}` : greeting}</h1>
          <p className="text-muted home-sub">
            {overall !== null ? t('home.subWithScore', { score: overall }) : exams.length ? t('home.subStart') : t('home.subEmpty')}
          </p>
        </div>
        {lastExamId && (
          <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate({ name: 'exam', examId: lastExamId })}>
            <Play size={18} aria-hidden /> {t('home.practice')}
          </button>
        )}
      </header>

      {exams.length === 0 && (
        <section className="card hero-empty">
          <div>
            <h2 className="h2">{t('home.welcomeTitle')}</h2>
            <p className="text-muted measure">{t('home.welcomeText')}</p>
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate({ name: 'library' })}>
            <FolderPlus size={18} aria-hidden /> {t('home.goLibrary')}
          </button>
        </section>
      )}

      {inProgress.length > 0 && (
        <section className="card resume-card" aria-labelledby="resume-title">
          <h2 id="resume-title" className="h-small">{t('home.continue')}</h2>
          <ul className="resume-list">
            {inProgress.map((a) => (
              <li key={a.id}>
                <PaperBadge type={a.paperType} />
                <span className="resume-name">{a.examName}</span>
                <span className="text-subtle text-sm">{modeLabel(a.mode)} · {formatDate(a.startedAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <span className="resume-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDiscard(a.id)}>
                    <Trash2 size={15} aria-hidden /> {t('home.discard')}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate({ name: 'attempt', attemptId: a.id })}>
                    <PlayCircle size={16} aria-hidden /> {t('home.resume')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="stats-row" aria-label={t('home.summary')}>
        <div className="stat">
          <span className="stat-icon" aria-hidden><CheckCircle2 size={20} /></span>
          <span className="stat-value"><CountUp value={summary.finishedCount} /></span>
          <span className="stat-label">{t('home.attemptsDone')}</span>
        </div>
        <div className="stat">
          <span className="stat-icon" aria-hidden><BookOpenCheck size={20} /></span>
          <span className="stat-value"><CountUp value={summary.examsPracticed} /></span>
          <span className="stat-label">{t('home.examsPracticed')}</span>
        </div>
        <div className="stat">
          <span className="stat-icon" aria-hidden><Timer size={20} /></span>
          <span className="stat-value">
            {summary.totalMinutes < 60 ? <><CountUp value={summary.totalMinutes} /><span className="stat-unit"> {t('home.minutes')}</span></> : <><CountUp value={summary.totalMinutes / 60} decimals={1} /><span className="stat-unit"> h</span></>}
          </span>
          <span className="stat-label">{t('home.timeStudied')}</span>
        </div>
      </section>

      <PracticeCard />

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

      <section aria-labelledby="avg-title">
        <h2 id="avg-title" className="section-title">{t('home.averages')}</h2>
        <div className="paper-grid">
          {PAPER_ORDER.map((type) => {
            const a = summary.averages.find((x) => x.type === type)!
            return (
              <div key={type} className={`card paper-card paper-${type}`}>
                <div className="paper-card-head">
                  <PaperIcon type={type} />
                  <span>{paperLabel(type)}</span>
                </div>
                <div className="paper-card-value">
                  {a.average === null ? <span className="text-subtle">—</span> : <><CountUp value={a.average} /><span className="stat-unit">%</span></>}
                </div>
                <div className="meter" aria-hidden><span style={{ width: `${a.average ?? 0}%` }} /></div>
                <div className="paper-card-foot">
                  {a.average !== null ? <CambridgeBadge percent={a.average} size="sm" /> : <span />}
                  <span className="text-subtle text-sm">{tn('home.attemptsCount', a.attempts)}</span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-subtle text-sm hint">{t('home.averagesHint')}</p>
      </section>

      <div className="two-col">
        <section className="card" aria-labelledby="chart-title">
          <h2 id="chart-title" className="section-title">{t('home.evolution')}</h2>
          <LineChart series={summary.series} />
        </section>
        <section className="card" aria-labelledby="weak-title">
          <h2 id="weak-title" className="section-title">{t('home.weak')}</h2>
          {maxWeak.length === 0 ? (
            <p className="text-muted">{t('home.weakEmpty')}</p>
          ) : (
            <ul className="bar-list">
              {maxWeak.map((c) => (
                <li key={c.category}>
                  <div className="bar-list-head">
                    <span>{c.category}</span>
                    <span className="tabular text-muted">{t('home.wrongOf', { wrong: c.wrong, total: c.total })}</span>
                  </div>
                  <div className="meter meter-danger" aria-hidden><span style={{ width: `${Math.round(c.errorRate * 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="recent-title">
        <div className="row-between">
          <h2 id="recent-title" className="section-title">{t('home.recent')}</h2>
          {recent.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate({ name: 'history' })}>
              {t('home.seeAll')} <ArrowRight size={15} aria-hidden />
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="text-muted">{t('home.recentEmpty')}</p>
        ) : (
          <ul className="attempt-list">
            {recent.map((a) => (
              <li key={a.id}>
                <button type="button" className="attempt-row" onClick={() => navigate({ name: 'results', attemptId: a.id })}>
                  <PaperBadge type={a.paperType} />
                  <span className="attempt-row-name">{a.examName}</span>
                  <span className="text-subtle text-sm">{modeLabel(a.mode)}</span>
                  <span className="text-subtle text-sm"><Clock size={13} aria-hidden /> {formatDate(a.finishedAt)}</span>
                  <span className="attempt-row-score tabular">{scoreLabel(a)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={discard !== null}
        title={t('home.discardTitle')}
        message={t('home.discardMessage')}
        confirmLabel={t('home.discard')}
        danger
        onCancel={() => setDiscard(null)}
        onConfirm={async () => {
          const id = discard!
          setDiscard(null)
          try {
            await deleteAttempt(id)
          } catch (e) {
            notify('error', errorMessage(e))
          }
        }}
      />
    </div>
  )
}

/** Tarjeta de práctica: Bubi cuenta qué toca hoy (repaso, racha o una hoja nueva). */
function PracticeCard() {
  const { practiceProgress, navigate, settings, updateSettings, notify } = useApp()
  const sheets = useAllSheets()
  if (!sheets) return null
  const today = localDay()
  const stats = practiceStats(sheets, practiceProgress)
  const next = nextSheet(sheets, practiceProgress)
  const review = reviewSummary(sheets, practiceProgress, today)
  if (!next) return null
  const p = practiceProgress.find((x) => x.id === next.id)
  const started = !!p && !p.checked && Object.keys(p.answers).length > 0
  const practicedToday = practiceProgress.some((x) => x.days?.includes(today))
  const name = settings.userName.split(' ')[0]
  const message = review.due > 0
    ? tn('home.bubiReview', review.due, { name })
    : practicedToday
      ? tn('home.bubiDone', stats.streak)
      : stats.streak > 0
        ? tn('home.bubiStreak', stats.streak)
        : t('home.bubiStart')
  const mood = review.due > 0 ? 'think' : practicedToday ? 'celebrate' : stats.streak > 0 ? 'cheer' : 'wave'
  return (
    <section className="card home-practice" aria-labelledby="home-practice-title">
      <Mascot mood={mood} size={88} message={message} className="home-bubi" />
      <div className="home-practice-text">
        <p className="eyebrow">{t('home.practiceEyebrow')}</p>
        <h2 id="home-practice-title" className="h-small">{next.number ? `${t('practice.sheetN', { n: next.number })} · ` : ''}{next.title}</h2>
        <p className="text-muted text-sm">{skillLabel(next.skill)} · {next.topic} · {t('practice.minutes', { n: next.minutes })} · {t('practice.items', { n: countItems(next) })}</p>
        <div className="home-practice-meter">
          <span className="sheet-progress-bar" aria-hidden><span style={{ width: `${(stats.done / Math.max(1, stats.total)) * 100}%` }} /></span>
          <span>{t('home.practiceDone', { done: stats.done, total: stats.total })}</span>
          {stats.streak > 0 && <span className="row-gap"><Flame size={13} aria-hidden /> {tn('home.practiceStreak', stats.streak)}</span>}
        </div>
        <div className="row-gap home-practice-actions">
          {review.due > 0 && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate({ name: 'review' })}>
              <RotateCcw size={15} aria-hidden /> {t('home.reviewGo', { n: review.due })}
            </button>
          )}
          <button type="button" className={`btn btn-sm ${review.due > 0 ? 'btn-secondary' : 'btn-primary'}`} onClick={() => navigate({ name: 'sheet', sheetId: next.id })}>
            {started ? t('practice.nextContinue') : t('home.practiceGo')} <ArrowRight size={15} aria-hidden />
          </button>
          {!settings.reminder.enabled && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                await updateSettings({ reminder: { enabled: true, background: true } })
                notify('success', t('home.reminderOn', { time: settings.reminder.time }))
              }}
            >
              <BellRing size={15} aria-hidden /> {t('home.reminderOffer')}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
