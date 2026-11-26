import { useMemo, useState } from 'react'
import { Check, ClipboardCopy, ClipboardPaste, ShieldCheck, TriangleAlert } from 'lucide-react'
import { newId } from '@shared/ids'
import { STUDY_SKILLS, type StudySkill } from '@shared/learning/taxonomy'
import { aliasOf, buildErrorsPrompt, DEFAULT_PROMPT_OPTIONS, ERROR_PROMPT_MODES, MAX_PROMPT_ERRORS, parseErrorSheets, parseExplanations, parseLesson, type ErrorPromptOptions, type ExplanationImport, type LessonImport } from '@shared/learning/aiErrors'
import type { ErrorRecord } from '@shared/learning/notebook'
import type { PracticeSheet } from '@shared/practice'
import { Modal } from './Modal'
import { CategoryOptions } from './CategoryOptions'
import { errorMessage, useApp } from '../lib/store'
import { useLearning } from '../lib/learning'
import { t, tn } from '../i18n'

/** Añadir un error a mano (p. ej. una corrección del profesor). Sin XP: no se premia escribir errores. */
export function ManualErrorModal({ onClose }: { onClose(): void }) {
  const learning = useLearning()
  const app = useApp()
  const [skill, setSkill] = useState<StudySkill>('useOfEnglish')
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [given, setGiven] = useState('')
  const [expected, setExpected] = useState('')
  const [explanation, setExplanation] = useState('')
  const [category, setCategory] = useState('-')
  const [notes, setNotes] = useState('')
  const valid = question.trim().length > 0 && expected.trim().length > 0
  const save = () => {
    const at = new Date().toISOString()
    const id = `m:${newId('error')}`
    learning.emit([
      {
        type: 'ERROR_ADDED',
        id: `added:${id}`,
        at,
        input: { id, skill, question, context, given, expected: expected.split(/\n|\s\/\s/).map((x) => x.trim()).filter(Boolean), explanation, category: category === '-' ? undefined : category, notes }
      }
    ])
    app.notify('success', t('notebook.added'))
    onClose()
  }
  return (
    <Modal
      open
      title={t('notebook.addTitle')}
      description={t('notebook.addDesc')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={save}><Check size={16} aria-hidden /> {t('notebook.save')}</button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t('notebook.skill')}</span>
          <select className="input" value={skill} onChange={(e) => setSkill(e.target.value as StudySkill)}>
            {STUDY_SKILLS.map((s) => <option key={s} value={s}>{t(`skills.${s}`)}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t('notebook.category')}</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <CategoryOptions />
          </select>
        </label>
        <label className="field field-wide">
          <span className="field-label">{t('notebook.question')} *</span>
          <input className="input" lang="en" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t('notebook.questionPlaceholder')} />
        </label>
        <label className="field field-wide">
          <span className="field-label">{t('notebook.context')}</span>
          <textarea className="input" lang="en" rows={2} value={context} onChange={(e) => setContext(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t('notebook.yourAnswer')}</span>
          <input className="input" lang="en" value={given} onChange={(e) => setGiven(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t('notebook.correct')} *</span>
          <input className="input" lang="en" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder={t('notebook.correctPlaceholder')} />
        </label>
        <label className="field field-wide">
          <span className="field-label">{t('notebook.explanation')}</span>
          <textarea className="input" rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </label>
        <label className="field field-wide">
          <span className="field-label">{t('notebook.notes')}</span>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
    </Modal>
  )
}

type Parsed = { mode: 'sheets'; sheets: Array<Omit<PracticeSheet, 'id'>> } | { mode: 'explanations'; items: ExplanationImport[] } | { mode: 'lesson'; lesson: LessonImport }

/** Prompt a partir de errores (copiar en un chat de IA) e importación validada de la respuesta. */
export function AiErrorsModal({ errors, onClose }: { errors: ErrorRecord[]; onClose(): void }) {
  const app = useApp()
  const learning = useLearning()
  const list = errors.slice(0, MAX_PROMPT_ERRORS)
  const [opts, setOpts] = useState<ErrorPromptOptions>(DEFAULT_PROMPT_OPTIONS)
  const [step, setStep] = useState<'prompt' | 'paste'>('prompt')
  const [pasted, setPasted] = useState('')
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prompt = useMemo(() => buildErrorsPrompt(list, opts), [list, opts])
  const setInc = (k: keyof ErrorPromptOptions['include'], v: boolean) => setOpts((o) => ({ ...o, include: { ...o.include, [k]: v } }))
  const kind: Parsed['mode'] = opts.mode === 'explanations' ? 'explanations' : opts.mode === 'lesson' ? 'lesson' : 'sheets'

  const copy = async () => {
    try {
      await window.api.copyText(prompt)
      app.notify('success', t('common.copied'))
      learning.featureUsed('errors-prompt')
      setStep('paste')
    } catch (e) {
      app.notify('error', errorMessage(e))
    }
  }

  const validate = (text: string) => {
    setPasted(text)
    setParsed(null)
    setError(null)
    if (!text.trim()) return
    try {
      if (kind === 'explanations') setParsed({ mode: 'explanations', items: parseExplanations(text, list.length) })
      else if (kind === 'lesson') setParsed({ mode: 'lesson', lesson: parseLesson(text) })
      else setParsed({ mode: 'sheets', sheets: parseErrorSheets(text) })
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const importIt = async () => {
    if (!parsed) return
    try {
      if (parsed.mode === 'sheets') {
        await app.addPracticeSheets(parsed.sheets, 'ai')
        app.notify('success', tn('ai2.sheetsAdded', parsed.sheets.length))
      } else if (parsed.mode === 'explanations') {
        learning.applyExplanations(parsed.items.map((it) => ({ id: list[it.index].id, explanation: it.explanation, category: it.category })))
        app.notify('success', tn('ai2.explanationsAdded', parsed.items.length))
      } else {
        learning.addLesson({ title: parsed.lesson.title, sections: parsed.lesson.sections, errorIds: list.map((e) => e.id) })
        app.notify('success', t('ai2.lessonAdded'))
      }
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Modal
      open
      size="lg"
      title={t('ai2.title')}
      description={tn('ai2.desc', list.length)}
      onClose={onClose}
      footer={
        step === 'prompt' ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setStep('paste')}>{t('ai2.haveAnswer')}</button>
            <button type="button" className="btn btn-primary" onClick={() => void copy()}><ClipboardCopy size={16} aria-hidden /> {t('ai2.copy')}</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setStep('prompt')}>{t('ai2.backToPrompt')}</button>
            <button type="button" className="btn btn-primary" disabled={!parsed} onClick={() => void importIt()}><Check size={16} aria-hidden /> {t('ai2.import')}</button>
          </>
        )
      }
    >
      {step === 'prompt' ? (
        <div className="ai2">
          <p className="ai2-privacy text-sm"><ShieldCheck size={15} aria-hidden /> {t('ai2.privacy')}</p>
          <fieldset className="wizard-field">
            <legend>{t('ai2.mode')}</legend>
            <div className="chip-row">
              {ERROR_PROMPT_MODES.map((m) => (
                <button key={m} type="button" className={`chip${opts.mode === m ? ' is-active' : ''}`} aria-pressed={opts.mode === m} onClick={() => setOpts((o) => ({ ...o, mode: m }))}>{t(`ai2.modes.${m}`)}</button>
              ))}
            </div>
            <p className="text-muted text-sm">{t(`ai2.modeHint.${opts.mode}`)}</p>
          </fieldset>
          <fieldset className="wizard-field">
            <legend>{t('ai2.include')}</legend>
            <div className="chip-row">
              {(['given', 'context', 'explanation', 'category', 'notes'] as const).map((k) => (
                <label key={k} className="check">
                  <input type="checkbox" checked={opts.include[k]} onChange={(e) => setInc(k, e.target.checked)} /> {t(`ai2.inc.${k}`)}
                </label>
              ))}
            </div>
          </fieldset>
          {kind === 'sheets' && (
            <div className="row-gap">
              <label className="field">
                <span className="field-label">{t('ai2.difficulty')}</span>
                <select className="input input-sm" value={opts.difficulty} onChange={(e) => setOpts((o) => ({ ...o, difficulty: e.target.value as ErrorPromptOptions['difficulty'] }))}>
                  {(['easier', 'same', 'harder'] as const).map((d) => <option key={d} value={d}>{t(`ai2.diff.${d}`)}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t('ai2.count')}</span>
                <select className="input input-sm" value={opts.count} onChange={(e) => setOpts((o) => ({ ...o, count: Number(e.target.value) }))}>
                  {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
          )}
          <label className="field">
            <span className="field-label">{t('ai2.preview')}</span>
            <textarea className="input input-mono ai2-preview" readOnly rows={10} value={prompt} />
          </label>
          {errors.length > MAX_PROMPT_ERRORS && <p className="text-subtle text-sm">{t('ai2.limited', { n: MAX_PROMPT_ERRORS })}</p>}
        </div>
      ) : (
        <div className="ai2">
          <label className="field">
            <span className="field-label"><ClipboardPaste size={14} aria-hidden /> {t('ai2.paste')}</span>
            <textarea className="input input-mono" rows={9} value={pasted} onChange={(e) => validate(e.target.value)} placeholder={t('ai2.pastePlaceholder')} />
          </label>
          {error && <p className="field-error" role="alert"><TriangleAlert size={14} aria-hidden /> {error}</p>}
          {parsed?.mode === 'sheets' && (
            <ul className="ai2-result">
              {parsed.sheets.map((s, i) => <li key={i}><strong lang="en">{s.title}</strong> · {s.topic} · {tn('ai2.tasks', s.tasks.length)}</li>)}
            </ul>
          )}
          {parsed?.mode === 'explanations' && (
            <ul className="ai2-result">
              {parsed.items.map((it) => (
                <li key={it.index}><strong>{aliasOf(it.index)}</strong> · {list[it.index].question ?? list[it.index].expected.join(' / ')}<br /><span className="text-muted text-sm">{it.explanation}</span></li>
              ))}
            </ul>
          )}
          {parsed?.mode === 'lesson' && (
            <div className="ai2-result">
              <strong>{parsed.lesson.title}</strong>
              <p className="text-muted text-sm">{parsed.lesson.sections.map((s) => s.heading).join(' · ')}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
