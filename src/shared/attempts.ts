// Creación y cierre de intentos (lógica pura).
import type { Attempt, AttemptMode, Exam, GradingOptions } from './types'
import { SCHEMA_VERSION } from './types'
import { gradeAttempt } from './grading'
import { newId } from './ids'

export interface StartOptions {
  mode: AttemptMode
  paperId: string
  partIds?: string[]
  questionIds?: string[]
}

export function createAttempt(exam: Exam, opts: StartOptions, now = new Date()): Attempt {
  const paper = exam.papers.find((p) => p.id === opts.paperId)
  if (!paper) throw new Error('El paper no existe en este examen.')
  let partIds = opts.partIds?.length ? paper.parts.filter((p) => opts.partIds!.includes(p.id)).map((p) => p.id) : paper.parts.map((p) => p.id)
  if (opts.questionIds) {
    const set = new Set(opts.questionIds)
    partIds = paper.parts.filter((p) => p.questions.some((q) => set.has(q.id))).map((p) => p.id)
  }
  if (partIds.length === 0) throw new Error('No hay partes que practicar.')
  // El temporizador solo se aplica en modo examen con el paper completo.
  const full = partIds.length === paper.parts.length && !opts.questionIds
  const limit = opts.mode === 'exam' && full && paper.timeLimitMin ? Math.round(paper.timeLimitMin * 60) : undefined
  return {
    id: newId('attempt'),
    schemaVersion: SCHEMA_VERSION,
    examId: exam.id,
    examName: exam.name,
    paperId: paper.id,
    paperType: paper.type,
    paperTitle: paper.title,
    mode: opts.mode,
    partIds,
    questionIds: opts.questionIds,
    status: 'in-progress',
    startedAt: now.toISOString(),
    durationSec: 0,
    timeLimitSec: limit,
    answers: {},
    selfAssessments: {}
  }
}

export function finishAttempt(attempt: Attempt, exam: Exam, grading: GradingOptions, reason: 'submitted' | 'timeout', now = new Date()): Attempt {
  const durationSec = attempt.timeLimitSec ? Math.min(attempt.durationSec, attempt.timeLimitSec) : attempt.durationSec
  const done: Attempt = { ...attempt, durationSec, status: 'finished', finishedAt: now.toISOString(), endReason: reason }
  return { ...done, result: gradeAttempt(exam, done, grading) }
}

/** Recalcula el resultado (p. ej. tras cambiar la autoevaluación o la clave). */
export function regrade(attempt: Attempt, exam: Exam, grading: GradingOptions): Attempt {
  if (attempt.status !== 'finished') return attempt
  return { ...attempt, result: gradeAttempt(exam, attempt, grading) }
}

export function remainingSeconds(attempt: Attempt): number | null {
  if (!attempt.timeLimitSec) return null
  return Math.max(0, attempt.timeLimitSec - attempt.durationSec)
}
