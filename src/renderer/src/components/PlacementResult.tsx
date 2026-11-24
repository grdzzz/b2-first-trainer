import { ArrowRight, BellRing, BookOpen, Clock3, FileText, Languages, NotebookPen, Puzzle, RotateCcw, Shapes, X } from 'lucide-react'
import type { CefrLevel, PlacementTip } from '@shared/placement'
import { placementTips } from '@shared/placement'
import { useApp } from '../lib/store'
import { formatDate, t } from '../i18n'

/** Nivel MCER en grande («Nivel B2»; por debajo de A2 se dice así). */
export function PlacementLevel({ level }: { level: CefrLevel }) {
  return (
    <span className={`placement-level level-${level}`}>
      {level === 'A1' ? t('placement.belowA2') : t('placement.resultLevel', { level })}
    </span>
  )
}

const TIP_ICON: Record<PlacementTip, typeof BookOpen> = {
  grammar: Puzzle,
  vocabulary: Languages,
  reading: BookOpen,
  dailySheets: NotebookPen,
  wordFormation: Shapes,
  fullExam: FileText,
  timed: Clock3,
  review: RotateCcw,
  reminder: BellRing
}

function rememberSkill(skill: string): void {
  try {
    localStorage.setItem('practice-skill', skill)
    localStorage.setItem('practice-status', 'all')
  } catch {
    /* ignorar */
  }
}

/** Lista de recomendaciones. `compact`: sin botones (dentro de la prueba). */
export function PlacementTips({ tips, compact }: { tips: PlacementTip[]; compact?: boolean }) {
  const { navigate, updateSettings, notify, settings } = useApp()
  const go = async (tip: PlacementTip) => {
    switch (tip) {
      case 'grammar':
      case 'vocabulary':
      case 'reading':
      case 'wordFormation':
        rememberSkill(tip)
        navigate({ name: 'practice' })
        break
      case 'dailySheets':
        rememberSkill('all')
        navigate({ name: 'practice' })
        break
      case 'fullExam':
      case 'timed':
        navigate({ name: 'library' })
        break
      case 'review':
        navigate({ name: 'review' })
        break
      case 'reminder':
        await updateSettings({ reminder: { enabled: true, background: true } })
        notify('success', t('home.reminderOn', { time: settings.reminder.time }))
        break
    }
  }
  return (
    <ul className={`placement-tips${compact ? ' is-compact' : ''}`}>
      {tips.map((tip) => {
        const Icon = TIP_ICON[tip]
        const done = tip === 'reminder' && settings.reminder.enabled
        return (
          <li key={tip} className="placement-tip">
            <span className="placement-tip-icon" aria-hidden><Icon size={18} /></span>
            <span className="placement-tip-text">
              <strong>{t(`placement.tips.${tip}.title`)}</strong>
              <span className="text-muted text-sm">{t(`placement.tips.${tip}.text`)}</span>
            </span>
            {!compact && !done && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void go(tip)}>
                {t('placement.go')} <ArrowRight size={14} aria-hidden />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Tarjeta del inicio con el nivel de la prueba inicial (hasta que se oculta). */
export function PlacementCard() {
  const { settings, updateSettings, notify } = useApp()
  const r = settings.placement
  if (!r || r.dismissed) return null
  return (
    <section className="card placement-home" aria-labelledby="placement-home-title">
      <div className="placement-home-head">
        <div className={`placement-home-badge level-${r.level}`} aria-hidden>{r.level === 'A1' ? '<A2' : r.level}</div>
        <div className="placement-home-text">
          <p className="eyebrow" id="placement-home-title">{t('placement.homeTitle')}</p>
          <h2 className="h-small"><PlacementLevel level={r.level} /> · <span className="tabular">{t('placement.scale', { score: r.score })}</span></h2>
          <p className="text-muted text-sm">{t(`placement.levels.${r.level}`)}</p>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn-sm placement-home-close"
          aria-label={t('placement.homeHide')}
          title={t('placement.homeHide')}
          onClick={async () => {
            await updateSettings({ placement: { ...r, dismissed: true } })
            notify('info', t('placement.homeHidden'))
          }}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <PlacementTips tips={placementTips(r, settings.reminder.enabled)} />
      <p className="text-subtle text-xs">{formatDate(r.date, { day: 'numeric', month: 'long', year: 'numeric' })} · {t('placement.correct', { correct: r.correct, total: r.total })}</p>
    </section>
  )
}
