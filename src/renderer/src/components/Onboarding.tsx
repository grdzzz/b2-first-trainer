import { useState } from 'react'
import { ArrowRight, BookOpenCheck, Compass, Sparkles } from 'lucide-react'
import { errorMessage, useApp } from '../lib/store'
import { t } from '../i18n'

/** Bienvenida de la primera vez: nombre y examen de ejemplo con recorrido guiado. */
export function Onboarding() {
  const { settings, exams, updateSettings, createExample, navigate, setTourStep, notify } = useApp()
  const [step, setStep] = useState<0 | 1>(0)
  const [name, setName] = useState(settings.userName)
  const [busy, setBusy] = useState(false)
  const hasExams = exams.length > 0
  const hasExample = exams.some((e) => e.isExample)

  const finish = async (withExample: boolean) => {
    setBusy(true)
    try {
      if (withExample && !hasExample) await createExample()
      await updateSettings({ userName: name.replace(/\s+/g, ' ').trim().slice(0, 40), onboarded: true })
      navigate({ name: 'home' })
      if (withExample) setTourStep(0)
    } catch (e) {
      notify('error', errorMessage(e))
      setBusy(false)
    }
  }

  const first = name.trim().split(' ')[0]

  return (
    <div className="onboarding">
      <div className="onb-bg" aria-hidden>
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
      </div>
      <main className="onb-card" key={step} aria-labelledby="onb-title">
        <div className="onb-mark" aria-hidden>B2</div>
        <div className="onb-dots" aria-hidden>
          <span className={step === 0 ? 'is-active' : ''} />
          <span className={step === 1 ? 'is-active' : ''} />
        </div>
        {step === 0 ? (
          <form
            className="onb-step"
            onSubmit={(e) => {
              e.preventDefault()
              setStep(1)
            }}
          >
            <h1 id="onb-title" className="onb-title">{t('onboarding.welcome')}</h1>
            <p className="onb-text">{t('onboarding.intro')}</p>
            <label className="field onb-field">
              <span className="field-label">{t('onboarding.nameLabel')}</span>
              <input className="input onb-input" autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder={t('onboarding.namePlaceholder')} />
            </label>
            <div className="onb-actions">
              <button type="submit" className="btn btn-primary btn-lg">
                {t('onboarding.continue')} <ArrowRight size={18} aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setName('')
                  setStep(1)
                }}
              >
                {t('onboarding.skipName')}
              </button>
            </div>
          </form>
        ) : (
          <div className="onb-step">
            <h1 id="onb-title" className="onb-title">{first ? t('onboarding.hello', { name: first }) : t('onboarding.helloNoName')}</h1>
            <p className="onb-text">{hasExams ? t('onboarding.exampleExisting') : t('onboarding.exampleText')}</p>
            <div className="onb-choices">
              <button type="button" className="onb-choice is-primary" onClick={() => finish(true)} disabled={busy} autoFocus>
                <span className="onb-choice-icon" aria-hidden><Compass size={22} /></span>
                <span>
                  <span className="onb-choice-title">{hasExample ? t('onboarding.tourOnly') : t('onboarding.withExample')}</span>
                  <span className="onb-choice-desc">{t('onboarding.withExampleDesc')}</span>
                </span>
              </button>
              <button type="button" className="onb-choice" onClick={() => finish(false)} disabled={busy}>
                <span className="onb-choice-icon" aria-hidden><BookOpenCheck size={22} /></span>
                <span>
                  <span className="onb-choice-title">{hasExams ? t('onboarding.noThanks') : t('onboarding.empty')}</span>
                  <span className="onb-choice-desc">{t('onboarding.emptyDesc')}</span>
                </span>
              </button>
            </div>
            <p className="onb-foot"><Sparkles size={14} aria-hidden /> {t('onboarding.privacy')}</p>
          </div>
        )}
      </main>
    </div>
  )
}
