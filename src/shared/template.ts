// Plantilla configurable con la estructura habitual del B2 First.
// Solo define la forma del examen (número de partes, preguntas y tipos); no incluye ningún contenido.
import type { Exam, Paper, PaperType, Part, Question, QuestionKind } from './types'
import { SCHEMA_VERSION } from './types'
import { newId } from './ids'

export interface PartSpec {
  title: string
  category: string
  count: number
  kind: QuestionKind
  /** Número de opciones (para `choice`). */
  options?: number
  points?: number
  minWords?: number
  maxWords?: number
}

export interface PaperSpec {
  type: PaperType
  title: string
  timeLimitMin: number
  parts: PartSpec[]
}

export const B2_FIRST_TEMPLATE: PaperSpec[] = [
  {
    type: 'reading',
    title: 'Reading & Use of English',
    timeLimitMin: 75,
    parts: [
      { title: 'Multiple-choice cloze', category: 'Multiple-choice cloze', count: 8, kind: 'choice', options: 4, points: 1 },
      { title: 'Open cloze', category: 'Open cloze', count: 8, kind: 'text', points: 1 },
      { title: 'Word formation', category: 'Word formation', count: 8, kind: 'text', points: 1 },
      { title: 'Key word transformation', category: 'Key word transformation', count: 6, kind: 'text', points: 2 },
      { title: 'Multiple choice', category: 'Multiple choice (reading)', count: 6, kind: 'choice', options: 4, points: 2 },
      { title: 'Gapped text', category: 'Gapped text', count: 6, kind: 'choice', options: 7, points: 2 },
      { title: 'Multiple matching', category: 'Multiple matching (reading)', count: 10, kind: 'choice', options: 6, points: 1 }
    ]
  },
  {
    type: 'writing',
    title: 'Writing',
    timeLimitMin: 80,
    parts: [
      { title: 'Essay', category: 'Essay', count: 1, kind: 'essay', points: 0, minWords: 140, maxWords: 190 },
      { title: 'Article / email / letter / report / review', category: 'Writing part 2', count: 1, kind: 'essay', points: 0, minWords: 140, maxWords: 190 }
    ]
  },
  {
    type: 'listening',
    title: 'Listening',
    timeLimitMin: 40,
    parts: [
      { title: 'Multiple choice (short extracts)', category: 'Multiple choice (listening)', count: 8, kind: 'choice', options: 3, points: 1 },
      { title: 'Sentence completion', category: 'Sentence completion', count: 10, kind: 'text', points: 1 },
      { title: 'Multiple matching', category: 'Multiple matching (listening)', count: 5, kind: 'choice', options: 8, points: 1 },
      { title: 'Multiple choice (interview)', category: 'Multiple choice (listening)', count: 7, kind: 'choice', options: 3, points: 1 }
    ]
  },
  {
    type: 'speaking',
    title: 'Speaking',
    timeLimitMin: 14,
    parts: [
      { title: 'Interview', category: 'Speaking interview', count: 1, kind: 'speaking', points: 0 },
      { title: 'Long turn', category: 'Speaking long turn', count: 1, kind: 'speaking', points: 0 },
      { title: 'Collaborative task', category: 'Speaking collaborative task', count: 1, kind: 'speaking', points: 0 },
      { title: 'Discussion', category: 'Speaking discussion', count: 1, kind: 'speaking', points: 0 }
    ]
  }
]

export function optionLabels(n: number): string[] {
  const count = Math.max(2, Math.min(26, Math.floor(n)))
  return Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i))
}

export function buildQuestion(kind: QuestionKind, number: number, spec: Partial<PartSpec> = {}): Question {
  const q: Question = { id: newId('q'), number, kind, points: spec.points ?? (kind === 'essay' || kind === 'speaking' ? 0 : 1) }
  if (kind === 'choice') q.options = optionLabels(spec.options ?? 4)
  if (kind === 'essay') {
    q.minWords = spec.minWords ?? 140
    q.maxWords = spec.maxWords ?? 190
  }
  return q
}

export function buildPart(spec: PartSpec, partNumber: number, firstQuestion: number): Part {
  return {
    id: newId('part'),
    number: partNumber,
    title: spec.title,
    category: spec.category,
    files: {},
    questions: Array.from({ length: spec.count }, (_, i) => buildQuestion(spec.kind, firstQuestion + i, spec))
  }
}

export function buildPaper(spec: PaperSpec): Paper {
  let next = 1
  const parts = spec.parts.map((p, i) => {
    const part = buildPart(p, i + 1, next)
    next += p.count
    return part
  })
  return { id: newId('paper'), type: spec.type, title: spec.title, timeLimitMin: spec.timeLimitMin, files: {}, parts }
}

export function createExam(name: string, paperTypes: PaperType[], template: PaperSpec[] = B2_FIRST_TEMPLATE, now = new Date()): Exam {
  const papers = template.filter((p) => paperTypes.includes(p.type)).map(buildPaper)
  return {
    id: newId('exam'),
    schemaVersion: SCHEMA_VERSION,
    name: name.trim() || 'Examen sin nombre',
    importedAt: now.toISOString(),
    papers
  }
}

/** Renumera las preguntas de un paper de forma continua (1..n) respetando el orden de las partes. */
export function renumberPaper(paper: Paper): Paper {
  let n = 1
  return {
    ...paper,
    parts: paper.parts.map((part, i) => ({
      ...part,
      number: i + 1,
      questions: part.questions.map((q) => ({ ...q, number: n++ }))
    }))
  }
}

/** Ajusta el número de preguntas de una parte, conservando las existentes. */
export function resizePart(part: Part, count: number, kind?: QuestionKind, options?: number): Part {
  const k = kind ?? part.questions[0]?.kind ?? 'text'
  const target = Math.max(0, Math.min(100, Math.floor(count)))
  const questions = part.questions.slice(0, target).map((q) => {
    if (kind && q.kind !== kind) return { ...buildQuestion(kind, q.number, { options }), id: q.id, points: q.points }
    if (k === 'choice' && options) return { ...q, options: optionLabels(options) }
    return q
  })
  const sample = questions[questions.length - 1]
  while (questions.length < target) {
    const nq = buildQuestion(k, (sample?.number ?? 0) + questions.length + 1, {
      options: options ?? sample?.options?.length,
      points: sample?.points
    })
    questions.push(nq)
  }
  return { ...part, questions }
}

export function partHasKey(part: Part): boolean {
  return part.questions.some((q) => (q.answers?.length ?? 0) > 0)
}

export function isAutoGradable(kind: QuestionKind): boolean {
  return kind === 'choice' || kind === 'text'
}
