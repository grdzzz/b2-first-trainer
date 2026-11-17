// Corrección automática y cálculo de resultados.
import type {
  Attempt,
  AttemptResult,
  Exam,
  GradingOptions,
  Paper,
  PartResult,
  Question,
  QuestionResult
} from './types'
import { criteriaFor } from './types'

const APOSTROPHES = /[‘’ʼ`´]/g
const QUOTES = /[“”]/g
const DASHES = /[‐-―]/g

/**
 * Normaliza una respuesta para compararla.
 * Siempre: recorta espacios al principio y al final y unifica apóstrofos/comillas tipográficas.
 * Opcional (ajustes): mayúsculas, espacios sobrantes internos y tildes.
 */
export function normalizeAnswer(raw: string, opts: GradingOptions): string {
  let s = (raw ?? '').normalize('NFC').replace(APOSTROPHES, "'").replace(QUOTES, '"').replace(DASHES, '-').trim()
  if (opts.ignoreExtraSpaces) s = s.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1')
  if (opts.ignoreCase) s = s.toLocaleLowerCase('en')
  if (opts.ignoreAccents) s = s.normalize('NFD').replace(/\p{M}+/gu, '').normalize('NFC')
  return s
}

/** ¿Es correcta la respuesta? null si la pregunta no tiene clave o no es corregible. */
export function isCorrect(question: Question, given: string | undefined, opts: GradingOptions): boolean | null {
  const expected = question.answers ?? []
  if (expected.length === 0) return null
  if (question.kind === 'essay' || question.kind === 'speaking') return null
  const value = (given ?? '').trim()
  if (!value) return false
  if (question.kind === 'choice') {
    const v = value.toUpperCase()
    return expected.some((e) => e.trim().toUpperCase() === v)
  }
  const n = normalizeAnswer(value, opts)
  return expected.some((e) => normalizeAnswer(e, opts) === n)
}

export function gradeQuestion(question: Question, partId: string, category: string, given: string | undefined, opts: GradingOptions): QuestionResult {
  const correct = isCorrect(question, given, opts)
  return {
    questionId: question.id,
    partId,
    number: question.number,
    category,
    kind: question.kind,
    given: given ?? '',
    expected: question.answers ?? [],
    correct,
    points: correct ? question.points : 0,
    maxPoints: correct === null ? 0 : question.points
  }
}

/** Media de una autoevaluación (0..5) o undefined si está incompleta. */
export function selfAssessmentAverage(scores: Record<string, number> | undefined, criteria: readonly string[]): number | undefined {
  if (!scores || criteria.length === 0) return undefined
  const values = criteria.map((c) => scores[c]).filter((v): v is number => typeof v === 'number' && v >= 0 && v <= 5)
  if (values.length !== criteria.length) return undefined
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Corrige un intento. Las preguntas sin clave cuentan como "sin corrección" y no suman al máximo.
 * Writing/Speaking: si hay autoevaluación completa, la parte se puntúa con ella (0..5 por criterio).
 */
export function gradeAttempt(exam: Exam, attempt: Pick<Attempt, 'paperId' | 'partIds' | 'questionIds' | 'answers' | 'selfAssessments'>, opts: GradingOptions): AttemptResult {
  const paper = exam.papers.find((p) => p.id === attempt.paperId)
  if (!paper) return { score: 0, maxScore: 0, percent: null, parts: [], questions: [] }
  return gradePaper(paper, attempt, opts)
}

export function gradePaper(paper: Paper, attempt: Pick<Attempt, 'partIds' | 'questionIds' | 'answers' | 'selfAssessments'>, opts: GradingOptions): AttemptResult {
  const only = attempt.questionIds ? new Set(attempt.questionIds) : null
  const criteria = criteriaFor(paper.type)
  const questions: QuestionResult[] = []
  const parts: PartResult[] = []
  let score = 0
  let maxScore = 0

  for (const part of paper.parts) {
    if (!attempt.partIds.includes(part.id)) continue
    const qs = part.questions.filter((q) => !only || only.has(q.id))
    if (qs.length === 0) continue
    const pr: PartResult = {
      partId: part.id,
      partNumber: part.number,
      title: part.title,
      category: part.category,
      score: 0,
      maxScore: 0,
      correct: 0,
      gradedCount: 0,
      total: qs.length,
      graded: false
    }
    const selfScores: number[] = []
    for (const q of qs) {
      const r = gradeQuestion(q, part.id, part.category, attempt.answers[q.id]?.value, opts)
      questions.push(r)
      if (r.correct !== null) {
        pr.graded = true
        pr.gradedCount++
        pr.maxScore += r.maxPoints
        pr.score += r.points
        if (r.correct) pr.correct++
      }
      if (q.kind === 'essay' || q.kind === 'speaking') {
        const avg = selfAssessmentAverage(attempt.selfAssessments[q.id]?.scores, criteria)
        if (avg !== undefined) selfScores.push(avg)
      }
    }
    if (selfScores.length > 0) {
      // Escala de Cambridge: cada criterio 0..5. Se guarda la suma de criterios como puntuación de la parte.
      const total = selfScores.reduce((a, b) => a + b, 0) * criteria.length
      pr.selfScore = round2(total)
      pr.selfMax = selfScores.length * criteria.length * 5
      pr.score += pr.selfScore
      pr.maxScore += pr.selfMax
      pr.graded = true
    }
    score += pr.score
    maxScore += pr.maxScore
    parts.push(pr)
  }
  return {
    score: round2(score),
    maxScore,
    percent: maxScore > 0 ? round2((score / maxScore) * 100) : null,
    parts,
    questions
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Cuenta palabras como lo haría un examinador: secuencias separadas por espacios que contienen letras o números. */
export function countWords(text: string): number {
  if (!text) return 0
  return text
    .replace(/[—–]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}
