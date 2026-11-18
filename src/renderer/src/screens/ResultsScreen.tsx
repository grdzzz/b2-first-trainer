import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Minus, RotateCcw, Trash2, X } from 'lucide-react'
import type { SelfAssessment as SA } from '@shared/types'
import { regrade, createAttempt } from '@shared/attempts'
import { pendingMistakes, formatDuration } from '@shared/stats'
import { buildSpeakingCorrectionPrompt, buildWritingCorrectionPrompt } from '@shared/aiPrompt'
import { countWords } from '@shared/grading'
import { errorMessage, useApp } from '../lib/store'
import { PaperBadge } from '../components/PaperBadge'
import { CambridgeBadge } from '../components/CambridgeBadge'
import { ProgressRing } from '../components/ProgressRing'
import { SelfAssessment } from '../components/SelfAssessment'
import { CopyButton } from '../components/CopyButton'
import { AudioPlayer } from '../components/AudioPlayer'
import { ConfirmDialog } from '../components/Modal'
import { modeLabel } from '../lib/format'
import { formatDate, formatNumber, t, tn } from '../i18n'

export function ResultsScreen({ attemptId }: { attemptId: string }) {
  const app = useApp()
  const attempt = app.attempts.find((a) => a.id === attemptId)
  const exam = app.exams.find((e) => e.id === attempt?.examId)
  const [onlyWrong, setOnlyWrong] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const paper = exam?.papers.find((p) => p.id === attempt?.paperId)
  const pending = useMemo(() => (exam && paper ? pendingMistakes(exam, paper.id, app.attempts) : []), [exam, paper, app.attempts])
  // La autoevaluación se edita en local y se guarda con un pequeño retardo (evita perder pulsaciones).
  const [sa, setSa] = useState<Record<string, SA>>(attempt?.selfAssessments ?? {})
  const saPending = useRef<Record<string, SA> | null>(null)
  const saTimer = useRef<number | undefined>(undefined)
  const latest = useRef({ attempt, exam, grading: app.settings.grading, saveAttempt: app.saveAttempt, notify: app.notify })
  latest.current = { attempt, exam, grading: app.settings.grading, saveAttempt: app.saveAttempt, notify: app.notify }
  const flushSa = useRef(async () => {
    window.clearTimeout(saTimer.current)
    const next = saPending.current
    saPending.current = null
    const { attempt: a, exam: ex, grading, saveAttempt, notify } = latest.current
    if (!next || !a) return
    const updated = { ...a, selfAssessments: next }
    try {
      await saveAttempt(ex ? regrade(updated, ex, grading) : updated)
    } catch (e) {
      notify('error', t('errors.saveFailed', { error: errorMessage(e) }))
    }
  })
  useEffect(() => () => void flushSa.current(), [])

  if (!attempt || !attempt.result) {
    return (
      <div className="page">
        <p>{t('results.notFound')}</p>
        <button type="button" className="btn btn-secondary" onClick={() => app.navigate({ name: 'history' })}>{t('common.back')}</button>
      </div>
    )
  }
  const r = attempt.result
  const auto = attempt.paperType === 'reading' || attempt.paperType === 'listening'

  const setSelf = (qid: string, v: SA) => {
    const next = { ...sa, [qid]: v }
    setSa(next)
    saPending.current = next
    window.clearTimeout(saTimer.current)
    saTimer.current = window.setTimeout(() => void flushSa.current(), 500)
  }

  const startReview = async () => {
    if (!exam || !paper || pending.length === 0) return
    try {
      const a = await app.saveAttempt(createAttempt(exam, { mode: 'review', paperId: paper.id, questionIds: pending }))
      app.navigate({ name: 'attempt', attemptId: a.id })
    } catch (e) {
      app.notify('error', errorMessage(e))
    }
  }

  const questionsByPart = r.parts.map((p) => ({ part: p, questions: r.questions.filter((q) => q.partId === p.partId && (!onlyWrong || q.correct === false)) }))
  const paperQuestions = paper?.parts.flatMap((p) => p.questions.map((q) => ({ q, part: p }))) ?? []

  return (
    <div className="page">
      <button type="button" className="btn btn-ghost btn-sm back-link" onClick={() => app.navigate({ name: 'history' })}>
        <ArrowLeft size={16} aria-hidden /> {t('nav.history')}
      </button>
      <header className="page-header">
        <div>
          <p className="eyebrow"><PaperBadge type={attempt.paperType} label={attempt.paperTitle} /> · {modeLabel(attempt.mode)}</p>
          <h1 className="h1">{attempt.examName}</h1>
          <p className="text-subtle text-sm">
            {formatDate(attempt.finishedAt, { dateStyle: 'long', timeStyle: 'short' })} · {t('results.duration', { d: formatDuration(attempt.durationSec) })}
            {attempt.endReason === 'timeout' && ` · ${t('results.timeout')}`}
          </p>
        </div>
        <div className="row-gap">
          {auto && exam && (
            <button type="button" className="btn btn-primary" onClick={startReview} disabled={pending.length === 0} title={pending.length ? '' : t('results.noPending')}>
              <RotateCcw size={16} aria-hidden /> {t('results.review', { n: pending.length })}
            </button>
          )}
          <button type="button" className="icon-btn" onClick={() => setConfirmDelete(true)} aria-label={t('history.delete')} title={t('history.delete')}>
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      </header>

      <section className="score-hero card">
        {r.percent === null ? (
          <div className="score-big"><span className="text-subtle">—</span></div>
        ) : (
          <ProgressRing value={r.percent} size={156} stroke={12} color={r.percent >= 60 ? 'var(--success)' : r.percent >= 40 ? 'var(--accent)' : 'var(--warning)'} label={`${Math.round(r.percent)} %`}>
            <span className="score-big">{formatNumber(r.percent, 0)}<span className="score-unit">%</span></span>
          </ProgressRing>
        )}
        {r.percent !== null && (
          <div className="score-cam">
            <span className="score-cam-label">{t('cambridge.scale')}</span>
            <CambridgeBadge percent={r.percent} />
          </div>
        )}
        <div className="score-meta">
          {r.maxScore > 0 ? <p className="h-small">{t('results.points', { score: formatNumber(r.score, 1), max: formatNumber(r.maxScore, 1) })}</p> : <p className="text-muted">{auto ? t('results.noKeyAtAll') : t('results.selfHint')}</p>}
          <div className="part-scores">
            {r.parts.map((p) => (
              <div key={p.partId} className="part-score">
                <span className="part-score-label">{t('attempt.partShort', { n: p.partNumber })}</span>
                <div className="meter" aria-hidden><span style={{ width: p.maxScore ? `${(p.score / p.maxScore) * 100}%` : '0%' }} /></div>
                <span className="tabular text-sm">{p.graded ? `${formatNumber(p.score, 1)}/${formatNumber(p.maxScore, 1)}` : t('results.ungraded')}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!exam && <p className="notice notice-warning">{t('results.examDeleted')}</p>}

      {auto && (
        <section className="card">
          <div className="row-between">
            <h2 className="section-title">{t('results.answers')}</h2>
            <label className="switch">
              <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} />
              <span>{t('results.onlyWrong')}</span>
            </label>
          </div>
          {questionsByPart.map(({ part, questions }) =>
            questions.length === 0 ? null : (
              <div key={part.partId} className="result-part">
                <h3 className="h-small">{t('attempt.partShort', { n: part.partNumber })} · {part.title} {!part.graded && <span className="pill pill-muted">{t('start.noKey')}</span>}</h3>
                <table className="result-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">{t('results.yourAnswer')}</th>
                      <th scope="col">{t('results.correctAnswer')}</th>
                      <th scope="col"><span className="sr-only">{t('results.verdict')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q) => (
                      <tr key={q.questionId} className={q.correct === false ? 'is-wrong' : q.correct ? 'is-correct' : ''}>
                        <td className="tabular">{q.number}</td>
                        <td>{q.given ? <span className="given">{q.given}</span> : <span className="text-subtle">{t('results.blank')}</span>}</td>
                        <td>{q.expected.length ? q.expected.join(' / ') : <span className="text-subtle">—</span>}</td>
                        <td className="verdict">
                          {q.correct === true && <Check size={16} aria-label={t('attempt.correct')} />}
                          {q.correct === false && <X size={16} aria-label={t('results.wrong')} />}
                          {q.correct === null && <Minus size={16} aria-label={t('results.ungraded')} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
          {onlyWrong && r.questions.every((q) => q.correct !== false) && <p className="text-muted">{t('results.noWrong')}</p>}
        </section>
      )}

      {!auto &&
        paperQuestions
          .filter(({ q }) => r.questions.some((x) => x.questionId === q.id))
          .map(({ q, part }) => {
            const ans = attempt.answers[q.id]
            const prompt = q.prompt ?? ans?.prompt ?? ''
            return (
              <section key={q.id} className="card result-production">
                <header className="row-between">
                  <h2 className="section-title">{t('attempt.partShort', { n: part.number })} · {part.title}</h2>
                  <CopyButton
                    getText={() =>
                      attempt.paperType === 'writing'
                        ? buildWritingCorrectionPrompt({ examName: attempt.examName, taskTitle: `Part ${part.number}: ${part.title}`, taskPrompt: prompt, studentText: ans?.value ?? '', minWords: q.minWords, maxWords: q.maxWords })
                        : buildSpeakingCorrectionPrompt({ examName: attempt.examName, partTitle: `Part ${part.number}: ${part.title}`, taskPrompt: prompt, transcript: ans?.transcript ?? '', durationSec: ans?.recording?.durationSec })
                    }
                  />
                </header>
                {prompt && <div className="task-prompt"><p className="field-label">{t('attempt.task')}</p><p className="task-prompt-text">{prompt}</p></div>}
                {attempt.paperType === 'writing' ? (
                  <>
                    <div className="essay-readonly">{ans?.value?.trim() ? ans.value : <span className="text-subtle">{t('results.blank')}</span>}</div>
                    <p className="text-subtle text-sm">{tn('attempt.words', countWords(ans?.value ?? ''))}</p>
                  </>
                ) : (
                  <>
                    {ans?.recording ? (
                      <AudioPlayer compact sourceKey={ans.recording.file.storedName} mime={ans.recording.file.mime} knownDuration={ans.recording.durationSec} load={() => window.api.readRecording(attempt.id, ans.recording!.file.storedName)} title={t('recorder.yourRecording')} />
                    ) : (
                      <p className="text-subtle">{t('results.noRecording')}</p>
                    )}
                    {ans?.transcript && <div className="essay-readonly">{ans.transcript}</div>}
                  </>
                )}
                <SelfAssessment paperType={attempt.paperType} idPrefix={`r-${q.id}`} value={sa[q.id]} onChange={(v) => setSelf(q.id, v)} />
              </section>
            )
          })}

      <ConfirmDialog
        open={confirmDelete}
        title={t('history.deleteTitle')}
        message={t('history.deleteMessage')}
        confirmLabel={t('common.delete')}
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false)
          try {
            await app.deleteAttempt(attempt.id)
            app.navigate({ name: 'history' })
          } catch (e) {
            app.notify('error', errorMessage(e))
          }
        }}
      />
    </div>
  )
}
