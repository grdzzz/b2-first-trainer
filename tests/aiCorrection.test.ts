import { describe, expect, it } from 'vitest'
import { AiParseError, applyAiCorrection, buildBulkCorrectionPrompt, parseAiCorrection, tasksForAttempt } from '@shared/aiCorrection'
import { createAttempt } from '@shared/attempts'
import { gradeAttempt } from '@shared/grading'
import { createExam } from '@shared/template'
import { DEFAULT_SETTINGS } from '@shared/types'

const exam = createExam('Mock', ['writing', 'speaking'])
const writing = exam.papers[0]
const speaking = exam.papers[1]
writing.parts[0].questions[0].prompt = 'Some people say school holidays are too long.'

function writingAttempt() {
  const a = createAttempt(exam, { mode: 'practice', paperId: writing.id })
  a.answers[writing.parts[0].questions[0].id] = { value: 'I think holidays are good for students because they rest.' }
  a.answers[writing.parts[1].questions[0].id] = { value: 'Dear Michelle, thanks for your email.', prompt: '2 Article\n3 Email\n4 Story' }
  return a
}

describe('tareas y texto para copiar', () => {
  it('genera W1/W2 con texto, palabras y consigna', () => {
    const tasks = tasksForAttempt(writingAttempt(), writing)
    expect(tasks.map((t) => [t.id, t.partNumber, t.words])).toEqual([['W1', 1, 10], ['W2', 2, 6]])
    expect(tasks[1].prompt).toContain('3 Email')
  })
  it('el prompt incluye todas las tareas, criterios y el formato JSON con los ids', () => {
    const p = buildBulkCorrectionPrompt({ examName: 'Mock', paperType: 'writing', tasks: tasksForAttempt(writingAttempt(), writing) })
    for (const s of ['TAREA W1', 'TAREA W2', 'holidays are good', 'Dear Michelle', 'communicativeAchievement', '"formato": "b2ft-correccion"', 'W1, W2', 'tarea_elegida', '140–190']) expect(p).toContain(s)
  })
  it('Speaking usa la transcripción y permite pronunciation null', () => {
    const a = createAttempt(exam, { mode: 'practice', paperId: speaking.id })
    a.answers[speaking.parts[0].questions[0].id] = { transcript: 'I live in Madrid.' }
    const tasks = tasksForAttempt(a, speaking)
    expect(tasks[0]).toMatchObject({ id: 'S1', text: 'I live in Madrid.', kind: 'speaking' })
    const p = buildBulkCorrectionPrompt({ examName: 'Mock', paperType: 'speaking', tasks })
    expect(p).toContain('"pronunciation": null')
    expect(p).toContain('grammarVocabulary')
  })
})

const reply = `¡Aquí tienes la corrección!
\`\`\`json
{
  "formato": "b2ft-correccion",
  "version": 1,
  "tareas": [
    { "id": "W1", "puntuaciones": { "content": 4, "communicativeAchievement": "3", "organisation": 3.6, "language": 9 },
      "resumen": "Buen texto.", "errores": [{ "original": "they rest", "correccion": "they can rest", "explicacion": "falta modal" }],
      "consejos": ["Usa más conectores"], "version_mejorada": "I believe holidays..." },
    { "id": "w2", "tarea_elegida": "3", "puntuaciones": { "Content": 2, "Communicative Achievement": 2, "Organisation": 2, "Language": 2 },
      "resumen": "Muy corto.", "errores": ["Dear Michelle"], "consejos": "Escribe más", },
  ],
  "comentario_general": "Nivel B2 cercano."
}
\`\`\`
Espero que te ayude.`

describe('parseAiCorrection', () => {
  it('lee el bloque con texto alrededor, comas finales, nombres y tipos variados', () => {
    const r = parseAiCorrection(reply, ['W1', 'W2'], 'writing')
    expect(r.tasks.W1.scores).toEqual({ content: 4, communicativeAchievement: 3, organisation: 4, language: 5 })
    expect(r.tasks.W1.errors[0]).toEqual({ original: 'they rest', correction: 'they can rest', explanation: 'falta modal' })
    expect(r.tasks.W2).toMatchObject({ chosenTask: '3', tips: ['Escribe más'], scores: { content: 2, communicativeAchievement: 2, organisation: 2, language: 2 } })
    expect(r.tasks.W2.errors[0].original).toBe('Dear Michelle')
    expect(r.general).toBe('Nivel B2 cercano.')
    expect(r.warnings).toEqual([])
  })
  it('asigna por orden si faltan ids y avisa de criterios sin nota', () => {
    const r = parseAiCorrection('{"tasks":[{"scores":{"grammar":3,"discourse":4,"pronunciation":null,"interaction":5}}]}', ['S1'], 'speaking')
    expect(r.tasks.S1.scores).toEqual({ grammarVocabulary: 3, discourseManagement: 4, interactiveCommunication: 5 })
    expect(r.warnings.join()).toMatch(/pronunciation/)
  })
  it('errores claros', () => {
    expect(() => parseAiCorrection('hola', ['W1'], 'writing')).toThrow(AiParseError)
    expect(() => parseAiCorrection('{"tareas": []}', ['W1'], 'writing')).toThrow(/tareas/)
    expect(() => parseAiCorrection('{"tareas": [{"id":"X9"},{"id":"X8"}]}', ['W1'], 'writing')).toThrow(/ninguna/)
    expect(() => parseAiCorrection('{"tareas": [ {"id": "W1", } ', ['W1'], 'writing')).toThrow(AiParseError)
  })
})

describe('applyAiCorrection', () => {
  it('guarda comentarios, vuelca notas y la nota del intento se recalcula', () => {
    const a = writingAttempt()
    const tasks = tasksForAttempt(a, writing)
    const out = applyAiCorrection(a, tasks, parseAiCorrection(reply, ['W1', 'W2'], 'writing'))
    const q1 = tasks[0].questionId
    expect(out.aiFeedback?.[q1]?.summary).toBe('Buen texto.')
    expect(out.selfAssessments[q1].scores).toEqual({ content: 4, communicativeAchievement: 3, organisation: 4, language: 5 })
    expect(out.aiGeneral).toBe('Nivel B2 cercano.')
    const r = gradeAttempt(exam, out, DEFAULT_SETTINGS.grading)
    expect(r.score).toBe(16 + 8)
    expect(r.maxScore).toBe(40)
  })
  it('no borra notas propias de criterios que la IA no puntuó', () => {
    const a = createAttempt(exam, { mode: 'practice', paperId: speaking.id })
    const qid = speaking.parts[0].questions[0].id
    a.selfAssessments[qid] = { scores: { pronunciation: 4 } }
    const tasks = tasksForAttempt(a, speaking)
    const out = applyAiCorrection(a, tasks, parseAiCorrection('{"tareas":[{"id":"S1","puntuaciones":{"grammarVocabulary":3,"discourseManagement":3,"interactiveCommunication":3}}]}', ['S1'], 'speaking'))
    expect(out.selfAssessments[qid].scores).toEqual({ pronunciation: 4, grammarVocabulary: 3, discourseManagement: 3, interactiveCommunication: 3 })
  })
})
