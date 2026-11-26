import { useMemo, useState } from 'react'
import { Lock, Search, Star } from 'lucide-react'
import { ACHIEVEMENT_CATEGORIES, achievementViews, achievementXp, RARITIES, type AchievementCategory, type AchievementView, type Rarity } from '@shared/learning/achievements'
import { COSMETIC_BY_ID } from '@shared/learning/cosmetics'
import { fuzzyScore } from '@shared/fuzzy'
import { useApp } from '../lib/store'
import { useLearning } from '../lib/learning'
import { AchievementBadge } from '../components/AchievementBadge'
import { ProgressRing } from '../components/ProgressRing'
import { Modal } from '../components/Modal'
import { AchievementsSkeleton } from '../components/ScreenSkeletons'
import { EmptyState } from '../components/EmptyState'
import { formatDate, t } from '../i18n'

type Status = 'all' | 'unlocked' | 'locked'

export function AchievementsScreen() {
  const app = useApp()
  const learning = useLearning()
  const [cat, setCat] = useState<AchievementCategory | 'all'>('all')
  const [rarity, setRarity] = useState<Rarity | 'all'>('all')
  const [status, setStatus] = useState<Status>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<AchievementView | null>(null)
  const views = useMemo(() => achievementViews(learning.stats, learning.state.game.achievements), [learning.stats, learning.state.game.achievements])
  if (!learning.ready) return <AchievementsSkeleton />
  if (!app.settings.gamification) {
    return (
      <div className="page">
        <EmptyState title={t('achievements.offTitle')} mood="resting" text={t('achievements.offText')} actions={<button type="button" className="btn btn-primary" onClick={() => app.navigate({ name: 'settings', section: 'appearance' })}>{t('achievements.offGo')}</button>} />
      </div>
    )
  }
  const unlocked = views.filter((v) => v.unlockedAt).length
  const favorites = learning.state.game.profile.favorites
  const visible = views.filter((v) => {
    if (cat !== 'all' && v.def.category !== cat) return false
    if (rarity !== 'all' && v.def.rarity !== rarity) return false
    if (status === 'unlocked' && !v.unlockedAt) return false
    if (status === 'locked' && v.unlockedAt) return false
    if (query.trim()) {
      const hidden = v.def.secret && !v.unlockedAt
      if (fuzzyScore(query, hidden ? (v.def.hint ?? '') : `${v.def.name} ${v.def.description}`) <= 0) return false
    }
    return true
  })
  const recent = views.filter((v) => v.unlockedAt && Date.now() - Date.parse(v.unlockedAt) < 60_000)
  const toggleFav = (id: string) => learning.setProfile({ favorites: favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id].slice(-3) })

  return (
    <div className="page achievements-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('achievements.eyebrow')}</p>
          <h1 className="h1">{t('achievements.title')}</h1>
          <p className="text-muted">{t('achievements.sub')}</p>
        </div>
        <ProgressRing value={(unlocked / views.length) * 100} size={96} stroke={9} label={t('achievements.progress', { n: unlocked, total: views.length })}>
          <span className="practice-ring-value tabular">{unlocked}</span>
          <span className="ring-caption">/ {views.length}</span>
        </ProgressRing>
      </header>

      <div className="ach-filters">
        <label className="search-box">
          <Search size={16} aria-hidden />
          <span className="sr-only">{t('achievements.search')}</span>
          <input type="search" className="input" placeholder={t('achievements.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="seg seg-small" role="group" aria-label={t('achievements.status')}>
          {(['all', 'unlocked', 'locked'] as Status[]).map((s) => <button key={s} type="button" className={`seg-btn${status === s ? ' is-active' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>{t(`achievements.statuses.${s}`)}</button>)}
        </div>
        <label className="sort-select">
          <span className="sr-only">{t('achievements.rarityFilter')}</span>
          <select className="input input-sm" value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | 'all')}>
            <option value="all">{t('achievements.allRarities')}</option>
            {RARITIES.map((r) => <option key={r} value={r}>{t(`achievements.rarity.${r}`)}</option>)}
          </select>
        </label>
      </div>
      <div className="chip-row ach-cats" role="group" aria-label={t('achievements.category')}>
        <button type="button" className={`chip${cat === 'all' ? ' is-active' : ''}`} aria-pressed={cat === 'all'} onClick={() => setCat('all')}>{t('achievements.allCategories')}</button>
        {ACHIEVEMENT_CATEGORIES.map((c) => {
          const n = views.filter((v) => v.def.category === c)
          return (
            <button key={c} type="button" className={`chip${cat === c ? ' is-active' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>
              {t(`achievements.categories.${c}`)} <span className="tabular text-subtle">{n.filter((v) => v.unlockedAt).length}/{n.length}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="card text-muted">{t('achievements.none')}</p>
      ) : (
        <ul className="ach-grid">
          {visible.map((v) => {
            const hidden = v.def.secret && !v.unlockedAt
            const p = v.progress
            return (
              <li key={v.def.id} className={`ach-card rarity-${v.def.rarity}${v.unlockedAt ? ' is-unlocked' : ''}${recent.includes(v) ? ' just-unlocked' : ''}`}>
                <button type="button" className="ach-card-main" onClick={() => setOpen(v)}>
                  <AchievementBadge def={v.def} unlocked={!!v.unlockedAt} />
                  <span className="ach-name">{hidden ? t('achievements.secret') : v.def.name}</span>
                  <span className="ach-desc text-muted text-sm">{hidden ? v.def.hint : v.def.description}</span>
                  {v.unlockedAt ? (
                    <span className="ach-date text-subtle text-xs">{v.retro ? t('achievements.retro') : formatDate(v.unlockedAt)}</span>
                  ) : p.target ? (
                    <span className="ach-progress">
                      <span className="meter" aria-hidden><span style={{ width: `${((p.current ?? 0) / p.target) * 100}%` }} /></span>
                      <span className="text-subtle text-xs tabular">{p.current}/{p.target}</span>
                    </span>
                  ) : (
                    <span className="text-subtle text-xs"><Lock size={11} aria-hidden /> {t('achievements.locked')}</span>
                  )}
                  <span className={`rarity-tag r-${v.def.rarity}`}>{t(`achievements.rarity.${v.def.rarity}`)}</span>
                </button>
                {v.unlockedAt && (
                  <button type="button" className={`icon-btn icon-btn-sm ach-fav${favorites.includes(v.def.id) ? ' is-on' : ''}`} aria-pressed={favorites.includes(v.def.id)} aria-label={t('achievements.favorite', { name: v.def.name })} title={t('achievements.favoriteHint')} onClick={() => toggleFav(v.def.id)}>
                    <Star size={14} aria-hidden />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={!!open} title={open ? (open.def.secret && !open.unlockedAt ? t('achievements.secret') : open.def.name) : ''} onClose={() => setOpen(null)} size="sm">
        {open && (
          <div className="ach-detail">
            <AchievementBadge def={open.def} unlocked={!!open.unlockedAt} size={96} />
            <p>{open.def.secret && !open.unlockedAt ? open.def.hint : open.def.description}</p>
            <dl className="detail-stats">
              <div><dt>{t('achievements.categoryLabel')}</dt><dd>{t(`achievements.categories.${open.def.category}`)}</dd></div>
              <div><dt>{t('achievements.rarityLabel')}</dt><dd>{t(`achievements.rarity.${open.def.rarity}`)}</dd></div>
              <div><dt>{t('achievements.reward')}</dt><dd>+{achievementXp(open.def)} XP{open.def.cosmetic ? ` · ${COSMETIC_BY_ID.get(open.def.cosmetic)?.name}` : ''}</dd></div>
              <div><dt>{t('achievements.unlockedAt')}</dt><dd>{open.unlockedAt ? (open.retro ? t('achievements.retro') : formatDate(open.unlockedAt, { dateStyle: 'long' })) : open.progress.target ? `${open.progress.current}/${open.progress.target}` : '—'}</dd></div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  )
}
