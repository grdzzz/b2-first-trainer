import { useMemo, useState } from 'react'
import { ChevronRight, Clock3, History as HistoryIcon, ListChecks, PlayCircle, Target, Trash2 } from 'lucide-react'
import type { Attempt, PaperType } from '@shared/types'
import { PAPER_ORDER } from '@shared/types'
import { formatDuration } from '@shared/stats'
import { errorMessage, useApp } from '../lib/store'
import { PaperBadge, PaperIcon, paperLabel } from '../components/PaperBadge'
import { CambridgeBadge } from '../components/CambridgeBadge'
import { ConfirmDialog } from '../components/Modal'
import { modeLabel, scoreDetail, scoreLabel } from '../lib/format'
import { formatDate, t } from '../i18n'

/** «Hoy», «Ayer» o la fecha larga. */
function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((start(now) - start(d)) / 86_400_000)
  if (diff === 0) return t('history.today')
  if (diff === 1) return t('history.yesterday')
  return formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}

export function HistoryScreen() {
  const { attempts, navigate, deleteAttempt, notify } = useApp()
  const [filter, setFilter] = useState<PaperType | 'all'>('all')
  const [toDelete, setToDelete] = useState<string | null>(null)
  const list = useMemo(() => attempts.filter((a) => filter === 'all' || a.paperType === filter), [attempts, filter])

  const groups = useMemo(() => {
    const out: Array<{ label: string; items: Attempt[] }> = []
    for (const a of list) {
      const label = dayLabel(a.finishedAt ?? a.startedAt)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(a)
      else out.push({ label, items: [a] })
    }
    return out
  }, [list])

  const summary = useMemo(() => {
    const finished = list.filter((a) => a.status === 'finished')
    const scored = finished.filter((a) => a.mode !== 'review' && a.result?.percent != null)
    const minutes = Math.round(list.reduce((n, a) => n + a.durationSec, 0) / 60)
    const avg = scored.length ? Math.round(scored.reduce((n, a) => n + (a.result!.percent ?? 0), 0) / scored.length) : null
    return { finished: finished.length, minutes, avg }
  }, [list])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: attempts.length }
    for (const a of attempts) c[a.paperType] = (c[a.paperType] ?? 0) + 1
    return c
  }, [attempts])

  const open = (a: Attempt) => navigate(a.status === 'finished' ? { name: 'results', attemptId: a.id } : { name: 'attempt', attemptId: a.id })

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('history.eyebrow')}</p>
          <h1 className="h1">{t('history.title')}</h1>
        </div>
      </header>

      {attempts.length > 0 && (
        <div className="history-toolbar">
          <div className="seg" role="group" aria-label={t('history.filter')}>
            <button type="button" className={`seg-btn${filter === 'all' ? ' is-active' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              {t('history.all')} <span className="seg-count tabular">{counts.all}</span>
            </button>
            {PAPER_ORDER.filter((p) => counts[p]).map((p) => (
              <button key={p} type="button" className={`seg-btn paper-${p}${filter === p ? ' is-active' : ''}`} aria-pressed={filter === p} onClick={() => setFilter(p)}>
                <PaperIcon type={p} size={15} /> {paperLabel(p)} <span className="seg-count tabular">{counts[p]}</span>
              </button>
            ))}
          </div>
          <div className="history-summary">
            <span><ListChecks size={15} aria-hidden /> <strong className="tabular">{summary.finished}</strong> {t('history.finished')}</span>
            <span><Clock3 size={15} aria-hidden /> <strong className="tabular">{summary.minutes < 60 ? `${summary.minutes} min` : `${(summary.minutes / 60).toFixed(1).replace('.', ',')} h`}</strong></span>
            {summary.avg !== null && <span><Target size={15} aria-hidden /> <strong className="tabular">{summary.avg}%</strong> {t('history.average')}</span>}
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="card empty-state empty-large">
          <HistoryIcon size={32} aria-hidden />
          <p className="text-muted">{t('history.empty')}</p>
        </div>
      ) : (
        <div className="history-groups">
          {groups.map((g) => (
            <section key={g.label} className="history-group" aria-label={g.label}>
              <h2 className="history-day">{g.label}</h2>
              <ul className="card history-list">
                {g.items.map((a) => {
                  const pct = a.result?.percent ?? null
                  const tone = pct === null ? '' : pct >= 80 ? ' score-great' : pct >= 60 ? ' score-good' : ' score-low'
                  return (
                    <li key={a.id} className={`history-row paper-${a.paperType}`}>
                      <button type="button" className="history-main" onClick={() => open(a)}>
                        <span className="history-icon" aria-hidden><PaperIcon type={a.paperType} size={18} /></span>
                        <span className="history-text">
                          <span className="history-name">{a.examName}</span>
                          <span className="history-meta">
                            <PaperBadge type={a.paperType} />
                            <span>{modeLabel(a.mode)}</span>
                            <span className="tabular">{formatDate(a.finishedAt ?? a.startedAt, { timeStyle: 'short' })}</span>
                            <span className="tabular"><Clock3 size={12} aria-hidden /> {formatDuration(a.durationSec)}</span>
                          </span>
                        </span>
                        {a.status === 'finished' ? (
                          <span className="history-score" title={scoreDetail(a)}>
                            {pct !== null && a.mode !== 'review' && (a.paperType === 'reading' || a.paperType === 'listening') && <CambridgeBadge percent={pct} size="sm" />}
                            <span className={`sheet-score${tone}`}>{scoreLabel(a)}</span>
                          </span>
                        ) : (
                          <span className="pill pill-warning"><PlayCircle size={13} aria-hidden /> {t('home.resume')}</span>
                        )}
                        <ChevronRight size={16} className="history-chevron" aria-hidden />
                      </button>
                      <button type="button" className="icon-btn icon-btn-sm history-delete" onClick={() => setToDelete(a.id)} aria-label={t('history.delete')} title={t('history.delete')}>
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={t('history.deleteTitle')}
        message={t('history.deleteMessage')}
        confirmLabel={t('common.delete')}
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const id = toDelete!
          setToDelete(null)
          try {
            await deleteAttempt(id)
          } catch (e) {
            notify('error', errorMessage(e))
          }
        }}
      />
    </div>
  )
}
