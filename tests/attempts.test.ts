import { describe, expect, it } from 'vitest'
import { createAttempt, finishAttempt, regrade, remainingSeconds } from '@shared/attempts'
import { applyKey, parseKeyJson } from '@shared/keys'
import { createExam } from '@shared/template'
import { DEFAULT_SETTINGS } from '@shared/types'

const exam = applyKey(createExam('E', ['reading', 'writing']), parseKeyJson('{"papers":{"reading":{"1":"A"}}}')).exam
const reading = exam.papers[0]

describe('intentos', () => {
  it('modo examen con paper completo aplica el tiempo oficial', () => {
    const a = createAttempt(exam, { mode: 'exam', paperId: reading.id })
    expect(a.timeLimitSec).toBe(75 * 60)
    expect(a.partIds).toHaveLength(7)
    expect(remainingSeconds({ ...a, durationSec: 100 })).toBe(4400)
  })
  it('práctica o una sola parte no tiene temporizador', () => {
    expect(createAttempt(exam, { mode: 'practice', paperId: reading.id }).timeLimitSec).toBeUndefined()
    expect(createAttempt(exam, { mode: 'exam', paperId: reading.id, partIds: [reading.parts[0].id] }).timeLimitSec).toBeUndefined()
  })
  it('repaso limita las partes a las de las preguntas elegidas', () => {
    const q = reading.parts[2].questions[1].id
    const a = createAttempt(exam, { mode: 'review', paperId: reading.id, questionIds: [q] })
    expect(a.partIds).toEqual([reading.parts[2].id])
  })
  it('errores', () => {
    expect(() => createAttempt(exam, { mode: 'exam', paperId: 'paper_nope0000' })).toThrow()
    expect(() => createAttempt(exam, { mode: 'review', paperId: reading.id, questionIds: [] })).toThrow()
  })
  it('finishAttempt corrige, recorta la duración al límite y regrade recalcula', () => {
    const a = createAttempt(exam, { mode: 'exam', paperId: reading.id })
    a.durationSec = 99999
    a.answers[reading.parts[0].questions[0].id] = { value: 'A' }
    const done = finishAttempt(a, exam, DEFAULT_SETTINGS.grading, 'timeout')
    expect(done).toMatchObject({ status: 'finished', endReason: 'timeout', durationSec: 4500 })
    expect(done.result?.score).toBe(1)
    const changedKey = applyKey(exam, parseKeyJson('{"papers":{"reading":{"1":"B"}}}')).exam
    expect(regrade(done, changedKey, DEFAULT_SETTINGS.grading).result?.score).toBe(0)
  })
})
