import { useState } from 'react'
import { BookMarked, Plus, Trash2 } from 'lucide-react'
import type { PaperType } from '@shared/types'
import { PAPER_ORDER } from '@shared/types'
import { createExam, partHasKey } from '@shared/template'
import { errorMessage, useApp } from '../lib/store'
import { Modal, ConfirmDialog } from '../components/Modal'
import { PaperBadge, paperLabel } from '../components/PaperBadge'
import { formatDate, t, tn } from '../i18n'

export function LibraryScreen() {
  const { exams, attempts, navigate, saveExam, deleteExam, notify } = useApp()
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('library.eyebrow')}</p>
          <h1 className="h1">{t('library.title')}</h1>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          <Plus size={18} aria-hidden /> {t('library.new')}
        </button>
      </header>

      {exams.length === 0 ? (
        <div className="card empty-state empty-large">
          <BookMarked size={32} aria-hidden />
          <h2 className="h2">{t('library.emptyTitle')}</h2>
          <p className="text-muted measure">{t('library.emptyText')}</p>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={18} aria-hidden /> {t('library.new')}
          </button>
        </div>
      ) : (
        <ul className="exam-grid">
          {exams.map((exam) => {
            const done = attempts.filter((a) => a.examId === exam.id && a.status === 'finished').length
            return (
              <li key={exam.id} className="card exam-card">
                <button type="button" className="exam-card-main" onClick={() => navigate({ name: 'exam', examId: exam.id })}>
                  <span className="exam-card-title">{exam.name}</span>
                  <span className="text-subtle text-sm">{t('library.imported', { date: formatDate(exam.importedAt) })} · {tn('library.attempts', done)}</span>
                </button>
                <div className="exam-card-papers">
                  {exam.papers.map((p) => {
                    const auto = p.type === 'reading' || p.type === 'listening'
                    const keyed = p.parts.filter(partHasKey).length
                    return (
                      <span key={p.id} className="exam-card-paper">
                        <PaperBadge type={p.type} />
                        {auto && <span className={`key-dot${keyed === p.parts.length ? ' is-full' : keyed ? ' is-partial' : ''}`} title={t('library.keyStatus', { n: keyed, total: p.parts.length })} aria-label={t('library.keyStatus', { n: keyed, total: p.parts.length })} />}
                      </span>
                    )
                  })}
                </div>
                <button type="button" className="icon-btn exam-card-delete" onClick={() => setToDelete(exam.id)} aria-label={t('library.deleteNamed', { name: exam.name })} title={t('common.delete')}>
                  <Trash2 size={16} aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {creating && (
        <NewExamModal
          onClose={() => setCreating(false)}
          onCreate={async (name, papers) => {
            try {
              const exam = await saveExam(createExam(name, papers))
              setCreating(false)
              navigate({ name: 'exam', examId: exam.id })
            } catch (e) {
              notify('error', t('errors.saveFailed', { error: errorMessage(e) }))
            }
          }}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={t('library.deleteTitle')}
        message={t('library.deleteMessage', { name: exams.find((e) => e.id === toDelete)?.name ?? '' })}
        confirmLabel={t('common.delete')}
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          const id = toDelete!
          setToDelete(null)
          try {
            await deleteExam(id)
            notify('success', t('library.deleted'))
          } catch (e) {
            notify('error', errorMessage(e))
          }
        }}
      />
    </div>
  )
}

function NewExamModal({ onClose, onCreate }: { onClose(): void; onCreate(name: string, papers: PaperType[]): void }) {
  const [name, setName] = useState('')
  const [papers, setPapers] = useState<PaperType[]>([...PAPER_ORDER])
  const valid = name.trim().length > 0 && papers.length > 0
  return (
    <Modal
      open
      title={t('library.newTitle')}
      description={t('library.newDescription')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" form="new-exam" className="btn btn-primary" disabled={!valid}>{t('library.create')}</button>
        </>
      }
    >
      <form
        id="new-exam"
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onCreate(name, papers)
        }}
      >
        <label className="field">
          <span className="field-label">{t('library.name')}</span>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('library.namePlaceholder')} maxLength={120} />
        </label>
        <fieldset className="field">
          <legend className="field-label">{t('library.papers')}</legend>
          <div className="check-grid">
            {PAPER_ORDER.map((type) => (
              <label key={type} className="check-card">
                <input
                  type="checkbox"
                  checked={papers.includes(type)}
                  onChange={(e) => setPapers((ps) => (e.target.checked ? PAPER_ORDER.filter((x) => x === type || ps.includes(x)) : ps.filter((x) => x !== type)))}
                />
                <span>{paperLabel(type)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-subtle text-sm">{t('library.templateHint')}</p>
      </form>
    </Modal>
  )
}
