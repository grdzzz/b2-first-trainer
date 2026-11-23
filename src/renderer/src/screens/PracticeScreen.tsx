import { useMemo, useState } from 'react'
import { ArrowRight, Check, Clock3, Flame, Play, RotateCcw, Sparkles, Target, Trash2, Trophy, UserRound } from 'lucide-react'
import { countItems, localDay, nextSheet, practiceStats, PRACTICE_SKILLS, type PracticeProgress, type PracticeSheet, type PracticeSkill } from '@shared/practice'
import { reviewSummary } from '@shared/review'
import { Mascot } from '../components/Mascot'
import { errorMessage, useApp } from '../lib/store'
import { useAllSheets } from '../lib/practice'
import { ProgressRing } from '../components/ProgressRing'
import { CountUp } from '../components/CountUp'
import { ConfirmDialog } from '../components/Modal'
import { SKILL_ICON, SkillBadge, skillLabel } from '../components/SkillBadge'
import { CreateSheetsModal } from '../components/CreateSheetsModal'
import { formatDate, t, tn } from '../i18n'

type SkillFilter = PracticeSkill | 'all' | 'mine'
type StatusFilter = 'all' | 'todo' | 'done'

function remembered<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback
  } catch {
    return fallback
  }
}
function remember(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignorar */
  }
}

export function PracticeScreen() {
  const app = useApp()
  const sheets = useAllSheets()
  // Filtro recordado; si era «Mis hojas» y ya no queda ninguna (o es un valor desconocido), se empieza en «Todas».
  const [skill, setSkillState] = useState<SkillFilter>(() => {
    const r = remembered<SkillFilter>('practice-skill', 'all')
    if (r === 'mine') return app.customSheets.length ? 'mine' : 'all'
    return r === 'all' || PRACTICE_SKILLS.includes(r) ? r : 'all'
  })
  const [status, setStatusState] = useState<StatusFilter>(() => remembered('practice-status', 'all'))
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<PracticeSheet | null>(null)
  const setSkill = (s: SkillFilter) => (setSkillState(s), remember('practice-skill', s))
  const setStatus = (s: StatusFilter) => (setStatusState(s), remember('practice-status', s))

  const progressById = useMemo(() => new Map(app.practiceProgress.map((p) => [p.id, p])), [app.practiceProgress])
  const stats = useMemo(() => (sheets ? practiceStats(sheets, app.practiceProgress) : null), [sheets, app.practiceProgress])
  const next = useMemo(() => (sheets ? nextSheet(sheets, app.practiceProgress) : null), [sheets, app.practiceProgress])

  if (!sheets || !stats) {
    return (
      <div className="page">
        <p className="text-muted" aria-busy="true">{t('practice.loading')}</p>
      </div>
    )
  }

  const mineCount = sheets.filter((s) => !s.builtIn).length
  const visible = sheets.filter((s) => {
    if (skill === 'mine' ? s.builtIn : skill !== 'all' && s.skill !== skill) return false
    const done = (progressById.get(s.id)?.times ?? 0) > 0
    return status === 'all' || (status === 'done' ? done : !done)
  })
  const nextProgress = next ? progressById.get(next.id) : undefined
  const nextStarted = !!nextProgress && !nextProgress.checked && Object.keys(nextProgress.answers).length > 0
  const allDone = stats.done === stats.total && stats.total > 0

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('practice.eyebrow')}</p>
          <h1 className="h1">{t('practice.title')}</h1>
          <p className="text-muted measure practice-sub">{t('practice.sub')}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          <Sparkles size={18} aria-hidden /> {t('practice.create')}
        </button>
      </header>

      <section className="card practice-hero" aria-labelledby="next-title">
        {next && (
          <div className={`practice-next skill-${next.skill}`}>
            <p className="eyebrow">{allDone ? t('practice.allDoneTitle') : t('practice.nextEyebrow')}</p>
            <h2 id="next-title" className="practice-next-title">{next.title}</h2>
            <div className="sheet-meta">
              <SkillBadge skill={next.skill} />
              <span>{next.topic}</span>
              <span><Clock3 size={14} aria-hidden /> {t('practice.minutes', { n: next.minutes })}</span>
              <span>{t('practice.items', { n: countItems(next) })}</span>
            </div>
            <p className="text-muted">{allDone ? t('practice.allDoneText') : next.focus}</p>
            <button type="button" className="btn btn-primary btn-lg practice-next-btn" onClick={() => app.navigate({ name: 'sheet', sheetId: next.id })}>
              {nextStarted ? <Play size={18} aria-hidden /> : <ArrowRight size={18} aria-hidden />}
              {nextStarted ? t('practice.nextContinue') : allDone ? t('practice.nextAgain') : t('practice.nextStart')}
            </button>
          </div>
        )}
        <div className="practice-stats">
          <ProgressRing value={(stats.done / Math.max(1, stats.total)) * 100} size={118} stroke={10} label={`${stats.done} / ${stats.total} ${t('practice.statDone')}`}>
            <span className="practice-ring-value tabular"><CountUp value={stats.done} /></span>
            <span className="ring-caption">/ {stats.total}</span>
          </ProgressRing>
          <div className="practice-stat-list">
            <div className="practice-stat">
              <span className="practice-stat-icon" aria-hidden><Check size={16} /></span>
              <span><strong className="tabular"><CountUp value={stats.done} /></strong> {t('practice.statDone')}</span>
            </div>
            <div className="practice-stat">
              <span className="practice-stat-icon" aria-hidden><Target size={16} /></span>
              <span><strong className="tabular">{stats.average !== null ? <><CountUp value={stats.average} /> %</> : '—'}</strong> {t('practice.statAverage')}</span>
            </div>
            <div className={`practice-stat${stats.streak > 0 ? ' is-hot' : ''}`} title={t('practice.streakHint')}>
              <span className="practice-stat-icon" aria-hidden><Flame size={16} /></span>
              <span><strong className="tabular"><CountUp value={stats.streak} /></strong> {stats.streak === 1 ? t('practice.statStreakOne') : t('practice.statStreak')}</span>
            </div>
          </div>
        </div>
      </section>

      <ReviewBanner />

      <div className="practice-filters">
        <div className="seg" role="group" aria-label={t('practice.filterSkill')}>
          <button type="button" className={`seg-btn${skill === 'all' ? ' is-active' : ''}`} aria-pressed={skill === 'all'} onClick={() => setSkill('all')}>
            {t('practice.all')} <span className="seg-count tabular">{stats.done}/{stats.total}</span>
          </button>
          {PRACTICE_SKILLS.map((s) => {
            const Icon = SKILL_ICON[s]
            const k = stats.bySkill[s]
            if (!k.total) return null
            return (
              <button key={s} type="button" className={`seg-btn skill-${s}${skill === s ? ' is-active' : ''}`} aria-pressed={skill === s} onClick={() => setSkill(s)}>
                <Icon size={15} aria-hidden /> {skillLabel(s, true)} <span className="seg-count tabular">{k.done}/{k.total}</span>
              </button>
            )
          })}
          <button type="button" className={`seg-btn${skill === 'mine' ? ' is-active' : ''}`} aria-pressed={skill === 'mine'} onClick={() => setSkill('mine')}>
            <UserRound size={15} aria-hidden /> {t('practice.mine')} <span className="seg-count tabular">{mineCount}</span>
          </button>
        </div>
        <div className="seg seg-small" role="group" aria-label={t('practice.filterStatus')}>
          {(['all', 'todo', 'done'] as const).map((s) => (
            <button key={s} type="button" className={`seg-btn${status === s ? ' is-active' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
              {t(s === 'all' ? 'practice.statusAll' : s === 'todo' ? 'practice.statusTodo' : 'practice.statusDone')}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card empty-state">
          <Mascot mood={skill === 'mine' && mineCount === 0 ? 'wave' : 'think'} size={88} layout="below" message={skill === 'mine' && mineCount === 0 ? t('practice.emptyMine') : t('practice.empty')} />
          {skill === 'mine' && (
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              <Sparkles size={16} aria-hidden /> {t('practice.create')}
            </button>
          )}
        </div>
      ) : (
        <ul className="sheet-grid" key={`${skill}-${status}`}>
          {visible.map((s) => (
            <SheetCard key={s.id} sheet={s} progress={progressById.get(s.id)} onOpen={() => app.navigate({ name: 'sheet', sheetId: s.id })} onDelete={s.builtIn ? undefined : () => setToDelete(s)} />
          ))}
        </ul>
      )}

      {creating && (
        <CreateSheetsModal
          onClose={() => setCreating(false)}
          onAdded={() => {
            setCreating(false)
            setSkill('mine')
            setStatus('all')
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={t('practice.deleteTitle')}
        message={t('practice.deleteMessage', { name: toDelete?.title ?? '' })}
        confirmLabel={t('common.delete')}
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const s = toDelete!
          setToDelete(null)
          try {
            await app.deletePracticeSheet(s.id)
            app.notify('success', t('practice.deleted'))
          } catch (e) {
            app.notify('error', errorMessage(e))
          }
        }}
      />
    </div>
  )
}

function SheetCard({ sheet, progress, onOpen, onDelete }: { sheet: PracticeSheet; progress?: PracticeProgress; onOpen(): void; onDelete?(): void }) {
  const Icon = SKILL_ICON[sheet.skill]
  const done = (progress?.times ?? 0) > 0
  const started = !!progress && !progress.checked && Object.keys(progress.answers).length > 0
  const total = progress?.total ?? countItems(sheet)
  const best = progress?.best ?? 0
  const pct = total ? best / total : 0
  const tone = pct >= 0.8 ? 'great' : pct >= 0.6 ? 'good' : 'low'
  return (
    <li className={`sheet-card skill-${sheet.skill}${done ? ' is-done' : ''}`}>
      <button type="button" className="sheet-card-main" onClick={onOpen}>
        <span className="sheet-card-top">
          <span className="sheet-card-icon" aria-hidden><Icon size={18} /></span>
          <span className="sheet-card-num tabular">{sheet.number ? String(sheet.number).padStart(2, '0') : <UserRound size={16} aria-label={t('practice.custom')} />}</span>
        </span>
        <span className="sheet-card-title">{sheet.title}</span>
        <span className="sheet-card-sub">{skillLabel(sheet.skill)} · {sheet.topic}</span>
        <span className="sheet-card-foot">
          <span className="text-subtle"><Clock3 size={13} aria-hidden /> {t('practice.minutes', { n: sheet.minutes })}</span>
          {done ? (
            <span className={`sheet-score score-${tone}`}>
              {tone === 'great' ? <Trophy size={13} aria-hidden /> : <Check size={13} aria-hidden />} {best}/{total}
            </span>
          ) : started ? (
            <span className="pill pill-warning">{t('practice.inProgress')}</span>
          ) : null}
        </span>
      </button>
      {onDelete && (
        <button type="button" className="icon-btn icon-btn-sm sheet-card-delete" onClick={onDelete} aria-label={`${t('practice.deleteSheet')}: ${sheet.title}`} title={t('practice.deleteSheet')}>
          <Trash2 size={14} aria-hidden />
        </button>
      )}
    </li>
  )
}

/** Repaso de fallos: cuántas preguntas tocan hoy. */
function ReviewBanner() {
  const app = useApp()
  const sheets = useAllSheets()
  if (!sheets) return null
  const today = localDay()
  const r = reviewSummary(sheets, app.practiceProgress, today)
  const text = r.due > 0 ? tn('review.cardDue', r.due) : r.total > 0 ? t('review.cardNone', { date: formatDate(r.nextDue ?? today, { weekday: 'long', day: 'numeric', month: 'long' }) }) : t('review.cardEmpty')
  return (
    <section className={`card review-banner${r.due > 0 ? ' has-due' : ''}`} aria-labelledby="review-banner-title">
      <Mascot mood={r.due > 0 ? 'think' : r.total > 0 ? 'happy' : 'wave'} size={64} />
      <div className="review-banner-text">
        <h2 id="review-banner-title" className="h-small">
          <RotateCcw size={16} aria-hidden /> {t('review.cardTitle')}
          {r.due > 0 && <span className="review-count tabular">{r.due}</span>}
        </h2>
        <p className="text-muted text-sm">{text}{r.mastered > 0 ? ` · ${t('review.cardMastered', { n: r.mastered })}` : ''}</p>
      </div>
      {r.due > 0 && (
        <button type="button" className="btn btn-primary" onClick={() => app.navigate({ name: 'review' })}>
          <RotateCcw size={16} aria-hidden /> {t('review.cardGo')}
        </button>
      )}
    </section>
  )
}
