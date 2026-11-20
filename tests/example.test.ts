import { describe, expect, it } from 'vitest'
import { buildExampleExam, EXAMPLE_FILES } from '@shared/example'
import { createAttempt, finishAttempt } from '@shared/attempts'
import { DEFAULT_SETTINGS } from '@shared/types'

const ref = (name: string) => ({ name, storedName: `x-${name}`, size: 1, mime: 'application/pdf' })
const files = Object.fromEntries(EXAMPLE_FILES.map((f) => [f.file, ref(f.file)]))

describe('examen de ejemplo', () => {
  const exam = buildExampleExam(files)
  it('tiene los 4 papers, numeración continua y archivos', () => {
    expect(exam.isExample).toBe(true)
    expect(exam.papers.map((p) => p.type)).toEqual(['reading', 'writing', 'listening', 'speaking'])
    const reading = exam.papers[0]
    expect(reading.parts.flatMap((p) => p.questions.map((q) => q.number))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(reading.files.pdf?.name).toBe('reading.pdf')
    expect(exam.papers[2].files.audio?.name).toBe('listening.mp3')
    expect(exam.papers[1].parts[0].questions[0].prompt).toContain('phones')
  })
  it('se puede hacer y corregir: todo bien = 100 %', () => {
    const reading = exam.papers[0]
    const a = createAttempt(exam, { mode: 'practice', paperId: reading.id })
    const correct: Record<number, string> = { 1: 'A', 2: 'B', 3: 'B', 4: 'C', 5: 'before', 6: 'how', 7: 'without', 8: 'take', 9: "didn't have to bring", 10: 'last time I saw' }
    for (const q of reading.parts.flatMap((p) => p.questions)) a.answers[q.id] = { value: correct[q.number] }
    const done = finishAttempt(a, exam, DEFAULT_SETTINGS.grading, 'submitted')
    expect(done.result).toMatchObject({ score: 12, maxScore: 12, percent: 100 })
  })
})
