import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, CircleHelp, Clock, Eye, FileQuestion, LogOut, Save, Send, X } from 'lucide-react'
import type { AnswerStyle, AnswerValue, Attempt, Exam, Paper, Part, Question, SelfAssessment as SA } from '@shared/types'
import { finishAttempt, remainingSeconds } from '@shared/attempts'
import { countWords, isCorrect } from '@shared/grading'
import { formatDuration } from '@shared/stats'
import { buildSpeakingCorrectionPrompt, buildWritingCorrectionPrompt } from '@shared/aiPrompt'
import { errorMessage, useApp } from '../lib/store'
import { PdfViewer } from '../components/PdfViewer'
import { AudioPlayer } from '../components/AudioPlayer'
import { Recorder } from '../components/Recorder'
import { SelfAssessment } from '../components/SelfAssessment'
import { CopyButton } from '../components/CopyButton'
import { TranscribeButton } from '../components/TranscribeButton'
import { WritingHelp } from '../components/WritingHelp'
import { VideoPlayer, isVideoFile, mediaUrl } from '../components/VideoPlayer'
import { ANSWER_STYLES, applyStyle, canChooseStyle, styleOfPart } from '@shared/answerStyles'
import { detectWritingType } from '@shared/writing'
import { ConfirmDialog } from '../components/Modal'
import { PaperBadge } from '../components/PaperBadge'
import { modeLabel } from '../lib/format'
import { t, tn } from '../i18n'

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

function answered(q: Question, a?: AnswerValue): boolean {
  if (q.kind === 'speaking') return !!a?.recording
  return !!a?.value?.trim()
}

export function AttemptScreen({ attemptId }: { attemptId: string }) {
  const app = useApp()
  const initial = app.attempts.find((a) => a.id === attemptId)
  const exam = app.exams.find((e) => e.id === initial?.examId)
  if (!initial || !exam) {
    return (
      <div className="page">
        <p>{t('attempt.notFound')}</p>
        <button type="button" className="btn btn-secondary" onClick={() => app.navigate({ name: 'home' })}>{t('common.back')}</button>
      </div>
    )
  }
  const paper = exam.papers.find((p) => p.id === initial.paperId)
  if (!paper) {
    return (
      <div className="page">
        <p>{t('attempt.paperMissing')}</p>
        <button type="button" className="btn btn-secondary" onClick={() => app.navigate({ name: 'home' })}>{t('common.back')}</button>
      </div>
    )
  }
  return <AttemptRunner initial={initial} exam={exam} paper={paper} />
}

function AttemptRunner({ initial, exam, paper }: { initial: Attempt; exam: Exam; paper: Paper }) {
  const app = useApp()
  const [attempt, setAttemptState] = useState<Attempt>(initial)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const attemptRef = useRef(attempt)
  const dirty = useRef(false)
  const finishing = useRef(false)

  const parts = useMemo(() => {
    const only = attempt.questionIds ? new Set(attempt.questionIds) : null
    return paper.parts
      .filter((p) => attempt.partIds.includes(p.id))
      .map((p) => ({ ...p, questions: p.questions.filter((q) => !only || only.has(q.id)) }))
      .filter((p) => p.questions.length > 0)
  }, [paper, attempt.partIds, attempt.questionIds])

  const [partIdx, setPartIdx] = useState(0)
  const part = parts[Math.min(partIdx, parts.length - 1)]
  const [activeQ, setActiveQ] = useState<string | null>(part?.questions[0]?.id ?? null)
  const allQuestions = useMemo(() => parts.flatMap((p) => p.questions), [parts])

  const setAttempt = useCallback((fn: (a: Attempt) => Attempt) => {
    setAttemptState((prev) => {
      const next = fn(prev)
      attemptRef.current = next
      return next
    })
    dirty.current = true
    setSaveState('dirty')
  }, [])

  const persist = useCallback(async () => {
    if (!dirty.current || finishing.current) return
    dirty.current = false
    setSaveState('saving')
    try {
      await app.saveAttempt(attemptRef.current)
      setSaveState(dirty.current ? 'dirty' : 'saved')
      setLastSaved(new Date())
    } catch (e) {
      dirty.current = true
      setSaveState('error')
      app.notify('error', t('errors.saveFailed', { error: errorMessage(e) }))
    }
  }, [app])
  const persistRef = useRef(persist)
  persistRef.current = persist

  // Autoguardado periódico, al ocultar la ventana, al salir de la pantalla y antes de cerrar la app.
  useEffect(() => {
    const id = window.setInterval(() => void persistRef.current(), app.settings.autosaveSeconds * 1000)
    return () => window.clearInterval(id)
  }, [app.settings.autosaveSeconds])
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && void persistRef.current()
    document.addEventListener('visibilitychange', onHide)
    const off = window.api.onBeforeClose(() => persistRef.current())
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      off()
      void persistRef.current()
    }
  }, [])

  const finish = useCallback(
    async (reason: 'submitted' | 'timeout') => {
      if (finishing.current) return
      finishing.current = true
      try {
        const done = finishAttempt(attemptRef.current, exam, app.settings.grading, reason)
        attemptRef.current = done
        dirty.current = false
        await app.saveAttempt(done)
        if (reason === 'timeout') app.notify('info', t('attempt.timeUp'))
        app.navigate({ name: 'results', attemptId: done.id })
      } catch (e) {
        finishing.current = false
        app.notify('error', t('errors.saveFailed', { error: errorMessage(e) }))
      }
    },
    [app, exam]
  )

  // Cronómetro: cuenta el tiempo real transcurrido mientras la pantalla está abierta.
  useEffect(() => {
    let last = Date.now()
    const id = window.setInterval(() => {
      const now = Date.now()
      const delta = Math.min(5, Math.max(0, (now - last) / 1000))
      last = now
      // Con la ventana oculta (minimizada o en segundo plano por el recordatorio) el tiempo no corre.
      if (finishing.current || document.hidden) return
      setAttemptState((prev) => {
        const next = { ...prev, durationSec: prev.durationSec + delta }
        attemptRef.current = next
        return next
      })
      dirty.current = true
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  const remaining = remainingSeconds(attempt)
  useEffect(() => {
    if (remaining !== null && remaining <= 0) void finish('timeout')
  }, [remaining, finish])

  const setAnswer = useCallback(
    (qid: string, patch: Partial<AnswerValue>) =>
      setAttempt((a) => ({ ...a, answers: { ...a.answers, [qid]: { ...a.answers[qid], ...patch, updatedAt: new Date().toISOString() } } })),
    [setAttempt]
  )
  const setSelf = useCallback((qid: string, value: SA) => setAttempt((a) => ({ ...a, selfAssessments: { ...a.selfAssessments, [qid]: value } })), [setAttempt])

  // Atajos: 1–9 / A–Z eligen opción en la pregunta activa; ↑/↓ cambian de pregunta.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      if (document.querySelector('dialog[open]')) return
      const qs = part?.questions ?? []
      const idx = qs.findIndex((q) => q.id === activeQ)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const next = qs[Math.max(0, Math.min(qs.length - 1, (idx === -1 ? -1 : idx) + (e.key === 'ArrowDown' ? 1 : -1)))]
        if (next) {
          setActiveQ(next.id)
          document.getElementById(`q-${next.id}`)?.focus()
        }
        return
      }
      const q = qs[idx]
      if (!q || q.kind !== 'choice' || !q.options) return
      const ans = attemptRef.current.answers[q.id]
      if (ans?.revealed) return
      let option: string | undefined
      if (/^[1-9]$/.test(e.key)) option = q.options[Number(e.key) - 1]
      else if (/^[a-z]$/i.test(e.key)) option = q.options.find((o) => o === e.key.toUpperCase())
      if (option) {
        e.preventDefault()
        setAnswer(q.id, { value: option })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [part, activeQ, setAnswer])

  const goToPart = (i: number) => {
    setPartIdx(i)
    setActiveQ(parts[i]?.questions[0]?.id ?? null)
    document.querySelector('.pane-answers')?.scrollTo({ top: 0 })
  }

  const unanswered = allQuestions.filter((q) => !answered(q, attempt.answers[q.id])).length
  const pdf = part?.files.pdf ?? paper.files.pdf
  const audio = part?.files.audio ?? paper.files.audio
  const paperHasMaterial = !!(paper.files.pdf || paper.files.audio || paper.parts.some((p) => p.files.pdf || p.files.audio))
  const [split, setSplit] = useState(() => {
    try {
      return Number(localStorage.getItem('split-ratio')) || 0.55
    } catch {
      return 0.55
    }
  })

  const exit = async () => {
    await persistRef.current()
    app.navigate({ name: 'exam', examId: exam.id })
  }

  if (!part) {
    return (
      <div className="page">
        <p>{t('attempt.empty')}</p>
        <button type="button" className="btn btn-secondary" onClick={exit}>{t('common.back')}</button>
      </div>
    )
  }

  const timerWarn = remaining !== null && remaining <= 300

  return (
    <div className="attempt">
      <header className="attempt-bar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={exit} title={t('attempt.exitHint')}>
          <LogOut size={16} aria-hidden /> {t('attempt.exit')}
        </button>
        <div className="attempt-title">
          <PaperBadge type={paper.type} label={paper.title} />
          <span className="attempt-exam">{exam.name}</span>
          <span className={`pill pill-mode-${attempt.mode}`}>{modeLabel(attempt.mode)}</span>
        </div>
        <span className="spacer" />
        <span className={`save-status save-${saveState}`} aria-live="polite">
          <Save size={14} aria-hidden />
          {saveState === 'saving' ? t('attempt.saving') : saveState === 'error' ? t('attempt.saveError') : saveState === 'dirty' ? t('attempt.unsaved') : lastSaved ? t('attempt.savedAt', { time: lastSaved.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }) : t('attempt.saved')}
        </span>
        <span className={`timer${timerWarn ? ' timer-warn' : ''}`} role="timer" aria-label={remaining !== null ? t('attempt.remaining') : t('attempt.elapsed')}>
          <Clock size={16} aria-hidden />
          <span className="tabular">{formatDuration(remaining ?? attempt.durationSec)}</span>
        </span>
        <button type="button" className="btn btn-primary" onClick={() => setConfirmSubmit(true)}>
          <Send size={16} aria-hidden /> {t('attempt.submit')}
        </button>
      </header>

      <div className="attempt-progress" role="progressbar" aria-label={t('attempt.progress')} aria-valuemin={0} aria-valuemax={allQuestions.length} aria-valuenow={allQuestions.length - unanswered}>
        <span style={{ width: `${allQuestions.length ? ((allQuestions.length - unanswered) / allQuestions.length) * 100 : 0}%` }} />
      </div>

      <div className={`attempt-body${paperHasMaterial ? '' : ' no-material'}`} style={{ ['--split' as string]: `${split * 100}%` }}>
        {paperHasMaterial && (
          <>
            <div className="pane pane-material">
              {paper.type === 'listening' && audio && isVideoFile(audio) && (
                <VideoPlayer key={audio.storedName} src={mediaUrl(exam.id, audio.storedName)} title={audio.name} shortcuts large={!pdf} />
              )}
              {paper.type === 'listening' && audio && !isVideoFile(audio) && (
                <AudioPlayer
                  key={audio.storedName}
                  sourceKey={audio.storedName}
                  mime={audio.mime}
                  title={audio.name}
                  shortcuts
                  load={() => window.api.readExamFile(exam.id, audio.storedName)}
                />
              )}
              {pdf ? (
                <PdfViewer key={pdf.storedName} sourceKey={pdf.storedName} title={pdf.name} initialPage={part?.files.pdf ? undefined : part?.pdfPage} load={() => window.api.readExamFile(exam.id, pdf.storedName)} />
              ) : audio && isVideoFile(audio) ? null : (
                <div className="empty-state">
                  <FileQuestion size={28} aria-hidden />
                  <p>{t('attempt.noPdf')}</p>
                </div>
              )}
            </div>
            <Divider
              ratio={split}
              onChange={(r) => {
                setSplit(r)
                try {
                  localStorage.setItem('split-ratio', String(r))
                } catch {
                  /* ignorar */
                }
              }}
            />
          </>
        )}

        <div className="pane pane-answers">
          {parts.length > 1 && (
            <div className="part-tabs" role="tablist" aria-label={t('attempt.parts')}>
              {parts.map((p, i) => {
                const done = p.questions.filter((q) => answered(q, attempt.answers[q.id])).length
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={i === partIdx}
                    className={`part-tab${i === partIdx ? ' is-active' : ''}${done === p.questions.length ? ' is-done' : ''}`}
                    onClick={() => goToPart(i)}
                  >
                    <span>{t('attempt.partShort', { n: p.number })}</span>
                    <span className="part-tab-count tabular">{done}/{p.questions.length}</span>
                  </button>
                )
              })}
            </div>
          )}
          <div className="part-head">
            <p className="eyebrow">{t('attempt.partOf', { n: part.number })} · {part.category}</p>
            <h2 className="h2">{part.title}</h2>
            {part.instructions && <p className="text-muted">{part.instructions}</p>}
            {(() => {
              // Sin clave (p. ej. un vídeo sin PDF), el alumno elige cómo son las preguntas de la parte.
              const original = paper.parts.find((p) => p.id === part.id)
              if (!original || !canChooseStyle(original)) return null
              const current = styleOfPart(original)
              return (
                <label className="style-picker">
                  <span>{t('styles.label')}</span>
                  <select
                    className="input input-sm"
                    value={current ?? ''}
                    onChange={async (e) => {
                      const style = e.target.value as AnswerStyle
                      const next = applyStyle(original, style)
                      const kindChanged = next.questions[0]?.kind !== original.questions[0]?.kind
                      try {
                        await app.saveExam({ ...exam, papers: exam.papers.map((pp) => (pp.id === paper.id ? { ...pp, parts: pp.parts.map((x) => (x.id === part.id ? next : x)) } : pp)) })
                        // Si cambia de opciones a texto (o al revés), las respuestas anteriores ya no valen.
                        if (kindChanged) setAttempt((a) => ({ ...a, answers: Object.fromEntries(Object.entries(a.answers).filter(([qid]) => !original.questions.some((q) => q.id === qid))) }))
                      } catch (err) {
                        app.notify('error', t('errors.saveFailed', { error: errorMessage(err) }))
                      }
                    }}
                  >
                    {ANSWER_STYLES.map((s) => <option key={s.id} value={s.id}>{t(`styles.${s.id}`)}</option>)}
                  </select>
                  <span className="style-picker-hint text-subtle">{t('styles.hint')}</span>
                </label>
              )
            })()}
            {(part.questions[0]?.kind === 'choice' || part.questions[0]?.kind === 'text') && (
              <p className="kbd-hint"><CircleHelp size={14} aria-hidden /> {part.questions[0].kind === 'choice' ? t('attempt.kbdChoice', { last: Math.min(9, part.questions[0].options?.length ?? 4), letter: part.questions[0].options?.[part.questions[0].options.length - 1] ?? 'D' }) : t('attempt.kbdText')}{paper.type === 'listening' ? ` ${t('attempt.kbdAudio')}` : ''}</p>
            )}
          </div>
          <div className="questions" role="list">
            {part.questions.map((q) => (
              <QuestionView
                key={q.id}
                q={q}
                part={part}
                paper={paper}
                exam={exam}
                attempt={attempt}
                active={activeQ === q.id}
                onActivate={() => setActiveQ(q.id)}
                onAnswer={(patch) => setAnswer(q.id, patch)}
                onSelf={(v) => setSelf(q.id, v)}
              />
            ))}
          </div>
          <div className="part-nav">
            <button type="button" className="btn btn-secondary" disabled={partIdx === 0} onClick={() => goToPart(partIdx - 1)}>{t('attempt.prevPart')}</button>
            {partIdx < parts.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={() => goToPart(partIdx + 1)}>{t('attempt.nextPart')}</button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={() => setConfirmSubmit(true)}><Send size={16} aria-hidden /> {t('attempt.submit')}</button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        title={t('attempt.submitTitle')}
        message={unanswered > 0 ? tn('attempt.submitUnanswered', unanswered) : t('attempt.submitAll')}
        confirmLabel={t('attempt.submit')}
        onCancel={() => setConfirmSubmit(false)}
        onConfirm={() => {
          setConfirmSubmit(false)
          void finish('submitted')
        }}
      />
    </div>
  )
}

function Divider({ ratio, onChange }: { ratio: number; onChange(r: number): void }) {
  const ref = useRef<HTMLDivElement>(null)
  const clamp = (r: number) => Math.max(0.25, Math.min(0.75, r))
  return (
    <div
      ref={ref}
      className="divider"
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={25}
      aria-valuemax={75}
      aria-label={t('attempt.resize')}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          e.stopPropagation()
          onChange(clamp(ratio + (e.key === 'ArrowLeft' ? -0.03 : 0.03)))
        }
      }}
      onPointerDown={(e) => {
        const parent = ref.current?.parentElement
        if (!parent) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const rect = parent.getBoundingClientRect()
        const move = (ev: PointerEvent) => onChange(clamp((ev.clientX - rect.left) / rect.width))
        const up = () => {
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
      }}
    />
  )
}

interface QuestionViewProps {
  q: Question
  part: Part
  paper: Paper
  exam: Exam
  attempt: Attempt
  active: boolean
  onActivate(): void
  onAnswer(patch: Partial<AnswerValue>): void
  onSelf(v: SA): void
}

function QuestionView(props: QuestionViewProps) {
  const { q } = props
  if (q.kind === 'essay') return <EssayQuestion {...props} />
  if (q.kind === 'speaking') return <SpeakingQuestion {...props} />
  return <ShortQuestion {...props} />
}

function ShortQuestion({ q, part, attempt, active, onActivate, onAnswer }: QuestionViewProps) {
  // Las frases se numeran dentro de cada parte: Phrase 1, Phrase 2…
  const phraseIndex = part.questions.findIndex((x) => x.id === q.id) + 1
  const { settings } = useApp()
  const ans = attempt.answers[q.id]
  const practice = attempt.mode !== 'exam'
  const revealed = practice && !!ans?.revealed
  const verdict = revealed ? isCorrect(q, ans?.value, settings.grading) : null
  const hasKey = (q.answers?.length ?? 0) > 0
  const state = revealed ? (verdict === true ? ' is-correct' : verdict === false ? ' is-wrong' : '') : ''

  return (
    <div
      id={`q-${q.id}`}
      role="listitem"
      tabIndex={-1}
      className={`question${active ? ' is-active' : ''}${state}`}
      onFocusCapture={onActivate}
      onMouseDown={onActivate}
      aria-label={t('attempt.questionN', { n: q.number })}
    >
      <span className={`q-num${part.answerStyle === 'phrase' ? ' q-num-phrase' : ''}`} aria-hidden>{part.answerStyle === 'phrase' ? t('styles.phraseN', { n: phraseIndex }) : q.number}</span>
      <div className="q-body">
        {q.kind === 'choice' ? (
          <div className="options" role="radiogroup" aria-label={t('attempt.questionN', { n: q.number })}>
            {(q.options ?? []).map((o, i) => {
              const selected = ans?.value === o
              const isKey = revealed && q.answers?.includes(o)
              return (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={revealed}
                  className={`option${selected ? ' is-selected' : ''}${isKey ? ' is-key' : ''}`}
                  onClick={() => onAnswer({ value: selected ? '' : o })}
                  title={`${o} (${i + 1})`}
                >
                  {o}
                </button>
              )
            })}
          </div>
        ) : (
          <input
            className={`input q-input${part.answerStyle === 'phrase' ? ' q-input-phrase' : ''}`}
            placeholder={part.answerStyle === 'phrase' ? t('styles.phraseN', { n: phraseIndex }) : undefined}
            value={ans?.value ?? ''}
            onChange={(e) => onAnswer({ value: e.target.value })}
            disabled={revealed}
            spellCheck={false}
            autoComplete="off"
            aria-label={t('attempt.answerFor', { n: q.number })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const items = Array.from(document.querySelectorAll<HTMLInputElement>('.q-input:not(:disabled)'))
                items[items.indexOf(e.currentTarget) + 1]?.focus()
              }
            }}
          />
        )}
        {revealed && (
          <p className={`feedback${verdict === true ? ' feedback-ok' : verdict === false ? ' feedback-bad' : ''}`} role="status">
            {verdict === true && <><Check size={15} aria-hidden /> {t('attempt.correct')}</>}
            {verdict === false && <><X size={15} aria-hidden /> {t('attempt.incorrect', { answer: (q.answers ?? []).join(' / ') })}</>}
            {verdict === null && t('attempt.noKey')}
          </p>
        )}
      </div>
      {practice && !revealed && hasKey && (
        <button
          type="button"
          className="btn btn-ghost btn-xs q-check"
          onClick={() => onAnswer({ revealed: true })}
          disabled={!hasKey || !ans?.value?.trim()}
          title={hasKey ? t('attempt.checkHint') : t('attempt.noKey')}
        >
          <Eye size={14} aria-hidden /> {t('attempt.check')}
        </button>
      )}
    </div>
  )
}

function PromptField({ q, attempt, onAnswer }: Pick<QuestionViewProps, 'q' | 'attempt' | 'onAnswer'>) {
  const ans = attempt.answers[q.id]
  if (q.prompt) {
    // Las consignas largas (p. ej. las tres tareas de Writing Part 2) empiezan plegadas: ya se ven en el PDF.
    return (
      <details className="task-prompt" open={q.prompt.length <= 400}>
        <summary className="field-label">{t('attempt.task')}</summary>
        <p className="task-prompt-text">{q.prompt}</p>
      </details>
    )
  }
  return (
    <label className="field">
      <span className="field-label">{t('attempt.taskOptional')}</span>
      <textarea className="input" rows={2} value={ans?.prompt ?? ''} onChange={(e) => onAnswer({ prompt: e.target.value })} placeholder={t('exam.promptPlaceholder')} />
    </label>
  )
}

function EssayQuestion({ q, part, exam, attempt, onAnswer, onActivate }: QuestionViewProps) {
  const ans = attempt.answers[q.id]
  const text = ans?.value ?? ''
  const area = useRef<HTMLTextAreaElement>(null)
  const writingType = ans?.writingType ?? detectWritingType(q.prompt ?? ans?.prompt ?? '', part.number)
  /** Inserta una frase de la guía donde está el cursor. */
  const insert = (phrase: string) => {
    const el = area.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const before = text.slice(0, start)
    const sep = before && !/\s$/.test(before) ? ' ' : ''
    const next = `${before}${sep}${phrase} ${text.slice(end)}`
    onAnswer({ value: next })
    requestAnimationFrame(() => {
      const pos = before.length + sep.length + phrase.length + 1
      el?.focus()
      el?.setSelectionRange(pos, pos)
    })
  }
  const words = countWords(text)
  const min = q.minWords ?? 0
  const max = q.maxWords ?? 0
  const status = words === 0 ? '' : min && words < min ? ' is-under' : max && words > max ? ' is-over' : ' is-ok'
  return (
    <div className="question question-essay" role="listitem" onFocusCapture={onActivate}>
      <PromptField q={q} attempt={attempt} onAnswer={onAnswer} />
      <label className="sr-only" htmlFor={`essay-${q.id}`}>{t('attempt.yourText')}</label>
      <textarea
        ref={area}
        id={`essay-${q.id}`}
        className="input essay"
        value={text}
        onChange={(e) => onAnswer({ value: e.target.value })}
        spellCheck={false}
        placeholder={t('attempt.essayPlaceholder')}
      />
      <div className="essay-foot">
        <span className={`word-count${status}`} aria-live="polite">
          {tn('attempt.words', words)}
          {min || max ? <span className="text-subtle"> · {t('attempt.wordRange', { min, max })}</span> : null}
        </span>
        <CopyButton
          getText={() =>
            buildWritingCorrectionPrompt({
              examName: exam.name,
              taskTitle: `Part ${part.number}: ${part.title}`,
              taskPrompt: q.prompt ?? ans?.prompt ?? '',
              studentText: text,
              minWords: q.minWords,
              maxWords: q.maxWords
            })
          }
        />
      </div>
      {attempt.mode === 'exam' ? (
        <p className="text-subtle text-sm">{t('writing.examMode')}</p>
      ) : (
        <WritingHelp text={text} type={writingType} onType={(w) => onAnswer({ writingType: w })} minWords={q.minWords} maxWords={q.maxWords} onInsert={insert} />
      )}
    </div>
  )
}

function SpeakingQuestion({ q, part, paper, exam, attempt, onAnswer, onSelf, onActivate }: QuestionViewProps) {
  const ans = attempt.answers[q.id]
  return (
    <div className="question question-speaking" role="listitem" onFocusCapture={onActivate}>
      <PromptField q={q} attempt={attempt} onAnswer={onAnswer} />
      <Recorder
        attemptId={attempt.id}
        questionId={q.id}
        recording={ans?.recording}
        onSaved={(recording) => onAnswer({ recording })}
        onRemoved={() => onAnswer({ recording: undefined })}
      />
      <div className="transcript-field">
        <div className="row-between">
          <label className="field-label" htmlFor={`tr-${q.id}`}>{t('attempt.transcript')}</label>
          {ans?.recording && (
            <TranscribeButton
              hasText={!!ans.transcript?.trim()}
              load={() => window.api.readRecording(attempt.id, ans.recording!.file.storedName)}
              onText={(transcript) => onAnswer({ transcript })}
            />
          )}
        </div>
        <textarea id={`tr-${q.id}`} className="input" rows={4} value={ans?.transcript ?? ''} onChange={(e) => onAnswer({ transcript: e.target.value })} placeholder={t('attempt.transcriptPlaceholder')} />
      </div>
      <div className="row-end">
        <CopyButton
          getText={() =>
            buildSpeakingCorrectionPrompt({
              examName: exam.name,
              partTitle: `Part ${part.number}: ${part.title}`,
              taskPrompt: q.prompt ?? ans?.prompt ?? '',
              transcript: ans?.transcript ?? '',
              durationSec: ans?.recording?.durationSec
            })
          }
        />
      </div>
      <SelfAssessment paperType={paper.type} idPrefix={`sa-${q.id}`} value={attempt.selfAssessments[q.id]} onChange={onSelf} />
    </div>
  )
}
