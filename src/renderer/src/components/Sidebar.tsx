// Barra lateral agrupada (General · Aprendizaje · Personal), contraíble y navegable con teclado.
// Contraída: solo iconos, con el nombre como tooltip y para lectores de pantalla.
import { useEffect, useState } from 'react'
import { BarChart3, Bell, CalendarRange, ChevronsLeft, ChevronsRight, History, Home, Library, NotebookPen, RotateCcw, Search, Settings as SettingsIcon, Shirt, Trophy, UserRound, BookX } from 'lucide-react'
import { useApp, type Route } from '../lib/store'
import { useLearning } from '../lib/learning'
import { useNotifications } from '../lib/notifications'
import { XpBar } from './XpBar'
import { UpdateBanner } from './UpdateBanner'
import { NotificationCenter } from './NotificationCenter'
import { openPalette } from './CommandPalette'
import { t, type TKey } from '../i18n'

type NavName = 'home' | 'plan' | 'library' | 'practice' | 'review' | 'notebook' | 'stats' | 'history' | 'profile' | 'achievements' | 'wardrobe' | 'settings'

interface NavEntry {
  route: NavName
  label: TKey
  icon: typeof Home
}

export const NAV_GROUPS: Array<{ label: TKey; items: NavEntry[] }> = [
  {
    label: 'nav.groupGeneral',
    items: [
      { route: 'home', label: 'nav.home', icon: Home },
      { route: 'plan', label: 'nav.plan', icon: CalendarRange },
      { route: 'library', label: 'nav.library', icon: Library },
      { route: 'practice', label: 'nav.practice', icon: NotebookPen },
      { route: 'review', label: 'nav.review', icon: RotateCcw }
    ]
  },
  {
    label: 'nav.groupLearning',
    items: [
      { route: 'notebook', label: 'nav.notebook', icon: BookX },
      { route: 'stats', label: 'nav.stats', icon: BarChart3 },
      { route: 'history', label: 'nav.history', icon: History }
    ]
  },
  {
    label: 'nav.groupPersonal',
    items: [
      { route: 'profile', label: 'nav.profile', icon: UserRound },
      { route: 'achievements', label: 'nav.achievements', icon: Trophy },
      { route: 'wardrobe', label: 'nav.wardrobe', icon: Shirt },
      { route: 'settings', label: 'nav.settings', icon: SettingsIcon }
    ]
  }
]

export function activeSection(route: Route): NavName {
  switch (route.name) {
    case 'exam':
      return 'library'
    case 'results':
      return 'history'
    case 'sheet':
      return 'practice'
    case 'attempt':
      return 'library'
    default:
      return route.name
  }
}

const KEY = 'b2ft.sidebar.collapsed'

export function readCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1' || (localStorage.getItem(KEY) === null && window.innerWidth < 1000)
  } catch {
    return false
  }
}

export function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const set = (v: boolean) => {
    setCollapsed(v)
    try {
      localStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      /* sin almacenamiento local */
    }
  }
  // Ctrl/Cmd + B: contraer o expandir.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b' && !(e.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]')) {
        e.preventDefault()
        setCollapsed((c) => {
          try {
            localStorage.setItem(KEY, c ? '0' : '1')
          } catch {
            /* sin almacenamiento local */
          }
          return !c
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return [collapsed, set]
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle(): void }) {
  const { route, navigate, settings } = useApp()
  const learning = useLearning()
  const notes = useNotifications()
  const [bellOpen, setBellOpen] = useState(false)
  const unread = notes.filter((n) => !n.read).length
  const section = activeSection(route)
  const dueTotal = learning.due.sheet + learning.due.own
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
  const badges: Partial<Record<NavName, number>> = { review: dueTotal }
  const hidden = new Set<NavName>()
  if (!settings.gamification) hidden.add('achievements')
  if (!settings.mascot) hidden.add('wardrobe')

  return (
    <nav className={`sidebar sidebar-v2${collapsed ? ' is-collapsed' : ''}`} aria-label={t('nav.main')}>
      <div className="brand">
        <span className="brand-mark" aria-hidden>B2</span>
        {!collapsed && (
          <span className="brand-text">
            <span className="brand-name">First Trainer</span>
            <span className="brand-sub">{t('app.tagline')}</span>
          </span>
        )}
      </div>

      <button type="button" className="nav-search" onClick={openPalette} title={collapsed ? t('palette.open') : undefined} aria-label={t('palette.open')} aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}>
        <Search size={16} aria-hidden />
        {!collapsed && (
          <>
            <span>{t('palette.search')}</span>
            <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </>
        )}
      </button>

      <div className="nav-groups">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="nav-group" role="group" aria-label={t(g.label)}>
            {!collapsed && <p className="nav-group-label" aria-hidden>{t(g.label)}</p>}
            <ul className="nav-list">
              {g.items
                .filter((it) => !hidden.has(it.route))
                .map(({ route: r, label, icon: Icon }) => {
                  const badge = badges[r] ?? 0
                  return (
                    <li key={r}>
                      <button
                        type="button"
                        data-nav={r}
                        className={`nav-item${section === r ? ' is-active' : ''}`}
                        aria-current={section === r ? 'page' : undefined}
                        title={collapsed ? t(label) : undefined}
                        onClick={() => navigate({ name: r } as Route)}
                      >
                        <Icon size={18} aria-hidden />
                        {collapsed ? <span className="sr-only">{t(label)}</span> : <span className="nav-label">{t(label)}</span>}
                        {badge > 0 && (
                          <span className="nav-badge tabular" aria-label={t('nav.badge', { n: badge })}>
                            {badge > 99 ? '99+' : badge}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
            </ul>
          </div>
        ))}
      </div>

      <div className="sidebar-bottom">
        <XpBar compact={collapsed} onClick={() => navigate({ name: 'profile' })} />
        <div className="sidebar-tools">
          <button type="button" className="icon-btn nav-bell" aria-label={unread ? t('notifications.openUnread', { n: unread }) : t('notifications.open')} title={t('notifications.title')} aria-expanded={bellOpen} onClick={() => setBellOpen((v) => !v)}>
            <Bell size={17} aria-hidden />
            {unread > 0 && <span className="bell-dot" aria-hidden />}
          </button>
          <button type="button" className="icon-btn" onClick={onToggle} aria-label={collapsed ? t('nav.expand') : t('nav.collapse')} title={`${collapsed ? t('nav.expand') : t('nav.collapse')} (${isMac ? '⌘' : 'Ctrl'}+B)`} aria-keyshortcuts={isMac ? 'Meta+B' : 'Control+B'}>
            {collapsed ? <ChevronsRight size={17} aria-hidden /> : <ChevronsLeft size={17} aria-hidden />}
          </button>
        </div>
        {!collapsed && <UpdateBanner />}
        {!collapsed && <p className="sidebar-foot">{t('app.offline')}</p>}
      </div>
      {bellOpen && <NotificationCenter onClose={() => setBellOpen(false)} />}
    </nav>
  )
}
