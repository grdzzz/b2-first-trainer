import { useMemo, useState } from 'react'
import { ClipboardPaste, Sparkles } from 'lucide-react'
import type { Attempt, Paper } from '@shared/types'
import { applyAiCorrection, buildBulkCorrectionPrompt, parseAiCorrection, tasksForAttempt } from '@shared/aiCorrection'
import { CopyButton } from './CopyButton'
import { Modal } from './Modal'
import { t, tn } from '../i18n'

interface Props {
  attempt: Attempt
  paper: Paper
  onApply(next: Attempt): void
}

/** Corrección en bloque con un chat de IA: copiar todas las tareas y pegar la respuesta. */
export function AiCorrectionPanel({ attempt, paper, onApply }: Props) {
  const [pasting, setPasting] = useState(false)
  const tasks = useMemo(() => tasksForAttempt(attempt, paper), [attempt, paper])
  const empty = tasks.filter((x) => !x.text)
  const corrected = tasks.filter((x) => attempt.aiFeedback?.[x.questionId]).length
  const type = paper.type === 'speaking' ? 'speaking' : 'writing'

  return (
    <section className="card ai-panel" aria-labelledby="ai-title">
      <div className="ai-panel-head">
        <span className="ai-icon" aria-hidden><Sparkles size={20} /></span>
        <div>
          <h2 id="ai-title" className="section-title">{t('ai.title')}</h2>
          <p className="text-muted text-sm">{corrected ? tn('ai.corrected', corrected, { total: tasks.length }) : t('ai.intro')}</p>
        </div>
      </div>
      <ol className="ai-steps">
        <li>
          <span className="ai-step-n">1</span>
          <div>
            <p className="ai-step-title">{t('ai.step1')}</p>
            {empty.length > 0 && <p className="field-error text-sm">{type === 'speaking' ? t('ai.emptySpeaking', { tasks: empty.map((x) => x.id).join(', ') }) : t('ai.emptyWriting', { tasks: empty.map((x) => x.id).join(', ') })}</p>}
          </div>
          <CopyButton label={t('ai.copyAll')} getText={() => buildBulkCorrectionPrompt({ examName: attempt.examName, paperType: type, tasks })} />
        </li>
        <li>
          <span className="ai-step-n">2</span>
          <div>
            <p className="ai-step-title">{t('ai.step2')}</p>
            <p className="text-subtle text-sm">{t('ai.step2Hint')}</p>
          </div>
        </li>
        <li>
          <span className="ai-step-n">3</span>
          <div>
            <p className="ai-step-title">{t('ai.step3')}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setPasting(true)}>
            <ClipboardPaste size={16} aria-hidden /> {t('ai.paste')}
          </button>
        </li>
      </ol>
      {attempt.aiGeneral && (
        <div className="ai-general">
          <p className="field-label">{t('ai.general')}</p>
          <p>{attempt.aiGeneral}</p>
        </div>
      )}
      {pasting && (
        <PasteModal
          attempt={attempt}
          paper={paper}
          onClose={() => setPasting(false)}
          onApply={(next) => {
            onApply(next)
            setPasting(false)
          }}
        />
      )}
    </section>
  )
}

function PasteModal({ attempt, paper, onClose, onApply }: Props & { onClose(): void }) {
  const [text, setText] = useState('')
  const tasks = useMemo(() => tasksForAttempt(attempt, paper), [attempt, paper])
  const preview = useMemo(() => {
    if (!text.trim()) return { kind: 'empty' as const }
    try {
      return { kind: 'ok' as const, parsed: parseAiCorrection(text, tasks.map((x) => x.id), paper.type) }
    } catch (e) {
      return { kind: 'error' as const, message: (e as Error).message }
    }
  }, [text, tasks, paper.type])

  const pasteFromClipboard = async () => {
    try {
      setText(await navigator.clipboard.readText())
    } catch {
      /* sin permiso de portapapeles: se pega a mano */
    }
  }

  return (
    <Modal
      open
      size="lg"
      title={t('ai.pasteTitle')}
      description={t('ai.pasteDescription')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" disabled={preview.kind !== 'ok'} onClick={() => preview.kind === 'ok' && onApply(applyAiCorrection(attempt, tasks, preview.parsed))}>
            {t('ai.apply')}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <div className="row-between">
          <label htmlFor="ai-reply" className="field-label">{t('ai.replyLabel')}</label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={pasteFromClipboard}>
            <ClipboardPaste size={15} aria-hidden /> {t('ai.pasteClipboard')}
          </button>
        </div>
        <textarea id="ai-reply" className="input input-mono" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'```json\n{ "formato": "b2ft-correccion", "tareas": [ … ] }\n```'} spellCheck={false} />
        <div className="key-preview" aria-live="polite">
          {preview.kind === 'empty' && <p className="text-muted">{t('ai.previewEmpty')}</p>}
          {preview.kind === 'error' && <p className="field-error">{preview.message}</p>}
          {preview.kind === 'ok' && (
            <>
              <ul className="ai-preview-list">
                {tasks.map((task) => {
                  const fb = preview.parsed.tasks[task.id]
                  const scores = fb ? Object.values(fb.scores) : []
                  return (
                    <li key={task.id}>
                      <strong>{task.id}</strong> · {t('attempt.partShort', { n: task.partNumber })}
                      {fb ? <span className="key-ok"> — {scores.reduce((a, b) => a + b, 0)}/{scores.length * 5} · {tn('ai.errorsCount', fb.errors.length)}</span> : <span className="text-subtle"> — {t('ai.noCorrection')}</span>}
                    </li>
                  )
                })}
              </ul>
              {preview.parsed.warnings.length > 0 && (
                <ul className="issue-list">
                  {preview.parsed.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
