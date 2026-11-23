import { useMemo, useState } from 'react'
import { AlertTriangle, BookText, CheckCircle2, ChevronDown, Lightbulb, ListChecks, Plus } from 'lucide-react'
import { analyzeWriting, WRITING_GUIDES, WRITING_TYPES, type WritingType } from '@shared/writing'
import { Mascot } from './Mascot'
import { t } from '../i18n'

interface Props {
  text: string
  type: WritingType
  onType(type: WritingType): void
  minWords?: number
  maxWords?: number
  /** Inserta una frase en el texto (donde está el cursor). */
  onInsert(phrase: string): void
}

/** Ayuda para Writing: revisión automática mientras escribes y guía del tipo de texto. */
export function WritingHelp({ text, type, onType, minWords, maxWords, onInsert }: Props) {
  const [tab, setTab] = useState<'check' | 'guide'>('check')
  const [open, setOpen] = useState(true)
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const analysis = useMemo(() => analyzeWriting(text, type, minWords || 140, maxWords || 190), [text, type, minWords, maxWords])
  const guide = WRITING_GUIDES[type]
  const warnings = analysis.checks.filter((c) => c.level === 'warn').length
  const allGood = analysis.words >= (minWords || 140) && warnings === 0 && analysis.checks.length > 0

  return (
    <section className={`writing-help${open ? ' is-open' : ''}`} aria-label={t('writing.title')}>
      <header className="writing-help-head">
        <button type="button" className="writing-help-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <Lightbulb size={16} aria-hidden /> {t('writing.title')}
          {warnings > 0 && <span className="pill pill-warning">{warnings}</span>}
          <ChevronDown size={16} aria-hidden className="writing-help-chevron" />
        </button>
        <label className="inline-field text-sm">
          <span className="text-muted">{t('writing.type')}</span>
          <select className="input input-sm" value={type} onChange={(e) => onType(e.target.value as WritingType)}>
            {WRITING_TYPES.map((w) => <option key={w} value={w}>{WRITING_GUIDES[w].label}</option>)}
          </select>
        </label>
      </header>

      {open && (
        <div className="writing-help-body">
          <div className="seg seg-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'check'} className={`seg-btn${tab === 'check' ? ' is-active' : ''}`} onClick={() => setTab('check')}>
              <ListChecks size={15} aria-hidden /> {t('writing.tabCheck')}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'guide'} className={`seg-btn${tab === 'guide' ? ' is-active' : ''}`} onClick={() => setTab('guide')}>
              <BookText size={15} aria-hidden /> {t('writing.tabGuide')}
            </button>
          </div>

          {tab === 'check' ? (
            analysis.words === 0 ? (
              <Mascot mood="wave" size={56} message={t('writing.empty', { type: guide.label })} />
            ) : (
              <>
                {allGood && <Mascot mood="celebrate" size={56} message={t('writing.allGood')} />}
                <ul className="writing-checks" aria-live="polite">
                  {analysis.checks.map((c, i) => (
                    <li key={i} className={`writing-check is-${c.level}`}>
                      {c.level === 'ok' ? <CheckCircle2 size={15} aria-hidden /> : c.level === 'warn' ? <AlertTriangle size={15} aria-hidden /> : <Lightbulb size={15} aria-hidden />}
                      <span>{c.text}</span>
                    </li>
                  ))}
                </ul>
                <p className="writing-stats text-subtle text-sm">
                  {t('writing.stats', { words: analysis.words, paragraphs: analysis.paragraphs, sentences: analysis.sentences })}
                  {analysis.connectors.length > 0 && <> · {t('writing.connectors')}: <em>{analysis.connectors.slice(0, 8).join(', ')}</em></>}
                </p>
                <p className="text-subtle text-sm">{t('writing.disclaimer')}</p>
              </>
            )
          ) : (
            <div className="writing-guide">
              <p>{guide.purpose}</p>
              <p className="text-muted text-sm"><strong>{t('writing.register')}:</strong> {guide.register}</p>
              <h3 className="writing-guide-title">{t('writing.structure')}</h3>
              <ol className="writing-structure">
                {guide.structure.map((s) => (
                  <li key={s.title}><strong>{s.title}.</strong> {s.text}</li>
                ))}
              </ol>
              <h3 className="writing-guide-title">{t('writing.phrases')}</h3>
              <p className="text-subtle text-sm">{t('writing.phrasesHint')}</p>
              <div className="writing-phrases">
                {guide.phrases.map((g) => (
                  <div key={g.group} className="writing-phrase-group">
                    <span className="writing-phrase-label">{g.group}</span>
                    <div className="writing-chips">
                      {g.items.map((p) => (
                        <button key={p} type="button" className="writing-chip" onClick={() => onInsert(p)} title={t('writing.insert')}>
                          <Plus size={12} aria-hidden /> {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <h3 className="writing-guide-title">{t('writing.checklist')}</h3>
              <ul className="writing-checklist">
                {guide.checklist.map((c) => (
                  <li key={c}>
                    <label>
                      <input type="checkbox" checked={!!ticks[`${type}:${c}`]} onChange={(e) => setTicks((x) => ({ ...x, [`${type}:${c}`]: e.target.checked }))} /> {c}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
