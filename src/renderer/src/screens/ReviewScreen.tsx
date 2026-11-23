import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, NotebookPen, RotateCcw, Sparkles } from 'lucide-react'
import { checkItem, expectedAnswers, localDay, TASK_PART, type PracticeProgress } from '@shared/practice'
import { answerReview, gapContext, reviewOf, reviewSession, reviewSummary, type ReviewItem } from '@shared/review'
import { errorMessage, useApp } from '../lib/store'
import { useAllSheets } from '../lib/practice'
import { Mascot } from '../components/Mascot'
import { SkillBadge } from '../components/SkillBadge'
import { Explanation, GapInput, OptionButtons, optionText } from './SheetScreen'
import { formatDate, t, tn } from '../i18n'

export function ReviewScreen() {
  const sheets = useAllSheets()
  if (!sheets) return <div className="page"><p className="text-muted" aria-busy="true">{t('practice.loading')}</p></div>
  return <ReviewRunner sheets={sheets} />
}

function ReviewRunner({ sheets }: { sheets: NonNullable<ReturnType<typeof useAllSheets>> }) {
  const app = useApp()
  const today = localDay()
  // La sesión se fija al entrar: responder no cambia el orden ni añade preguntas a mitad.
  const [queue] = useState<ReviewItem[]>(() => reviewSession(sheets, app.practiceProgress, today))
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState<Array<{ ok: boolean; mastered: boolean }>>([])
  const progressRef = useRef(app.practiceProgress)
  progressRef.current = app.practiceProgress
  const summary = useMemo(() => reviewSummary(sheets, app.practiceProgress, today), [sheets, app.practiceProgress, today])

  const item = queue[index]
  const done = index >= queue.length

  const check = async () => {
    if (!item || checked || !value.trim()) return
    const task = item.sheet.tasks[item.taskIndex]
    const ok = checkItem(task, item.itemIndex, value) === true
    setChecked(true)
    const prev: PracticeProgress = progressRef.current.find((p) => p.id === item.sheet.id) ?? { id: item.sheet.id, answers: {}, checked: false, times: 0 }
    const review = { ...reviewOf(item.sheet, prev, today) }
    const state = review[item.key] ?? item.state
    const next = answerReview(state, ok, today)
    if (next) review[item.key] = next
    else delete review[item.key]
    setResults((r) => [...r, { ok, mastered: !next }])
    try {
      await app.savePracticeProgress({
        ...prev,
        review,
        mastered: (prev.mastered ?? 0) + (next ? 0 : 1),
        days: Array.from(new Set([today, ...(prev.days ?? [])])).slice(0, 400)
      })
    } catch (e) {
      app.notify('error', t('errors.saveFailed', { error: errorMessage(e) }))
    }
  }

  const next = () => {
    setIndex((i) => i + 1)
    setValue('')
    setChecked(false)
  }

  // Intro: comprobar / pasar a la siguiente.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || document.querySelector('dialog[open]')) return
      // En un botón, Intro ya lo pulsa (elegir opción, «Siguiente»…).
      if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return
      e.preventDefault()
      if (checked) next()
      else void check()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const header = (
    <>
      <button type="button" className="btn btn-ghost btn-sm back-link" onClick={() => app.navigate({ name: 'practice' })}>
        <ArrowLeft size={16} aria-hidden /> {t('sheet.back')}
      </button>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('review.eyebrow')}</p>
          <h1 className="h1">{t('review.title')}</h1>
        </div>
      </header>
    </>
  )

  if (queue.length === 0) {
    return (
      <div className="page page-narrow review-page">
        {header}
        <section className="card review-empty">
          <Mascot mood="sleep" size={120} layout="below" message={summary.total ? t('review.nothingTodayNext', { date: formatDate(summary.nextDue ?? today, { weekday: 'long', day: 'numeric', month: 'long' }), n: summary.total }) : t('review.nothingYet')} />
          <button type="button" className="btn btn-primary" onClick={() => app.navigate({ name: 'practice' })}>
            <NotebookPen size={16} aria-hidden /> {t('review.goPractice')}
          </button>
        </section>
      </div>
    )
  }

  if (done) {
    const ok = results.filter((r) => r.ok).length
    const mastered = results.filter((r) => r.mastered).length
    const pct = results.length ? ok / results.length : 0
    return (
      <div className="page page-narrow review-page">
        {header}
        <section className="card review-done">
          <Mascot
            mood={pct >= 0.8 ? 'celebrate' : pct >= 0.5 ? 'cheer' : 'happy'}
            size={120}
            layout="below"
            message={
              <>
                <strong>{t('review.doneTitle', { ok, total: results.length })}</strong>
                <br />
                {mastered > 0 ? tn('review.doneMastered', mastered) : pct >= 0.5 ? t('review.doneGood') : t('review.doneKeepGoing')}
              </>
            }
          />
          <div className="row-gap">
            {summary.due > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => app.navigate({ name: 'practice' })}>
                <RotateCcw size={16} aria-hidden /> {tn('review.moreLeft', summary.due)}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => app.navigate({ name: 'practice' })}>
              <NotebookPen size={16} aria-hidden /> {t('review.goPractice')}
            </button>
          </div>
        </section>
      </div>
    )
  }

  const task = item.sheet.tasks[item.taskIndex]
  const ii = item.itemIndex
  const verdict = checked ? checkItem(task, ii, value) : undefined
  const label = t('review.questionN', { n: index + 1 })

  let body: React.ReactNode = null
  if (task.type === 'mcCloze') {
    const it = task.items[ii]
    const c = gapContext(task, ii)
    body = (
      <>
        <p className="review-sentence">
          {c.before} <span className={`review-blank${value !== '' ? ' is-filled' : ''}${verdict === true ? ' is-ok' : verdict === false ? ' is-bad' : ''}`}>{value !== '' ? it.options[Number(value)] : '_____'}</span>
          {/^[,.;:!?]/.test(c.after) ? '' : ' '}
          {c.after}
        </p>
        <OptionButtons options={it.options} value={value} answer={it.answer} checked={checked} onPick={(i) => setValue(String(i))} label={label} />
      </>
    )
  } else if (task.type === 'openCloze' || task.type === 'wordFormation') {
    const it = task.items[ii]
    const c = gapContext(task, ii)
    body = (
      <p className="review-sentence">
        {c.before} <GapInput value={value} onChange={setValue} disabled={checked} label={label} verdict={verdict} base={'base' in it ? it.base : undefined} />
        {/^[,.;:!?]/.test(c.after) ? '' : ' '}
        {c.after}
      </p>
    )
  } else if (task.type === 'transformation') {
    const it = task.items[ii]
    body = (
      <div className="review-transform">
        <p className="transform-first">{it.first}</p>
        <span className="keyword">{it.keyword}</span>
        <p className="transform-second">
          {it.start && <>{it.start} </>}
          <GapInput value={value} onChange={setValue} disabled={checked} label={label} verdict={verdict} />
          {it.end && it.end !== '.' ? <> {it.end}</> : it.end}
        </p>
      </div>
    )
  } else if (task.type === 'readingMc') {
    const it = task.items[ii]
    body = (
      <>
        <details className="review-text">
          <summary><BookOpen size={15} aria-hidden /> {t('review.showText')}</summary>
          <article className="reading-text">{task.text.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</article>
        </details>
        <p className="question-text">{it.question}</p>
        <OptionButtons wide options={it.options} value={value} answer={it.answer} checked={checked} onPick={(i) => setValue(String(i))} label={label} />
      </>
    )
  } else if (task.type === 'matching') {
    const it = task.items[ii]
    body = (
      <>
        <details className="review-text">
          <summary><BookOpen size={15} aria-hidden /> {t('review.showTexts')}</summary>
          <div className="match-texts">
            {task.sections.map((s) => (
              <article key={s.label} className="match-text">
                <header><span className="match-letter">{s.label}</span>{s.title && <strong>{s.title}</strong>}</header>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </details>
        <div className="match-row">
          <p className="question-text">{it.question}</p>
          <div className="match-letters" role="radiogroup" aria-label={label}>
            {task.sections.map((s) => {
              const selected = value === s.label
              const state = checked ? (s.label === it.answer ? ' is-key' : selected ? ' is-wrong' : '') : ''
              return (
                <button key={s.label} type="button" role="radio" aria-checked={selected} disabled={checked} className={`match-choice${selected ? ' is-selected' : ''}${state}`} onClick={() => setValue(s.label)}>
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  const given = task.type === 'mcCloze' || task.type === 'readingMc' ? optionText(task.items[ii].options, value) : value
  const explain = (task.items[ii] as { explain?: string }).explain

  return (
    <div className={`page page-narrow review-page skill-${item.sheet.skill}`}>
      {header}
      <div className="sheet-progress" role="progressbar" aria-label={t('review.progress')} aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index}>
        <span className="text-sm">{t('review.progressN', { n: index + 1, total: queue.length })}</span>
        <span className="sheet-progress-bar"><span style={{ width: `${(index / queue.length) * 100}%` }} /></span>
      </div>

      <section className="card review-card" key={item.sheet.id + item.key} aria-labelledby="review-q">
        <div className="review-card-head">
          <SkillBadge skill={item.sheet.skill} />
          <span className="text-subtle text-sm">{item.sheet.number ? `${t('practice.sheetN', { n: item.sheet.number })} · ` : ''}{item.sheet.title} · {TASK_PART[task.type].split(' · ')[1]}</span>
          <span className="spacer" />
          <span className="pill pill-muted" title={t('review.boxHint')}>{t('review.box', { n: item.state.box + 1, total: 4 })}</span>
        </div>
        <h2 id="review-q" className="sr-only">{label}</h2>
        {task.type === 'wordFormation' && <p className="sheet-instructions">{t('review.wfHint')}</p>}
        {task.type === 'openCloze' && <p className="sheet-instructions">{t('review.ocHint')}</p>}
        {body}
        {checked && <Explanation ok={verdict ?? null} expected={expectedAnswers(task, ii)} explain={explain} given={given || undefined} />}
        <div className="review-actions">
          {checked ? (
            <>
              <span className={`review-verdict${verdict ? ' is-ok' : ' is-bad'}`}>
                {verdict ? <><CheckCircle2 size={16} aria-hidden /> {results[results.length - 1]?.mastered ? t('review.mastered') : t('review.right')}</> : <><Sparkles size={16} aria-hidden /> {t('review.wrong')}</>}
              </span>
              <span className="spacer" />
              <button type="button" className="btn btn-primary" onClick={next} autoFocus>
                {index + 1 < queue.length ? t('review.next') : t('review.finish')} <ArrowRight size={16} aria-hidden />
              </button>
            </>
          ) : (
            <>
              <span className="text-subtle text-sm">{t('review.enterHint')}</span>
              <span className="spacer" />
              <button type="button" className="btn btn-primary" onClick={() => void check()} disabled={!value.trim()}>
                <CheckCircle2 size={16} aria-hidden /> {t('review.check')}
              </button>
            </>
          )}
        </div>
      </section>
      <p className="text-subtle text-sm review-how">{t('review.how')}</p>
    </div>
  )
}
