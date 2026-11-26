// Paleta de comandos global (Ctrl + K / Cmd + K): navegar, buscar exámenes, hojas y errores, empezar la
// sesión del día, reanudar intentos, cambiar de tema… Búsqueda tolerante a erratas y comandos recientes.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, BookX, CalendarRange, CornerDownLeft, FileText, Keyboard, Moon, NotebookPen, Palette, Play, PlayCircle, Plus, RotateCcw, Search, Sun, SunMoon } from 'lucide-react'
import { fuzzyFilter } from '@shared/fuzzy'
import type { ThemePreference } from '@shared/types'
import { useApp, type Route } from '../lib/store'
import { useLearning } from '../lib/learning'
import { useLaunchActivity } from '../lib/launch'
import { NAV_GROUPS } from './Sidebar'
import { openShortcuts } from './ShortcutsHelp'
import { t } from '../i18n'

const OPEN_EVENT = 'b2ft:palette'
const RECENT_KEY = 'b2ft.palette.recent'

export function openPalette(): void {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

interface Command {
  id: string
  group: 'actions' | 'navigation' | 'exams' | 'sheets' | 'errors'
  label: string
  hint?: string
  icon: typeof Search
  keywords?: string
  run(): void
}

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 6) : []
  } catch {
    return []
  }
}

function pushRecent(id: string): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 6)))
  } catch {
    /* sin almacenamiento local */
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
  if (!open) return null
  return <PaletteDialog onClose={() => setOpen(false)} />
}

function PaletteDialog({ onClose }: { onClose(): void }) {
  const app = useApp()
  const learning = useLearning()
  const launch = useLaunchActivity()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLDialogElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const used = useRef(false)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    if (!used.current) {
      used.current = true
      learning.featureUsed('palette')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const commands = useMemo<Command[]>(() => {
    const go = (r: Route) => () => app.navigate(r)
    const out: Command[] = []
    const next = learning.todaySession?.activities.find((a) => a.status === 'todo')
    if (next) out.push({ id: 'act:today', group: 'actions', label: t('palette.startToday'), hint: next.title, icon: Play, keywords: 'sesion hoy plan empezar continuar estudiar', run: () => void launch(next) })
    else out.push({ id: 'act:plan', group: 'actions', label: t('palette.openPlan'), icon: CalendarRange, keywords: 'plan sesion hoy', run: go({ name: 'plan' }) })
    for (const a of app.attempts.filter((x) => x.status === 'in-progress').slice(0, 5)) {
      out.push({ id: `resume:${a.id}`, group: 'actions', label: t('palette.resume', { name: `${a.examName} · ${a.paperTitle}` }), icon: PlayCircle, keywords: 'reanudar continuar intento', run: go({ name: 'attempt', attemptId: a.id }) })
    }
    const due = learning.due.sheet + learning.due.own
    out.push({ id: 'act:review', group: 'actions', label: due ? t('palette.reviewDue', { n: due }) : t('palette.review'), icon: RotateCcw, keywords: 'repaso repasar errores leitner', run: go({ name: 'review' }) })
    out.push({ id: 'act:addError', group: 'actions', label: t('palette.addError'), icon: Plus, keywords: 'nuevo error anotar cuaderno manual', run: go({ name: 'notebook', add: true }) })
    out.push({ id: 'act:createSheets', group: 'actions', label: t('palette.createSheets'), icon: NotebookPen, keywords: 'ia chat hoja generar', run: go({ name: 'practice' }) })
    const themes: Array<[ThemePreference, typeof Sun]> = [['light', Sun], ['dark', Moon], ['oled', Moon], ['midnight', Moon], ['system', SunMoon]]
    for (const [theme, Icon] of themes) {
      out.push({
        id: `theme:${theme}`,
        group: 'actions',
        label: t('palette.theme', { theme: t(`settings.themes.${theme}`) }),
        icon: Icon,
        keywords: 'tema apariencia modo oscuro claro color',
        run: () => {
          void app.updateSettings({ theme })
          learning.featureUsed('appearance')
        }
      })
    }
    out.push({ id: 'act:appearance', group: 'actions', label: t('palette.appearance'), icon: Palette, keywords: 'acento densidad animaciones apariencia', run: go({ name: 'settings', section: 'appearance' }) })
    out.push({ id: 'act:shortcuts', group: 'actions', label: t('palette.shortcuts'), icon: Keyboard, keywords: 'atajos teclado ayuda', run: openShortcuts })
    for (const g of NAV_GROUPS) for (const it of g.items) out.push({ id: `nav:${it.route}`, group: 'navigation', label: t('palette.goTo', { name: t(it.label) }), icon: it.icon, keywords: t(it.label), run: go({ name: it.route } as Route) })
    for (const e of app.exams) out.push({ id: `exam:${e.id}`, group: 'exams', label: e.name, hint: e.papers.map((p) => p.title).join(' · '), icon: FileText, run: go({ name: 'exam', examId: e.id }) })
    for (const s of learning.sheets ?? []) out.push({ id: `sheet:${s.id}`, group: 'sheets', label: s.number ? `${t('practice.sheetN', { n: s.number })} · ${s.title}` : s.title, hint: s.topic, icon: NotebookPen, keywords: `${s.skill} ${s.focus ?? ''}`, run: go({ name: 'sheet', sheetId: s.id }) })
    for (const r of learning.errors) {
      if (r.deleted) continue
      out.push({ id: `error:${r.id}`, group: 'errors', label: r.question ?? r.expected.join(' / '), hint: `${r.given ?? '—'} → ${r.expected.join(' / ')}`, icon: BookX, keywords: `${r.explanation ?? ''} ${r.notes ?? ''}`, run: go({ name: 'notebook', errorId: r.id }) })
    }
    return out
  }, [app, learning, launch])

  const results = useMemo(() => {
    if (!query.trim()) {
      const recent = readRecent()
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is Command => !!c)
      const base = commands.filter((c) => c.group === 'actions' || c.group === 'navigation').filter((c) => !recent.includes(c))
      return [...recent.map((c) => ({ ...c, recent: true })), ...base.slice(0, 14)]
    }
    return fuzzyFilter(commands, query, (c) => `${c.label} ${c.hint ?? ''} ${c.keywords ?? ''}`, 40)
  }, [commands, query])

  useEffect(() => setIndex(0), [query])
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const run = (c: Command) => {
    pushRecent(c.id)
    onClose()
    c.run()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const c = results[index]
      if (c) run(c)
    }
  }

  let lastGroup = ''
  const activeId = results[index] ? `pal-${results[index].id}` : undefined
  return (
    <dialog
      ref={ref}
      className="palette"
      aria-label={t('palette.title')}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onMouseDown={(e) => e.target === ref.current && onClose()}
    >
      <div className="palette-inner">
        <div className="palette-search">
          <Search size={18} aria-hidden />
          <input
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls="palette-list"
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            placeholder={t('palette.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            spellCheck={false}
          />
          <kbd>Esc</kbd>
        </div>
        <ul id="palette-list" ref={listRef} className="palette-list" role="listbox" aria-label={t('palette.results')}>
          {results.length === 0 && <li className="palette-empty text-muted">{t('palette.noResults', { q: query })}</li>}
          {results.map((c, i) => {
            const group = 'recent' in c && c.recent ? 'recent' : c.group
            const header = group !== lastGroup ? group : null
            lastGroup = group
            const Icon = c.icon
            return (
              <li key={c.id} role="presentation">
                {header && <p className="palette-group" role="presentation">{t(`palette.groups.${header}` as 'palette.groups.actions')}</p>}
                <div id={`pal-${c.id}`} role="option" aria-selected={i === index} data-index={i} className={`palette-item${i === index ? ' is-active' : ''}`} onMouseMove={() => setIndex(i)} onClick={() => run(c)}>
                  <Icon size={16} aria-hidden />
                  <span className="palette-label">{c.label}</span>
                  {c.hint && <span className="palette-hint text-subtle">{c.hint}</span>}
                  {i === index ? <CornerDownLeft size={14} aria-hidden className="palette-enter" /> : <ArrowRight size={14} aria-hidden className="palette-enter is-faint" />}
                </div>
              </li>
            )
          })}
        </ul>
        <footer className="palette-foot text-subtle text-xs">
          <span><kbd>↑</kbd><kbd>↓</kbd> {t('palette.navigate')}</span>
          <span><kbd>↵</kbd> {t('palette.select')}</span>
          <span><kbd>Esc</kbd> {t('palette.close')}</span>
        </footer>
      </div>
    </dialog>
  )
}
