import { useState } from 'react'
import { Check, EyeOff, Lock } from 'lucide-react'
import { COSMETICS, isUnlocked, unlockedCosmetics, BUBI_COLORS, type CosmeticDef } from '@shared/learning/cosmetics'
import { ACHIEVEMENT_BY_ID } from '@shared/learning/achievements'
import { COSMETIC_SLOTS, type CosmeticSlot } from '@shared/learning/game'
import type { BubiBase, BubiSignal } from '@shared/mascot'
import { useApp } from '../lib/store'
import { useLearning } from '../lib/learning'
import { useOutfit } from '../lib/bubi'
import { MascotSvg } from '../components/Mascot'
import { EmptyState } from '../components/EmptyState'
import { WardrobeSkeleton } from '../components/ScreenSkeletons'
import { t } from '../i18n'

const POSES: BubiBase[] = ['idle', 'reading', 'writing', 'computer', 'music', 'calendar', 'solving', 'studying', 'trophy', 'dance', 'yawn', 'resting', 'sleeping', 'thinking']
const REACTIONS: BubiSignal[] = ['happy', 'celebration', 'levelUp', 'achievement', 'sad']

export function WardrobeScreen() {
  const app = useApp()
  const learning = useLearning()
  const equipped = useOutfit()
  const [slot, setSlot] = useState<CosmeticSlot>('color')
  const [pose, setPose] = useState<BubiBase>('idle')
  const [react, setReact] = useState<{ s: BubiSignal; k: number } | null>(null)
  const [preview, setPreview] = useState<CosmeticDef | null>(null)
  if (!learning.ready) return <WardrobeSkeleton />
  if (!app.settings.mascot) {
    return (
      <div className="page">
        <EmptyState title={t('wardrobe.hiddenTitle')} text={t('wardrobe.hiddenText')} actions={<button type="button" className="btn btn-primary" onClick={() => void app.updateSettings({ mascot: true })}>{t('wardrobe.show')}</button>} />
      </div>
    )
  }
  const level = learning.level.level
  const ach = learning.state.game.achievements
  const unlockedCount = learning.admin ? COSMETICS.length : unlockedCosmetics(level, ach).length
  const outfit = preview ? { ...equipped, [preview.slot]: preview.id } : equipped
  const items = COSMETICS.filter((c) => c.slot === slot)

  return (
    <div className="page wardrobe-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('wardrobe.eyebrow')}</p>
          <h1 className="h1">{t('wardrobe.title')}</h1>
          <p className="text-muted">{t('wardrobe.sub', { n: unlockedCount, total: COSMETICS.length })}</p>
          {learning.admin && <p className="admin-note text-sm">{t('admin.wardrobeNote')}</p>}
        </div>
      </header>
      <div className="wardrobe">
        <section className="card wardrobe-stage" aria-label={t('wardrobe.preview')}>
          <div className="stage-bubi">
            <MascotSvg mood={pose} size={200} outfit={outfit} react={react?.s} reactKey={react?.k} />
          </div>
          {preview && <p className="text-sm stage-note">{t('wardrobe.previewing', { name: preview.name })}</p>}
          <div className="stage-controls">
            <label className="field">
              <span className="field-label">{t('wardrobe.pose')}</span>
              <select className="input input-sm" value={pose} onChange={(e) => setPose(e.target.value as BubiBase)}>
                {POSES.map((p) => <option key={p} value={p}>{t(`wardrobe.poses.${p}` as 'wardrobe.poses.idle')}</option>)}
              </select>
            </label>
            <div className="chip-row">
              {REACTIONS.map((r) => <button key={r} type="button" className="chip" onClick={() => setReact((x) => ({ s: r, k: (x?.k ?? 0) + 1 }))}>{t(`wardrobe.reactions.${r}` as 'wardrobe.reactions.happy')}</button>)}
            </div>
          </div>
        </section>
        <section className="card wardrobe-items">
          <div className="tabs" role="tablist" aria-label={t('wardrobe.slots')}>
            {COSMETIC_SLOTS.map((s) => (
              <button key={s} type="button" role="tab" aria-selected={slot === s} className={`tab${slot === s ? ' is-active' : ''}`} onClick={() => { setSlot(s); setPreview(null) }}>{t(`wardrobe.slot.${s}`)}</button>
            ))}
          </div>
          <ul className="cos-grid">
            {slot !== 'color' && (
              <li>
                <button type="button" className={`cos-item${!equipped[slot] ? ' is-equipped' : ''}`} onClick={() => { learning.equip(slot, null); setPreview(null) }} aria-pressed={!equipped[slot]}>
                  <span className="cos-thumb is-none" aria-hidden><EyeOff size={22} /></span>
                  <span>{t('wardrobe.none')}</span>
                </button>
              </li>
            )}
            {items.map((c) => {
              const open = isUnlocked(c, level, ach, learning.admin)
              const on = (equipped[slot] ?? (slot === 'color' ? 'classic' : undefined)) === c.id
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`cos-item${on ? ' is-equipped' : ''}${open ? '' : ' is-locked'}`}
                    aria-pressed={on}
                    onMouseEnter={() => setPreview(c)}
                    onMouseLeave={() => setPreview(null)}
                    onFocus={() => setPreview(c)}
                    onBlur={() => setPreview(null)}
                    onClick={() => open && learning.equip(slot, c.id)}
                    aria-disabled={!open}
                  >
                    <span className="cos-thumb" aria-hidden>
                      {slot === 'color' ? <span className="color-dot" style={{ background: `linear-gradient(135deg, ${BUBI_COLORS[c.id].from}, ${BUBI_COLORS[c.id].to})` }} /> : <MascotSvg mood="idle" size={64} outfit={{ [slot]: c.id }} />}
                    </span>
                    <span className="cos-name">{c.name}</span>
                    <span className="text-subtle text-xs">
                      {on ? <><Check size={11} aria-hidden /> {t('wardrobe.equipped')}</> : open ? t('wardrobe.available') : <><Lock size={11} aria-hidden /> {c.level ? t('wardrobe.unlockLevel', { n: c.level }) : t('wardrobe.unlockAch', { name: ACHIEVEMENT_BY_ID.get(c.achievement ?? '')?.name ?? '' })}</>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="text-subtle text-xs">{t('wardrobe.hint')}</p>
        </section>
      </div>
    </div>
  )
}
