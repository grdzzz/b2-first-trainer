// Adaptadores entre los datos de la app y el motor adaptativo (puros: sin React).
import type { Attempt, Exam, Paper, Part } from '@shared/types'
import type { PracticeProgress, PracticeSheet } from '@shared/practice'
import type { PlacementResult } from '@shared/placement'
import { partHasKey } from '@shared/template'
import { allReviewItems } from '@shared/review'
import { errorIdFor, type ErrorRecord, type StatusContext } from '@shared/learning/notebook'
import type { ReviewState } from '@shared/review'
import type { AttemptLite, CatalogExam, CatalogSheet, EngineInput, SheetState } from '@shared/learning/engine'
import type { PlanConfig, PlanSession } from '@shared/learning/plan'
import type { ActivityEntry } from '@shared/learning/game'

function playable(paper: Paper, part: Part): boolean {
  if (paper.type === 'writing' || paper.type === 'speaking') return true
  if (paper.type === 'listening') return !!(part.files.audio || paper.files.audio)
  // Reading: con PDF, o sin él si cada pregunta trae su enunciado.
  return !!(part.files.pdf || paper.files.pdf) || part.questions.every((q) => !!q.prompt)
}

function gradable(paper: Paper, part: Part): boolean {
  if (paper.type === 'writing' || paper.type === 'speaking') return true
  return partHasKey(part) || !!part.answerStyle
}

export function catalogExams(exams: Exam[]): CatalogExam[] {
  return exams.map((e) => ({
    id: e.id,
    name: e.name,
    isExample: !!e.isExample,
    papers: e.papers.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      timeLimitMin: p.timeLimitMin,
      parts: p.parts.map((part) => ({ id: part.id, number: part.number, title: part.title, questions: part.questions.length, gradable: gradable(p, part), playable: playable(p, part) }))
    }))
  }))
}

export function catalogSheets(sheets: PracticeSheet[]): CatalogSheet[] {
  return sheets.map((s) => ({ id: s.id, title: s.title, number: s.number, skill: s.skill, minutes: s.minutes, taskTypes: s.tasks.map((t) => t.type), builtIn: !!s.builtIn }))
}

export function sheetStates(progress: PracticeProgress[]): Record<string, SheetState> {
  const out: Record<string, SheetState> = {}
  for (const p of progress) out[p.id] = { times: p.times ?? 0, best: p.best, total: p.total, lastAt: p.lastAt, inProgress: !p.checked && Object.keys(p.answers).length > 0 }
  return out
}

export function attemptsLite(attempts: Attempt[], exams: Exam[]): AttemptLite[] {
  const papers = new Map(exams.flatMap((e) => e.papers.map((p) => [p.id, p] as const)))
  return attempts.map((a) => ({
    id: a.id,
    examId: a.examId,
    paperId: a.paperId,
    paperType: a.paperType,
    mode: a.mode,
    status: a.status,
    startedAt: a.startedAt,
    finishedAt: a.finishedAt,
    partIds: a.partIds,
    percent: a.result?.percent ?? null,
    full: !a.questionIds && a.partIds.length === (papers.get(a.paperId)?.parts.length ?? -1)
  }))
}

/** Estado Leitner de las preguntas de hojas, por id de error del cuaderno. */
export function sheetReviewMap(sheets: PracticeSheet[], progress: PracticeProgress[], today: string): Map<string, ReviewState> {
  const m = new Map<string, ReviewState>()
  for (const it of allReviewItems(sheets, progress, today)) m.set(errorIdFor({ kind: 'sheet', sheetId: it.sheet.id, key: it.key }), it.state)
  return m
}

export interface DueCounts {
  /** Preguntas de hojas para repasar hoy (Leitner de las hojas). */
  sheet: number
  /** Errores con repaso propio que se repasan en la app (escritos a mano, IA, Writing, Speaking). */
  own: number
  /** Errores de examen que tocan (se repasan dentro del examen). */
  exam: number
}

export function dueCounts(records: ErrorRecord[], ctx: StatusContext): DueCounts {
  let sheet = 0
  for (const st of ctx.sheetReview.values()) if (st.due <= ctx.today) sheet++
  let own = 0
  let exam = 0
  for (const r of records) {
    if (r.deleted || r.mastered || r.ref.kind === 'sheet' || !r.review || r.review.due > ctx.today) continue
    if (r.ref.kind === 'exam') exam++
    else own++
  }
  return { sheet, own, exam }
}

export interface InputSources {
  today: string
  config: PlanConfig
  sheets: PracticeSheet[]
  progress: PracticeProgress[]
  exams: Exam[]
  attempts: Attempt[]
  activity: ActivityEntry[]
  placement: PlacementResult | null
  errors: ErrorRecord[]
  due: DueCounts
  history: Record<string, PlanSession>
}

export function engineInput(s: InputSources): EngineInput {
  return {
    today: s.today,
    config: s.config,
    sheets: catalogSheets(s.sheets),
    sheetStates: sheetStates(s.progress),
    exams: catalogExams(s.exams),
    attempts: attemptsLite(s.attempts, s.exams),
    activity: s.activity,
    placement: s.placement,
    errors: s.errors,
    dueReviews: s.due.sheet + s.due.own,
    dueExamErrors: s.due.exam,
    history: s.history
  }
}
