// Skeletons de cada pantalla: misma estructura y clases que la pantalla real, con bloques en lugar de datos.
import { BarChart3, History, Library, NotebookPen, Settings as SettingsIcon } from 'lucide-react'
import { PAPER_ORDER } from '@shared/types'
import { PRACTICE_SKILLS } from '@shared/practice'
import { skillLabel } from './SkillBadge'
import { Sk, SkButton, SkChip, SkCircle, SkeletonRegion, SkLines, SkText } from './Skeleton'
import type { Route } from '../lib/store'
import { t } from '../i18n'

/** Cabecera de página: antetítulo, título y subtítulo. */
function HeaderSk({ eyebrow = '8em', title = '9em', sub, action, className = '' }: { eyebrow?: string; title?: string; sub?: string; action?: string; className?: string }) {
  return (
    <header className={`page-header ${className}`}>
      <div>
        <p className="eyebrow"><SkText w={eyebrow} /></p>
        <h1 className="h1"><SkText w={title} /></h1>
        {sub && <p className="text-muted home-sub"><SkText w={sub} /></p>}
      </div>
      {action && <SkButton label={action} className="btn-primary" />}
    </header>
  )
}

// ---------- Arranque: barra lateral real (no depende de datos) + inicio ----------
const NAV = [
  { label: () => t('nav.home'), icon: BarChart3 },
  { label: () => t('nav.library'), icon: Library },
  { label: () => t('nav.practice'), icon: NotebookPen },
  { label: () => t('nav.history'), icon: History },
  { label: () => t('nav.settings'), icon: SettingsIcon }
]

export function BootSkeleton() {
  return (
    <div className="app app-booting">
      <nav className="sidebar" aria-hidden inert>
        <div className="brand">
          <span className="brand-mark">B2</span>
          <span className="brand-text">
            <span className="brand-name">First Trainer</span>
            <span className="brand-sub">{t('app.tagline')}</span>
          </span>
        </div>
        <ul className="nav-list">
          {NAV.map(({ label, icon: Icon }, i) => (
            <li key={i}>
              <span className={`nav-item${i === 0 ? ' is-active' : ''}`}>
                <Icon size={18} aria-hidden />
                {label()}
              </span>
            </li>
          ))}
        </ul>
        <p className="sidebar-foot">{t('app.offline')}</p>
      </nav>
      <main className="main">
        <HomeSkeleton />
      </main>
    </div>
  )
}

// ---------- Inicio ----------
export function HomeSkeleton() {
  return (
    <SkeletonRegion className="page">
      <HeaderSk className="home-header" eyebrow="11em" title="8.5em" sub="24em" />
      <section className="stats-row">
        {[0, 1, 2].map((i) => (
          <div key={i} className="stat">
            <Sk className="stat-icon" />
            <span className="stat-value"><SkText w="1.6em" /></span>
            <span className="stat-label"><SkText w="7em" /></span>
          </div>
        ))}
      </section>
      <HomePracticeSkeleton />
      <section>
        <h2 className="section-title"><SkText w="9em" /></h2>
        <div className="paper-grid">
          {PAPER_ORDER.map((type) => (
            <div key={type} className={`card paper-card paper-${type} sk-card`}>
              <div className="paper-card-head"><SkText w="6em" /></div>
              <div className="paper-card-value"><SkText w="1.6em" /></div>
              <div className="meter" aria-hidden><span style={{ width: 0 }} /></div>
              <div className="paper-card-foot"><span /><span className="text-sm"><SkText w="5em" /></span></div>
            </div>
          ))}
        </div>
      </section>
    </SkeletonRegion>
  )
}

/** Tarjeta de práctica del inicio mientras cargan las hojas. */
export function HomePracticeSkeleton() {
  return (
    <section className="card home-practice" aria-hidden>
      <div className="mascot mascot-side home-bubi">
        <SkCircle size={88} />
        <div className="mascot-bubble sk-bubble"><SkLines n={2} last="70%" /></div>
      </div>
      <div className="home-practice-text">
        <p className="eyebrow"><SkText w="7em" /></p>
        <h2 className="h-small"><SkText w="16em" /></h2>
        <p className="text-muted text-sm"><SkText w="22em" /></p>
        <div className="home-practice-meter">
          <span className="sheet-progress-bar" aria-hidden><span style={{ width: 0 }} /></span>
          <span><SkText w="9em" /></span>
        </div>
        <div className="row-gap home-practice-actions">
          <SkButton label={t('home.practiceGo')} className="btn-sm btn-primary" />
        </div>
      </div>
    </section>
  )
}

// ---------- Práctica ----------
export function PracticeSkeleton() {
  return (
    <SkeletonRegion className="page" label={t('practice.loading')}>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('practice.eyebrow')}</p>
          <h1 className="h1">{t('practice.title')}</h1>
          <p className="text-muted measure practice-sub">{t('practice.sub')}</p>
        </div>
        <SkButton label={t('practice.create')} className="btn-primary" />
      </header>
      <section className="card practice-hero">
        <div className="practice-next">
          <p className="eyebrow"><SkText w="7em" /></p>
          <h2 className="practice-next-title"><SkText w="12em" /></h2>
          <div className="sheet-meta">
            <SkChip className="skill-badge" label={skillLabel('vocabulary')} />
            <span><SkText w="16em" /></span>
          </div>
          <p className="text-muted"><SkText w="26em" /></p>
          <SkButton label={t('practice.nextStart')} className="btn-primary btn-lg practice-next-btn" />
        </div>
        <div className="practice-stats">
          <SkCircle size={118} />
          <div className="practice-stat-list">
            {[0, 1, 2].map((i) => (
              <div key={i} className="practice-stat">
                <Sk className="practice-stat-icon" />
                <span><SkText w="8em" /></span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="card review-banner">
        <SkCircle size={64} />
        <div className="review-banner-text">
          <h2 className="h-small"><SkText w="9em" /></h2>
          <p className="text-muted text-sm"><SkText w="20em" /></p>
        </div>
      </section>
      <div className="practice-filters">
        {/* Los mismos botones de filtro (sus textos no dependen de los datos): ocupan las mismas líneas. */}
        <div className="seg" aria-hidden>
          {[t('practice.all'), ...PRACTICE_SKILLS.map((k) => skillLabel(k, true)), t('practice.mine')].map((label, i) => (
            <span key={i} className={`seg-btn${i === 0 ? ' is-active' : ''}`}>
              {i > 0 && <span className="sk-seg-icon" />}
              {label} <span className="seg-count tabular">{i === 0 || i > PRACTICE_SKILLS.length ? '00' : '0/00'}</span>
            </span>
          ))}
        </div>
        <div className="seg seg-small" aria-hidden>
          {[t('practice.statusAll'), t('practice.statusTodo'), t('practice.statusDone')].map((label, i) => (
            <span key={i} className={`seg-btn${i === 0 ? ' is-active' : ''}`}>{label}</span>
          ))}
        </div>
      </div>
      <ul className="sheet-grid">
        {Array.from({ length: 9 }, (_, i) => (
          <li key={i} className="sheet-card sk-sheet-card">
            <span className="sheet-card-main">
              <span className="sheet-card-top">
                <Sk className="sheet-card-icon" />
                <span className="sheet-card-num"><SkText w="1.4em" /></span>
              </span>
              <span className="sheet-card-title"><SkText w={i % 2 ? '70%' : '85%'} /></span>
              <span className="sheet-card-sub"><SkText w="60%" /></span>
              <span className="sheet-card-foot"><span className="text-subtle"><SkText w="4em" /></span></span>
            </span>
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  )
}

// ---------- Hoja de práctica ----------
export function SheetSkeleton() {
  return (
    <SkeletonRegion className="page page-narrow sheet-page" label={t('practice.loading')}>
      <SkButton label={t('sheet.back')} className="btn-ghost btn-sm back-link" />
      <header className="sheet-header">
        <p className="eyebrow"><SkText w="5em" /></p>
        <h1 className="h1"><SkText w="11em" /></h1>
        <div className="sheet-meta">
          <SkChip className="skill-badge" label={skillLabel('vocabulary')} />
          <span><SkText w="14em" /></span>
          <span className="spacer" />
          <SkButton label={t('createSheets.export')} className="btn-ghost btn-xs" />
        </div>
        <p className="text-muted"><SkText w="30em" /></p>
      </header>
      <div className="sheet-progress">
        <span className="text-sm"><SkText w="7em" /></span>
        <span className="sheet-progress-bar"><span style={{ width: 0 }} /></span>
      </div>
      {[0, 1].map((i) => (
        <section key={i} className="card sheet-task">
          <header className="sheet-task-head">
            <SkChip className="pill" label="Part 1 · Multiple-choice cloze" />
            <SkText w="4em" />
          </header>
          <p className="sheet-instructions"><SkText w="80%" /></p>
          <div className="reading-text sk-paragraph"><SkLines n={i ? 4 : 6} /></div>
        </section>
      ))}
    </SkeletonRegion>
  )
}

// ---------- Repaso ----------
export function ReviewSkeleton() {
  return (
    <SkeletonRegion className="page page-narrow review-page" label={t('practice.loading')}>
      <SkButton label={t('sheet.back')} className="btn-ghost btn-sm back-link" />
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('review.eyebrow')}</p>
          <h1 className="h1">{t('review.title')}</h1>
        </div>
      </header>
      <div className="sheet-progress">
        <span className="text-sm"><SkText w="8em" /></span>
        <span className="sheet-progress-bar"><span style={{ width: 0 }} /></span>
      </div>
      <section className="card review-card">
        <div className="review-card-head">
          <SkChip className="skill-badge" label={skillLabel('vocabulary')} />
          <span className="text-sm"><SkText w="16em" /></span>
        </div>
        <p className="review-sentence"><SkLines n={2} last="45%" /></p>
        <div className="review-actions">
          <span className="text-sm"><SkText w="12em" /></span>
          <span className="spacer" />
          <SkButton label={t('review.check')} className="btn-primary" />
        </div>
      </section>
    </SkeletonRegion>
  )
}

// ---------- Pantallas genéricas (examen, resultados, intento) ----------
export function GenericSkeleton() {
  return (
    <SkeletonRegion className="page">
      <HeaderSk title="12em" sub="20em" />
      <section className="card sk-card-tall">
        <h2 className="section-title"><SkText w="10em" /></h2>
        <SkLines n={3} />
      </section>
      <section className="card sk-card-tall">
        <h2 className="section-title"><SkText w="8em" /></h2>
        <SkLines n={4} last="40%" />
      </section>
    </SkeletonRegion>
  )
}

/** Intento de examen (modo concentración, sin barra lateral): barra superior + documento + respuestas. */
export function AttemptSkeleton() {
  return (
    <SkeletonRegion className="sk-attempt">
      <div className="sk-attempt-bar">
        <SkText w="14em" />
        <span className="spacer" />
        <Sk w="7rem" h="2.25rem" r="var(--radius-md)" />
      </div>
      <div className="sk-attempt-split">
        <Sk className="sk-attempt-doc" />
        <div className="sk-attempt-answers">
          {Array.from({ length: 6 }, (_, i) => (
            <Sk key={i} h="2.75rem" r="var(--radius-md)" />
          ))}
        </div>
      </div>
    </SkeletonRegion>
  )
}

/** Skeleton para la pantalla que se está cargando (pantallas que se cargan bajo demanda). */
export function RouteSkeleton({ route }: { route: Route }) {
  switch (route.name) {
    case 'practice':
      return <PracticeSkeleton />
    case 'sheet':
      return <SheetSkeleton />
    case 'review':
      return <ReviewSkeleton />
    case 'attempt':
      return <AttemptSkeleton />
    case 'home':
      return <HomeSkeleton />
    default:
      return <GenericSkeleton />
  }
}
