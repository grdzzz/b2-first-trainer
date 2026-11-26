// Skeletons de cada pantalla: misma estructura y clases que la pantalla real, con bloques en lugar de datos.
import { Search } from 'lucide-react'
import { NAV_GROUPS, readCollapsed } from './Sidebar'
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
export function BootSkeleton() {
  const collapsed = readCollapsed()
  return (
    <div className={`app app-booting${collapsed ? ' is-collapsed' : ''}`}>
      <nav className={`sidebar sidebar-v2${collapsed ? ' is-collapsed' : ''}`} aria-hidden inert>
        <div className="brand">
          <span className="brand-mark">B2</span>
          {!collapsed && (
            <span className="brand-text">
              <span className="brand-name">First Trainer</span>
              <span className="brand-sub">{t('app.tagline')}</span>
            </span>
          )}
        </div>
        <span className="nav-search">
          <Search size={16} aria-hidden />
          {!collapsed && <span>{t('palette.search')}</span>}
        </span>
        <div className="nav-groups">
          {NAV_GROUPS.map((g, gi) => (
            <div key={g.label} className="nav-group">
              {!collapsed && <p className="nav-group-label">{t(g.label)}</p>}
              <ul className="nav-list">
                {g.items.map(({ label, icon: Icon }, i) => (
                  <li key={label}>
                    <span className={`nav-item${gi === 0 && i === 0 ? ' is-active' : ''}`}>
                      <Icon size={18} aria-hidden />
                      {!collapsed && <span className="nav-label">{t(label)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
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
    <SkeletonRegion className="page home-page">
      <header className="page-header home-header">
        <div>
          <p className="eyebrow"><SkText w="11em" /></p>
          <h1 className="h1"><SkText w="8.5em" /></h1>
          <p className="text-muted home-sub"><SkText w="24em" /></p>
        </div>
        <div className="row-gap">
          <SkButton label={t('home.continueStudying')} className="btn-primary btn-lg" />
          <SkButton label={t('home.customize')} className="btn-ghost btn-sm" />
        </div>
      </header>
      <div className="dash-layout">
        <div className="dash-col dash-col-main">
          <div className="dash-mod mod-today"><HomePracticeSkeleton /></div>
        </div>
        <div className="dash-col dash-col-side">
          {[0, 1].map((i) => (
            <div key={i} className="dash-mod">
              <section className="card dash-card sk-card">
                <div className="card-head"><h2 className="h-small"><SkText w="8em" /></h2></div>
                <p className="dash-big"><SkText w="3em" /></p>
                <SkLines n={2} last="60%" />
              </section>
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  )
}

/** Tarjeta de práctica del inicio mientras cargan las hojas. */
export function HomePracticeSkeleton() {
  return (
    <section className="card home-practice home-today" aria-hidden>
      <div className="mascot mascot-side home-bubi">
        <SkCircle size={72} />
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

// ---------- Mi plan ----------
export function PlanSkeleton({ inline }: { inline?: boolean }) {
  const body = (
    <div className="plan-today">
      <section className="card today-hero">
        <div className="mascot mascot-side today-bubi"><SkCircle size={88} /><div className="mascot-bubble sk-bubble"><SkLines n={2} last="70%" /></div></div>
        <div className="today-head">
          <p className="eyebrow"><SkText w="9em" /></p>
          <h2 className="h2"><SkText w="14em" /></h2>
          <div className="today-meter"><span className="meter"><span style={{ width: 0 }} /></span><span className="text-sm"><SkText w="6em" /></span></div>
          <div className="row-gap"><SkButton label={t('plan.startSession')} className="btn-primary" /></div>
        </div>
      </section>
      <ol className="activity-list">
        {[0, 1, 2].map((i) => (
          <li key={i} className="activity-card">
            <Sk className="activity-icon" />
            <div className="activity-body">
              <div className="activity-top"><h3 className="activity-title"><SkText w="14em" /></h3></div>
              <div className="activity-meta text-sm"><SkText w="16em" /></div>
              <p className="activity-reason text-sm"><SkText w="22em" /></p>
            </div>
            <div className="activity-actions"><SkButton label={t('plan.start')} className="btn-primary btn-sm" /></div>
          </li>
        ))}
      </ol>
    </div>
  )
  if (inline) return <SkeletonRegion label={t('plan.loading')}>{body}</SkeletonRegion>
  return (
    <SkeletonRegion className="page plan-page" label={t('plan.loading')}>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('plan.eyebrow')}</p>
          <h1 className="h1">{t('plan.title')}</h1>
          <p className="text-muted"><SkText w="22em" /></p>
        </div>
      </header>
      <div className="tabs">
        {[t('plan.tabs.today'), t('plan.tabs.calendar'), t('plan.tabs.readiness'), t('plan.tabs.setup')].map((l, i) => <span key={l} className={`tab${i === 0 ? ' is-active' : ''}`}><span className="sk-seg-icon" />{l}</span>)}
      </div>
      <div className="tab-panel">{body}</div>
    </SkeletonRegion>
  )
}

/** Calendario mientras se calcula la previsión. */
export function CalendarSkeleton() {
  return (
    <SkeletonRegion className="card calendar" label={t('plan.loading')}>
      <header className="calendar-head"><h2 className="h-small calendar-title"><SkText w="12em" /></h2></header>
      <div className="calendar-grid view-week"><div className="calendar-cells">{Array.from({ length: 7 }, (_, i) => <div key={i} className="cal-day"><span className="cal-day-head"><SkText w="1.2em" /></span></div>)}</div></div>
    </SkeletonRegion>
  )
}

// ---------- Mis errores ----------
export function NotebookSkeleton() {
  return (
    <SkeletonRegion className="page page-wide notebook-page" label={t('notebook.loading')}>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('notebook.eyebrow')}</p>
          <h1 className="h1">{t('notebook.title')}</h1>
          <p className="text-muted"><SkText w="26em" /></p>
        </div>
        <SkButton label={t('notebook.add')} className="btn-secondary" />
      </header>
      <section className="notebook-sessions">{[0, 1, 2, 3].map((i) => <span key={i} className="session-chip sk sk-btn">{t('notebook.sessionRecurring')} 00</span>)}</section>
      <ul className="notebook-list view-cards">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="error-item">
            <span className="error-main">
              <span className="error-top"><SkText w="10em" /></span>
              <span className="error-q"><SkText w={i % 2 ? '80%' : '92%'} /></span>
              <span className="error-compare"><SkText w="60%" /></span>
              <span className="error-foot text-xs"><SkText w="8em" /></span>
            </span>
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  )
}

// ---------- Estadísticas ----------
export function StatsSkeleton() {
  return (
    <SkeletonRegion className="page stats-page" label={t('stats.loading')}>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('stats.eyebrow')}</p>
          <h1 className="h1">{t('stats.title')}</h1>
          <p className="text-muted">{t('stats.sub')}</p>
        </div>
      </header>
      <section className="stats-row">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="stat">
            <Sk className="stat-icon" />
            <span className="stat-value"><SkText w="1.6em" /></span>
            <span className="stat-label"><SkText w="7em" /></span>
          </div>
        ))}
      </section>
      <section className="card"><h2 className="section-title"><SkText w="10em" /></h2><SkLines n={5} /></section>
    </SkeletonRegion>
  )
}

// ---------- Perfil ----------
export function ProfileSkeleton() {
  return (
    <SkeletonRegion className="page profile-page" label={t('profile.loading')}>
      <section className="card profile-hero">
        <SkCircle size={112} />
        <div className="profile-id">
          <p className="eyebrow">{t('profile.eyebrow')}</p>
          <h1 className="h1"><SkText w="8em" /></h1>
          <p className="text-muted"><SkText w="16em" /></p>
        </div>
      </section>
      <section className="stats-row profile-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="stat"><Sk className="stat-icon" /><span className="stat-value"><SkText w="2em" /></span><span className="stat-label"><SkText w="6em" /></span></div>
        ))}
      </section>
      <section className="card"><h2 className="section-title"><SkText w="10em" /></h2><Sk h="7rem" r="var(--radius-md)" /></section>
    </SkeletonRegion>
  )
}

// ---------- Logros ----------
export function AchievementsSkeleton() {
  return (
    <SkeletonRegion className="page achievements-page" label={t('achievements.loading')}>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('achievements.eyebrow')}</p>
          <h1 className="h1">{t('achievements.title')}</h1>
          <p className="text-muted">{t('achievements.sub')}</p>
        </div>
        <SkCircle size={96} />
      </header>
      <ul className="ach-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="ach-card">
            <span className="ach-card-main"><SkCircle size={56} /><span className="ach-name"><SkText w="8em" /></span><span className="ach-desc text-sm"><SkLines n={2} /></span></span>
          </li>
        ))}
      </ul>
    </SkeletonRegion>
  )
}

// ---------- Armario de Bubi ----------
export function WardrobeSkeleton() {
  return (
    <SkeletonRegion className="page wardrobe-page" label={t('wardrobe.loading')}>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('wardrobe.eyebrow')}</p>
          <h1 className="h1">{t('wardrobe.title')}</h1>
          <p className="text-muted"><SkText w="18em" /></p>
        </div>
      </header>
      <div className="wardrobe">
        <section className="card wardrobe-stage"><div className="stage-bubi"><SkCircle size={200} /></div></section>
        <section className="card wardrobe-items"><ul className="cos-grid">{Array.from({ length: 6 }, (_, i) => <li key={i}><span className="cos-item"><Sk className="cos-thumb" /><span className="cos-name"><SkText w="6em" /></span></span></li>)}</ul></section>
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
    case 'plan':
      return <PlanSkeleton />
    case 'notebook':
      return <NotebookSkeleton />
    case 'stats':
      return <StatsSkeleton />
    case 'profile':
      return <ProfileSkeleton />
    case 'achievements':
      return <AchievementsSkeleton />
    case 'wardrobe':
      return <WardrobeSkeleton />
    default:
      return <GenericSkeleton />
  }
}
