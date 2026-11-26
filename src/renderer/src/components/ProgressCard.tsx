// Tarjeta de progreso para compartir: el alumno elige qué datos aparecen y se guarda como PNG.
// Se dibuja como SVG (sin fuentes externas) y se convierte a imagen en local; nada sale del equipo.
import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Modal } from './Modal'
import { useApp } from '../lib/store'
import { useLearning } from '../lib/learning'
import { ACHIEVEMENT_BY_ID } from '@shared/learning/achievements'
import { errorMessage } from '../lib/store'
import { t } from '../i18n'

type Field = 'name' | 'level' | 'streak' | 'time' | 'readiness' | 'achievements' | 'favorites'
const FIELDS: Field[] = ['name', 'level', 'streak', 'time', 'readiness', 'achievements', 'favorites']

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function ProgressCardModal({ onClose }: { onClose(): void }) {
  const app = useApp()
  const learning = useLearning()
  const [on, setOn] = useState<Record<Field, boolean>>({ name: true, level: app.settings.gamification, streak: true, time: true, readiness: true, achievements: app.settings.gamification, favorites: app.settings.gamification })
  const [busy, setBusy] = useState(false)
  const minutes = Object.values(learning.state.game.activity).reduce((n, a) => n + a.minutes, 0)
  const unlocked = Object.keys(learning.state.game.achievements).length
  const favs = learning.state.game.profile.favorites.map((id) => ACHIEVEMENT_BY_ID.get(id)?.name).filter(Boolean) as string[]

  const svg = useMemo(() => {
    const W = 800
    const H = 440
    const rows: Array<[string, string]> = []
    if (on.level) rows.push([t('card.level'), `${learning.level.level} · ${learning.rank.name}`])
    if (on.streak) rows.push([t('card.streak'), t('card.streakValue', { current: learning.stats.streak.current, best: learning.stats.streak.best })])
    if (on.time) rows.push([t('card.time'), minutes >= 60 ? `${(minutes / 60).toFixed(1)} h` : `${Math.round(minutes)} min`])
    if (on.readiness && learning.readiness.estimate) rows.push([t('card.readiness'), `${learning.readiness.estimate.scale} (${learning.readiness.estimate.low}–${learning.readiness.estimate.high})`])
    if (on.achievements) rows.push([t('card.achievements'), `${unlocked}`])
    if (on.favorites && favs.length) rows.push([t('card.favorites'), favs.join(' · ')])
    const name = on.name ? app.settings.userName || t('card.student') : t('card.student')
    const sans = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
    const serif = "Georgia, 'Times New Roman', serif"
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a54d6"/><stop offset="1" stop-color="#1f2f8a"/></linearGradient></defs>
  <rect width="${W}" height="${H}" rx="28" fill="url(#g)"/>
  <circle cx="${W - 70}" cy="70" r="120" fill="#ffffff" opacity="0.06"/>
  <text x="48" y="70" font-family="${sans}" font-size="18" font-weight="600" fill="#c9d2ff" letter-spacing="2">B2 FIRST TRAINER</text>
  <text x="48" y="122" font-family="${serif}" font-size="40" fill="#ffffff">${esc(name)}</text>
  ${rows
    .map(
      ([k, v], i) => `<text x="48" y="${188 + i * 40}" font-family="${sans}" font-size="17" fill="#aeb9ff">${esc(k)}</text>
  <text x="300" y="${188 + i * 40}" font-family="${sans}" font-size="20" font-weight="600" fill="#ffffff">${esc(v)}</text>`
    )
    .join('\n  ')}
  <text x="48" y="${H - 34}" font-family="${sans}" font-size="14" fill="#aeb9ff">${esc(t('card.footer'))}</text>
</svg>`
  }, [on, learning, app.settings.userName, minutes, unlocked, favs])

  const url = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg])

  const save = async () => {
    setBusy(true)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 1600
      canvas.height = 880
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, 1600, 880)
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
      if (!blob) throw new Error(t('card.error'))
      const path = await window.api.saveImageFile('mi-progreso-b2.png', new Uint8Array(await blob.arrayBuffer()))
      if (path) app.notify('success', t('card.saved'))
      onClose()
    } catch (e) {
      app.notify('error', errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      size="lg"
      title={t('card.title')}
      description={t('card.desc')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}><Download size={16} aria-hidden /> {t('card.save')}</button>
        </>
      }
    >
      <div className="card-export">
        <fieldset className="chip-row" aria-label={t('card.fields')}>
          {FIELDS.map((f) => (
            <label key={f} className="check">
              <input type="checkbox" checked={on[f]} onChange={(e) => setOn((o) => ({ ...o, [f]: e.target.checked }))} /> {t(`card.f.${f}`)}
            </label>
          ))}
        </fieldset>
        <img className="card-preview" src={url} alt={t('card.preview')} width={800} height={440} />
      </div>
    </Modal>
  )
}
