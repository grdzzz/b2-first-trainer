import { ArrowRight, Lightbulb, Sparkles } from 'lucide-react'
import type { AiFeedback } from '@shared/types'
import { t, tn } from '../i18n'

/** Comentarios de la IA para una tarea: resumen, errores corregidos, consejos y versión mejorada. */
export function AiFeedbackView({ fb, kind }: { fb: AiFeedback; kind: 'essay' | 'speaking' }) {
  return (
    <div className="ai-feedback">
      <p className="ai-feedback-title"><Sparkles size={16} aria-hidden /> {t('ai.feedbackTitle')}{fb.chosenTask ? ` · ${t('ai.chosen', { n: fb.chosenTask })}` : ''}</p>
      {fb.summary && <p className="ai-summary">{fb.summary}</p>}
      {fb.errors.length > 0 && (
        <div>
          <p className="field-label">{tn('ai.errorsCount', fb.errors.length)}</p>
          <ul className="ai-errors">
            {fb.errors.map((e, i) => (
              <li key={i}>
                <span className="ai-wrong">{e.original}</span>
                {e.correction && (
                  <>
                    <ArrowRight size={14} aria-hidden className="ai-arrow" />
                    <span className="ai-right">{e.correction}</span>
                  </>
                )}
                {e.explanation && <span className="ai-why">{e.explanation}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {fb.tips.length > 0 && (
        <div>
          <p className="field-label">{t('ai.tips')}</p>
          <ul className="ai-tips">
            {fb.tips.map((tip, i) => <li key={i}><Lightbulb size={14} aria-hidden /> {tip}</li>)}
          </ul>
        </div>
      )}
      {fb.improved && (
        <details className="ai-improved">
          <summary>{kind === 'essay' ? t('ai.improved') : t('ai.model')}</summary>
          <div className="essay-readonly">{fb.improved}</div>
        </details>
      )}
    </div>
  )
}
