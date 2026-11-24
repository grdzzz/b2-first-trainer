import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CircleHelp, Clock3, History, ListChecks, Sparkles } from 'lucide-react'
import {
  PLACEMENT_PASSAGES,
  PLACEMENT_QUESTIONS,
  PLACEMENT_SKILLS,
  placementTips,
  scorePlacement,
  type PlacementAnswers,
  type PlacementResult
} from '@shared/placement'
import { MascotSvg } from './Mascot'
import { CountUp } from './CountUp'
import { Confetti } from './Confetti'
import { PlacementLevel, PlacementTips } from './PlacementResult'
import { errorMessage, useApp } from '../lib/store'
import { prefersReducedMotion } from '../lib/motion'
import { t } from '../i18n'

const STORE_KEY = 'b2ft.placement.progress'
const TOTAL = PLACEMENT_QUESTIONS.length

interface Saved {
  answers: PlacementAnswers
  index: number
}

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Saved
    if (!v || typeof v.index !== 'number' || typeof v.answers !== 'object') return null
    return { answers: v.answers, index: Math.max(0, Math.min(TOTAL - 1, v.index)) }
  } catch {
    return null
  }
}

function save(v: Saved | null): void {
  try {
    if (v) localStorage.setItem(STORE_KEY, JSON.stringify(v))
    else localStorage.removeItem(STORE_KEY)
  } catch {
    /* sin almacenamiento local: se empieza de cero si se cierra la app */
  }
}

type Step = { s: 'intro' } | { s: 'question' } | { s: 'calculating' } | { s: 'result'; result: PlacementResult }

/**
 * Prueba de nivel obligatoria (una sola vez). No se guarda como intento ni aparece en el historial:
 * solo se guarda el resultado en los ajustes.
 * `existing`: la persona ya usaba la app antes de esta versión (se le explica por qué aparece).
 */
export function PlacementTest({ existing }: { existing: boolean }) {
  const { settings, updateSettings, notify, navigate } = useApp()
  const saved = useMemo(loadSaved, [])
  const [step, setStep] = useState<Step>({ s: 'intro' })
  const [answers, setAnswers] = useState<PlacementAnswers>(saved?.answers ?? {})
  const [index, setIndex] = useState(saved?.index ?? 0)
  const name = settings.userName.split(' ')[0]

  const q = PLACEMENT_QUESTIONS[index]
  const chosen = answers[q.id]
  const answered = chosen !== undefined

  useEffect(() => {
    if (step.s === 'question') save({ answers, index })
  }, [answers, index, step.s])

  const finish = async () => {
    setStep({ s: 'calculating' })
    const result: PlacementResult = { ...scorePlacement(answers), dismissed: false }
    // Un momento para «pensar» (Bubi piensa) y dar sensación de cierre; sin animaciones, casi nada.
    await new Promise((r) => window.setTimeout(r, prefersReducedMotion() ? 250 : 1500))
    setStep({ s: 'result', result })
  }

  const next = () => {
    if (!answered) return
    if (index + 1 < TOTAL) setIndex(index + 1)
    else void finish()
  }
  const pick = (value: number) => setAnswers((a) => ({ ...a, [q.id]: value }))

  // Teclado: 1–4 / A–D eligen, «0» o «?» = no lo sé, Intro sigue, flecha izquierda vuelve.
  const nextRef = useRef(next)
  nextRef.current = next
  useEffect(() => {
    if (step.s !== 'question') return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      const n = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k)
      if (n >= 0 && n < q.options.length) {
        e.preventDefault()
        pick(n)
      } else if (k === '0' || k === '?') {
        pick(-1)
      } else if (k === 'enter' && (e.target as HTMLElement | null)?.tagName !== 'BUTTON') {
        e.preventDefault()
        nextRef.current()
      } else if (k === 'arrowleft' && index > 0) {
        setIndex(index - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const complete = async (result: PlacementResult) => {
    try {
      await updateSettings({ placement: result })
      save(null)
      navigate({ name: 'home' })
    } catch (e) {
      notify('error', errorMessage(e))
    }
  }

  return (
    <div className="onboarding placement">
      <div className="onb-bg" aria-hidden>
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
      </div>
      <main className={`onb-card placement-card placement-step-${step.s}`} aria-labelledby="placement-title">
        {step.s === 'intro' && (
          <div className="onb-step" key="intro">
            <div className="onb-hero" aria-hidden>
              <div className="onb-mark">B2</div>
              <MascotSvg mood="wave" size={84} react="welcome" />
            </div>
            <p className="eyebrow">{t('placement.eyebrow')}</p>
            <h1 id="placement-title" className="onb-title">{existing && name ? t('placement.title') + `, ${name}` : t('placement.title')}</h1>
            <p className="onb-text">{existing ? (name ? t('placement.introExisting', { name }) : t('placement.introExistingNoName')) : t('placement.intro')}</p>
            <ul className="placement-facts">
              <li><ListChecks size={18} aria-hidden /> {t('placement.facts.questions')}</li>
              <li><Clock3 size={18} aria-hidden /> {t('placement.facts.time')}</li>
              <li><History size={18} aria-hidden /> {t('placement.facts.noHistory')}</li>
            </ul>
            <p className="text-subtle text-sm placement-honest"><CircleHelp size={15} aria-hidden /> {t('placement.honest')}</p>
            <div className="onb-actions">
              <button type="button" className="btn btn-primary btn-lg" autoFocus onClick={() => setStep({ s: 'question' })}>
                {saved ? t('placement.resume') : t('placement.start')} <ArrowRight size={18} aria-hidden />
              </button>
            </div>
          </div>
        )}

        {step.s === 'question' && (
          <div className="placement-q">
            <div className="placement-top">
              <span className={`placement-skill skill-${q.skill}`}>{t(`placement.skills.${q.skill}`)}</span>
              <span className="text-subtle text-sm tabular">{t('placement.question', { n: index + 1, total: TOTAL })}</span>
            </div>
            <div className="placement-progress" role="progressbar" aria-label={t('placement.question', { n: index + 1, total: TOTAL })} aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={index}>
              <span style={{ width: `${(index / TOTAL) * 100}%` }} />
            </div>

            <div className="placement-body" key={q.id}>
              {q.passage && (
                <details className="placement-passage" open>
                  <summary><BookOpen size={15} aria-hidden /> {PLACEMENT_PASSAGES[q.passage].title}</summary>
                  <article className="reading-text">
                    {PLACEMENT_PASSAGES[q.passage].text.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
                  </article>
                </details>
              )}
              <p className="text-muted text-sm">{t(`placement.instructions.${q.skill}`)}</p>
              <h1 id="placement-title" className="placement-prompt" lang="en">
                {q.prompt.split('___').map((part, i, all) => (
                  <span key={i}>
                    {part}
                    {i < all.length - 1 && <span className={`placement-gap${answered && chosen >= 0 ? ' is-filled' : ''}`}>{answered && chosen >= 0 ? q.options[chosen] : ' '}</span>}
                  </span>
                ))}
              </h1>
              <div className={`placement-options${q.skill === 'reading' ? ' is-list' : ''}`} role="radiogroup" aria-labelledby="placement-title">
                {q.options.map((o, i) => (
                  <button key={i} type="button" role="radio" aria-checked={chosen === i} className={`placement-option${chosen === i ? ' is-selected' : ''}`} onClick={() => pick(i)} lang="en">
                    <span className="placement-key" aria-hidden>{String.fromCharCode(65 + i)}</span>
                    <span>{o}</span>
                  </button>
                ))}
                <button type="button" role="radio" aria-checked={chosen === -1} className={`placement-option placement-dontknow${chosen === -1 ? ' is-selected' : ''}`} onClick={() => pick(-1)}>
                  <span className="placement-key" aria-hidden>?</span>
                  <span>{t('placement.dontKnow')}</span>
                </button>
              </div>
            </div>

            <div className="placement-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setIndex(index - 1)} disabled={index === 0}>
                <ArrowLeft size={16} aria-hidden /> {t('placement.prev')}
              </button>
              <span className="text-subtle text-xs placement-keys">{t('placement.keysHint')}</span>
              <button type="button" className="btn btn-primary" onClick={next} disabled={!answered}>
                {index + 1 < TOTAL ? t('placement.next') : t('placement.finish')} <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          </div>
        )}

        {step.s === 'calculating' && (
          <div className="placement-calc" role="status" aria-live="polite">
            <MascotSvg mood="thinking" size={120} />
            <p id="placement-title" className="h2">{t('placement.calculating')}</p>
          </div>
        )}

        {step.s === 'result' && (
          <div className="onb-step placement-result" key="result">
            {(step.result.level === 'B2' || step.result.level === 'C1') && <Confetti />}
            <div className="placement-result-head">
              <MascotSvg mood={step.result.level === 'B2' || step.result.level === 'C1' ? 'celebrate' : 'cheer'} size={104} react={step.result.level === 'B2' || step.result.level === 'C1' ? 'achievement' : 'happy'} />
              <div>
                <p className="eyebrow">{t('placement.resultEyebrow')}</p>
                <h1 id="placement-title" className="placement-level-title" tabIndex={-1} ref={(el) => el?.focus({ preventScroll: true })}>
                  <PlacementLevel level={step.result.level} />
                </h1>
                <p className="placement-scale"><strong className="tabular"><CountUp value={step.result.score} duration={1100} /></strong> {t('placement.scale', { score: '' }).trim()}</p>
                <p className="text-subtle text-sm">{t('placement.correct', { correct: step.result.correct, total: step.result.total })}</p>
              </div>
            </div>
            <p className="onb-text">{t(`placement.levels.${step.result.level}`)}</p>

            <h2 className="h-small">{t('placement.skillsTitle')}</h2>
            <ul className="placement-skills">
              {PLACEMENT_SKILLS.map((s) => (
                <li key={s}>
                  <span>{t(`placement.skills.${s}`)}</span>
                  <span className="meter" aria-hidden><span style={{ width: `${step.result.skills[s]}%` }} /></span>
                  <span className="tabular text-muted">{step.result.skills[s]} %</span>
                </li>
              ))}
            </ul>

            <h2 className="h-small">{t('placement.tipsTitle')}</h2>
            <PlacementTips tips={placementTips(step.result, settings.reminder.enabled)} compact />

            <p className="text-subtle text-sm placement-note"><Sparkles size={14} aria-hidden /> {t('placement.note')}</p>
            <div className="onb-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => void complete(step.result)}>
                {t('placement.done')} <ArrowRight size={18} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
