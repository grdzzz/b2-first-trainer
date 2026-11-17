import { useMemo, useState } from 'react'
import { FileUp } from 'lucide-react'
import type { Exam } from '@shared/types'
import { applyKey, keyToText, parseKey, type ApplyKeyReport } from '@shared/keys'
import { Modal } from './Modal'
import { t } from '../i18n'

interface Props {
  open: boolean
  exam: Exam
  paperId: string
  partId?: string
  onClose(): void
  onSave(exam: Exam, report: ApplyKeyReport): void
}

export function KeyEditor({ open, exam, paperId, partId, onClose, onSave }: Props) {
  const paper = exam.papers.find((p) => p.id === paperId)!
  const part = partId ? paper.parts.find((p) => p.id === partId) : undefined
  const [text, setText] = useState(() => keyToText(paper, partId))
  const [fileError, setFileError] = useState<string | null>(null)

  const range = useMemo(() => {
    const qs = (part ? [part] : paper.parts).flatMap((p) => p.questions).filter((q) => q.kind === 'choice' || q.kind === 'text')
    return qs.length ? `${qs[0].number}–${qs[qs.length - 1].number}` : '—'
  }, [paper, part])

  const preview = useMemo(() => {
    if (!text.trim()) return { kind: 'empty' as const }
    try {
      const parsed = parseKey(text)
      const result = applyKey(exam, parsed, { paperId, partId, replace: true })
      return { kind: 'ok' as const, ...result }
    } catch (e) {
      return { kind: 'error' as const, message: (e as Error).message }
    }
  }, [text, exam, paperId, partId])

  const importFile = async () => {
    setFileError(null)
    try {
      const file = await window.api.openKeyFile()
      if (file) setText(file.text)
    } catch (e) {
      setFileError((e as Error).message)
    }
  }

  const clearKey = () => {
    const next = applyKey(exam, { papers: {}, loose: {}, warnings: [] }, { paperId, partId, replace: true })
    onSave(next.exam, next.report)
  }

  const title = part ? t('keyEditor.titlePart', { part: part.number, paper: paper.title }) : t('keyEditor.titlePaper', { paper: paper.title })
  const issues = preview.kind === 'ok' ? [...preview.report.warnings, ...preview.report.invalid, ...preview.report.unmatched.map((u) => t('keyEditor.unmatched', { q: u }))] : []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={t('keyEditor.description', { range })}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-ghost btn-danger-text" onClick={clearKey}>{t('keyEditor.clear')}</button>
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" disabled={preview.kind !== 'ok'} onClick={() => preview.kind === 'ok' && onSave(preview.exam, preview.report)}>
            {t('keyEditor.save')}
          </button>
        </>
      }
    >
      <div className="key-editor">
        <div className="key-editor-main">
          <div className="row-between">
            <label htmlFor="key-text" className="field-label">{t('keyEditor.textLabel')}</label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={importFile}>
              <FileUp size={15} aria-hidden /> {t('keyEditor.importFile')}
            </button>
          </div>
          <textarea
            id="key-text"
            className="input input-mono"
            rows={14}
            spellCheck={false}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'1 B\n2 C\n9 which\n10 at / in'}
          />
          {fileError && <p className="field-error" role="alert">{fileError}</p>}
        </div>
        <aside className="key-editor-help">
          <h3 className="h-small">{t('keyEditor.formatTitle')}</h3>
          <ul className="help-list">
            <li><code>1 B</code> — {t('keyEditor.helpLine')}</li>
            <li><code>10 at / in</code> — {t('keyEditor.helpAlt')}</li>
            <li><code>[listening]</code> — {t('keyEditor.helpSection')}</li>
            <li><code>{'{ "1": "B" }'}</code> — {t('keyEditor.helpJson')}</li>
          </ul>
          <div className="key-preview" aria-live="polite">
            {preview.kind === 'empty' && <p className="text-muted">{t('keyEditor.empty')}</p>}
            {preview.kind === 'error' && <p className="field-error">{preview.message}</p>}
            {preview.kind === 'ok' && (
              <>
                <p className="key-ok">{t('keyEditor.recognized', { n: preview.report.applied })}</p>
                {issues.length > 0 && (
                  <ul className="issue-list">
                    {issues.slice(0, 12).map((w, i) => <li key={i}>{w}</li>)}
                    {issues.length > 12 && <li>{t('keyEditor.more', { n: issues.length - 12 })}</li>}
                  </ul>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </Modal>
  )
}
