// Datos de prueba comunes para el núcleo de aprendizaje.
import { BUILT_IN_SHEETS } from '../src/shared/practiceSheets'
import { itemKey, type PracticeProgress, type PracticeSheet } from '../src/shared/practice'
import { reviewAfterCheck } from '../src/shared/review'
import { createExam } from '../src/shared/template'
import { applyKey, parseKeyJson } from '../src/shared/keys'
import { createAttempt, finishAttempt } from '../src/shared/attempts'
import { DEFAULT_SETTINGS, type Attempt, type Exam } from '../src/shared/types'
import { emptyNotebook } from '../src/shared/learning/notebook'
import { emptyGame } from '../src/shared/learning/game'
import { emptyPlan } from '../src/shared/learning/plan'
import type { LearningState, ProcessContext } from '../src/shared/learning/events'

export const SHEETS = BUILT_IN_SHEETS

export function allRight(sheet: PracticeSheet): Record<string, string> {
  const a: Record<string, string> = {}
  sheet.tasks.forEach((task, ti) => task.items.forEach((it, ii) => (a[itemKey(ti, ii)] = 'answers' in it ? it.answers[0] : String((it as { answer: number | string }).answer))))
  return a
}

/** Progreso de una hoja tras comprobarla con estas respuestas (como hace SheetScreen). */
export function checked(sheet: PracticeSheet, answers: Record<string, string>, at: string, prev?: PracticeProgress): PracticeProgress {
  const day = at.slice(0, 10)
  const rv = reviewAfterCheck(sheet, answers, prev?.review, day, new Date(at))
  let correct = 0
  let total = 0
  sheet.tasks.forEach((task, ti) =>
    task.items.forEach((it, ii) => {
      total++
      const v = answers[itemKey(ti, ii)]
      if (v === undefined) return
      if ('answers' in it) {
        if (it.answers.some((x) => x.toLowerCase() === v.toLowerCase())) correct++
      } else if (String((it as { answer: number | string }).answer) === v) correct++
    })
  )
  return {
    id: sheet.id,
    answers,
    checked: true,
    lastScore: correct,
    total,
    best: Math.max(prev?.best ?? 0, correct),
    times: (prev?.times ?? 0) + 1,
    lastAt: at,
    days: Array.from(new Set([day, ...(prev?.days ?? [])])),
    review: rv.review,
    mastered: (prev?.mastered ?? 0) + rv.mastered
  }
}

export function examWithKey(): Exam {
  return applyKey(createExam('Mock 1', ['reading', 'writing', 'listening', 'speaking']), parseKeyJson('{"papers":{"reading":{"1":"A","2":"B","3":"C","4":"D","5":"A","6":"B"}}}')).exam
}

/** Intento terminado del paper de Reading, con las respuestas dadas (número de pregunta → letra). */
export function finishedReading(exam: Exam, answers: Record<number, string>, at: string, mode: 'exam' | 'practice' | 'review' = 'practice', questionIds?: string[]): Attempt {
  const paper = exam.papers.find((p) => p.type === 'reading')!
  const a = createAttempt(exam, { mode, paperId: paper.id, questionIds }, new Date(at))
  for (const part of paper.parts) for (const q of part.questions) if (answers[q.number] !== undefined) a.answers[q.id] = { value: answers[q.number] }
  return finishAttempt({ ...a, durationSec: 600 }, exam, DEFAULT_SETTINGS.grading, 'submitted', new Date(at))
}

export function emptyState(): LearningState {
  return { notebook: emptyNotebook(new Date(0)), game: emptyGame(new Date(0)), plan: emptyPlan(new Date(0)) }
}

export function ctx(today: string, extra: Partial<ProcessContext> = {}): ProcessContext {
  return { today, practiceDays: [], legacyMastered: 0, customSheets: 0, readinessReached: false, ...extra }
}
