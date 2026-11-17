import { describe, expect, it } from 'vitest'
import { countWords, gradeAttempt, isCorrect, normalizeAnswer, selfAssessmentAverage } from '@shared/grading'
import { applyKey, parseKeyJson } from '@shared/keys'
import { createExam } from '@shared/template'
import type { Attempt, GradingOptions, Question } from '@shared/types'

const strict: GradingOptions = { ignoreCase: false, ignoreExtraSpaces: false, ignoreAccents: false }
const lenient: GradingOptions = { ignoreCase: true, ignoreExtraSpaces: true, ignoreAccents: true }
const q = (over: Partial<Question>): Question => ({ id: 'q_aaaaaaaa', number: 1, kind: 'text', points: 1, ...over })

describe('normalizeAnswer', () => {
  it('siempre recorta y unifica apóstrofos', () => {
    expect(normalizeAnswer("  wasn’t  ", strict)).toBe("wasn't")
  })
  it('aplica cada opción por separado', () => {
    expect(normalizeAnswer('Café  Au  Lait', { ...strict, ignoreCase: true })).toBe('café  au  lait')
    expect(normalizeAnswer('Café  Au  Lait', { ...strict, ignoreExtraSpaces: true })).toBe('Café Au Lait')
    expect(normalizeAnswer('Café', { ...strict, ignoreAccents: true })).toBe('Cafe')
    expect(normalizeAnswer('Café  AU , lait', lenient)).toBe('cafe au, lait')
  })
})

describe('isCorrect', () => {
  it('opción múltiple ignora mayúsculas y espacios', () => {
    const mc = q({ kind: 'choice', options: ['A', 'B', 'C', 'D'], answers: ['B'] })
    expect(isCorrect(mc, ' b ', strict)).toBe(true)
    expect(isCorrect(mc, 'C', strict)).toBe(false)
    expect(isCorrect(mc, undefined, strict)).toBe(false)
  })
  it('texto: estricto por defecto, flexible con ajustes', () => {
    const t = q({ answers: ['which', 'that'] })
    expect(isCorrect(t, 'that', strict)).toBe(true)
    expect(isCorrect(t, 'Which', strict)).toBe(false)
    expect(isCorrect(t, 'Which', lenient)).toBe(true)
    expect(isCorrect(t, '', lenient)).toBe(false)
    expect(isCorrect(q({ answers: ['was not  allowed'] }), 'was not allowed', { ...strict, ignoreExtraSpaces: true })).toBe(true)
  })
  it('sin clave o redacción devuelve null', () => {
    expect(isCorrect(q({}), 'x', strict)).toBeNull()
    expect(isCorrect(q({ kind: 'essay', answers: ['x'] }), 'x', strict)).toBeNull()
  })
})

describe('gradeAttempt', () => {
  const base = createExam('E', ['reading', 'writing', 'speaking'])
  const exam = applyKey(base, parseKeyJson('{"papers":{"reading":{"1":"A","2":"B","9":"which","25":"in spite of"}}}')).exam
  const reading = exam.papers[0]
  const ids = (n: number) => reading.parts.flatMap((p) => p.questions).find((x) => x.number === n)!.id
  const attempt = (answers: Record<number, string>, partIds = reading.parts.map((p) => p.id)): Pick<Attempt, 'paperId' | 'partIds' | 'answers' | 'selfAssessments' | 'questionIds'> => ({
    paperId: reading.id,
    partIds,
    answers: Object.fromEntries(Object.entries(answers).map(([n, v]) => [ids(Number(n)), { value: v }])),
    selfAssessments: {}
  })

  it('puntúa por parte usando los puntos de cada pregunta', () => {
    const r = gradeAttempt(exam, attempt({ 1: 'A', 2: 'C', 9: 'which', 25: 'in spite of' }), strict)
    expect(r.score).toBe(4) // 1 + 0 + 1 + 2
    expect(r.maxScore).toBe(5) // 1 + 1 + 1 + 2
    expect(r.percent).toBe(80)
    const p1 = r.parts[0]
    expect(p1).toMatchObject({ partNumber: 1, score: 1, maxScore: 2, correct: 1, gradedCount: 2, total: 8, graded: true })
    expect(r.parts[4].graded).toBe(false) // parte 5 sin clave
    const wrong = r.questions.find((x) => x.number === 2)!
    expect(wrong).toMatchObject({ correct: false, given: 'C', expected: ['B'] })
    expect(r.questions.find((x) => x.number === 3)!.correct).toBeNull()
  })

  it('respeta partes y preguntas seleccionadas (modo repaso)', () => {
    const a = { ...attempt({ 1: 'A' }), questionIds: [ids(1), ids(2)] }
    const r = gradeAttempt(exam, a, strict)
    expect(r.questions).toHaveLength(2)
    expect(r.parts).toHaveLength(1)
    expect(r.score).toBe(1)
  })

  it('sin clave el porcentaje es null', () => {
    const r = gradeAttempt(base, { ...attempt({}), paperId: base.papers[0].id, partIds: base.papers[0].parts.map((p) => p.id) }, strict)
    expect(r.percent).toBeNull()
    expect(r.maxScore).toBe(0)
  })

  it('Writing y Speaking puntúan con la autoevaluación completa', () => {
    const writing = exam.papers[1]
    const q1 = writing.parts[0].questions[0].id
    const q2 = writing.parts[1].questions[0].id
    const r = gradeAttempt(exam, {
      paperId: writing.id,
      partIds: writing.parts.map((p) => p.id),
      answers: { [q1]: { value: 'text' } },
      selfAssessments: {
        [q1]: { scores: { content: 5, communicativeAchievement: 4, organisation: 3, language: 4 } },
        [q2]: { scores: { content: 5 } } // incompleta: no cuenta
      }
    }, strict)
    expect(r.parts[0]).toMatchObject({ selfScore: 16, selfMax: 20, graded: true })
    expect(r.parts[1].graded).toBe(false)
    expect(r.percent).toBe(80)
  })

  it('paper inexistente', () => {
    expect(gradeAttempt(exam, { ...attempt({}), paperId: 'paper_zzzzzzzz' }, strict).parts).toEqual([])
  })
})

describe('utilidades', () => {
  it('selfAssessmentAverage', () => {
    expect(selfAssessmentAverage({ a: 4, b: 2 }, ['a', 'b'])).toBe(3)
    expect(selfAssessmentAverage({ a: 4, b: 7 }, ['a', 'b'])).toBeUndefined()
    expect(selfAssessmentAverage(undefined, ['a'])).toBeUndefined()
  })
  it('countWords', () => {
    expect(countWords('')).toBe(0)
    expect(countWords("  Hello,  world!  It's 2024 — great. ")).toBe(5)
    expect(countWords('one\ntwo\tthree - four')).toBe(4)
  })
})
