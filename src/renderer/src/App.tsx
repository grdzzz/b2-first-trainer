import { BarChart3, History, Library, Settings as SettingsIcon, TriangleAlert } from 'lucide-react'
import { AppProvider, useApp, useThemeEffect, type Route } from './lib/store'
import { Toasts } from './components/Toasts'
import { HomeScreen } from './screens/HomeScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { ExamScreen } from './screens/ExamScreen'
import { AttemptScreen } from './screens/AttemptScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { t } from './i18n'

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

const NAV: Array<{ route: Route['name']; label: () => string; icon: typeof Library }> = [
  { route: 'home', label: () => t('nav.home'), icon: BarChart3 },
  { route: 'library', label: () => t('nav.library'), icon: Library },
  { route: 'history', label: () => t('nav.history'), icon: History },
  { route: 'settings', label: () => t('nav.settings'), icon: SettingsIcon }
]

function activeSection(route: Route): Route['name'] {
  if (route.name === 'exam') return 'library'
  if (route.name === 'results') return 'history'
  return route.name
}

function Shell() {
  const { ready, loadError, settings, route, navigate, reload } = useApp()
  useThemeEffect(settings)

  if (!ready) {
    return <div className="boot" aria-busy="true"><span className="boot-mark">B2</span></div>
  }
  if (loadError) {
    return (
      <div className="boot">
        <div className="card fatal" role="alert">
          <TriangleAlert size={28} aria-hidden />
          <h1 className="h2">{t('errors.loadTitle')}</h1>
          <p className="text-muted">{loadError}</p>
          <button type="button" className="btn btn-primary" onClick={() => void reload()}>{t('common.retry')}</button>
        </div>
      </div>
    )
  }

  const focusMode = route.name === 'attempt'
  const section = activeSection(route)

  return (
    <div className={`app${focusMode ? ' app-focus' : ''}`}>
      <a className="skip-link" href="#main">{t('nav.skip')}</a>
      {!focusMode && (
        <nav className="sidebar" aria-label={t('nav.main')}>
          <div className="brand">
            <span className="brand-mark" aria-hidden>B2</span>
            <span className="brand-text">
              <span className="brand-name">First Trainer</span>
              <span className="brand-sub">{t('app.tagline')}</span>
            </span>
          </div>
          <ul className="nav-list">
            {NAV.map(({ route: r, label, icon: Icon }) => (
              <li key={r}>
                <button
                  type="button"
                  className={`nav-item${section === r ? ' is-active' : ''}`}
                  aria-current={section === r ? 'page' : undefined}
                  onClick={() => navigate({ name: r } as Route)}
                >
                  <Icon size={18} aria-hidden />
                  {label()}
                </button>
              </li>
            ))}
          </ul>
          <p className="sidebar-foot">{t('app.offline')}</p>
        </nav>
      )}
      <main id="main" className="main" tabIndex={-1}>
        <Screen route={route} />
      </main>
      <Toasts />
    </div>
  )
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />
    case 'library':
      return <LibraryScreen />
    case 'exam':
      return <ExamScreen key={route.examId} examId={route.examId} />
    case 'attempt':
      return <AttemptScreen key={route.attemptId} attemptId={route.attemptId} />
    case 'results':
      return <ResultsScreen key={route.attemptId} attemptId={route.attemptId} />
    case 'history':
      return <HistoryScreen />
    case 'settings':
      return <SettingsScreen />
  }
}
