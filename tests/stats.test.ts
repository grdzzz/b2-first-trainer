import { describe, expect, it } from 'vitest'
import { pendingMistakes, progressSummary, formatDuration } from '@shared/stats'
import { gradeAttempt } from '@shared/grading'
import { applyKey, parseKeyJson } from '@shared/keys'
import { createExam } from '@shared/template'
import { buildWritingCorrectionPrompt, buildSpeakingCorrectionPrompt } from '@shared/aiPrompt'
import type { Attempt, AttemptMode } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

const exam = applyKey(createExam('E', ['reading']), parseKeyJson('{"papers":{"reading":{"1":"A","2":"B","3":"C","9":"which"}}}')).exam
const paper = exam.papers[0]
const qid = (n: number) => paper.parts.flatMap((p) => p.questions).find((q) => q.number === n)!.id
let t = 0
function make(answers: Record<number, string>, mode: AttemptMode = 'practice', questionIds?: string[]): Attempt {
  t++
  const base = {
    id: `attempt_${String(t).padStart(8, '0')}`, schemaVersion: 1, examId: exam.id, examName: exam.name, paperId: paper.id, paperType: 'reading' as const,
    paperTitle: paper.title, mode, partIds: paper.parts.map((p) => p.id), questionIds, status: 'finished' as const,
    startedAt: `2026-01-0${t}T10:00:00Z`, finishedAt: `2026-01-0${t}T11:00:00Z`, durationSec: 600,
    answers: Object.fromEntries(Object.entries(answers).map(([n, v]) => [qid(Number(n)), { value: v }])), selfAssessments: {}
  }
  return { ...base, result: gradeAttempt(exam, base, DEFAULT_SETTINGS.grading) }
}

describe('pendingMistakes', () => {
  it('devuelve las falladas en el último intento y las quita al acertarlas', () => {
    const a1 = make({ 1: 'A', 2: 'C', 3: 'D', 9: 'what' })
    expect(pendingMistakes(exam, paper.id, [a1])).toEqual([qid(2), qid(3), qid(9)])
    const review = make({ 2: 'B', 3: 'A' }, 'review', [qid(2), qid(3), qid(9)])
    expect(pendingMistakes(exam, paper.id, [review, a1])).toEqual([qid(3), qid(9)])
  })
  it('ignora intentos en curso y otros papers', () => {
    const a = { ...make({ 1: 'B' }), status: 'in-progress' as const }
    expect(pendingMistakes(exam, paper.id, [a])).toEqual([])
    expect(pendingMistakes(exam, 'paper_other0', [make({ 1: 'B' })])).toEqual([])
  })
})

describe('progressSummary', () => {
  it('calcula medias, series y tipos con más fallos', () => {
    const s = progressSummary([make({ 1: 'A', 2: 'B', 3: 'C', 9: 'which' }), make({ 1: 'A', 2: 'B', 3: 'A', 9: 'x' }), make({ 1: 'B' }, 'review', [qid(1)])])
    expect(s.finishedCount).toBe(3)
    expect(s.examsPracticed).toBe(1)
    expect(s.totalMinutes).toBe(30)
    expect(s.averages.find((a) => a.type === 'reading')).toEqual({ type: 'reading', attempts: 3, average: 75 })
    expect(s.series.reading.map((p) => p.percent)).toEqual([100, 50])
    expect(s.weakCategories[0]).toMatchObject({ category: 'Open cloze', wrong: 1, total: 2 })
    expect(s.averages.find((a) => a.type === 'writing')!.average).toBeNull()
  })
  it('formatDuration', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3725)).toBe('1:02:05')
    expect(formatDuration(-3)).toBe('0:00')
  })
})

describe('prompts para IA', () => {
  it('Writing incluye consigna, texto, nivel, palabras y criterios', () => {
    const p = buildWritingCorrectionPrompt({ examName: 'Mock', taskTitle: 'Essay', taskPrompt: 'Some people say…', studentText: 'I think that is true.', minWords: 140, maxWords: 190 })
    for (const s of ['B2', 'Some people say…', 'I think that is true.', 'Content', 'Communicative Achievement', 'Organisation', 'Language', '140–190', 'word count: 5']) expect(p).toContain(s)
  })
  it('Speaking incluye criterios y avisa si no hay transcripción', () => {
    const p = buildSpeakingCorrectionPrompt({ examName: 'Mock', partTitle: 'Long turn', taskPrompt: '', transcript: '' })
    for (const s of ['Grammar and Vocabulary', 'Discourse Management', 'Pronunciation', 'Interactive Communication', 'No hay transcripción']) expect(p).toContain(s)
  })
})
