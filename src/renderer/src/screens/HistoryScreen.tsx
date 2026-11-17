import { useMemo, useState } from 'react'
import { History as HistoryIcon, PlayCircle, Trash2 } from 'lucide-react'
import type { PaperType } from '@shared/types'
import { PAPER_ORDER } from '@shared/types'
import { formatDuration } from '@shared/stats'
import { errorMessage, useApp } from '../lib/store'
import { PaperBadge, paperLabel } from '../components/PaperBadge'
import { ConfirmDialog } from '../components/Modal'
import { modeLabel, scoreDetail, scoreLabel } from '../lib/format'
import { formatDate, t } from '../i18n'

export function HistoryScreen() {
  const { attempts, navigate, deleteAttempt, notify } = useApp()
  const [filter, setFilter] = useState<PaperType | 'all'>('all')
  const [toDelete, setToDelete] = useState<string | null>(null)
  const list = useMemo(() => attempts.filter((a) => filter === 'all' || a.paperType === filter), [attempts, filter])

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('history.eyebrow')}</p>
          <h1 className="h1">{t('history.title')}</h1>
        </div>
        <label className="inline-field">
          <span className="text-muted text-sm">{t('history.filter')}</span>
          <select className="input input-sm" value={filter} onChange={(e) => setFilter(e.target.value as PaperType | 'all')}>
            <option value="all">{t('history.all')}</option>
            {PAPER_ORDER.map((p) => <option key={p} value={p}>{paperLabel(p)}</option>)}
          </select>
        </label>
      </header>

      {list.length === 0 ? (
        <div className="card empty-state empty-large">
          <HistoryIcon size={32} aria-hidden />
          <p className="text-muted">{t('history.empty')}</p>
        </div>
      ) : (
        <div className="card table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t('common.date')}</th>
                <th scope="col">{t('history.exam')}</th>
                <th scope="col">{t('common.paper')}</th>
                <th scope="col">{t('history.mode')}</th>
                <th scope="col" className="num">{t('history.duration')}</th>
                <th scope="col" className="num">{t('history.score')}</th>
                <th scope="col"><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap">{formatDate(a.finishedAt ?? a.startedAt, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>
                    <button type="button" className="link-btn" onClick={() => navigate(a.status === 'finished' ? { name: 'results', attemptId: a.id } : { name: 'attempt', attemptId: a.id })}>
                      {a.examName}
                    </button>
                  </td>
                  <td><PaperBadge type={a.paperType} /></td>
                  <td>{modeLabel(a.mode)}</td>
                  <td className="num tabular">{formatDuration(a.durationSec)}</td>
                  <td className="num tabular">
                    {a.status === 'finished' ? (
                      <span title={scoreDetail(a)}>{scoreLabel(a)}</span>
                    ) : (
                      <button type="button" className="btn btn-secondary btn-xs" onClick={() => navigate({ name: 'attempt', attemptId: a.id })}>
                        <PlayCircle size={14} aria-hidden /> {t('home.resume')}
                      </button>
                    )}
                  </td>
                  <td className="num">
                    <button type="button" className="icon-btn icon-btn-sm" onClick={() => setToDelete(a.id)} aria-label={t('history.delete')} title={t('history.delete')}>
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
