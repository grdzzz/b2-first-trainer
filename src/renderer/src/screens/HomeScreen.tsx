// Inicio (dashboard): lo importante primero (la sesión de hoy y «Continuar estudiando») y, debajo, módulos
// que se pueden ocultar y reordenar. Divulgación progresiva: cada módulo enlaza a su pantalla completa.
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, BellRing, BookX, CalendarRange, Clock, Command, Eye, EyeOff, Flag, Flame, GripVertical, Library, NotebookPen, Play, PlayCircle, RotateCcw, Settings2, Sparkles, Trash2, Trophy } from 'lucide-react'
import { DASHBOARD_MODULES, type DashboardModule } from '@shared/types'
import { progressSummary } from '@shared/stats'
import { planMilestones, daysUntil } from '@shared/learning/plan'
import { ACHIEVEMENT_BY_ID } from '@shared/learning/achievements'
import { addDays } from '@shared/review'
import { weekStart } from '@shared/learning/streaks'
import { errorMessage, useApp } from '../lib/store'
import { useLearning } from '../lib/learning'
import { useLaunchActivity } from '../lib/launch'
import { useCalendarInfo } from '../lib/calendarInfo'
import { reasonText } from '../lib/reasons'
import { Mascot } from '../components/Mascot'
import { HomeSkeleton } from '../components/ScreenSkeletons'
import { PlacementCard } from '../components/PlacementResult'
import { ConfirmDialog } from '../components/Modal'
import { LineChart } from '../components/LineChart'
import { PaperBadge } from '../components/PaperBadge'
import { XpBar } from '../components/XpBar'
import { MissionsCard } from '../components/MissionsCard'
import { AchievementBadge } from '../components/AchievementBadge'
import { ReadinessGauge } from '../components/ReadinessPanel'
import { StudySkillIcon } from '../components/StudySkill'
import { openPalette } from '../components/CommandPalette'
import { formatDate, t, tn } from '../i18n'
import { modeLabel } from '../lib/format'

export function HomeScreen() {
  const { settings } = useApp()
  const learning = useLearning()
  if (!learning.ready || !learning.sheets) return <HomeSkeleton />
  return <Dashboard key={settings.dashboard.order.join()} />
}

function greetingNow(): string {
  const hour = new Date().getHours()
  return hour < 6 ? t('home.greetNight') : hour < 14 ? t('home.greetMorning') : hour < 21 ? t('home.greetAfternoon') : t('home.greetNight')
}

function Dashboard() {
  const app = useApp()
  const learning = useLearning()
  const launch = useLaunchActivity()
  const { settings } = app
  const [customizing, setCustomizing] = useState(false)
  const [dragging, setDragging] = useState<DashboardModule | null>(null)
  const firstName = settings.userName.split(' ')[0]
  const next = learning.todaySession?.activities.find((a) => a.status === 'todo')
  const order = settings.dashboard.order.filter((m) => DASHBOARD_MODULES.includes(m))
  const hidden = new Set(settings.dashboard.hidden)
  const gamification = settings.gamification

  const setOrder = (o: DashboardModule[]) => void app.updateSettings({ dashboard: { order: o } })
  const move = (m: DashboardModule, dir: -1 | 1) => {
    const i = order.indexOf(m)
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const o = order.slice()
    ;[o[i], o[j]] = [o[j], o[i]]
    setOrder(o)
  }
  const toggleHidden = (m: DashboardModule) => void app.updateSettings({ dashboard: { hidden: hidden.has(m) ? settings.dashboard.hidden.filter((x) => x !== m) : [...settings.dashboard.hidden, m] } })
  const dropOn = (target: DashboardModule) => {
    if (!dragging || dragging === target) return
    const o = order.filter((x) => x !== dragging)
    o.splice(o.indexOf(target), 0, dragging)
    setOrder(o)
    setDragging(null)
  }

  const modules: Record<DashboardModule, React.ReactNode> = {
    resume: app.attempts.some((a) => a.status === 'in-progress') ? <ResumeModule /> : null,
    today: <TodayModule />,
    goal: <GoalModule />,
    progress: <ProgressModule />,
    review: <ReviewModule />,
    week: <WeekModule />,
    missions: gamification ? <MissionsCard compact /> : null,
    evolution: <EvolutionModule />,
    milestones: learning.state.plan.config ? <MilestonesModule /> : null,
    achievements: gamification ? <AchievementsModule /> : null,
    quick: <QuickModule />
  }

  return (
    <div className="page home-page">
      <header className="page-header home-header">
        <div>
          <p className="eyebrow">{formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="h1">{firstName ? `${greetingNow()}, ${firstName}` : greetingNow()}</h1>
          <p className="text-muted home-sub">{learning.state.plan.config ? t('home.subPlan') : app.exams.length ? t('home.subStart') : t('home.subEmpty')}</p>
        </div>
        <div className="row-gap">
          {next ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => void launch(next)}>
              <Play size={18} aria-hidden /> {t('home.continueStudying')}
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => app.navigate({ name: 'plan' })}>
              <CalendarRange size={18} aria-hidden /> {learning.state.plan.config ? t('home.openPlan') : t('home.createPlan')}
            </button>
          )}
          <button type="button" className={`btn btn-ghost btn-sm${customizing ? ' is-active' : ''}`} aria-pressed={customizing} onClick={() => setCustomizing((v) => !v)}>
            <Settings2 size={15} aria-hidden /> {customizing ? t('home.customizeDone') : t('home.customize')}
          </button>
        </div>
      </header>

      <PlacementCard />

      {customizing && <p className="customize-hint text-sm text-muted">{t('home.customizeHint')}</p>}

      <div className={`dash-grid${customizing ? ' is-customizing' : ''}`}>
        {order.map((m) => {
          const node = modules[m]
          // Sin contenido (p. ej. ningún intento a medias): no ocupa sitio en la rejilla.
          if (!node && (!customizing || m === 'resume' || m === 'milestones')) return null
          if (hidden.has(m) && !customizing) return null
          return (
            <div
              key={m}
              className={`dash-mod mod-${m}${hidden.has(m) ? ' is-hidden' : ''}${dragging === m ? ' is-dragging' : ''}`}
              draggable={customizing}
              onDragStart={() => setDragging(m)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => customizing && e.preventDefault()}
              onDrop={() => dropOn(m)}
            >
              {customizing && (
                <div className="mod-tools">
                  <GripVertical size={15} aria-hidden className="mod-grip" />
                  <span className="mod-name">{t(`home.modules.${m}`)}</span>
                  <span className="spacer" />
                  <button type="button" className="icon-btn icon-btn-sm" onClick={() => move(m, -1)} aria-label={t('home.moveUp', { name: t(`home.modules.${m}`) })}><ArrowUp size={14} aria-hidden /></button>
                  <button type="button" className="icon-btn icon-btn-sm" onClick={() => move(m, 1)} aria-label={t('home.moveDown', { name: t(`home.modules.${m}`) })}><ArrowDown size={14} aria-hidden /></button>
                  <button type="button" className="icon-btn icon-btn-sm" onClick={() => toggleHidden(m)} aria-pressed={!hidden.has(m)} aria-label={hidden.has(m) ? t('home.show', { name: t(`home.modules.${m}`) }) : t('home.hide', { name: t(`home.modules.${m}`) })}>
                    {hidden.has(m) ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                  </button>
                </div>
              )}
              {node ?? <p className="card text-subtle text-sm">{t('home.moduleOff')}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Módulos ----------

function TodayModule() {
  const app = useApp()
  const learning = useLearning()
  const launch = useLaunchActivity()
  const session = learning.todaySession
  const name = app.settings.userName.split(' ')[0]
  if (!learning.state.plan.config) {
    return (
      <section className="card home-practice home-today" aria-labelledby="today-title">
        <Mascot mood="wave" size={88} message={t('home.bubiNoPlan', { name })} className="home-bubi" greet />
        <div className="home-practice-text">
          <p className="eyebrow">{t('home.todayEyebrow')}</p>
          <h2 id="today-title" className="h-small">{t('home.noPlanTitle')}</h2>
          <p className="text-muted text-sm">{t('home.noPlanText')}</p>
          <div className="row-gap home-practice-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => app.navigate({ name: 'plan' })}><CalendarRange size={15} aria-hidden /> {t('home.createPlan')}</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => app.navigate({ name: 'practice' })}>{t('home.practiceGo')} <ArrowRight size={15} aria-hidden /></button>
          </div>
        </div>
      </section>
    )
  }
  const acts = session?.activities ?? []
  const planned = acts.reduce((n, a) => n + a.minutes, 0)
  const done = acts.filter((a) => a.status === 'done').reduce((n, a) => n + a.minutes, 0)
  const allDone = acts.length > 0 && done === planned
  const message = session?.restDay ? t('plan.bubiRest', { name }) : allDone ? t('plan.bubiDone') : acts[0] ? reasonText(acts.find((a) => a.status === 'todo')?.reasons[0] ?? acts[0].reasons[0] ?? { code: 'neverDone' }, learning.patterns) : t('home.bubiStart')
  return (
    <section className="card home-practice home-today" aria-labelledby="today-title">
      <Mascot mood={session?.restDay ? 'resting' : allDone ? 'celebrate' : 'happy'} size={88} message={message} className="home-bubi" greet />
      <div className="home-practice-text">
        <p className="eyebrow">{t('home.todayEyebrow')}</p>
        <h2 id="today-title" className="h-small">{session?.restDay ? t('plan.restTitle') : t('plan.todayTitle', { minutes: planned })}</h2>
        {!session?.restDay && (
          <>
            <ul className="today-mini">
              {acts.slice(0, 4).map((a) => (
                <li key={a.id} className={a.status === 'done' ? 'is-done' : ''}>
                  <StudySkillIcon skill={a.skill} size={14} />
                  <span>{a.kind === 'review' ? t('plan.kinds.review') : a.kind === 'errors' ? t('plan.kinds.errors') : a.title}</span>
                  <span className="text-subtle text-xs">{t('plan.minutes', { n: a.minutes })}</span>
                </li>
              ))}
            </ul>
            <div className="home-practice-meter">
              <span className="sheet-progress-bar" aria-hidden><span style={{ width: `${planned ? (done / planned) * 100 : 0}%` }} /></span>
              <span>{t('plan.minutesDone', { done, planned })}</span>
            </div>
          </>
        )}
        <div className="row-gap home-practice-actions">
          {acts.find((a) => a.status === 'todo') && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void launch(acts.find((a) => a.status === 'todo')!)}>
              <Play size={15} aria-hidden /> {done ? t('plan.continue') : t('plan.startSession')}
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => app.navigate({ name: 'plan' })}>{t('home.seePlan')} <ArrowRight size={15} aria-hidden /></button>
          {!app.settings.reminder.enabled && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                await app.updateSettings({ reminder: { enabled: true, background: true } })
                app.notify('success', t('home.reminderOn', { time: app.settings.reminder.time }))
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

function ResumeModule() {
  const { attempts, navigate, deleteAttempt, notify } = useApp()
  const [discard, setDiscard] = useState<string | null>(null)
  const inProgress = attempts.filter((a) => a.status === 'in-progress')
  if (!inProgress.length) return null
  return (
    <section className="card resume-card" aria-labelledby="resume-title">
      <h2 id="resume-title" className="h-small">{t('home.continue')}</h2>
      <ul className="resume-list">
        {inProgress.map((a) => (
          <li key={a.id}>
            <PaperBadge type={a.paperType} />
            <span className="resume-name">{a.examName}</span>
            <span className="text-subtle text-sm">{modeLabel(a.mode)} · {formatDate(a.startedAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span className="resume-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDiscard(a.id)}><Trash2 size={15} aria-hidden /> {t('home.discard')}</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate({ name: 'attempt', attemptId: a.id })}><PlayCircle size={16} aria-hidden /> {t('home.resume')}</button>
            </span>
          </li>
        ))}
      </ul>
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
    </section>
  )
}

function GoalModule() {
  const app = useApp()
  const { readiness } = useLearning()
  return (
    <section className="card dash-card" aria-labelledby="goal-title">
      <div className="row-between">
        <h2 id="goal-title" className="h-small">{t('home.goal')}</h2>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => app.navigate({ name: 'plan', tab: 'readiness' })}>{t('home.details')} <ArrowRight size={13} aria-hidden /></button>
      </div>
      {readiness.estimate ? (
        <>
          <p className="dash-big tabular">{readiness.estimate.scale}<span className="text-subtle text-sm"> / {t('home.target', { n: readiness.target })}</span></p>
          <ReadinessGauge r={readiness} compact />
          <p className="text-subtle text-xs">{t(`readiness.conf.${readiness.confidence}`)} · {t('readiness.short')}</p>
        </>
      ) : (
        <p className="text-muted text-sm">{t('readiness.howToStart')}</p>
      )}
    </section>
  )
}

function ProgressModule() {
  const app = useApp()
  const { stats } = useLearning()
  return (
    <section className="card dash-card" aria-labelledby="prog-title">
      <h2 id="prog-title" className="h-small">{t('home.progress')}</h2>
      {app.settings.gamification && <XpBar onClick={() => app.navigate({ name: 'profile' })} />}
      <div className="dash-pair">
        <span><Flame size={16} aria-hidden className="flame" /> <strong className="tabular">{stats.streak.current}</strong> {tn('home.streakDays', stats.streak.current)}</span>
        <span className="text-subtle text-sm">{t('home.bestStreak', { n: stats.streak.best })}</span>
      </div>
    </section>
  )
}

function ReviewModule() {
  const app = useApp()
  const { due, errors } = useLearning()
  const pending = due.sheet + due.own
  const recurring = errors.filter((e) => !e.mastered && e.fails >= 3).length
  return (
    <section className="card dash-card" aria-labelledby="rev-title">
      <h2 id="rev-title" className="h-small">{t('home.reviewTitle')}</h2>
      <p className="dash-big tabular">{pending}<span className="text-subtle text-sm"> {tn('home.reviewPending', pending)}</span></p>
      <p className="text-subtle text-xs">{t('home.reviewMore', { errors: errors.filter((e) => !e.mastered).length, recurring, exam: due.exam })}</p>
      <div className="row-gap">
        {pending > 0 && <button type="button" className="btn btn-primary btn-sm" onClick={() => app.navigate({ name: 'review' })}><RotateCcw size={14} aria-hidden /> {t('home.reviewGo', { n: pending })}</button>}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => app.navigate({ name: 'notebook' })}><BookX size={14} aria-hidden /> {t('nav.notebook')}</button>
      </div>
    </section>
  )
}

function WeekModule() {
  const app = useApp()
  const learning = useLearning()
  const info = useCalendarInfo(7)
  const start = weekStart(learning.today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <section className="card dash-card dash-week" aria-labelledby="week-title">
      <div className="row-between">
        <h2 id="week-title" className="h-small">{t('home.week')}</h2>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => app.navigate({ name: 'plan', tab: 'calendar' })}>{t('home.calendar')} <ArrowRight size={13} aria-hidden /></button>
      </div>
      <ol className="week-strip">
        {days.map((d, i) => {
          const x = info(d)
          const studied = x.done.length > 0
          return (
            <li key={d} className={`${d === learning.today ? 'is-today' : ''}${studied ? ' is-studied' : ''}${x.rest ? ' is-rest' : ''}`}>
              <span className="text-subtle text-xs">{t(`weekdays.short.${i}` as 'weekdays.short.0')}</span>
              <span className="week-day tabular">{Number(d.slice(8))}</span>
              <span className="week-dots" aria-hidden>
                {Array.from(new Set([...x.done.map((y) => y.skill), ...x.planned.map((y) => y.skill)].filter(Boolean))).slice(0, 3).map((s) => <span key={s} className={`cal-dot sk-${s}${x.done.some((y) => y.skill === s) ? ' is-done' : ''}`} />)}
              </span>
              <span className="sr-only">{studied ? t('home.dayStudied') : x.rest ? t('calendar.rest') : x.planned.length ? t('home.dayPlanned') : ''}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function EvolutionModule() {
  const { attempts } = useApp()
  const summary = useMemo(() => progressSummary(attempts), [attempts])
  const app = useApp()
  return (
    <section className="card dash-card" aria-labelledby="chart-title">
      <div className="row-between">
        <h2 id="chart-title" className="h-small">{t('home.evolution')}</h2>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => app.navigate({ name: 'stats' })}>{t('nav.stats')} <ArrowRight size={13} aria-hidden /></button>
      </div>
      <LineChart series={summary.series} />
    </section>
  )
}

function MilestonesModule() {
  const learning = useLearning()
  const config = learning.state.plan.config
  const upcoming = useMemo(() => (config ? planMilestones(config, learning.today, 120).filter((m) => m.date >= learning.today && m.kind !== 'start').slice(0, 3) : []), [config, learning.today])
  if (!config) return null
  return (
    <section className="card dash-card" aria-labelledby="ms-title">
      <h2 id="ms-title" className="h-small"><Flag size={15} aria-hidden /> {t('home.milestones')}</h2>
      {upcoming.length ? (
        <ul className="ms-list">
          {upcoming.map((m) => (
            <li key={m.kind + m.date}>
              <span>{t(`milestones.${m.kind}`)}</span>
              <span className="text-subtle text-sm">{formatDate(`${m.date}T12:00:00`, { day: 'numeric', month: 'short' })} · {tn('home.inDays', daysUntil(learning.today, m.date))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted text-sm">{t('home.noMilestones')}</p>
      )}
    </section>
  )
}

function AchievementsModule() {
  const app = useApp()
  const { state } = useLearning()
  const recent = Object.entries(state.game.achievements)
    .sort((a, b) => b[1].at.localeCompare(a[1].at))
    .slice(0, 3)
    .map(([id, v]) => ({ def: ACHIEVEMENT_BY_ID.get(id), at: v.at }))
    .filter((x) => !!x.def)
  return (
    <section className="card dash-card" aria-labelledby="ach-title">
      <div className="row-between">
        <h2 id="ach-title" className="h-small"><Trophy size={15} aria-hidden /> {t('home.recentAchievements')}</h2>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => app.navigate({ name: 'achievements' })}>{t('home.seeAll')} <ArrowRight size={13} aria-hidden /></button>
      </div>
      {recent.length ? (
        <ul className="fav-list is-compact">
          {recent.map(({ def, at }) => <li key={def!.id}><AchievementBadge def={def!} unlocked size={40} /><span><strong>{def!.name}</strong><span className="text-subtle text-xs"><Clock size={11} aria-hidden /> {formatDate(at, { day: 'numeric', month: 'short' })}</span></span></li>)}
        </ul>
      ) : (
        <p className="text-muted text-sm">{t('home.noAchievements')}</p>
      )}
    </section>
  )
}

function QuickModule() {
  const app = useApp()
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
  return (
    <section className="card dash-card" aria-labelledby="quick-title">
      <h2 id="quick-title" className="h-small">{t('home.quick')}</h2>
      <div className="quick-grid">
        <button type="button" className="quick-btn" onClick={() => app.navigate({ name: 'practice' })}><NotebookPen size={18} aria-hidden /> {t('nav.practice')}</button>
        <button type="button" className="quick-btn" onClick={() => app.navigate({ name: 'review' })}><RotateCcw size={18} aria-hidden /> {t('nav.review')}</button>
        <button type="button" className="quick-btn" onClick={() => app.navigate({ name: 'library' })}><Library size={18} aria-hidden /> {t('nav.library')}</button>
        <button type="button" className="quick-btn" onClick={() => app.navigate({ name: 'notebook', add: true })}><Sparkles size={18} aria-hidden /> {t('home.quickAddError')}</button>
        <button type="button" className="quick-btn" onClick={openPalette}><Command size={18} aria-hidden /> {t('home.quickPalette', { keys: isMac ? '⌘K' : 'Ctrl K' })}</button>
      </div>
    </section>
  )
}
