import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, BookX, CheckCircle2, Clock3, Download, Lightbulb, RotateCcw, Trophy, XCircle } from 'lucide-react'
import {
  checkItem,
  countItems,
  expectedAnswers,
  exportSheet,
  itemKey,
  localDay,
  OPTION_LETTERS,
  scoreSheet,
  TASK_INSTRUCTIONS,
  TASK_PART,
  transformationWords,
  type PracticeProgress,
  type PracticeSheet,
  type PracticeTask
} from '@shared/practice'
import { errorMessage, useApp } from '../lib/store'
import { useAllSheets } from '../lib/practice'
import { SkillBadge } from '../components/SkillBadge'
import { Mascot, type MascotMood } from '../components/Mascot'
import { SheetSkeleton } from '../components/ScreenSkeletons'
import { reviewAfterCheck, reviewOf } from '@shared/review'
import { ProgressRing } from '../components/ProgressRing'
import { Confetti } from '../components/Confetti'
import { t, tn } from '../i18n'

type Answers = Record<string, string>

export function SheetScreen({ sheetId }: { sheetId: string }) {
  const app = useApp()
  const sheets = useAllSheets()
  if (!sheets) return <SheetSkeleton />
  const sheet = sheets.find((s) => s.id === sheetId)
  if (!sheet) {
    return (
      <div className="page">
        <p>{t('sheet.notFound')}</p>
        <button type="button" className="btn btn-secondary" onClick={() => app.navigate({ name: 'practice' })}>{t('common.back')}</button>
      </div>
    )
  }
  const index = sheets.indexOf(sheet)
  return <SheetRunner sheet={sheet} nextSheet={sheets[index + 1] ?? null} />
}

function resultMood(pct: number): MascotMood {
  return pct >= 80 ? 'celebrate' : pct >= 60 ? 'cheer' : pct >= 40 ? 'happy' : 'oops'
}

/** Mensaje de ánimo según el porcentaje. */
function resultMessage(pct: number): string {
  if (pct >= 90) return t('sheet.result90')
  if (pct >= 75) return t('sheet.result75')
  if (pct >= 60) return t('sheet.result60')
  if (pct >= 40) return t('sheet.result40')
  return t('sheet.result0')
}

function SheetRunner({ sheet, nextSheet }: { sheet: PracticeSheet; nextSheet: PracticeSheet | null }) {
  const app = useApp()
  const stored = app.practiceProgress.find((p) => p.id === sheet.id)
  const [answers, setAnswers] = useState<Answers>(stored?.answers ?? {})
  const [checked, setChecked] = useState(stored?.checked ?? false)
  const [celebrate, setCelebrate] = useState<{ newBest: boolean; confetti: boolean; toReview: number } | null>(null)
  const progressRef = useRef<PracticeProgress>(stored ?? { id: sheet.id, answers: {}, checked: false, times: 0 })
  const timer = useRef<number | undefined>(undefined)
  const topRef = useRef<HTMLDivElement>(null)

  const persist = useCallback(
    (next: PracticeProgress) => {
      progressRef.current = next
      void app.savePracticeProgress(next).catch((e) => app.notify('error', t('errors.saveFailed', { error: errorMessage(e) })))
    },
    [app]
  )

  // Guarda las respuestas al poco de escribir y al salir de la pantalla.
  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = undefined
  }, [])
  // Al salir con un guardado pendiente se guarda a través del estado de la app: así, al volver a la hoja
  // (o a la lista), se ven las últimas respuestas y un guardado posterior no las pisa.
  const saveRef = useRef(app.savePracticeProgress)
  saveRef.current = app.savePracticeProgress
  useEffect(() => () => {
    if (timer.current !== undefined) {
      window.clearTimeout(timer.current)
      timer.current = undefined
      void saveRef.current(progressRef.current).catch(() => undefined)
    }
  }, [])

  useEffect(
    () =>
      window.api.onBeforeClose(async () => {
        if (timer.current === undefined) return
        window.clearTimeout(timer.current)
        timer.current = undefined
        await saveRef.current(progressRef.current).catch(() => undefined)
      }),
    []
  )

  const setAnswer = (key: string, value: string) => {
    if (checked) return
    setAnswers((prev) => {
      const next = { ...prev, [key]: value }
      if (!value) delete next[key]
      progressRef.current = { ...progressRef.current, answers: next, checked: false }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        timer.current = undefined
        persist(progressRef.current)
      }, 600)
      return next
    })
  }

  const total = countItems(sheet)
  const score = useMemo(() => scoreSheet(sheet, answers), [sheet, answers])
  const answered = Object.keys(answers).filter((k) => answers[k]?.trim()).length

  const check = () => {
    flush()
    const prev = progressRef.current
    const best = Math.max(prev.best ?? 0, score.correct)
    const today = localDay()
    // Los fallos pasan al repaso espaciado (y lo que tocaba repasar y se acierta, avanza).
    const rv = reviewAfterCheck(sheet, answers, reviewOf(sheet, prev, today), today)
    const next: PracticeProgress = {
      ...prev,
      review: rv.review,
      mastered: (prev.mastered ?? 0) + rv.mastered,
      answers,
      checked: true,
      lastScore: score.correct,
      total,
      best,
      times: (prev.times ?? 0) + 1,
      lastAt: new Date().toISOString(),
      days: Array.from(new Set([today, ...(prev.days ?? [])])).slice(0, 400)
    }
    setChecked(true)
    setCelebrate({ newBest: (prev.times ?? 0) > 0 && score.correct > (prev.best ?? 0), confetti: score.percent >= 80, toReview: total - score.correct })
    persist(next)
    window.requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const retry = () => {
    flush()
    setAnswers({})
    setChecked(false)
    setCelebrate(null)
    persist({ ...progressRef.current, answers: {}, checked: false })
    document.getElementById('main')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const exportIt = async () => {
    try {
      const path = await window.api.saveTextFile(`${sheet.title.replace(/[\\/:*?"<>|]+/g, '')}.json`, exportSheet(sheet))
      if (path) app.notify('success', t('createSheets.exported'))
    } catch (e) {
      app.notify('error', errorMessage(e))
    }
  }

  // Atajos: Ctrl/Cmd + Intro comprueba; Alt + ↓/↑ salta al siguiente/anterior hueco sin responder.
  const checkRef = useRef(check)
  checkRef.current = check
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!checked && Object.keys(answers).length > 0) {
          e.preventDefault()
          checkRef.current()
        }
        return
      }
      if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault()
        const fields = Array.from(document.querySelectorAll<HTMLElement>('.sheet-page .gap-input:not(:disabled), .sheet-page .sheet-options'))
        const pending = fields.filter((f) => (f instanceof HTMLInputElement ? !f.value.trim() : !f.querySelector('.is-selected')))
        const list = pending.length ? pending : fields
        const current = fields.findIndex((f) => f.contains(document.activeElement))
        const ordered = e.key === 'ArrowDown' ? list.filter((f) => fields.indexOf(f) > current) : list.filter((f) => fields.indexOf(f) < current).reverse()
        const target = ordered[0] ?? (e.key === 'ArrowDown' ? list[0] : list[list.length - 1])
        const focusable = target instanceof HTMLInputElement ? target : target?.querySelector<HTMLElement>('.is-selected, .sheet-option')
        focusable?.focus()
        focusable?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [checked, answers])

  let counter = 0
  const numbers = sheet.tasks.map((task) => task.items.map(() => ++counter))
  const best = progressRef.current.best

  return (
    <div className={`page page-narrow sheet-page skill-${sheet.skill}`}>
      <button type="button" className="btn btn-ghost btn-sm back-link" onClick={() => app.navigate({ name: 'practice' })}>
        <ArrowLeft size={16} aria-hidden /> {t('sheet.back')}
      </button>

      <header className="sheet-header" ref={topRef}>
        <p className="eyebrow">{sheet.number ? t('practice.sheetN', { n: sheet.number }) : t('practice.custom')}</p>
        <h1 className="h1">{sheet.title}</h1>
        <div className="sheet-meta">
          <SkillBadge skill={sheet.skill} />
          <span>{sheet.topic}</span>
          <span><Clock3 size={14} aria-hidden /> {t('practice.minutes', { n: sheet.minutes })}</span>
          <span>{t('practice.items', { n: total })}</span>
          <span className="spacer" />
          <button type="button" className="btn btn-ghost btn-xs" onClick={exportIt} title={t('createSheets.export')}>
            <Download size={14} aria-hidden /> {t('createSheets.export')}
          </button>
        </div>
        {sheet.focus && <p className="text-muted">{sheet.focus}</p>}
      </header>

      {checked ? (
        <section className={`card sheet-result${score.percent >= 60 ? ' is-pass' : ''}`} aria-live="polite">
          {celebrate?.confetti && <Confetti />}
          <ProgressRing value={score.percent} size={112} stroke={10} color={score.percent >= 80 ? 'var(--success)' : score.percent >= 60 ? 'var(--accent)' : 'var(--warning)'} label={`${score.percent} %`}>
            <span className="practice-ring-value tabular">{score.percent}<small>%</small></span>
          </ProgressRing>
          <div className="sheet-result-text">
            <h2 className="h2">{t('sheet.resultTitle', { correct: score.correct, total })}</h2>
            <Mascot mood={resultMood(score.percent)} size={72} react={celebrate ? (celebrate.newBest ? 'achievement' : score.percent >= 80 ? undefined : score.percent >= 50 ? 'happy' : 'sad') : undefined} message={<>{resultMessage(score.percent)}{celebrate && celebrate.toReview > 0 ? <> {tn('sheet.toReview', celebrate.toReview)}</> : null}</>} />
            {celebrate?.newBest ? (
              <p className="celebrate-msg"><Trophy size={15} aria-hidden /> {t('sheet.newBest')}</p>
            ) : best !== undefined && (progressRef.current.times ?? 0) > 1 ? (
              <p className="text-subtle text-sm">{t('sheet.bestSoFar', { best, total })}</p>
            ) : null}
            <ul className="sheet-result-parts">
              {sheet.tasks.map((task, ti) => {
                const ok = task.items.filter((_, ii) => checkItem(task, ii, answers[itemKey(ti, ii)])).length
                return (
                  <li key={ti}>
                    <span>{TASK_PART[task.type].split(' · ')[1]}</span>
                    <span className="tabular">{ok}/{task.items.length}</span>
                  </li>
                )
              })}
            </ul>
            <div className="row-gap">
              <button type="button" className="btn btn-secondary" onClick={retry}>
                <RotateCcw size={16} aria-hidden /> {t('sheet.retry')}
              </button>
              {score.correct < total && (
                <button type="button" className="btn btn-ghost" onClick={() => app.navigate({ name: 'notebook' })}>
                  <BookX size={16} aria-hidden /> {t('sheet.seeErrors')}
                </button>
              )}
              {nextSheet && (
                <button type="button" className="btn btn-primary" onClick={() => app.navigate({ name: 'sheet', sheetId: nextSheet.id })}>
                  {t('sheet.next')} <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="sheet-progress" role="progressbar" aria-label={t('sheet.progress')} aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
          <span className="text-sm">{t('sheet.progress')} <strong className="tabular">{answered}/{total}</strong></span>
          <span className="sheet-progress-bar"><span style={{ width: `${(answered / total) * 100}%` }} /></span>
        </div>
      )}

      {sheet.tasks.map((task, ti) => (
        <TaskCard key={ti} task={task} ti={ti} numbers={numbers[ti]} answers={answers} checked={checked} onAnswer={setAnswer} />
      ))}

      {!checked && (
        <div className="sheet-footer">
          <p className="text-muted text-sm">{answered === 0 ? t('sheet.checkNone') : answered < total ? t('sheet.checkHint', { n: total - answered }) : t('sheet.checkReady')}</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={check} disabled={answered === 0} aria-keyshortcuts="Control+Enter" title={t('sheet.checkShortcut')}>
            <CheckCircle2 size={18} aria-hidden /> {t('sheet.check')}
          </button>
        </div>
      )}
      {checked && (
        <div className="sheet-footer">
          <button type="button" className="btn btn-secondary" onClick={retry}>
            <RotateCcw size={16} aria-hidden /> {t('sheet.retry')}
          </button>
          {nextSheet && (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => app.navigate({ name: 'sheet', sheetId: nextSheet.id })}>
              {t('sheet.next')} <ArrowRight size={18} aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface TaskProps {
  task: PracticeTask
  ti: number
  numbers: number[]
  answers: Answers
  checked: boolean
  onAnswer(key: string, value: string): void
}

function TaskCard(props: TaskProps) {
  const { task } = props
  const [tip, setTip] = useState(false)
  return (
    <section className={`card sheet-task task-${task.type}`} aria-labelledby={`task-${props.ti}`}>
      <header className="sheet-task-head">
        <span className="pill">{TASK_PART[task.type]}</span>
        <button type="button" className={`btn btn-ghost btn-xs tip-btn${tip ? ' is-open' : ''}`} aria-expanded={tip} onClick={() => setTip((v) => !v)}>
          <Lightbulb size={14} aria-hidden /> {t('sheet.tip')}
        </button>
      </header>
      {'title' in task && task.title && <h2 id={`task-${props.ti}`} className="h2 sheet-task-title">{task.title}</h2>}
      <p className="sheet-instructions" id={'title' in task && task.title ? undefined : `task-${props.ti}`}>{TASK_INSTRUCTIONS[task.type]}</p>
      {tip && <p className="sheet-tip"><Lightbulb size={15} aria-hidden /> {t(`sheet.tips.${task.type}`)}</p>}
      {task.type === 'mcCloze' && <McCloze {...props} task={task} />}
      {(task.type === 'openCloze' || task.type === 'wordFormation') && <GapText {...props} task={task} />}
      {task.type === 'transformation' && <Transformations {...props} task={task} />}
      {task.type === 'readingMc' && <ReadingMc {...props} task={task} />}
      {task.type === 'matching' && <Matching {...props} task={task} />}
    </section>
  )
}

/** Divide un texto con huecos {1}, {2}… en párrafos y fragmentos. */
function renderGapped(text: string, renderGap: (index: number) => ReactNode): ReactNode {
  return text.split(/\n\s*\n/).map((para, pi) => (
    <p key={pi}>
      {para.split(/\{(\d+)\}/).map((part, i) => (i % 2 === 1 ? <Fragment key={i}>{renderGap(Number(part) - 1)}</Fragment> : <Fragment key={i}>{part}</Fragment>))}
    </p>
  ))
}

export function optionText(options: string[], value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : `${OPTION_LETTERS[Number(value)]} · ${options[Number(value)]}`
}

function verdictOf(task: PracticeTask, ii: number, value: string | undefined, checked: boolean): boolean | null | undefined {
  if (!checked) return undefined
  return checkItem(task, ii, value)
}

export function Explanation({ ok, expected, explain, given }: { ok: boolean | null; expected: string[]; explain?: string; given?: string }) {
  return (
    <div className={`explain${ok ? ' is-ok' : ' is-bad'}`}>
      {ok ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
      <div>
        {!ok && (
          <p>
            {given ? <><span className="text-subtle">{t('sheet.yourAnswer')}</span> <s>{given}</s> · </> : <span className="text-subtle">{t('sheet.noAnswer')} · </span>}
            <span className="text-subtle">{t('sheet.correctAnswer')}</span> <strong>{expected.join(' / ')}</strong>
          </p>
        )}
        {explain && <p className="explain-text">{explain}</p>}
      </div>
    </div>
  )
}

export function OptionButtons({ options, value, answer, checked, onPick, label, wide }: { options: string[]; value?: string; answer: number; checked: boolean; onPick(i: number): void; label: string; wide?: boolean }) {
  return (
    <div
      className={`sheet-options${wide ? ' is-wide' : ''}`}
      role="radiogroup"
      aria-label={label}
      aria-keyshortcuts="A B C D"
      onKeyDown={(e) => {
        // A, B, C, D eligen opción; flechas para moverse entre ellas.
        if (checked || e.ctrlKey || e.metaKey || e.altKey) return
        const i = OPTION_LETTERS.indexOf(e.key.toUpperCase())
        if (i >= 0 && i < options.length) {
          e.preventDefault()
          onPick(i)
          return
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('.sheet-option'))
          const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
          const next = buttons[(at + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length]
          next?.focus()
          e.preventDefault()
        }
      }}
    >
      {options.map((o, i) => {
        const selected = value === String(i)
        const state = checked ? (i === answer ? ' is-key' : selected ? ' is-wrong' : '') : ''
        return (
          <button key={i} type="button" role="radio" aria-checked={selected} disabled={checked} className={`sheet-option${selected ? ' is-selected' : ''}${state}`} onClick={() => onPick(i)}>
            <span className="sheet-option-letter">{OPTION_LETTERS[i]}</span>
            <span className="sheet-option-text">{o}</span>
          </button>
        )
      })}
    </div>
  )
}

function McCloze({ task, ti, numbers, answers, checked, onAnswer }: TaskProps & { task: Extract<PracticeTask, { type: 'mcCloze' }> }) {
  return (
    <>
      <div className="sheet-text" aria-label={t('sheet.textLabel')}>
        {renderGapped(task.text, (ii) => {
          const v = answers[itemKey(ti, ii)]
          const verdict = verdictOf(task, ii, v, checked)
          const word = v !== undefined ? task.items[ii].options[Number(v)] : null
          return (
            <a href={`#q-${ti}-${ii}`} className={`gap-chip${word ? ' is-filled' : ''}${verdict === true ? ' is-ok' : verdict === false || verdict === null ? ' is-bad' : ''}`} onClick={(e) => {
              e.preventDefault()
              document.getElementById(`q-${ti}-${ii}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              document.querySelector<HTMLButtonElement>(`#q-${ti}-${ii} .sheet-option`)?.focus({ preventScroll: true })
            }}>
              <span className="gap-num">{numbers[ii]}</span>
              {word ?? '…'}
            </a>
          )
        })}
      </div>
      <ol className="sheet-items">
        {task.items.map((it, ii) => {
          const key = itemKey(ti, ii)
          const verdict = verdictOf(task, ii, answers[key], checked)
          return (
            <li key={ii} id={`q-${ti}-${ii}`} className="sheet-item">
              <span className={`item-num${verdict === true ? ' is-ok' : verdict === undefined ? '' : ' is-bad'}`}>{numbers[ii]}</span>
              <div className="sheet-item-body">
                <OptionButtons options={it.options} value={answers[key]} answer={it.answer} checked={checked} onPick={(i) => onAnswer(key, String(i))} label={t('sheet.gapLabel', { n: numbers[ii] })} />
                {checked && <Explanation ok={verdict ?? null} expected={expectedAnswers(task, ii)} explain={it.explain} given={optionText(it.options, answers[key])} />}
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}

export function GapInput({ value, onChange, disabled, label, verdict, base }: { value: string; onChange(v: string): void; disabled: boolean; label: string; verdict: boolean | null | undefined; base?: string }) {
  const width = Math.max(7, Math.min(22, (value?.length ?? 0) + 2))
  return (
    <span className={`gap-field${verdict === true ? ' is-ok' : verdict === undefined ? '' : ' is-bad'}`}>
      <input
        className="gap-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        style={{ width: `${width}ch` }}
      />
      {base && <span className="gap-base">{base}</span>}
    </span>
  )
}

function GapText({ task, ti, numbers, answers, checked, onAnswer }: TaskProps & { task: Extract<PracticeTask, { type: 'openCloze' | 'wordFormation' }> }) {
  return (
    <>
      <div className="sheet-text sheet-text-inputs" aria-label={t('sheet.textLabel')}>
        {renderGapped(task.text, (ii) => {
          const key = itemKey(ti, ii)
          const item = task.items[ii]
          return (
            <span className="gap-wrap">
              <span className="gap-num" aria-hidden>{numbers[ii]}</span>
              <GapInput value={answers[key] ?? ''} onChange={(v) => onAnswer(key, v)} disabled={checked} label={t('sheet.gapLabel', { n: numbers[ii] })} verdict={verdictOf(task, ii, answers[key], checked)} base={'base' in item ? item.base : undefined} />
            </span>
          )
        })}
      </div>
      {checked && (
        <ol className="sheet-items sheet-solutions">
          {task.items.map((it, ii) => {
            const key = itemKey(ti, ii)
            const verdict = checkItem(task, ii, answers[key])
            return (
              <li key={ii} className="sheet-item">
                <span className={`item-num${verdict ? ' is-ok' : ' is-bad'}`}>{numbers[ii]}</span>
                <Explanation ok={verdict} expected={expectedAnswers(task, ii)} explain={it.explain} given={answers[key]} />
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}

function Transformations({ task, ti, numbers, answers, checked, onAnswer }: TaskProps & { task: Extract<PracticeTask, { type: 'transformation' }> }) {
  return (
    <>
      <p className="text-subtle text-sm">{t('sheet.wordsHint')}</p>
      <ol className="sheet-items">
        {task.items.map((it, ii) => {
          const key = itemKey(ti, ii)
          const value = answers[key] ?? ''
          const verdict = verdictOf(task, ii, value, checked)
          const words = value.trim() ? transformationWords(value) : 0
          return (
            <li key={ii} className="sheet-item transform-item">
              <span className={`item-num${verdict === true ? ' is-ok' : verdict === undefined ? '' : ' is-bad'}`}>{numbers[ii]}</span>
              <div className="sheet-item-body">
                <p className="transform-first">{it.first}</p>
                <span className="keyword" aria-label={`${t('sheet.keyword')}: ${it.keyword}`}>{it.keyword}</span>
                <p className="transform-second">
                  {it.start && <>{it.start} </>}
                  <GapInput value={value} onChange={(v) => onAnswer(key, v)} disabled={checked} label={t('sheet.questionLabel', { n: numbers[ii] })} verdict={verdict} />
                  {it.end && it.end !== '.' ? <> {it.end}</> : it.end}
                </p>
                {!checked && words > 0 && <span className={`word-count${words > 5 ? ' is-over' : ''}`}>{t('sheet.words', { n: words })}</span>}
                {checked && <Explanation ok={verdict ?? null} expected={expectedAnswers(task, ii)} explain={it.explain} given={value} />}
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}

function ReadingMc({ task, ti, numbers, answers, checked, onAnswer }: TaskProps & { task: Extract<PracticeTask, { type: 'readingMc' }> }) {
  return (
    <div className="reading-layout">
      <article className="reading-text">
        {task.text.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
      </article>
      <ol className="sheet-items reading-questions">
        {task.items.map((it, ii) => {
          const key = itemKey(ti, ii)
          const verdict = verdictOf(task, ii, answers[key], checked)
          return (
            <li key={ii} className="sheet-item">
              <span className={`item-num${verdict === true ? ' is-ok' : verdict === undefined ? '' : ' is-bad'}`}>{numbers[ii]}</span>
              <div className="sheet-item-body">
                <p className="question-text">{it.question}</p>
                <OptionButtons wide options={it.options} value={answers[key]} answer={it.answer} checked={checked} onPick={(i) => onAnswer(key, String(i))} label={t('sheet.questionLabel', { n: numbers[ii] })} />
                {checked && <Explanation ok={verdict ?? null} expected={expectedAnswers(task, ii)} explain={it.explain} given={optionText(it.options, answers[key])} />}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Matching({ task, ti, numbers, answers, checked, onAnswer }: TaskProps & { task: Extract<PracticeTask, { type: 'matching' }> }) {
  return (
    <>
      {task.intro && <p className="text-muted">{task.intro}</p>}
      <div className="match-texts">
        {task.sections.map((s) => (
          <article key={s.label} className="match-text">
            <header><span className="match-letter">{s.label}</span>{s.title && <strong>{s.title}</strong>}</header>
            <p>{s.text}</p>
          </article>
        ))}
      </div>
      <ol className="sheet-items">
        {task.items.map((it, ii) => {
          const key = itemKey(ti, ii)
          const value = answers[key]
          const verdict = verdictOf(task, ii, value, checked)
          return (
            <li key={ii} className="sheet-item">
              <span className={`item-num${verdict === true ? ' is-ok' : verdict === undefined ? '' : ' is-bad'}`}>{numbers[ii]}</span>
              <div className="sheet-item-body">
                <div className="match-row">
                  <p className="question-text">{it.question}</p>
                  <div className="match-letters" role="radiogroup" aria-label={t('sheet.questionLabel', { n: numbers[ii] })}>
                    {task.sections.map((s) => {
                      const selected = value === s.label
                      const state = checked ? (s.label === it.answer ? ' is-key' : selected ? ' is-wrong' : '') : ''
                      return (
                        <button key={s.label} type="button" role="radio" aria-checked={selected} disabled={checked} className={`match-choice${selected ? ' is-selected' : ''}${state}`} onClick={() => onAnswer(key, s.label)}>
                          {s.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {checked && <Explanation ok={verdict ?? null} expected={expectedAnswers(task, ii)} explain={it.explain} given={value} />}
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}
