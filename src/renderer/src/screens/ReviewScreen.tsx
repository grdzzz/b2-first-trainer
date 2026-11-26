import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, BookX, CheckCircle2, Eye, FileText, NotebookPen, RotateCcw, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import { checkItem, expectedAnswers, localDay, TASK_PART, type PracticeProgress } from '@shared/practice'
import { answerReview, failedState, gapContext, reviewOf, reviewSession, reviewSummary, type ReviewItem, type ReviewState } from '@shared/review'
import { selectSessionErrors, type ErrorRecord, type ReviewSessionSpec } from '@shared/learning/notebook'
import { sheetItemDraft } from '@shared/learning/sources'
import { competency, partLabel } from '@shared/learning/taxonomy'
import { createAttempt } from '@shared/attempts'
import type { DomainEvent } from '@shared/learning/events'
import { errorMessage, useApp } from '../lib/store'
import { useAllSheets } from '../lib/practice'
import { useLearning } from '../lib/learning'
import { Mascot, MascotSvg } from '../components/Mascot'
import { ReviewSkeleton } from '../components/ScreenSkeletons'
import { SkillBadge } from '../components/SkillBadge'
import { StudySkillChip } from '../components/StudySkill'
import { Explanation, GapInput, OptionButtons, optionText } from './SheetScreen'
import { formatDate, t, tn } from '../i18n'

type QItem = { kind: 'sheet'; item: ReviewItem; errorId: string; inLeitner: boolean } | { kind: 'self'; record: ErrorRecord }

const SESSION_SIZE = 15

export function ReviewScreen({ session }: { session?: ReviewSessionSpec }) {
  const sheets = useAllSheets()
  const learning = useLearning()
  if (!sheets || !learning.ready) return <ReviewSkeleton />
  return <ReviewRunner sheets={sheets} spec={session ?? { kind: 'due' }} />
}

function ReviewRunner({ sheets, spec }: { sheets: NonNullable<ReturnType<typeof useAllSheets>>; spec: ReviewSessionSpec }) {
  const app = useApp()
  const learning = useLearning()
  const today = localDay()
  const started = useRef(Date.now())
  // La sesión se fija al entrar: responder no cambia el orden ni añade preguntas a mitad.
  const [{ queue, examErrors }] = useState(() => buildQueue(spec, sheets, app.practiceProgress, learning.errors, learning.statusCtx, today))
  const [index, setIndex] = useState(0)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState<Array<{ ok: boolean; mastered: boolean }>>([])
  const progressRef = useRef(app.practiceProgress)
  progressRef.current = app.practiceProgress
  const summary = useMemo(() => reviewSummary(sheets, app.practiceProgress, today), [sheets, app.practiceProgress, today])
  const sent = useRef(false)

  const entry = queue[index]
  const done = index >= queue.length

  // Al terminar: una sola vez, el evento de sesión completada (XP, plan, misiones…).
  useEffect(() => {
    if (!done || sent.current || results.length === 0) return
    sent.current = true
    const at = new Date().toISOString()
    learning.emit([{ type: 'REVIEW_COMPLETED', id: `review-session:${at}`, at, session: spec, answered: results.length, correct: results.filter((r) => r.ok).length, mastered: results.filter((r) => r.mastered).length, minutes: Math.max(1, Math.round((Date.now() - started.current) / 60000)) }])
  }, [done, results, learning, spec])

  const emitAnswer = (ev: Omit<Extract<DomainEvent, { type: 'REVIEW_ANSWERED' }>, 'type' | 'id' | 'at'>) => {
    const at = new Date().toISOString()
    learning.emit([{ type: 'REVIEW_ANSWERED', id: `review:${ev.errorId}:${at}`, at, ...ev }])
  }

  const check = async () => {
    if (!entry || entry.kind !== 'sheet' || checked || !value.trim()) return
    const { item } = entry
    const task = item.sheet.tasks[item.taskIndex]
    const ok = checkItem(task, item.itemIndex, value) === true
    setChecked(true)
    const prev: PracticeProgress = progressRef.current.find((p) => p.id === item.sheet.id) ?? { id: item.sheet.id, answers: {}, checked: false, times: 0 }
    const review = { ...reviewOf(item.sheet, prev, today) }
    const state: ReviewState | undefined = review[item.key] ?? (entry.inLeitner ? item.state : undefined)
    let next: ReviewState | null | undefined
    if (state) next = answerReview(state, ok, today)
    else next = ok ? undefined : failedState(undefined, today)
    if (next) review[item.key] = next
    else delete review[item.key]
    const mastered = !!state && next === null
    setResults((r) => [...r, { ok, mastered }])
    emitAnswer({ errorId: entry.errorId, correct: ok, sheetMastered: mastered, draft: sheetItemDraft(item.sheet, item.taskIndex, item.itemIndex, value) })
    try {
      await app.savePracticeProgress({ ...prev, review, mastered: (prev.mastered ?? 0) + (mastered ? 1 : 0), days: Array.from(new Set([today, ...(prev.days ?? [])])).slice(0, 400) })
    } catch (e) {
      app.notify('error', t('errors.saveFailed', { error: errorMessage(e) }))
    }
  }

  const selfAnswer = (knew: boolean) => {
    if (!entry || entry.kind !== 'self' || checked) return
    const st = entry.record.review
    const mastered = knew && !!st && answerReview(st, true, today) === null
    setChecked(true)
    setResults((r) => [...r, { ok: knew, mastered }])
    emitAnswer({ errorId: entry.record.id, correct: knew })
  }

  const next = () => {
    setIndex((i) => i + 1)
    setValue('')
    setChecked(false)
    setRevealed(false)
  }

  // Intro: comprobar / pasar a la siguiente. 1 / 2: «aún no» / «lo sabía» en la autoevaluación.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return
      const target = e.target as HTMLElement | null
      if (entry?.kind === 'self' && !checked && revealed && !target?.closest('input, textarea')) {
        if (e.key === '1') return selfAnswer(false)
        if (e.key === '2') return selfAnswer(true)
      }
      if (e.key !== 'Enter' || e.shiftKey) return
      if (target?.tagName === 'BUTTON') return
      e.preventDefault()
      if (checked) next()
      else if (entry?.kind === 'sheet') void check()
      else if (entry?.kind === 'self' && !revealed) setRevealed(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const startExamReview = async (examId: string, paperId: string, questionIds: string[]) => {
    const exam = app.exams.find((e) => e.id === examId)
    if (!exam) return
    try {
      const a = await app.saveAttempt(createAttempt(exam, { mode: 'review', paperId, questionIds }))
      app.navigate({ name: 'attempt', attemptId: a.id })
    } catch (e) {
      app.notify('error', errorMessage(e))
    }
  }

  const title = spec.kind === 'due' ? t('review.title') : t(`review.sessions.${spec.kind}`, { name: spec.kind === 'competency' ? (competency(spec.value)?.label ?? '') : (app.exams.find((e) => e.id === spec.value)?.name ?? '') })
  const header = (
    <>
      <button type="button" className="btn btn-ghost btn-sm back-link" onClick={() => app.navigate(spec.kind === 'due' ? { name: 'practice' } : { name: 'notebook' })}>
        <ArrowLeft size={16} aria-hidden /> {spec.kind === 'due' ? t('sheet.back') : t('notebook.back')}
      </button>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('review.eyebrow')}</p>
          <h1 className="h1">{title}</h1>
        </div>
      </header>
    </>
  )

  const examBlock = examErrors.length > 0 && (
    <section className="card review-exam-block" aria-labelledby="review-exam-title">
      <h2 id="review-exam-title" className="h-small"><FileText size={16} aria-hidden /> {tn('review.examTitle', examErrors.reduce((n, g) => n + g.questionIds.length, 0))}</h2>
      <p className="text-muted text-sm">{t('review.examText')}</p>
      <ul className="review-exam-list">
        {examErrors.map((g) => (
          <li key={g.paperId}>
            <span>{g.label}</span>
            <span className="text-subtle text-sm">{tn('review.questions', g.questionIds.length)}</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void startExamReview(g.examId, g.paperId, g.questionIds)}>
              <RotateCcw size={14} aria-hidden /> {t('review.examGo')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )

  if (queue.length === 0) {
    return (
      <div className="page page-narrow review-page">
        {header}
        {examBlock}
        <section className="card review-empty">
          <Mascot
            mood="resting"
            size={120}
            layout="below"
            message={spec.kind !== 'due' ? t('review.nothingInSession') : summary.total ? t('review.nothingTodayNext', { date: formatDate(summary.nextDue ?? today, { weekday: 'long', day: 'numeric', month: 'long' }), n: summary.total }) : t('review.nothingYet')}
          />
          <div className="row-gap">
            <button type="button" className="btn btn-primary" onClick={() => app.navigate({ name: 'practice' })}>
              <NotebookPen size={16} aria-hidden /> {t('review.goPractice')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => app.navigate({ name: 'notebook' })}>
              <BookX size={16} aria-hidden /> {t('review.goNotebook')}
            </button>
          </div>
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
            react={mastered > 0 ? 'achievement' : pct >= 0.5 ? 'happy' : undefined}
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
            {summary.due > 0 && spec.kind === 'due' && (
              <button type="button" className="btn btn-secondary" onClick={() => app.navigate({ name: 'practice' })}>
                <RotateCcw size={16} aria-hidden /> {tn('review.moreLeft', summary.due)}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => app.navigate({ name: 'notebook' })}>
              <BookX size={16} aria-hidden /> {t('review.goNotebook')}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => app.navigate({ name: 'plan' })}>
              {t('review.goPlan')} <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </section>
        {examBlock}
      </div>
    )
  }

  const label = t('review.questionN', { n: index + 1 })
  const progress = (
    <div className="sheet-progress" role="progressbar" aria-label={t('review.progress')} aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index}>
      <span className="text-sm">{t('review.progressN', { n: index + 1, total: queue.length })}</span>
      <span className="sheet-progress-bar"><span style={{ width: `${(index / queue.length) * 100}%` }} /></span>
    </div>
  )

  if (entry.kind === 'self') {
    const r = entry.record
    return (
      <div className="page page-narrow review-page">
        {header}
        {progress}
        <section className="card review-card" key={r.id} aria-labelledby="review-q">
          <div className="review-card-head">
            <StudySkillChip skill={r.skill} />
            <span className="text-subtle text-sm">{[r.category ? competency(r.category)?.label : null, r.part ? partLabel(r.part) : null, t(`notebook.sources.${r.source}`)].filter(Boolean).join(' · ')}</span>
            <span className="spacer" />
            {r.review && <span className="pill pill-muted" title={t('review.boxHint')}>{t('review.box', { n: r.review.box + 1, total: 4 })}</span>}
          </div>
          <h2 id="review-q" className="sr-only">{label}</h2>
          <p className="sheet-instructions">{t('review.selfHint')}</p>
          {r.question && <p className="review-sentence">{r.question}</p>}
          {r.given && (
            <p className="self-given">
              <span className="text-subtle">{t('notebook.yourAnswer')}</span> <s>{r.given}</s>
            </p>
          )}
          {revealed ? (
            <div className="explain is-ok">
              <CheckCircle2 size={16} aria-hidden />
              <div>
                <p>
                  <span className="text-subtle">{t('sheet.correctAnswer')}</span> <strong>{r.expected.join(' / ') || '—'}</strong>
                </p>
                {r.explanation && <p className="explain-text">{r.explanation}</p>}
                {r.notes && <p className="explain-text"><em>{r.notes}</em></p>}
              </div>
            </div>
          ) : null}
          <div className="review-actions">
            {app.settings.mascot && <MascotSvg mood={checked ? 'happy' : revealed ? 'thinking' : 'solving'} size={40} react={checked ? (results[results.length - 1]?.ok ? 'happy' : undefined) : undefined} reactKey={index} />}
            {checked ? (
              <>
                <span className={`review-verdict${results[results.length - 1]?.ok ? ' is-ok' : ' is-bad'}`}>
                  {results[results.length - 1]?.mastered ? t('review.mastered') : results[results.length - 1]?.ok ? t('review.selfKnew') : t('review.selfLater')}
                </span>
                <span className="spacer" />
                <button type="button" className="btn btn-primary" onClick={next} autoFocus>
                  {index + 1 < queue.length ? t('review.next') : t('review.finish')} <ArrowRight size={16} aria-hidden />
                </button>
              </>
            ) : revealed ? (
              <>
                <span className="text-subtle text-sm">{t('review.selfKeys')}</span>
                <span className="spacer" />
                <button type="button" className="btn btn-secondary" onClick={() => selfAnswer(false)}>
                  <ThumbsDown size={16} aria-hidden /> {t('review.selfNo')}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => selfAnswer(true)} autoFocus>
                  <ThumbsUp size={16} aria-hidden /> {t('review.selfYes')}
                </button>
              </>
            ) : (
              <>
                <span className="text-subtle text-sm">{t('review.selfThink')}</span>
                <span className="spacer" />
                <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)} autoFocus>
                  <Eye size={16} aria-hidden /> {t('review.selfReveal')}
                </button>
              </>
            )}
          </div>
        </section>
        <p className="text-subtle text-sm review-how">{t('review.selfHow')}</p>
      </div>
    )
  }

  const item = entry.item
  const task = item.sheet.tasks[item.taskIndex]
  const ii = item.itemIndex
  const verdict = checked ? checkItem(task, ii, value) : undefined

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
  const notes = learning.state.notebook.records[entry.errorId]?.notes

  return (
    <div className={`page page-narrow review-page skill-${item.sheet.skill}`}>
      {header}
      {progress}
      <section className="card review-card" key={item.sheet.id + item.key} aria-labelledby="review-q">
        <div className="review-card-head">
          <SkillBadge skill={item.sheet.skill} />
          <span className="text-subtle text-sm">{item.sheet.number ? `${t('practice.sheetN', { n: item.sheet.number })} · ` : ''}{item.sheet.title} · {TASK_PART[task.type].split(' · ')[1]}</span>
          <span className="spacer" />
          {entry.inLeitner && <span className="pill pill-muted" title={t('review.boxHint')}>{t('review.box', { n: item.state.box + 1, total: 4 })}</span>}
        </div>
        <h2 id="review-q" className="sr-only">{label}</h2>
        {task.type === 'wordFormation' && <p className="sheet-instructions">{t('review.wfHint')}</p>}
        {task.type === 'openCloze' && <p className="sheet-instructions">{t('review.ocHint')}</p>}
        {body}
        {checked && <Explanation ok={verdict ?? null} expected={expectedAnswers(task, ii)} explain={explain} given={given || undefined} />}
        {checked && notes && <p className="text-muted text-sm review-note"><em>{notes}</em></p>}
        <div className="review-actions">
          {app.settings.mascot && <MascotSvg mood={checked ? 'happy' : 'solving'} size={40} react={checked ? (verdict ? (results[results.length - 1]?.mastered ? 'achievement' : 'happy') : 'sad') : undefined} reactKey={index} />}
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

interface ExamGroup {
  examId: string
  paperId: string
  label: string
  questionIds: string[]
}

/** Cola de la sesión: preguntas de hojas (con su Leitner), errores de autoevaluación y, aparte, los de examen. */
function buildQueue(spec: ReviewSessionSpec, sheets: NonNullable<ReturnType<typeof useAllSheets>>, progress: PracticeProgress[], errors: ErrorRecord[], ctx: ReturnType<typeof useLearning>['statusCtx'], today: string): { queue: QItem[]; examErrors: ExamGroup[] } {
  const byId = new Map(sheets.map((s) => [s.id, s]))
  const queue: QItem[] = []
  const exams = new Map<string, ExamGroup>()
  const addExam = (r: ErrorRecord) => {
    if (r.ref.kind !== 'exam') return
    const key = r.ref.paperId
    const g = exams.get(key) ?? { examId: r.ref.examId, paperId: r.ref.paperId, label: (r.question ?? '').split(' · ').slice(0, 2).join(' · ') || r.ref.paperId, questionIds: [] }
    if (!g.questionIds.includes(r.ref.questionId)) g.questionIds.push(r.ref.questionId)
    exams.set(key, g)
  }
  if (spec.kind === 'due') {
    for (const item of reviewSession(sheets, progress, today, SESSION_SIZE)) queue.push({ kind: 'sheet', item, errorId: `s:${item.sheet.id}:${item.key}`, inLeitner: true })
    for (const r of errors) {
      if (r.deleted || r.mastered || r.ref.kind === 'sheet' || !r.review || r.review.due > today) continue
      if (r.ref.kind === 'exam') addExam(r)
      else if (queue.length < SESSION_SIZE) queue.push({ kind: 'self', record: r })
    }
  } else {
    for (const r of selectSessionErrors(errors, spec, ctx, 40)) {
      if (queue.length >= SESSION_SIZE) break
      if (r.ref.kind === 'exam') {
        addExam(r)
        continue
      }
      if (r.ref.kind === 'sheet') {
        const sheet = byId.get(r.ref.sheetId)
        const [ti, ii] = r.ref.key.split('.').map(Number)
        if (!sheet?.tasks[ti]?.items[ii]) continue
        const state = ctx.sheetReview.get(r.id)
        queue.push({ kind: 'sheet', item: { sheet, taskIndex: ti, itemIndex: ii, key: r.ref.key, state: state ?? { box: 0, due: today, lapses: 0, addedAt: r.firstAt } }, errorId: r.id, inLeitner: !!state })
      } else queue.push({ kind: 'self', record: r })
    }
  }
  return { queue, examErrors: Array.from(exams.values()) }
}
