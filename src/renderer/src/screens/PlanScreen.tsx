import { useMemo, useState } from 'react'
import { ArrowRight, CalendarRange, Check, CheckCircle2, Clock3, Coffee, Gauge, Lightbulb, Play, Plus, RefreshCw, Replace, Settings2, Sparkles, Target, Upload, X } from 'lucide-react'
import type { PlanActivity } from '@shared/learning/plan'
import { daysUntil } from '@shared/learning/plan'
import { sessionMinutes } from '@shared/learning/engine'
import type { StudySkill } from '@shared/learning/taxonomy'
import { useApp } from '../lib/store'
import { useLearning } from '../lib/learning'
import { useLaunchActivity } from '../lib/launch'
import { useCalendarInfo } from '../lib/calendarInfo'
import { patternText, reasonText } from '../lib/reasons'
import { Mascot } from '../components/Mascot'
import { PlanWizard } from '../components/PlanWizard'
import { StudyCalendar } from '../components/StudyCalendar'
import { ReadinessPanel } from '../components/ReadinessPanel'
import { StudySkillChip, StudySkillIcon } from '../components/StudySkill'
import { PlanSkeleton } from '../components/ScreenSkeletons'
import { MissionsCard } from '../components/MissionsCard'
import { formatDate, t, tn } from '../i18n'

type Tab = 'today' | 'calendar' | 'readiness' | 'setup'

export function PlanScreen({ tab: initial }: { tab?: Tab }) {
  const learning = useLearning()
  const [tab, setTab] = useState<Tab>(initial ?? 'today')
  if (!learning.ready || !learning.sheets) return <PlanSkeleton />
  const config = learning.state.plan.config
  if (!config) {
    return (
      <div className="page plan-page">
        <header className="page-header">
          <div>
            <p className="eyebrow">{t('plan.eyebrow')}</p>
            <h1 className="h1">{t('plan.title')}</h1>
            <p className="text-muted measure">{t('plan.introText')}</p>
          </div>
        </header>
        <PlanWizard initial={null} onSave={(c) => learning.savePlanConfig(c)} />
      </div>
    )
  }
  const tabs: Array<{ id: Tab; label: string; icon: typeof Target }> = [
    { id: 'today', label: t('plan.tabs.today'), icon: Target },
    { id: 'calendar', label: t('plan.tabs.calendar'), icon: CalendarRange },
    { id: 'readiness', label: t('plan.tabs.readiness'), icon: Gauge },
    { id: 'setup', label: t('plan.tabs.setup'), icon: Settings2 }
  ]
  const examIn = config.examDate ? daysUntil(learning.today, config.examDate) : null
  return (
    <div className="page plan-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('plan.eyebrow')}</p>
          <h1 className="h1">{t('plan.title')}</h1>
          <p className="text-muted">
            {examIn !== null && examIn >= 0 ? tn('plan.examIn', examIn, { date: formatDate(`${config.examDate}T12:00:00`, { day: 'numeric', month: 'long' }) }) : t('plan.continuous')} · {t('plan.targetShort', { score: config.targetScore, level: config.targetLevel })}
          </p>
        </div>
      </header>
      <div className="tabs" role="tablist" aria-label={t('plan.title')}>
        {tabs.map((x) => (
          <button key={x.id} type="button" role="tab" id={`tab-${x.id}`} aria-selected={tab === x.id} aria-controls={`panel-${x.id}`} className={`tab${tab === x.id ? ' is-active' : ''}`} onClick={() => setTab(x.id)}>
            <x.icon size={16} aria-hidden /> {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tab-panel" key={tab}>
        {tab === 'today' && <TodayPanel />}
        {tab === 'calendar' && <CalendarPanel />}
        {tab === 'readiness' && <ReadinessPanel r={learning.readiness} profile={learning.profile} />}
        {tab === 'setup' && (
          <PlanWizard
            initial={config}
            onSave={(c) => {
              learning.savePlanConfig(c)
              setTab('today')
            }}
            onCancel={() => setTab('today')}
          />
        )}
      </div>
    </div>
  )
}

function CalendarPanel() {
  const learning = useLearning()
  const launch = useLaunchActivity()
  const info = useCalendarInfo()
  return <StudyCalendar today={learning.today} info={info} onMove={learning.moveActivity} onOpen={(a) => void launch(a)} />
}

export function TodayPanel() {
  const app = useApp()
  const learning = useLearning()
  const launch = useLaunchActivity()
  const session = learning.todaySession
  const [swapping, setSwapping] = useState<string | null>(null)
  if (!session) return <PlanSkeleton inline />
  const { planned, done } = sessionMinutes(session)
  const allDone = session.activities.length > 0 && session.activities.every((a) => a.status === 'done')
  const next = session.activities.find((a) => a.status === 'todo')
  const name = app.settings.userName.split(' ')[0]
  const message = session.restDay
    ? t('plan.bubiRest', { name })
    : allDone
      ? t('plan.bubiDone')
      : session.welcomeBack
        ? tn('plan.bubiWelcomeBack', session.welcomeBack, { name })
        : done > 0
          ? t('plan.bubiProgress', { left: planned - done })
          : t('plan.bubiStart', { n: session.activities.length, minutes: planned })

  return (
    <div className="plan-today">
      <section className="card today-hero" aria-labelledby="today-title">
        <Mascot mood={session.restDay ? 'resting' : allDone ? 'celebrate' : done > 0 ? 'studying' : 'calendar'} size={88} message={message} className="today-bubi" />
        <div className="today-head">
          <p className="eyebrow">{formatDate(`${session.date}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2 id="today-title" className="h2">{session.restDay ? t('plan.restTitle') : t('plan.todayTitle', { minutes: planned })}</h2>
          {!session.restDay && (
            <div className="today-meter">
              <span className="meter" aria-hidden><span style={{ width: `${planned ? (done / planned) * 100 : 0}%` }} /></span>
              <span className="text-sm tabular">{t('plan.minutesDone', { done, planned })}</span>
            </div>
          )}
          <div className="row-gap">
            {next && (
              <button type="button" className="btn btn-primary" onClick={() => void launch(next)}>
                <Play size={16} aria-hidden /> {done > 0 ? t('plan.continue') : t('plan.startSession')}
              </button>
            )}
            {session.restDay && (
              <button type="button" className="btn btn-secondary" onClick={learning.forceSessionToday}>
                <Coffee size={16} aria-hidden /> {t('plan.trainAnyway')}
              </button>
            )}
            {!session.startedAt && !session.restDay && <span className="text-subtle text-xs"><RefreshCw size={12} aria-hidden /> {t('plan.autoReplan')}</span>}
          </div>
        </div>
      </section>

      {session.activities.length > 0 && (
        <ol className="activity-list" aria-label={t('plan.activities')}>
          {session.activities.map((a, i) => (
            <ActivityCard key={a.id} a={a} index={i} swapping={swapping === a.id} onSwap={() => setSwapping(swapping === a.id ? null : a.id)} onStart={() => void launch(a)} onReplace={(r) => { learning.replaceActivity(a.id, r); setSwapping(null) }} alternatives={swapping === a.id ? learning.alternatives(a) : []} />
          ))}
        </ol>
      )}

      {session.gaps.length > 0 && <GapsCard gaps={session.gaps} />}
      <PatternsCard />
      {app.settings.gamification && <MissionsCard />}
    </div>
  )
}

function ActivityCard({ a, index, swapping, onSwap, onStart, onReplace, alternatives }: { a: PlanActivity; index: number; swapping: boolean; onSwap(): void; onStart(): void; onReplace(r: PlanActivity): void; alternatives: PlanActivity[] }) {
  const { patterns } = useLearning()
  const done = a.status === 'done'
  const canSwap = a.kind !== 'review' && a.kind !== 'errors' && !done
  return (
    <li className={`activity-card sk-${a.skill}${done ? ' is-done' : ''}`} style={{ '--i': index } as React.CSSProperties}>
      <span className="activity-icon" aria-hidden>{done ? <Check size={18} /> : <StudySkillIcon skill={a.skill} size={18} />}</span>
      <div className="activity-body">
        <div className="activity-top">
          <h3 className="activity-title">{a.kind === 'review' ? t('plan.kinds.review') : a.kind === 'errors' ? t('plan.kinds.errors') : a.title}</h3>
          <span className="pill pill-muted">{t(`plan.kinds.${a.kind}`)}</span>
        </div>
        <div className="activity-meta text-sm">
          <StudySkillChip skill={a.skill} />
          <span><Clock3 size={13} aria-hidden /> {t('plan.minutes', { n: a.minutes })}</span>
          {a.difficulty && <span className={`difficulty diff-${a.difficulty}`}>{t(`plan.difficulty.${a.difficulty}`)}</span>}
          {done && <span className="pill pill-success"><CheckCircle2 size={12} aria-hidden /> {t('plan.done')}</span>}
        </div>
        {a.reasons[0] && (
          <p className="activity-reason text-muted text-sm">
            <Lightbulb size={13} aria-hidden /> {reasonText(a.reasons[0], patterns)}
            {a.reasons[1] && <span className="text-subtle"> · {reasonText(a.reasons[1], patterns)}</span>}
          </p>
        )}
        {swapping && (
          <div className="swap-panel">
            <p className="text-sm">{alternatives.length ? t('plan.swapTitle') : t('plan.swapNone')}</p>
            <ul>
              {alternatives.map((alt) => (
                <li key={alt.id}>
                  <span>{alt.title}</span>
                  <span className="text-subtle text-sm">{t('plan.minutes', { n: alt.minutes })}</span>
                  <button type="button" className="btn btn-secondary btn-xs" onClick={() => onReplace(alt)}>
                    <Replace size={13} aria-hidden /> {t('plan.swapUse')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="activity-actions">
        {!done && (
          <button type="button" className="btn btn-primary btn-sm" onClick={onStart}>
            <Play size={14} aria-hidden /> {t('plan.start')}
          </button>
        )}
        {done && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onStart}>
            {t('plan.again')}
          </button>
        )}
        {canSwap && (
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={swapping} onClick={onSwap}>
            {swapping ? <X size={14} aria-hidden /> : <Replace size={14} aria-hidden />} {swapping ? t('common.cancel') : t('plan.swap')}
          </button>
        )}
      </div>
    </li>
  )
}

/** Destrezas sin contenido: explicación y alternativas reales. */
function GapsCard({ gaps }: { gaps: StudySkill[] }) {
  const app = useApp()
  const hasExample = app.exams.some((e) => e.isExample)
  const sheetGap = gaps.includes('useOfEnglish') || gaps.includes('reading')
  return (
    <section className="card gaps-card" aria-labelledby="gaps-title">
      <h2 id="gaps-title" className="h-small"><Upload size={16} aria-hidden /> {t('plan.gapsTitle')}</h2>
      <p className="text-muted text-sm">{t('plan.gapsText', { skills: gaps.map((g) => t(`skills.${g}`)).join(', ') })}</p>
      <div className="row-gap">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => app.navigate({ name: 'library' })}>
          <Plus size={14} aria-hidden /> {t('plan.gapsImport')}
        </button>
        {!hasExample && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              try {
                await app.createExample()
                app.notify('success', t('plan.exampleCreated'))
              } catch (e) {
                app.notify('error', String(e))
              }
            }}
          >
            <Sparkles size={14} aria-hidden /> {t('plan.gapsExample')}
          </button>
        )}
        {sheetGap && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => app.navigate({ name: 'practice' })}>
            <Sparkles size={14} aria-hidden /> {t('plan.gapsAi')}
          </button>
        )}
      </div>
    </section>
  )
}

/** Patrones detectados en tus errores (con datos reales) y acceso directo para practicarlos. */
export function PatternsCard({ limit = 3 }: { limit?: number }) {
  const app = useApp()
  const { patterns } = useLearning()
  const list = useMemo(() => patterns.slice(0, limit), [patterns, limit])
  if (!list.length) return null
  return (
    <section className="card patterns-card" aria-labelledby="patterns-title">
      <h2 id="patterns-title" className="h-small"><Lightbulb size={16} aria-hidden /> {t('patterns.title')}</h2>
      <ul className="patterns-list">
        {list.map((p) => (
          <li key={p.id}>
            <StudySkillChip skill={p.skill} compact />
            <span>{patternText(p)}</span>
            {p.category && (
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => app.navigate({ name: 'review', session: { kind: 'competency', value: p.category } })}>
                {t('patterns.practice')} <ArrowRight size={13} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

