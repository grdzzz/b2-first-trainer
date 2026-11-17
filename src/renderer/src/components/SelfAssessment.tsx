import type { PaperType, SelfAssessment as SA } from '@shared/types'
import { criteriaFor } from '@shared/types'
import { selfAssessmentAverage } from '@shared/grading'
import { t, type TKey } from '../i18n'

interface Props {
  paperType: PaperType
  value?: SA
  onChange(value: SA): void
  idPrefix: string
}

/** Autoevaluación con los criterios de Cambridge (0–5 por criterio). */
export function SelfAssessment({ paperType, value, onChange, idPrefix }: Props) {
  const criteria = criteriaFor(paperType)
  const scores = value?.scores ?? {}
  const avg = selfAssessmentAverage(scores, criteria)
  return (
    <fieldset className="self-assessment">
      <legend>{t('self.title')}</legend>
      <p className="text-muted text-sm">{t('self.help')}</p>
      <div className="criteria">
        {criteria.map((c) => (
          <div className="criterion" key={c} role="radiogroup" aria-labelledby={`${idPrefix}-${c}`}>
            <div className="criterion-head">
              <span id={`${idPrefix}-${c}`} className="criterion-name">{t(`criteria.${c}` as TKey)}</span>
              <span className="criterion-desc text-subtle">{t(`criteria.${c}Desc` as TKey)}</span>
            </div>
            <div className="score-pills">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={scores[c] === n}
                  className={`score-pill${scores[c] === n ? ' is-selected' : ''}`}
                  onClick={() => onChange({ ...value, scores: { ...scores, [c]: n } })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <label className="field">
        <span className="field-label">{t('self.notes')}</span>
        <textarea className="input" rows={3} value={value?.notes ?? ''} onChange={(e) => onChange({ scores, notes: e.target.value })} placeholder={t('self.notesPlaceholder')} />
      </label>
      <p className="self-total" aria-live="polite">
        {avg === undefined ? t('self.incomplete') : t('self.total', { score: Math.round(avg * criteria.length * 10) / 10, max: criteria.length * 5 })}
      </p>
    </fieldset>
  )
}
