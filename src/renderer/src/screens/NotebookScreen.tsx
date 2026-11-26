import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, CalendarClock, CheckSquare, Download, ExternalLink, FileText, Filter, LayoutGrid, List, Plus, RotateCcw, Search, Square, Star, Tag, Trash2, Wand2, X } from 'lucide-react'
import {
  errorStatus,
  exportErrorsCsv,
  exportErrorsMarkdown,
  filterErrors,
  isRecurring,
  nextReviewDate,
  notebookSummary,
  sortErrors,
  ERROR_STATUSES,
  type ErrorFilter,
  type ErrorRecord,
  type ErrorSort,
  type ErrorStatus,
  type ReviewSessionSpec
} from '@shared/learning/notebook'
import { competency, partLabel, STUDY_SKILLS, type StudySkill } from '@shared/learning/taxonomy'
import { useApp } from '../lib/store'
import { useLearning } from '../lib/learning'
import { StudySkillChip } from '../components/StudySkill'
import { EmptyState } from '../components/EmptyState'
import { NotebookSkeleton } from '../components/ScreenSkeletons'
import { ContextMenu, useContextMenu, type MenuItem } from '../components/ContextMenu'
import { ManualErrorModal, AiErrorsModal } from '../components/NotebookModals'
import { CategoryOptions } from '../components/CategoryOptions'
import { PatternsCard } from './PlanScreen'
import { formatDate, t, tn } from '../i18n'

const FILTER_KEY = 'b2ft.notebook.filters'
const PAGE = 60

interface Persisted {
  skills: StudySkill[]
  statuses: ErrorStatus[]
  category: string
  minFails: number
  favorites: boolean
  sort: ErrorSort
  view: 'cards' | 'list'
}

const DEFAULTS: Persisted = { skills: [], statuses: [], category: '', minFails: 0, favorites: false, sort: 'recent', view: 'cards' }

function loadFilters(): Persisted {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}') as Partial<Persisted>) }
  } catch {
    return DEFAULTS
  }
}

export function NotebookScreen({ errorId, add }: { errorId?: string; add?: boolean }) {
  const learning = useLearning()
  if (!learning.ready) return <NotebookSkeleton />
  return <Notebook initialId={errorId} initialAdd={add} />
}

function Notebook({ initialId, initialAdd }: { initialId?: string; initialAdd?: boolean }) {
  const app = useApp()
  const learning = useLearning()
  const { errors, statusCtx } = learning
  const [f, setF] = useState<Persisted>(loadFilters)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(initialId ?? null)
  const [adding, setAdding] = useState(!!initialAdd)
  const [aiFor, setAiFor] = useState<ErrorRecord[] | null>(null)
  const [limit, setLimit] = useState(PAGE)
  const [tab, setTab] = useState<'errors' | 'lessons'>('errors')
  const [width, setWidth] = useState(() => {
    try {
      return Number(localStorage.getItem('b2ft.notebook.split')) || 420
    } catch {
      return 420
    }
  })
  const searchRef = useRef<HTMLInputElement>(null)
  const ctx = useContextMenu()

  const update = (patch: Partial<Persisted>) =>
    setF((cur) => {
      const next = { ...cur, ...patch }
      try {
        localStorage.setItem(FILTER_KEY, JSON.stringify(next))
      } catch {
        /* sin almacenamiento local */
      }
      return next
    })

  const filter: ErrorFilter = { query, skills: f.skills, statuses: f.statuses, categories: f.category ? [f.category] : undefined, minFails: f.minFails || undefined, favorites: f.favorites || undefined }
  const visible = useMemo(() => {
    const list = filterErrors(errors, filter, statusCtx)
    return query.trim() ? list : sortErrors(list, f.sort, statusCtx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors, statusCtx, query, f])
  const summary = useMemo(() => notebookSummary(errors, statusCtx), [errors, statusCtx])
  const open = openId ? (learning.state.notebook.records[openId] ?? null) : null
  const usedCats = useMemo(() => Array.from(new Set(errors.map((e) => e.category).filter((c): c is string => !!c))), [errors])
  const examsWithErrors = useMemo(() => app.exams.filter((e) => errors.some((r) => r.ref.kind === 'exam' && r.ref.examId === e.id && !r.mastered)), [app.exams, errors])

  useEffect(() => setLimit(PAGE), [query, f])

  // «/» enfoca el buscador.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target as HTMLElement)?.closest('input, textarea, select') && !document.querySelector('dialog[open]')) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Carga progresiva de la lista (rápida con miles de errores).
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setLimit((l) => l + PAGE))
    io.observe(el)
    return () => io.disconnect()
  }, [visible.length, limit])

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const selection = visible.filter((r) => selected.has(r.id))
  const allSelected = visible.length > 0 && visible.every((r) => selected.has(r.id))

  const remove = useCallback(
    (ids: string[]) => {
      const undo = learning.deleteErrors(ids)
      setSelected(new Set())
      if (openId && ids.includes(openId)) setOpenId(null)
      app.notify('success', tn('notebook.deleted', ids.length), { action: { label: t('common.undo'), run: undo } })
    },
    [learning, app, openId]
  )

  const review = (spec: ReviewSessionSpec) => app.navigate({ name: 'review', session: spec })

  const exportAs = async (kind: 'csv' | 'md' | 'json', list: ErrorRecord[]) => {
    const text = kind === 'csv' ? exportErrorsCsv(list, statusCtx) : kind === 'md' ? exportErrorsMarkdown(list) : JSON.stringify({ formato: 'b2ft-errores', version: 1, errores: list }, null, 2)
    const path = await window.api.saveTextFile(`mis-errores.${kind}`, text).catch((e) => {
      app.notify('error', String(e))
      return null
    })
    if (path) app.notify('success', t('notebook.exported'))
  }

  const menuFor = (r: ErrorRecord): MenuItem[] => [
    { label: r.favorite ? t('notebook.unfavorite') : t('notebook.favorite'), icon: <Star size={14} aria-hidden />, run: () => learning.patchErrors([r.id], { favorite: !r.favorite }) },
    { label: t('notebook.reviewThis'), icon: <RotateCcw size={14} aria-hidden />, disabled: r.ref.kind === 'exam', run: () => review({ kind: 'custom', ids: [r.id] }) },
    { label: t('notebook.openOriginal'), icon: <ExternalLink size={14} aria-hidden />, disabled: r.ref.kind === 'none', run: () => openOriginal(r) },
    { label: t('notebook.aiOne'), icon: <Wand2 size={14} aria-hidden />, run: () => setAiFor([r]) },
    { label: t('common.delete'), icon: <Trash2 size={14} aria-hidden />, danger: true, run: () => remove([r.id]) }
  ]

  const openOriginal = (r: ErrorRecord) => {
    const ref = r.ref
    if (ref.kind === 'sheet') app.navigate({ name: 'sheet', sheetId: ref.sheetId })
    else if (ref.kind === 'exam') {
      const attempt = app.attempts.find((a) => a.id === ref.attemptId)
      app.navigate(attempt ? { name: 'results', attemptId: attempt.id } : { name: 'exam', examId: ref.examId })
    } else if (ref.kind === 'attempt') app.navigate({ name: 'results', attemptId: ref.attemptId })
  }

  const startDrag = (e: React.PointerEvent) => {
    const startX = e.clientX
    const startW = width
    const move = (ev: PointerEvent) => setWidth(Math.max(320, Math.min(640, startW - (ev.clientX - startX))))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      try {
        localStorage.setItem('b2ft.notebook.split', String(width))
      } catch {
        /* sin almacenamiento local */
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const header = (
    <header className="page-header">
      <div>
        <p className="eyebrow">{t('notebook.eyebrow')}</p>
        <h1 className="h1">{t('notebook.title')}</h1>
        <p className="text-muted">{summary.total ? t('notebook.sub', { total: summary.total, due: summary.due, recurring: summary.recurring, mastered: summary.byStatus.mastered }) : t('notebook.subEmpty')}</p>
      </div>
      <div className="row-gap">
        <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)}>
          <Plus size={16} aria-hidden /> {t('notebook.add')}
        </button>
        {summary.due > 0 && (
          <button type="button" className="btn btn-primary" onClick={() => review({ kind: 'due' })}>
            <RotateCcw size={16} aria-hidden /> {t('notebook.reviewDue', { n: summary.due })}
          </button>
        )}
      </div>
    </header>
  )

  const modals = (
    <>
      {adding && <ManualErrorModal onClose={() => setAdding(false)} />}
      {aiFor && <AiErrorsModal errors={aiFor} onClose={() => setAiFor(null)} />}
    </>
  )

  if (errors.length === 0) {
    return (
      <div className="page notebook-page">
        {header}
        <EmptyState
          title={t('notebook.emptyTitle')}
          mood="reading"
          text={<><p>{t('notebook.emptyWhat')}</p><p>{t('notebook.emptyWhy')}</p></>}
          actions={
            <>
              <button type="button" className="btn btn-primary" onClick={() => app.navigate({ name: 'practice' })}>{t('notebook.emptyGo')}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)}><Plus size={16} aria-hidden /> {t('notebook.add')}</button>
            </>
          }
        />
        {modals}
      </div>
    )
  }

  const lessons = Object.values(learning.state.notebook.lessons).filter((l) => !l.deleted)

  return (
    <div className="page page-wide notebook-page">
      {header}

      <section className="notebook-sessions" aria-label={t('notebook.sessions')}>
        <button type="button" className="session-chip" disabled={!summary.today} onClick={() => review({ kind: 'today' })}><CalendarClock size={15} aria-hidden /> {t('notebook.sessionToday')} <span className="tabular">{summary.today}</span></button>
        <button type="button" className="session-chip" disabled={!summary.recurring} onClick={() => review({ kind: 'recurring' })}><RotateCcw size={15} aria-hidden /> {t('notebook.sessionRecurring')} <span className="tabular">{summary.recurring}</span></button>
        <button type="button" className="session-chip" disabled={!summary.due} onClick={() => review({ kind: 'due' })}><BookOpen size={15} aria-hidden /> {t('notebook.sessionDue')} <span className="tabular">{summary.due}</span></button>
        <button type="button" className="session-chip" onClick={() => review({ kind: 'old' })}><FileText size={15} aria-hidden /> {t('notebook.sessionOld')}</button>
        {usedCats.length > 0 && (
          <label className="session-chip session-select">
            <Tag size={15} aria-hidden />
            <span className="sr-only">{t('notebook.sessionCompetency')}</span>
            <select value="" onChange={(e) => e.target.value && review({ kind: 'competency', value: e.target.value })}>
              <option value="">{t('notebook.sessionCompetency')}</option>
              {usedCats.map((c) => <option key={c} value={c}>{competency(c)?.label}</option>)}
            </select>
          </label>
        )}
        {examsWithErrors.length > 0 && (
          <label className="session-chip session-select">
            <FileText size={15} aria-hidden />
            <span className="sr-only">{t('notebook.sessionExam')}</span>
            <select value="" onChange={(e) => e.target.value && review({ kind: 'exam', value: e.target.value })}>
              <option value="">{t('notebook.sessionExam')}</option>
              {examsWithErrors.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
        )}
      </section>

      <PatternsCard />

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'errors'} className={`tab${tab === 'errors' ? ' is-active' : ''}`} onClick={() => setTab('errors')}>{t('notebook.tabErrors')} <span className="tabular text-subtle">{summary.total}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'lessons'} className={`tab${tab === 'lessons' ? ' is-active' : ''}`} onClick={() => setTab('lessons')}>{t('notebook.tabLessons')} <span className="tabular text-subtle">{lessons.length}</span></button>
      </div>

      {tab === 'lessons' ? (
        <Lessons />
      ) : (
        <>
          <div className="notebook-toolbar">
            <label className="search-box">
              <Search size={16} aria-hidden />
              <span className="sr-only">{t('notebook.search')}</span>
              <input ref={searchRef} type="search" className="input" placeholder={t('notebook.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
              <kbd aria-hidden>/</kbd>
            </label>
            <div className="seg seg-small" role="group" aria-label={t('notebook.filterSkill')}>
              <button type="button" className={`seg-btn${f.skills.length === 0 ? ' is-active' : ''}`} aria-pressed={f.skills.length === 0} onClick={() => update({ skills: [] })}>{t('notebook.all')}</button>
              {STUDY_SKILLS.filter((s) => summary.bySkill[s] > 0).map((s) => (
                <button key={s} type="button" className={`seg-btn${f.skills.includes(s) ? ' is-active' : ''}`} aria-pressed={f.skills.includes(s)} onClick={() => update({ skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] })}>
                  {t(`skills.${s}`)} <span className="seg-count tabular">{summary.bySkill[s]}</span>
                </button>
              ))}
            </div>
            <details className="filter-more">
              <summary className="btn btn-ghost btn-sm"><Filter size={15} aria-hidden /> {t('notebook.moreFilters')}</summary>
              <div className="filter-panel">
                <fieldset>
                  <legend className="field-label">{t('notebook.status')}</legend>
                  <div className="chip-row">
                    {ERROR_STATUSES.map((st) => (
                      <button key={st} type="button" className={`chip${f.statuses.includes(st) ? ' is-active' : ''}`} aria-pressed={f.statuses.includes(st)} onClick={() => update({ statuses: f.statuses.includes(st) ? f.statuses.filter((x) => x !== st) : [...f.statuses, st] })}>
                        {t(`notebook.statuses.${st}`)} <span className="tabular text-subtle">{summary.byStatus[st]}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="field">
                  <span className="field-label">{t('notebook.category')}</span>
                  <select className="input input-sm" value={f.category} onChange={(e) => update({ category: e.target.value })}>
                    <option value="">{t('notebook.allCategories')}</option>
                    {usedCats.map((c) => <option key={c} value={c}>{competency(c)?.label}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">{t('notebook.frequency')}</span>
                  <select className="input input-sm" value={f.minFails} onChange={(e) => update({ minFails: Number(e.target.value) })}>
                    <option value={0}>{t('notebook.anyFrequency')}</option>
                    <option value={2}>{t('notebook.failsAtLeast', { n: 2 })}</option>
                    <option value={3}>{t('notebook.failsAtLeast', { n: 3 })}</option>
                    <option value={5}>{t('notebook.failsAtLeast', { n: 5 })}</option>
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" checked={f.favorites} onChange={(e) => update({ favorites: e.target.checked })} /> {t('notebook.onlyFavorites')}
                </label>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => update({ ...DEFAULTS, view: f.view, sort: f.sort })}>{t('notebook.clearFilters')}</button>
              </div>
            </details>
            <span className="spacer" />
            <label className="sort-select">
              <span className="sr-only">{t('notebook.sort')}</span>
              <select className="input input-sm" value={f.sort} onChange={(e) => update({ sort: e.target.value as ErrorSort })} disabled={!!query.trim()}>
                {(['recent', 'oldest', 'fails', 'due', 'category'] as ErrorSort[]).map((s) => <option key={s} value={s}>{t(`notebook.sorts.${s}`)}</option>)}
              </select>
            </label>
            <div className="seg seg-small" role="group" aria-label={t('notebook.view')}>
              <button type="button" className={`seg-btn${f.view === 'cards' ? ' is-active' : ''}`} aria-pressed={f.view === 'cards'} onClick={() => update({ view: 'cards' })} title={t('notebook.viewCards')}><LayoutGrid size={15} aria-hidden /><span className="sr-only">{t('notebook.viewCards')}</span></button>
              <button type="button" className={`seg-btn${f.view === 'list' ? ' is-active' : ''}`} aria-pressed={f.view === 'list'} onClick={() => update({ view: 'list' })} title={t('notebook.viewList')}><List size={15} aria-hidden /><span className="sr-only">{t('notebook.viewList')}</span></button>
            </div>
          </div>

          <div className={`bulk-bar${selection.length ? ' is-active' : ''}`} aria-live="polite">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(allSelected ? new Set() : new Set(visible.map((r) => r.id)))}>
              {allSelected ? <CheckSquare size={15} aria-hidden /> : <Square size={15} aria-hidden />} {allSelected ? t('notebook.selectNone') : t('notebook.selectAll', { n: visible.length })}
            </button>
            {selection.length > 0 && (
              <>
                <span className="text-sm">{tn('notebook.selected', selection.length)}</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => review({ kind: 'custom', ids: selection.map((r) => r.id) })}><RotateCcw size={14} aria-hidden /> {t('notebook.reviewSelected')}</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAiFor(selection)}><Wand2 size={14} aria-hidden /> {t('notebook.aiSelected')}</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => learning.patchErrors(selection.map((r) => r.id), { favorite: true })}><Star size={14} aria-hidden /> {t('notebook.favorite')}</button>
                <label className="bulk-cat">
                  <Tag size={14} aria-hidden />
                  <span className="sr-only">{t('notebook.setCategory')}</span>
                  <select className="input input-sm" value="" onChange={(e) => e.target.value && learning.patchErrors(selection.map((r) => r.id), { category: e.target.value === '-' ? undefined : e.target.value })}>
                    <option value="">{t('notebook.setCategory')}</option>
                    <CategoryOptions />
                  </select>
                </label>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void exportAs('csv', selection)}><Download size={14} aria-hidden /> {t('notebook.export')}</button>
                <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={() => remove(selection.map((r) => r.id))}><Trash2 size={14} aria-hidden /> {t('common.delete')}</button>
              </>
            )}
            {selection.length === 0 && (
              <span className="row-gap export-row">
                <span className="text-subtle text-sm">{tn('notebook.showing', visible.length)}</span>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => void exportAs('csv', visible)}><Download size={13} aria-hidden /> CSV</button>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => void exportAs('md', visible)}>Markdown</button>
                <button type="button" className="btn btn-ghost btn-xs" onClick={() => void exportAs('json', visible)}>JSON</button>
                <button type="button" className="btn btn-ghost btn-xs" disabled={!visible.length} onClick={() => setAiFor(visible.slice(0, 25))}><Wand2 size={13} aria-hidden /> {t('notebook.aiVisible')}</button>
              </span>
            )}
          </div>

          <div className={`notebook-split${open ? ' has-detail' : ''}`} style={{ '--detail-w': `${width}px` } as React.CSSProperties}>
            <div className="notebook-list-wrap">
              {visible.length === 0 ? (
                <p className="card text-muted notebook-none">{t('notebook.noMatch')}</p>
              ) : (
                <ul className={`notebook-list view-${f.view}`} aria-label={t('notebook.listLabel')}>
                  {visible.slice(0, limit).map((r) => (
                    <ErrorItem
                      key={r.id}
                      r={r}
                      status={errorStatus(r, statusCtx)}
                      view={f.view}
                      selected={selected.has(r.id)}
                      active={openId === r.id}
                      onToggle={() => toggleSel(r.id)}
                      onOpen={() => setOpenId(r.id)}
                      onMenu={(e) => ctx.open(e, menuFor(r))}
                      onKeyMenu={(e) => ctx.onKeyDown(e, menuFor(r))}
                    />
                  ))}
                </ul>
              )}
              {limit < visible.length && <div ref={sentinel} className="list-sentinel">{t('common.loading')}</div>}
            </div>
            {open && (
              <>
                <div
                  className="split-handle"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={t('notebook.resize')}
                  aria-valuenow={width}
                  aria-valuemin={320}
                  aria-valuemax={640}
                  tabIndex={0}
                  onPointerDown={startDrag}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') setWidth((w) => Math.min(640, w + 24))
                    if (e.key === 'ArrowRight') setWidth((w) => Math.max(320, w - 24))
                  }}
                />
                <ErrorDetail r={open} onClose={() => setOpenId(null)} onOriginal={() => openOriginal(open)} onDelete={() => remove([open.id])} onAi={() => setAiFor([open])} />
              </>
            )}
          </div>
        </>
      )}
      <ContextMenu menu={ctx.menu} onClose={ctx.close} />
      {modals}
    </div>
  )
}

function ErrorItem({ r, status, view, selected, active, onToggle, onOpen, onMenu, onKeyMenu }: { r: ErrorRecord; status: ErrorStatus; view: 'cards' | 'list'; selected: boolean; active: boolean; onToggle(): void; onOpen(): void; onMenu(e: React.MouseEvent): void; onKeyMenu(e: React.KeyboardEvent): void }) {
  return (
    <li className={`error-item status-${status}${selected ? ' is-selected' : ''}${active ? ' is-active' : ''}`} onContextMenu={onMenu}>
      <input type="checkbox" className="error-check" checked={selected} onChange={onToggle} aria-label={t('notebook.selectOne', { q: r.question ?? r.expected.join(' / ') })} />
      <button type="button" className="error-main" onClick={onOpen} onKeyDown={onKeyMenu} aria-current={active ? 'true' : undefined}>
        <span className="error-top">
          <StudySkillChip skill={r.skill} compact />
          <span className={`status-pill st-${status}`}>{t(`notebook.statuses.${status}`)}</span>
          {r.favorite && <Star size={13} aria-label={t('notebook.favorite')} className="fav-star" />}
          <span className="text-subtle text-xs error-cat">{competency(r.category)?.label ?? partLabel(r.part) ?? t(`notebook.sources.${r.source}`)}</span>
        </span>
        <span className="error-q">{r.question ?? t('notebook.noQuestion')}</span>
        {view === 'cards' && (
          <span className="error-compare">
            <span className="cmp-bad"><span className="sr-only">{t('notebook.yourAnswer')}</span>{r.given || t('notebook.blank')}</span>
            <span className="cmp-good"><span className="sr-only">{t('notebook.correct')}</span>{r.expected.join(' / ') || '—'}</span>
          </span>
        )}
        {view === 'cards' && r.explanation && <span className="error-explain text-muted text-sm">{r.explanation}</span>}
        <span className="error-foot text-subtle text-xs">
          <span>{tn('notebook.fails', r.fails)}</span>
          {r.successes > 0 && <span>{tn('notebook.successes', r.successes)}</span>}
          <span>{formatDate(r.lastAt, { day: 'numeric', month: 'short' })}</span>
        </span>
      </button>
    </li>
  )
}

function ErrorDetail({ r, onClose, onOriginal, onDelete, onAi }: { r: ErrorRecord; onClose(): void; onOriginal(): void; onDelete(): void; onAi(): void }) {
  const app = useApp()
  const learning = useLearning()
  const status = errorStatus(r, learning.statusCtx)
  const next = nextReviewDate(r, learning.statusCtx)
  const [notes, setNotes] = useState(r.notes ?? '')
  const [explain, setExplain] = useState(r.explanation ?? '')
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    setNotes(r.notes ?? '')
    setExplain(r.explanation ?? '')
    setEditing(false)
  }, [r.id, r.notes, r.explanation])
  const saveNotes = () => {
    if ((r.notes ?? '') !== notes) learning.patchErrors([r.id], { notes })
  }
  return (
    <aside className="card error-detail" aria-labelledby="detail-title">
      <header className="detail-head">
        <button type="button" className="btn btn-ghost btn-sm detail-back" onClick={onClose}><ArrowLeft size={15} aria-hidden /> {t('notebook.backToList')}</button>
        <span className="spacer" />
        <button type="button" className={`icon-btn${r.favorite ? ' is-on' : ''}`} aria-pressed={!!r.favorite} aria-label={r.favorite ? t('notebook.unfavorite') : t('notebook.favorite')} onClick={() => learning.patchErrors([r.id], { favorite: !r.favorite })}><Star size={17} aria-hidden /></button>
        <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={onClose}><X size={17} aria-hidden /></button>
      </header>
      <div className="detail-meta">
        <StudySkillChip skill={r.skill} />
        <span className={`status-pill st-${status}`}>{t(`notebook.statuses.${status}`)}</span>
        {!r.mastered && isRecurring(r) && status !== 'recurring' && <span className="status-pill st-recurring">{t('notebook.statuses.recurring')}</span>}
      </div>
      <h2 id="detail-title" className="detail-q">{r.question ?? t('notebook.noQuestion')}</h2>
      {r.context && <p className="detail-context text-muted">{r.context}</p>}
      <div className="compare-block">
        <div className="cmp-row is-bad"><span className="cmp-label">{t('notebook.yourAnswer')}</span><span>{r.given || t('notebook.blank')}</span></div>
        <div className="cmp-row is-good"><span className="cmp-label">{t('notebook.correct')}</span><span>{r.expected.join(' / ') || '—'}</span></div>
      </div>
      <section className="detail-section">
        <div className="row-between">
          <h3 className="field-label">{t('notebook.explanation')}{r.explanationSource === 'ai' ? ` · ${t('notebook.fromAi')}` : r.explanationSource === 'user' ? ` · ${t('notebook.edited')}` : ''}</h3>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditing((v) => !v)}>{editing ? t('common.cancel') : t('notebook.edit')}</button>
        </div>
        {editing ? (
          <>
            <textarea className="input" rows={3} value={explain} onChange={(e) => setExplain(e.target.value)} />
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { learning.patchErrors([r.id], { explanation: explain.trim() || undefined }); setEditing(false) }}>{t('notebook.save')}</button>
          </>
        ) : (
          <p className="text-sm">{r.explanation || <span className="text-subtle">{t('notebook.noExplanation')}</span>}</p>
        )}
      </section>
      <section className="detail-section">
        <label className="field">
          <span className="field-label">{t('notebook.category')}{r.categorySource === 'auto' ? ` · ${t('notebook.auto')}` : ''}</span>
          <select className="input input-sm" value={r.category ?? '-'} onChange={(e) => learning.patchErrors([r.id], { category: e.target.value === '-' ? undefined : e.target.value })}>
            <CategoryOptions />
          </select>
        </label>
        {r.part && <p className="text-subtle text-xs">{partLabel(r.part)}</p>}
      </section>
      <section className="detail-section">
        <label className="field">
          <span className="field-label">{t('notebook.notes')}</span>
          <textarea className="input" rows={3} value={notes} placeholder={t('notebook.notesPlaceholder')} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} />
        </label>
      </section>
      <dl className="detail-stats">
        <div><dt>{t('notebook.firstError')}</dt><dd>{formatDate(r.firstAt)}</dd></div>
        <div><dt>{t('notebook.lastError')}</dt><dd>{formatDate(r.lastAt)}</dd></div>
        <div><dt>{t('notebook.failsLabel')}</dt><dd className="tabular">{r.fails}</dd></div>
        <div><dt>{t('notebook.successesLabel')}</dt><dd className="tabular">{r.successes}</dd></div>
        <div><dt>{t('notebook.nextReview')}</dt><dd>{r.mastered ? t('notebook.statuses.mastered') : next ? formatDate(`${next}T12:00:00`, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</dd></div>
        <div><dt>{t('notebook.source')}</dt><dd>{t(`notebook.sources.${r.source}`)}</dd></div>
      </dl>
      {!r.autoCheck && (r.source === 'writing' || r.source === 'speaking') && <p className="text-subtle text-xs">{t('notebook.manualReviewHint')}</p>}
      <footer className="detail-actions">
        {r.ref.kind !== 'exam' && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => app.navigate({ name: 'review', session: { kind: 'custom', ids: [r.id] } })}><RotateCcw size={14} aria-hidden /> {t('notebook.reviewThis')}</button>
        )}
        {r.ref.kind !== 'none' && <button type="button" className="btn btn-secondary btn-sm" onClick={onOriginal}><ExternalLink size={14} aria-hidden /> {t('notebook.openOriginal')}</button>}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onAi}><Wand2 size={14} aria-hidden /> {t('notebook.aiOne')}</button>
        <button type="button" className="btn btn-ghost btn-sm btn-danger-text" onClick={onDelete}><Trash2 size={14} aria-hidden /> {t('common.delete')}</button>
      </footer>
    </aside>
  )
}

function Lessons() {
  const learning = useLearning()
  const lessons = Object.values(learning.state.notebook.lessons).filter((l) => !l.deleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (!lessons.length) return <p className="card text-muted">{t('notebook.noLessons')}</p>
  return (
    <div className="lessons">
      {lessons.map((l) => (
        <article key={l.id} className="card lesson">
          <header className="row-between">
            <h2 className="h2">{l.title}</h2>
            <button type="button" className="icon-btn" aria-label={t('common.delete')} onClick={() => learning.deleteLesson(l.id)}><Trash2 size={16} aria-hidden /></button>
          </header>
          <p className="text-subtle text-xs">{formatDate(l.createdAt)} · {tn('notebook.lessonErrors', l.errorIds.length)}</p>
          {l.sections.map((s, i) => (
            <section key={i} className="lesson-section">
              <h3 className="h-small">{s.heading}</h3>
              <p>{s.text}</p>
              {s.examples.length > 0 && <ul className="lesson-examples">{s.examples.map((e, j) => <li key={j} lang="en">{e}</li>)}</ul>}
            </section>
          ))}
        </article>
      ))}
    </div>
  )
}
