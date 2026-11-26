// Fuentes → eventos de dominio («reconciliación»).
//
// Los datos de siempre (progreso de las hojas, intentos de examen, correcciones de IA) son la fuente de
// verdad. Aquí se comparan con lo ya procesado (GameDoc.processed) y se generan los eventos que faltan.
// Ventajas: es idempotente por construcción (volver a reconciliar no repite nada), sirve igual para lo que
// acaba de pasar, para lo que llega sincronizado desde otro ordenador y para inicializar 2.0 con el
// historial de versiones anteriores (migración).
import type { Attempt, Exam, QuestionResult } from '../types'
import { checkItem, expectedAnswers, itemKey, localDay, OPTION_LETTERS, type PracticeProgress, type PracticeSheet, type PracticeTask } from '../practice'
import { gapContext } from '../review'
import { classifyError, examPartId, SHEET_TASK_PART, skillOfPart, skillOfPracticeSkill, taskTypeFromCategory, type StudySkill } from './taxonomy'
import { errorIdFor, type ErrorDraft } from './notebook'
import { fingerprint } from './plan'
import type { DomainEvent, ItemOutcome } from './events'
import type { GameDoc } from './game'

export interface Sources {
  sheets: PracticeSheet[]
  progress: PracticeProgress[]
  attempts: Attempt[]
  exams: Exam[]
}

function localDayOf(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? localDay() : localDay(d)
}

// ---------- Hojas ----------

/** Texto de la pregunta y su contexto, fuera de la hoja. */
export function sheetItemText(task: PracticeTask, ii: number): { question?: string; context?: string } {
  switch (task.type) {
    case 'mcCloze':
    case 'openCloze':
    case 'wordFormation': {
      const c = gapContext(task, ii)
      const base = task.type === 'wordFormation' ? ` (${task.items[ii].base})` : ''
      return { question: `${c.before} _____${base} ${c.after}`.replace(/\s+/g, ' ').trim(), context: task.type === 'mcCloze' ? task.items[ii].options.map((o, i) => `${OPTION_LETTERS[i]} ${o}`).join(' · ') : undefined }
    }
    case 'transformation': {
      const it = task.items[ii]
      return { question: it.first, context: `${it.keyword} → ${it.start} _____ ${it.end}`.replace(/\s+/g, ' ').trim() }
    }
    case 'readingMc': {
      const it = task.items[ii]
      return { question: it.question, context: it.options.map((o, i) => `${OPTION_LETTERS[i]} ${o}`).join(' · ') }
    }
    case 'matching': {
      const it = task.items[ii]
      return { question: it.question, context: task.title }
    }
  }
}

function givenText(task: PracticeTask, ii: number, raw: string | undefined): string | undefined {
  if (raw === undefined || raw === '') return undefined
  if (task.type === 'mcCloze' || task.type === 'readingMc') {
    const o = task.items[ii].options[Number(raw)]
    return o === undefined ? raw : `${OPTION_LETTERS[Number(raw)]} · ${o}`
  }
  return raw
}

export function sheetItemDraft(sheet: PracticeSheet, ti: number, ii: number, given: string | undefined): ErrorDraft {
  const task = sheet.tasks[ti]
  const item = task.items[ii] as { explain?: string; options?: string[]; answer?: number }
  const key = itemKey(ti, ii)
  const skill: StudySkill = skillOfPart(SHEET_TASK_PART[task.type])
  const text = sheetItemText(task, ii)
  const expected = expectedAnswers(task, ii)
  const correctOption = task.type === 'mcCloze' ? [task.items[ii].options[task.items[ii].answer]] : expected
  const cls = classifyError({ taskType: task.type, skill, question: text.question, expected: correctOption, explanation: item.explain })
  return {
    id: errorIdFor({ kind: 'sheet', sheetId: sheet.id, key }),
    source: 'sheet',
    ref: { kind: 'sheet', sheetId: sheet.id, key },
    question: text.question,
    context: text.context,
    given: givenText(task, ii, given),
    expected,
    explanation: item.explain,
    skill,
    part: SHEET_TASK_PART[task.type],
    category: cls.category,
    subcategory: cls.subcategory,
    // El repaso de las preguntas de hojas es el Leitner del progreso de la hoja.
    ownReview: false,
    autoCheck: true
  }
}

function sheetOutcomes(sheet: PracticeSheet, answers: Record<string, string>, extraWrong: Set<string>, review: Record<string, unknown>): ItemOutcome[] {
  const out: ItemOutcome[] = []
  sheet.tasks.forEach((task, ti) =>
    task.items.forEach((_, ii) => {
      const key = itemKey(ti, ii)
      const ok = checkItem(task, ii, answers[key]) === true
      const draft = sheetItemDraft(sheet, ti, ii, ok ? undefined : answers[key])
      out.push({ errorId: draft.id, ok: ok && !extraWrong.has(key), part: draft.part, category: draft.category, inReview: key in review, ...(ok && !extraWrong.has(key) ? {} : { draft }) })
    })
  )
  return out
}

export function practiceEvent(sheet: PracticeSheet, p: PracticeProgress, prevBest: number | undefined, retro: boolean): DomainEvent | null {
  if (!p.checked || !p.lastAt || !p.times) return null
  const correct = p.lastScore ?? 0
  const total = p.total ?? sheet.tasks.reduce((n, t) => n + t.items.length, 0)
  // Al inicializar con el historial: lo que sigue en el repaso también son errores (de comprobaciones anteriores).
  const extra = new Set<string>(retro ? Object.keys(p.review ?? {}) : [])
  return {
    type: 'PRACTICE_COMPLETED',
    id: `sheet:${sheet.id}@${p.lastAt}`,
    at: p.lastAt,
    retro,
    sheetId: sheet.id,
    title: sheet.title,
    practiceSkill: sheet.skill,
    skill: skillOfPracticeSkill(sheet.skill),
    minutes: sheet.minutes,
    correct,
    total,
    times: p.times,
    prevBest,
    items: sheetOutcomes(sheet, p.answers, extra, p.review ?? {})
  }
}

// ---------- Exámenes ----------

function examDraft(exam: Exam | undefined, a: Attempt, q: QuestionResult, partNumber: number): ErrorDraft {
  const paper = exam?.papers.find((p) => p.id === a.paperId)
  const part = paper?.parts.find((p) => p.id === q.partId)
  const question = part?.questions.find((x) => x.id === q.questionId)
  const pid = examPartId(a.paperType, partNumber)
  const skill = skillOfPart(pid)
  const taskType = taskTypeFromCategory(q.category)
  const cls = classifyError({ taskType: a.paperType === 'reading' ? taskType : undefined, skill, question: question?.prompt, expected: q.expected })
  return {
    id: errorIdFor({ kind: 'exam', examId: a.examId, paperId: a.paperId, questionId: q.questionId, attemptId: a.id }),
    source: 'exam',
    ref: { kind: 'exam', examId: a.examId, paperId: a.paperId, questionId: q.questionId, attemptId: a.id },
    question: question?.prompt?.trim() || `${a.examName} · ${a.paperTitle} · Part ${partNumber} · Question ${q.number}`,
    context: part?.title,
    given: q.given || undefined,
    expected: q.expected,
    skill,
    part: pid,
    category: cls.category,
    subcategory: cls.subcategory,
    ownReview: true,
    autoCheck: q.kind === 'choice' || q.kind === 'text'
  }
}

export function examEvent(a: Attempt, exam: Exam | undefined, retro: boolean): DomainEvent | null {
  if (a.status !== 'finished' || !a.result) return null
  const paper = exam?.papers.find((p) => p.id === a.paperId)
  const partNum = new Map(a.result.parts.map((p) => [p.partId, p.partNumber]))
  const items: ItemOutcome[] = []
  for (const q of a.result.questions) {
    if (q.correct === null) continue
    const n = partNum.get(q.partId) ?? 1
    const draft = examDraft(exam, a, q, n)
    items.push({ errorId: draft.id, ok: q.correct, part: draft.part, category: draft.category, ...(q.correct ? {} : { draft }) })
  }
  const full = !!paper && a.partIds.length === paper.parts.length && !a.questionIds
  return {
    type: 'EXAM_COMPLETED',
    id: `attempt:${a.id}`,
    at: a.finishedAt ?? a.startedAt,
    retro,
    attemptId: a.id,
    examId: a.examId,
    paperId: a.paperId,
    paperType: a.paperType,
    partIds: a.partIds,
    mode: a.mode,
    full,
    percent: a.result.percent,
    graded: a.result.questions.filter((q) => q.correct !== null).length,
    minutes: Math.max(1, Math.round(a.durationSec / 60)),
    items
  }
}

// ---------- Correcciones de IA (Writing/Speaking) ----------

export function aiEvents(a: Attempt, processed: Record<string, string>, retro: boolean): DomainEvent[] {
  const out: DomainEvent[] = []
  if (a.paperType !== 'writing' && a.paperType !== 'speaking') return out
  for (const [qid, fb] of Object.entries(a.aiFeedback ?? {})) {
    const key = `ai:${a.id}:${qid}`
    if (processed[key] && processed[key] >= fb.receivedAt) continue
    const skill = a.paperType as 'writing' | 'speaking'
    const errors = fb.errors.slice(0, 30).map((e) => {
      const cls = classifyError({ skill, explanation: e.explanation, original: e.original, correction: e.correction })
      const draft: ErrorDraft = {
        id: errorIdFor({ kind: 'attempt', attemptId: a.id, questionId: qid }, fingerprint(e.original.trim().toLowerCase())),
        source: skill,
        ref: { kind: 'attempt', attemptId: a.id, questionId: qid },
        question: a.answers[qid]?.prompt?.trim() || `${a.examName} · ${a.paperTitle}`,
        context: e.original,
        given: e.original,
        expected: e.correction ? [e.correction] : [],
        explanation: e.explanation || undefined,
        skill,
        part: undefined,
        category: cls.category,
        categorySource: cls.category ? 'auto' : undefined,
        // Sin corrección automática: se repasa con autoevaluación (nunca se da por dominado sola).
        ownReview: true,
        autoCheck: false
      }
      return draft
    })
    out.push({ type: 'AI_FEEDBACK_IMPORTED', id: `${key}@${fb.receivedAt}`, key, at: fb.receivedAt, retro, attemptId: a.id, questionId: qid, paperType: a.paperType, errors })
  }
  return out
}

// ---------- Reconciliación ----------

/** Eventos pendientes según lo ya procesado. `retro`: inicialización con el historial anterior. */
export function reconcile(src: Sources, game: Pick<GameDoc, 'processed'>, retro: boolean): DomainEvent[] {
  const events: DomainEvent[] = []
  const sheets = new Map(src.sheets.map((s) => [s.id, s]))
  const exams = new Map(src.exams.map((e) => [e.id, e]))
  for (const p of src.progress) {
    const sheet = sheets.get(p.id)
    if (!sheet || !p.checked || !p.lastAt) continue
    const done = game.processed[`sheet:${p.id}`]
    if (done && done >= p.lastAt) continue
    const prevBest = game.processed[`best:${p.id}`]
    const ev = practiceEvent(sheet, p, prevBest !== undefined ? Number(prevBest) : undefined, retro)
    if (ev) events.push(ev)
  }
  for (const a of src.attempts) {
    if (a.status === 'finished' && a.result && !game.processed[`attempt:${a.id}`]) {
      const ev = examEvent(a, exams.get(a.examId), retro)
      if (ev) events.push(ev)
    }
    events.push(...aiEvents(a, game.processed, retro))
  }
  return events.sort((x, y) => x.at.localeCompare(y.at) || x.id.localeCompare(y.id))
}

export { localDayOf }
