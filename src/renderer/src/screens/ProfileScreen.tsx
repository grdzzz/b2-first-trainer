import { useMemo, useState } from 'react'
import { Award, CalendarCheck, Flame, Gauge, Image, Pencil, Sparkles, Star, Timer, Trophy } from 'lucide-react'
import { ACHIEVEMENT_BY_ID } from '@shared/learning/achievements'
import { levelInfo, RANKS, xpByDay, xpHistory, type XpEntry } from '@shared/learning/game'
import { masteredCompetencies } from '@shared/learning/competency'
import { competency } from '@shared/learning/taxonomy'
import { PAPER_ORDER } from '@shared/types'
import { useApp } from '../lib/store'
import { useLearning } from '../lib/learning'
import { MascotSvg } from '../components/Mascot'
import { XpBar } from '../components/XpBar'
import { AchievementBadge } from '../components/AchievementBadge'
import { Heatmap, minutesByDay } from '../components/Heatmap'
import { ProgressCardModal } from '../components/ProgressCard'
import { ReadinessGauge } from '../components/ReadinessPanel'
import { paperLabel } from '../components/PaperBadge'
import { ProfileSkeleton } from '../components/ScreenSkeletons'
import { formatDate, t, tn } from '../i18n'

const AVATAR_COLORS = ['indigo', 'teal', 'violet', 'rose', 'amber', 'green']

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || 'B2'
}

export function ProfileScreen() {
  const app = useApp()
  const learning = useLearning()
  const [exporting, setExporting] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const { state, stats, level, rank } = learning
  const legacyDays = useMemo(() => app.practiceProgress.flatMap((p) => p.days ?? []), [app.practiceProgress])
  const minutes = useMemo(() => minutesByDay(Object.values(state.game.activity), legacyDays), [state.game.activity, legacyDays])
  const milestones = useMemo(() => buildMilestones(state.game.ledger, state.game.achievements, state.plan.config?.startedAt), [state.game.ledger, state.game.achievements, state.plan.config?.startedAt])
  if (!learning.ready) return <ProfileSkeleton />

  const totalMinutes = Array.from(minutes.values()).reduce((a, b) => a + b, 0)
  const avatar = state.game.profile.avatar
  const favorites = state.game.profile.favorites.map((id) => ACHIEVEMENT_BY_ID.get(id)).filter((d): d is NonNullable<typeof d> => !!d && !!state.game.achievements[d.id])
  const bestByPaper = PAPER_ORDER.map((p) => ({ p, best: Math.max(-1, ...Object.values(state.game.activity).filter((a) => a.kind === 'exam' && a.paperType === p && a.mode !== 'review' && typeof a.percent === 'number').map((a) => a.percent as number)) }))
  const bestDayXp = Math.max(0, ...xpByDay(state.game).values())
  const mastered = masteredCompetencies(learning.profile)
  const history = xpHistory(state.game, 12)
  const nextRank = rank.next

  return (
    <div className="page profile-page">
      <section className="card profile-hero">
        <button type="button" className={`avatar avatar-${avatar.kind} color-${avatar.color}`} onClick={() => setAvatarOpen((v) => !v)} aria-expanded={avatarOpen} aria-label={t('profile.changeAvatar')}>
          {avatar.kind === 'bubi' && app.settings.mascot ? <MascotSvg mood="welcome" size={96} /> : <span className="avatar-initials">{initials(app.settings.userName)}</span>}
        </button>
        <div className="profile-id">
          <p className="eyebrow">{t('profile.eyebrow')}</p>
          <h1 className="h1">{app.settings.userName || t('profile.noName')}</h1>
          {app.settings.gamification && <p className="text-muted">{t('profile.levelRank', { level: level.level, rank: rank.name })}{nextRank ? ` · ${t('profile.nextRank', { rank: nextRank.name, level: nextRank.from })}` : ''}</p>}
          {app.settings.gamification && <XpBar />}
          <div className="row-gap">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExporting(true)}><Image size={15} aria-hidden /> {t('profile.exportCard')}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => app.navigate({ name: 'settings', section: 'profile' })}><Pencil size={14} aria-hidden /> {t('profile.editName')}</button>
          </div>
        </div>
        {avatarOpen && (
          <div className="avatar-picker" role="group" aria-label={t('profile.changeAvatar')}>
            <div className="seg seg-small">
              <button type="button" className={`seg-btn${avatar.kind === 'bubi' ? ' is-active' : ''}`} aria-pressed={avatar.kind === 'bubi'} onClick={() => learning.setProfile({ avatar: { ...avatar, kind: 'bubi' } })}>Bubi</button>
              <button type="button" className={`seg-btn${avatar.kind === 'initials' ? ' is-active' : ''}`} aria-pressed={avatar.kind === 'initials'} onClick={() => learning.setProfile({ avatar: { ...avatar, kind: 'initials' } })}>{t('profile.initials')}</button>
            </div>
            <div className="swatches">
              {AVATAR_COLORS.map((c) => (
                <button key={c} type="button" className={`swatch color-${c}${avatar.color === c ? ' is-active' : ''}`} aria-pressed={avatar.color === c} aria-label={t(`appearance.accents.${c}` as 'appearance.accents.indigo')} onClick={() => learning.setProfile({ avatar: { ...avatar, color: c } })} />
              ))}
            </div>
            {avatar.kind === 'bubi' && <button type="button" className="btn btn-ghost btn-xs" onClick={() => app.navigate({ name: 'wardrobe' })}>{t('profile.openWardrobe')}</button>}
          </div>
        )}
      </section>

      <section className="stats-row profile-stats" aria-label={t('profile.summary')}>
        <div className="stat"><span className="stat-icon" aria-hidden><Timer size={20} /></span><span className="stat-value">{totalMinutes >= 60 ? `${(totalMinutes / 60).toFixed(1)} h` : `${Math.round(totalMinutes)} min`}</span><span className="stat-label">{t('profile.studyTime')}</span></div>
        <div className="stat"><span className="stat-icon" aria-hidden><CalendarCheck size={20} /></span><span className="stat-value tabular">{stats.streak.totalDays}</span><span className="stat-label">{t('profile.studyDays')}</span></div>
        <div className="stat"><span className="stat-icon" aria-hidden><Flame size={20} /></span><span className="stat-value tabular">{stats.streak.current}<span className="stat-unit"> / {stats.streak.best}</span></span><span className="stat-label">{t('profile.streaks')}</span></div>
        <div className="stat"><span className="stat-icon" aria-hidden><Gauge size={20} /></span><span className="stat-value tabular">{Math.round(stats.streak.consistency * 100)}%</span><span className="stat-label">{t('profile.consistency')}</span></div>
      </section>

      <div className="two-col">
        <section className="card" aria-labelledby="goal-title">
          <h2 id="goal-title" className="section-title">{t('profile.goal')}</h2>
          {learning.readiness.estimate ? (
            <>
              <p className="text-sm">{t('profile.goalText', { scale: learning.readiness.estimate.scale, target: learning.readiness.target })}</p>
              <ReadinessGauge r={learning.readiness} compact />
              <p className="text-subtle text-xs">{t(`readiness.conf.${learning.readiness.confidence}`)} · {t('readiness.short')}</p>
            </>
          ) : (
            <p className="text-muted text-sm">{t('readiness.howToStart')}</p>
          )}
          <h3 className="h-small profile-sub">{t('profile.mastered')}</h3>
          {mastered.length ? <div className="chip-row">{mastered.map((id) => <span key={id} className="chip is-static">{competency(id)?.label}</span>)}</div> : <p className="text-muted text-sm">{t('profile.masteredNone')}</p>}
        </section>
        <section className="card" aria-labelledby="records-title">
          <h2 id="records-title" className="section-title"><Trophy size={17} aria-hidden /> {t('profile.records')}</h2>
          <dl className="records">
            {bestByPaper.map(({ p, best }) => <div key={p}><dt>{t('profile.bestPaper', { paper: paperLabel(p) })}</dt><dd className="tabular">{best >= 0 ? `${Math.round(best)}%` : '—'}</dd></div>)}
            <div><dt>{t('profile.perfectSheets')}</dt><dd className="tabular">{stats.perfectSheets}</dd></div>
            <div><dt>{t('profile.bestStreak')}</dt><dd className="tabular">{tn('profile.days', stats.streak.best)}</dd></div>
            <div><dt>{t('profile.mostMinutes')}</dt><dd className="tabular">{Math.round(stats.maxMinutesDay)} min</dd></div>
            {app.settings.gamification && <div><dt>{t('profile.mostXp')}</dt><dd className="tabular">{bestDayXp} XP</dd></div>}
            <div><dt>{t('profile.errorsMastered')}</dt><dd className="tabular">{stats.mastered}</dd></div>
          </dl>
        </section>
      </div>

      <section className="card" aria-labelledby="heat-title">
        <h2 id="heat-title" className="section-title">{t('profile.activity')}</h2>
        <Heatmap minutesByDay={minutes} today={learning.today} />
        <p className="text-subtle text-xs">{t('profile.activityHint', { weeks: stats.streak.activeWeeks, rest: stats.streak.restDays28 })}</p>
      </section>

      {app.settings.gamification && (
        <div className="two-col">
          <section className="card" aria-labelledby="fav-title">
            <div className="row-between">
              <h2 id="fav-title" className="section-title"><Star size={17} aria-hidden /> {t('profile.favorites')}</h2>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => app.navigate({ name: 'achievements' })}>{t('profile.allAchievements')}</button>
            </div>
            {favorites.length ? (
              <ul className="fav-list">
                {favorites.map((d) => <li key={d.id}><AchievementBadge def={d} unlocked size={52} /><span><strong>{d.name}</strong><span className="text-muted text-sm">{d.description}</span></span></li>)}
              </ul>
            ) : (
              <p className="text-muted text-sm">{t('profile.noFavorites')}</p>
            )}
          </section>
          <section className="card" aria-labelledby="xp-title">
            <h2 id="xp-title" className="section-title"><Sparkles size={17} aria-hidden /> {t('profile.xpHistory')}</h2>
            {history.length ? (
              <ul className="xp-history">
                {history.map((e) => <li key={e.id}><span>{t(`xp.reasons.${e.reason}`)}</span><span className="text-subtle text-xs">{formatDate(e.at, { day: 'numeric', month: 'short' })}{e.retro ? ` · ${t('xp.retro')}` : ''}</span><span className="mission-xp tabular">+{e.xp}</span></li>)}
              </ul>
            ) : (
              <p className="text-muted text-sm">{t('profile.noXp')}</p>
            )}
          </section>
        </div>
      )}

      <section className="card" aria-labelledby="ms-title">
        <h2 id="ms-title" className="section-title"><Award size={17} aria-hidden /> {t('profile.milestones')}</h2>
        {milestones.length ? (
          <ol className="timeline">
            {milestones.slice(0, 14).map((m, i) => <li key={i}><time className="text-subtle text-xs">{formatDate(m.at)}</time><span>{m.label}</span></li>)}
          </ol>
        ) : (
          <p className="text-muted text-sm">{t('profile.noMilestones')}</p>
        )}
      </section>

      {exporting && <ProgressCardModal onClose={() => setExporting(false)} />}
    </div>
  )
}

/** Hitos: niveles alcanzados (según el registro de XP), logros y el inicio del plan. */
function buildMilestones(ledger: Record<string, XpEntry>, achievements: Record<string, { at: string; retro?: boolean }>, planStart?: string): Array<{ at: string; label: string }> {
  const out: Array<{ at: string; label: string }> = []
  const entries = Object.values(ledger).sort((a, b) => a.at.localeCompare(b.at))
  let xp = 0
  let level = 1
  for (const e of entries) {
    xp += e.xp
    const l = levelInfo(xp).level
    if (l > level) {
      for (let k = level + 1; k <= l; k++) if (RANKS.some((r) => r.from === k) || k % 5 === 0) out.push({ at: e.at, label: t('profile.msLevel', { level: k, rank: RANKS.filter((r) => r.from <= k).pop()!.name }) })
      level = l
    }
  }
  for (const [id, a] of Object.entries(achievements)) {
    const d = ACHIEVEMENT_BY_ID.get(id)
    if (d) out.push({ at: a.at, label: t('profile.msAchievement', { name: d.name }) })
  }
  if (planStart) out.push({ at: planStart, label: t('profile.msPlan') })
  return out.sort((a, b) => b.at.localeCompare(a.at))
}
