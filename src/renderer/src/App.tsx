import { lazy, Suspense, useRef } from 'react'
import { CloudOff, MonitorSmartphone, TriangleAlert } from 'lucide-react'
import { AppProvider, useApp, useThemeEffect, type Route } from './lib/store'
import { LearningProvider } from './lib/learning'
import { Sidebar, useSidebarCollapsed } from './components/Sidebar'
import { CommandPalette } from './components/CommandPalette'
import { Celebrations } from './components/Celebrations'
import { ShortcutsHelp } from './components/ShortcutsHelp'
import { Toasts } from './components/Toasts'
import { HomeScreen } from './screens/HomeScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { Onboarding } from './components/Onboarding'
import { Tour } from './components/Tour'
import { Modal } from './components/Modal'
import { BootSkeleton, RouteSkeleton } from './components/ScreenSkeletons'
import { PlacementTest } from './components/PlacementTest'
import { WhatsNew } from './components/WhatsNew'
import { HistoryScreen } from './screens/HistoryScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { t } from './i18n'

// Las pantallas pesadas (visor de PDF, grabadora…) se cargan solo cuando se abren: la app arranca antes.
const ExamScreen = lazy(() => import('./screens/ExamScreen').then((m) => ({ default: m.ExamScreen })))
const AttemptScreen = lazy(() => import('./screens/AttemptScreen').then((m) => ({ default: m.AttemptScreen })))
const ResultsScreen = lazy(() => import('./screens/ResultsScreen').then((m) => ({ default: m.ResultsScreen })))
const PracticeScreen = lazy(() => import('./screens/PracticeScreen').then((m) => ({ default: m.PracticeScreen })))
const ReviewScreen = lazy(() => import('./screens/ReviewScreen').then((m) => ({ default: m.ReviewScreen })))
const SheetScreen = lazy(() => import('./screens/SheetScreen').then((m) => ({ default: m.SheetScreen })))
const PlanScreen = lazy(() => import('./screens/PlanScreen').then((m) => ({ default: m.PlanScreen })))
const NotebookScreen = lazy(() => import('./screens/NotebookScreen').then((m) => ({ default: m.NotebookScreen })))
const StatsScreen = lazy(() => import('./screens/StatsScreen').then((m) => ({ default: m.StatsScreen })))
const ProfileScreen = lazy(() => import('./screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })))
const AchievementsScreen = lazy(() => import('./screens/AchievementsScreen').then((m) => ({ default: m.AchievementsScreen })))
const WardrobeScreen = lazy(() => import('./screens/WardrobeScreen').then((m) => ({ default: m.WardrobeScreen })))

export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

function Shell() {
  const { ready, loadError, missingDataPath, dataProblem, lockConflict, dismissLockConflict, settings, route, reload } = useApp()
  useThemeEffect(settings, ready)
  const [collapsed, setCollapsed] = useSidebarCollapsed()
  // ¿Ya usaba la app antes de abrirla esta vez? (para la prueba de nivel y las novedades)
  const wasOnboarded = useRef<boolean | null>(null)
  if (ready && !loadError && !missingDataPath && wasOnboarded.current === null) wasOnboarded.current = settings.onboarded

  if (!ready) return <BootSkeleton />
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

  if (missingDataPath) {
    return (
      <div className="boot">
        <div className="card fatal" role="alert">
          <CloudOff size={28} aria-hidden />
          <h1 className="h2">{dataProblem?.error ? t('sync.brokenTitle') : t('sync.missingTitle')}</h1>
          <p className="text-muted">{dataProblem?.error ? t('sync.brokenText') : t('sync.missingText')}</p>
          <p className="path-box">{missingDataPath}</p>
          {dataProblem?.error && <p className="text-subtle text-sm">{t('sync.brokenDetail', { error: dataProblem.error })}</p>}
          <div className="row-gap">
            <button type="button" className="btn btn-primary" onClick={() => void window.api.relaunch()}>{t('common.retry')}</button>
            {!dataProblem?.isDefault && <button type="button" className="btn btn-secondary" onClick={() => void window.api.resetDataFolder()}>{t('sync.useLocal')}</button>}
          </div>
        </div>
      </div>
    )
  }

  if (!settings.onboarded) return <Onboarding />
  // Prueba de nivel obligatoria (una sola vez, también para quien ya usaba la app).
  if (!settings.placement) return <PlacementTest existing={wasOnboarded.current === true} />

  const focusMode = route.name === 'attempt'

  return (
    <LearningProvider>
    <div className={`app${focusMode ? ' app-focus' : ''}${collapsed && !focusMode ? ' is-collapsed' : ''}`}>
      <a className="skip-link" href="#main">{t('nav.skip')}</a>
      {!focusMode && <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />}
      <main id="main" className="main" tabIndex={-1}>
        <Suspense fallback={<RouteSkeleton route={route} />}>
          <div className="route-view" key={routeKey(route)}>
            <Screen route={route} />
          </div>
        </Suspense>
      </main>
      <Toasts />
      <CommandPalette />
      <ShortcutsHelp />
      <Celebrations />
      <Tour />
      <WhatsNew existingUser={wasOnboarded.current === true} />
      <Modal
        open={lockConflict !== null}
        size="sm"
        title={t('sync.lockTitle', { host: lockConflict?.host ?? '' })}
        onClose={dismissLockConflict}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => window.close()}>{t('sync.lockClose')}</button>
            <button type="button" className="btn btn-primary" onClick={dismissLockConflict} autoFocus>{t('sync.lockContinue')}</button>
          </>
        }
      >
        <div className="lock-body">
          <MonitorSmartphone size={28} aria-hidden />
          <p className="text-muted">{t('sync.lockText', { host: lockConflict?.host ?? '' })}</p>
        </div>
      </Modal>
    </div>
    </LearningProvider>
  )
}

/** Cada pantalla (y cada examen, hoja…) monta de nuevo con una transición suave. */
function routeKey(route: Route): string {
  switch (route.name) {
    case 'exam':
      return `exam:${route.examId}`
    case 'attempt':
    case 'results':
      return `${route.name}:${route.attemptId}`
    case 'sheet':
      return `sheet:${route.sheetId}`
    case 'review':
      return `review:${route.session?.kind ?? 'due'}:${route.session?.value ?? ''}`
    default:
      return route.name
  }
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
    case 'practice':
      return <PracticeScreen />
    case 'review':
      return <ReviewScreen session={route.session} />
    case 'sheet':
      return <SheetScreen key={route.sheetId} sheetId={route.sheetId} />
    case 'history':
      return <HistoryScreen />
    case 'settings':
      return <SettingsScreen section={route.section} />
    case 'plan':
      return <PlanScreen tab={route.tab} />
    case 'notebook':
      return <NotebookScreen errorId={route.errorId} add={route.add} />
    case 'stats':
      return <StatsScreen />
    case 'profile':
      return <ProfileScreen />
    case 'achievements':
      return <AchievementsScreen />
    case 'wardrobe':
      return <WardrobeScreen />
  }
}
