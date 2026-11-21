import { useState } from 'react'
import { Bot, FileUp, Minus, Plus, ShieldCheck } from 'lucide-react'
import { buildSheetPrompt, parseSheets, PRACTICE_SKILLS, type PracticeSkill } from '@shared/practice'
import { errorMessage, useApp } from '../lib/store'
import { Modal } from './Modal'
import { CopyButton } from './CopyButton'
import { SKILL_ICON, skillLabel } from './SkillBadge'
import { t } from '../i18n'

/** Crear hojas nuevas: pidiéndoselas a un chat de IA (copiar y pegar) o importando un archivo. */
export function CreateSheetsModal({ onClose, onAdded }: { onClose(): void; onAdded(): void }) {
  const app = useApp()
  const [tab, setTab] = useState<'ai' | 'file'>('ai')
  const [skill, setSkill] = useState<PracticeSkill>('vocabulary')
  const [topic, setTopic] = useState('')
  const [focus, setFocus] = useState('')
  const [count, setCount] = useState(1)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const add = async (text: string, source: 'ai' | 'file') => {
    setError(null)
    setBusy(true)
    try {
      const sheets = parseSheets(text)
      const saved = await app.addPracticeSheets(sheets, source)
      app.notify('success', saved.length === 1 ? t('createSheets.added') : t('createSheets.addedMany', { n: saved.length }))
      onAdded()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const chooseFile = async () => {
    try {
      const file = await window.api.openPracticeFile()
      if (file) await add(file.text, 'file')
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <Modal
      open
      size="lg"
      title={t('createSheets.title')}
      description={t('createSheets.description')}
      onClose={onClose}
      footer={
        tab === 'ai' ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
            <button type="button" className="btn btn-primary" disabled={!pasted.trim() || busy} onClick={() => void add(pasted, 'ai')}>
              <Plus size={16} aria-hidden /> {t('createSheets.add')}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('common.close')}</button>
        )
      }
    >
      <div className="form-stack">
        <div className="seg seg-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'ai'} className={`seg-btn${tab === 'ai' ? ' is-active' : ''}`} onClick={() => (setTab('ai'), setError(null))}>
            <Bot size={16} aria-hidden /> {t('createSheets.tabAi')}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'file'} className={`seg-btn${tab === 'file' ? ' is-active' : ''}`} onClick={() => (setTab('file'), setError(null))}>
            <FileUp size={16} aria-hidden /> {t('createSheets.tabFile')}
          </button>
        </div>

        {tab === 'ai' ? (
          <>
            <fieldset className="field">
              <legend className="field-label">{t('createSheets.step1')}</legend>
              <div className="skill-picker" role="radiogroup" aria-label={t('createSheets.skill')}>
                {PRACTICE_SKILLS.map((s) => {
                  const Icon = SKILL_ICON[s]
                  return (
                    <label key={s} className={`skill-pick skill-${s}${skill === s ? ' is-selected' : ''}`}>
                      <input type="radio" name="skill" value={s} checked={skill === s} onChange={() => setSkill(s)} />
                      <Icon size={18} aria-hidden />
                      <span>{skillLabel(s)}</span>
                    </label>
                  )
                })}
              </div>
              <div className="create-fields">
                <label className="field field-grow">
                  <span className="field-label">{t('createSheets.topic')}</span>
                  <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t('createSheets.topicPlaceholder')} maxLength={80} />
                </label>
                <label className="field field-grow">
                  <span className="field-label">{t('createSheets.focus')}</span>
                  <input className="input" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder={t('createSheets.focusPlaceholder')} maxLength={120} />
                </label>
                <div className="field">
                  <span className="field-label" id="count-label">{t('createSheets.count')}</span>
                  <div className="stepper" role="group" aria-labelledby="count-label">
                    <button type="button" className="icon-btn icon-btn-sm" onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={count <= 1} aria-label="−1"><Minus size={14} aria-hidden /></button>
                    <span className="tabular" aria-live="polite">{count}</span>
                    <button type="button" className="icon-btn icon-btn-sm" onClick={() => setCount((c) => Math.min(5, c + 1))} disabled={count >= 5} aria-label="+1"><Plus size={14} aria-hidden /></button>
                  </div>
                </div>
              </div>
            </fieldset>
            <div className="field">
              <span className="field-label">{t('createSheets.step2')}</span>
              <div className="row-gap">
                <CopyButton getText={() => buildSheetPrompt({ skill, topic, focus, count })} label={t('createSheets.copy')} />
              </div>
            </div>
            <label className="field">
              <span className="field-label">{t('createSheets.step3')}</span>
              <textarea className="input input-mono paste-area" rows={6} value={pasted} onChange={(e) => (setPasted(e.target.value), setError(null))} placeholder={t('createSheets.pastePlaceholder')} spellCheck={false} />
            </label>
            <p className="notice"><ShieldCheck size={16} aria-hidden /> {t('createSheets.privacy')}</p>
          </>
        ) : (
          <div className="file-import">
            <p className="text-muted">{t('createSheets.fileText')}</p>
            <button type="button" className="btn btn-primary" onClick={() => void chooseFile()} disabled={busy}>
              <FileUp size={16} aria-hidden /> {t('createSheets.chooseFile')}
            </button>
          </div>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
    </Modal>
  )
}
