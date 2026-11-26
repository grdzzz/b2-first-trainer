// Asistente de configuración del plan (4 pasos). Sirve también para editarlo después sin perder el progreso.
import { useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Gauge, Plus, Sparkles, Target, Timer, X } from 'lucide-react'
import { defaultPlanConfig, levelForScore, STUDY_PREFERENCES, type PlanConfig, type PlanIntensity, type StudyPreference } from '@shared/learning/plan'
import { STUDY_SKILLS, type StudySkill } from '@shared/learning/taxonomy'
import { bandOfScale } from '@shared/cambridge'
import { localDay } from '@shared/practice'
import { useApp } from '../lib/store'
import { MascotSvg } from './Mascot'
import { StudySkillIcon } from './StudySkill'
import { formatDate, t } from '../i18n'

const MINUTES = [15, 20, 30, 45, 60, 90]
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

export function PlanWizard({ initial, onSave, onCancel }: { initial: PlanConfig | null; onSave(c: PlanConfig): void; onCancel?(): void }) {
  const { settings } = useApp()
  const [cfg, setCfg] = useState<PlanConfig>(() => initial ?? defaultPlanConfig(new Date(), settings.placement?.score))
  const [step, setStep] = useState(0)
  const [restDate, setRestDate] = useState('')
  const editing = !!initial
  const set = (patch: Partial<PlanConfig>) => setCfg((c) => ({ ...c, ...patch }))
  const today = localDay()
  const steps = [t('wizard.stepGoal'), t('wizard.stepTime'), t('wizard.stepPrefs'), t('wizard.stepSummary')]
  const toggle = <T,>(list: T[], v: T, max = 99): T[] => (list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v])
  const band = bandOfScale(cfg.targetScore)
  const canNext = step !== 1 || cfg.studyDays.length > 0

  return (
    <section className="card wizard" aria-labelledby="wizard-title">
      <header className="wizard-head">
        {settings.mascot && <MascotSvg mood={step === 3 ? 'cheer' : 'calendar'} size={64} />}
        <div>
          <p className="eyebrow">{editing ? t('wizard.editEyebrow') : t('wizard.eyebrow')}</p>
          <h2 id="wizard-title" className="h2">{steps[step]}</h2>
        </div>
        <ol className="wizard-steps" aria-label={t('wizard.progress')}>
          {steps.map((s, i) => (
            <li key={s} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
              <span className="wizard-dot" aria-hidden>{i < step ? <Check size={12} /> : i + 1}</span>
              <span className="sr-only">{s}</span>
            </li>
          ))}
        </ol>
      </header>

      <div className="wizard-body" key={step}>
        {step === 0 && (
          <>
            {settings.placement && !editing && <p className="wizard-note"><Sparkles size={15} aria-hidden /> {t('wizard.fromPlacement', { score: settings.placement.score, level: settings.placement.level })}</p>}
            <fieldset className="wizard-field">
              <legend><CalendarDays size={16} aria-hidden /> {t('wizard.examDate')}</legend>
              <div className="seg" role="group">
                <button type="button" className={`seg-btn${cfg.examDate ? ' is-active' : ''}`} aria-pressed={!!cfg.examDate} onClick={() => set({ examDate: cfg.examDate ?? addMonths(today, 3) })}>{t('wizard.haveDate')}</button>
                <button type="button" className={`seg-btn${!cfg.examDate ? ' is-active' : ''}`} aria-pressed={!cfg.examDate} onClick={() => set({ examDate: null })}>{t('wizard.noDate')}</button>
              </div>
              {cfg.examDate ? (
                <label className="field">
                  <span className="sr-only">{t('wizard.examDate')}</span>
                  <input type="date" className="input" value={cfg.examDate} min={today} onChange={(e) => set({ examDate: e.target.value || null })} />
                </label>
              ) : (
                <p className="text-muted text-sm">{t('wizard.continuous')}</p>
              )}
            </fieldset>
            <fieldset className="wizard-field">
              <legend><Target size={16} aria-hidden /> {t('wizard.target')}</legend>
              <div className="target-row">
                <input type="range" min={140} max={190} step={1} value={cfg.targetScore} aria-valuetext={`${cfg.targetScore} · ${band.cefr}`} onChange={(e) => set({ targetScore: Number(e.target.value), targetLevel: levelForScore(Number(e.target.value)) })} aria-label={t('wizard.target')} />
                <output className="target-value tabular">{cfg.targetScore}</output>
              </div>
              <div className="chip-row">
                {[{ s: 160, k: 'wizard.targetPass' as const }, { s: 173, k: 'wizard.targetB' as const }, { s: 180, k: 'wizard.targetA' as const }].map((o) => (
                  <button key={o.s} type="button" className={`chip${cfg.targetScore === o.s ? ' is-active' : ''}`} onClick={() => set({ targetScore: o.s, targetLevel: levelForScore(o.s) })}>
                    {t(o.k)} · {o.s}
                  </button>
                ))}
              </div>
              <p className="text-muted text-sm">{t('wizard.targetHint', { level: cfg.targetLevel })}</p>
            </fieldset>
          </>
        )}

        {step === 1 && (
          <>
            <fieldset className="wizard-field">
              <legend><Timer size={16} aria-hidden /> {t('wizard.minutes')}</legend>
              <div className="chip-row">
                {MINUTES.map((m) => (
                  <button key={m} type="button" className={`chip${cfg.minutesPerSession === m ? ' is-active' : ''}`} aria-pressed={cfg.minutesPerSession === m} onClick={() => set({ minutesPerSession: m })}>
                    {t('wizard.min', { n: m })}
                  </button>
                ))}
                <label className="chip chip-input">
                  <span className="sr-only">{t('wizard.minutesCustom')}</span>
                  <input type="number" min={10} max={180} step={5} value={cfg.minutesPerSession} onChange={(e) => set({ minutesPerSession: Math.max(10, Math.min(180, Number(e.target.value) || 10)) })} />
                  <span aria-hidden>min</span>
                </label>
              </div>
              <p className="text-muted text-sm">{t('wizard.minutesHint')}</p>
            </fieldset>
            <fieldset className="wizard-field">
              <legend><CalendarDays size={16} aria-hidden /> {t('wizard.days')}</legend>
              <div className="weekday-row">
                {WEEKDAYS.map((d) => (
                  <button key={d} type="button" className={`weekday${cfg.studyDays.includes(d) ? ' is-active' : ''}`} aria-pressed={cfg.studyDays.includes(d)} onClick={() => set({ studyDays: toggle(cfg.studyDays, d).sort() })}>
                    <span aria-hidden>{t(`weekdays.short.${d}` as 'weekdays.short.0')}</span>
                    <span className="sr-only">{t(`weekdays.long.${d}` as 'weekdays.long.0')}</span>
                  </button>
                ))}
              </div>
              <p className="text-muted text-sm">{cfg.studyDays.length ? t('wizard.daysHint', { n: cfg.studyDays.length, rest: 7 - cfg.studyDays.length }) : t('wizard.daysNone')}</p>
            </fieldset>
            <fieldset className="wizard-field">
              <legend>{t('wizard.restDates')}</legend>
              <div className="row-gap">
                <input type="date" className="input input-sm" value={restDate} min={today} onChange={(e) => setRestDate(e.target.value)} aria-label={t('wizard.restDateAdd')} />
                <button type="button" className="btn btn-secondary btn-sm" disabled={!restDate} onClick={() => { set({ restDates: Array.from(new Set([...cfg.restDates, restDate])).sort() }); setRestDate('') }}>
                  <Plus size={14} aria-hidden /> {t('wizard.restDateAdd')}
                </button>
              </div>
              {cfg.restDates.filter((d) => d >= today).length > 0 && (
                <ul className="chip-row">
                  {cfg.restDates.filter((d) => d >= today).map((d) => (
                    <li key={d} className="chip">
                      {formatDate(`${d}T12:00:00`, { weekday: 'short', day: 'numeric', month: 'short' })}
                      <button type="button" className="chip-x" aria-label={t('wizard.restDateRemove')} onClick={() => set({ restDates: cfg.restDates.filter((x) => x !== d) })}><X size={12} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          </>
        )}

        {step === 2 && (
          <>
            <fieldset className="wizard-field">
              <legend>{t('wizard.prefs')}</legend>
              <div className="option-cards">
                {STUDY_PREFERENCES.map((p: StudyPreference) => (
                  <button key={p} type="button" className={`option-card${cfg.preferences.includes(p) ? ' is-active' : ''}`} aria-pressed={cfg.preferences.includes(p)} onClick={() => set({ preferences: toggle(cfg.preferences, p) })}>
                    <strong>{t(`wizard.pref.${p}`)}</strong>
                    <span className="text-muted text-sm">{t(`wizard.prefHint.${p}`)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="wizard-field">
              <legend>{t('wizard.priority')}</legend>
              <div className="chip-row">
                {STUDY_SKILLS.map((sk: StudySkill) => (
                  <button key={sk} type="button" className={`chip skill-chip-toggle${cfg.prioritySkills.includes(sk) ? ' is-active' : ''}`} aria-pressed={cfg.prioritySkills.includes(sk)} onClick={() => set({ prioritySkills: toggle(cfg.prioritySkills, sk, 3) })}>
                    <StudySkillIcon skill={sk} size={14} /> {t(`skills.${sk}`)}
                  </button>
                ))}
              </div>
              <p className="text-muted text-sm">{t('wizard.priorityHint')}</p>
            </fieldset>
            <fieldset className="wizard-field">
              <legend><Gauge size={16} aria-hidden /> {t('wizard.intensity')}</legend>
              <div className="option-cards cols-3" role="radiogroup">
                {(['light', 'balanced', 'intense'] as PlanIntensity[]).map((i) => (
                  <button key={i} type="button" role="radio" aria-checked={cfg.intensity === i} className={`option-card${cfg.intensity === i ? ' is-active' : ''}`} onClick={() => set({ intensity: i })}>
                    <strong>{t(`wizard.intensities.${i}`)}</strong>
                    <span className="text-muted text-sm">{t(`wizard.intensityHint.${i}`)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 3 && (
          <dl className="wizard-summary">
            <div><dt>{t('wizard.examDate')}</dt><dd>{cfg.examDate ? formatDate(`${cfg.examDate}T12:00:00`, { dateStyle: 'long' }) : t('wizard.noDateShort')}</dd></div>
            <div><dt>{t('wizard.target')}</dt><dd>{cfg.targetScore} · {cfg.targetLevel}</dd></div>
            <div><dt>{t('wizard.minutes')}</dt><dd>{t('wizard.min', { n: cfg.minutesPerSession })}</dd></div>
            <div><dt>{t('wizard.days')}</dt><dd>{cfg.studyDays.map((d) => t(`weekdays.short.${d}` as 'weekdays.short.0')).join(' · ')}</dd></div>
            <div><dt>{t('wizard.prefs')}</dt><dd>{cfg.preferences.length ? cfg.preferences.map((p) => t(`wizard.pref.${p}`)).join(', ') : '—'}</dd></div>
            <div><dt>{t('wizard.priority')}</dt><dd>{cfg.prioritySkills.length ? cfg.prioritySkills.map((s) => t(`skills.${s}`)).join(', ') : t('wizard.priorityNone')}</dd></div>
            <div><dt>{t('wizard.intensity')}</dt><dd>{t(`wizard.intensities.${cfg.intensity}`)}</dd></div>
          </dl>
        )}
      </div>

      <footer className="wizard-foot">
        {step > 0 ? (
          <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} aria-hidden /> {t('wizard.back')}
          </button>
        ) : onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <button type="button" className="btn btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {t('wizard.next')} <ArrowRight size={16} aria-hidden />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => onSave({ ...cfg, startedAt: initial?.startedAt ?? new Date().toISOString() })}>
            <Check size={16} aria-hidden /> {editing ? t('wizard.save') : t('wizard.create')}
          </button>
        )}
      </footer>
    </section>
  )
}

function addMonths(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1 + n, d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
