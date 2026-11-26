import { describe, expect, it } from 'vitest'
import { AiImportError, buildErrorsPrompt, DEFAULT_PROMPT_OPTIONS, parseErrorSheets, parseExplanations, parseLesson } from '../src/shared/learning/aiErrors'
import { recordFailure, emptyNotebook } from '../src/shared/learning/notebook'
import { buildSheetPrompt } from '../src/shared/practice'

const nb = recordFailure(emptyNotebook(), { id: 's:x:0.1', source: 'sheet', ref: { kind: 'sheet', sheetId: 'x', key: '0.1' }, question: 'She is interested ___ art.', given: 'on', expected: ['in'], explanation: 'interested in', skill: 'useOfEnglish', category: 'grammar.prepositions', ownReview: false }, 'o', '2026-11-26T10:00:00Z', '2026-11-26').doc
const errors = [{ ...Object.values(nb.records)[0], notes: 'secreto' }]

describe('prompts a partir de errores', () => {
  it('incluye solo los datos elegidos y nunca ids internos', () => {
    const p = buildErrorsPrompt(errors, { ...DEFAULT_PROMPT_OPTIONS, include: { given: false, context: true, explanation: true, notes: false, category: true } })
    expect(p).toContain('E1.')
    expect(p).toContain('She is interested ___ art.')
    expect(p).not.toContain('Respuesta del estudiante')
    expect(p).not.toContain('secreto')
    expect(p).not.toContain('s:x:0.1')
    const withNotes = buildErrorsPrompt(errors, { ...DEFAULT_PROMPT_OPTIONS, include: { ...DEFAULT_PROMPT_OPTIONS.include, notes: true } })
    expect(withNotes).toContain('secreto')
  })
  it('cada modo pide su formato', () => {
    expect(buildErrorsPrompt(errors, { ...DEFAULT_PROMPT_OPTIONS, mode: 'explanations' })).toContain('b2ft-explicaciones')
    expect(buildErrorsPrompt(errors, { ...DEFAULT_PROMPT_OPTIONS, mode: 'lesson' })).toContain('b2ft-leccion')
    expect(buildErrorsPrompt(errors, { ...DEFAULT_PROMPT_OPTIONS, mode: 'variations' })).toContain('b2ft-hoja')
  })
})

describe('importación estricta', () => {
  it('explicaciones: valida ids, longitud y competencias', () => {
    const ok = parseExplanations('```json\n{"formato":"b2ft-explicaciones","items":[{"id":"E1","explanation":"Interested va con in: interested in art.","category":"grammar.prepositions"}]}\n```', 1)
    expect(ok).toEqual([{ index: 0, explanation: 'Interested va con in: interested in art.', category: 'grammar.prepositions' }])
    expect(() => parseExplanations('{"items":[{"id":"E2","explanation":"una explicación larga"}]}', 1)).toThrow(AiImportError)
    expect(() => parseExplanations('{"items":[{"id":"E1","explanation":"corta"}]}', 1)).toThrow(AiImportError)
    expect(() => parseExplanations('{"items":[{"id":"E1","explanation":"una explicación válida","category":"speaking.pronunciation"}]}', 1)).toThrow(AiImportError)
    expect(() => parseExplanations('{"items":[{"id":"E1","explanation":"una explicación válida","category":"hack"}]}', 1)).toThrow(AiImportError)
    expect(() => parseExplanations('nada', 1)).toThrow(AiImportError)
  })
  it('lección: título y secciones obligatorios', () => {
    const l = parseLesson('{"formato":"b2ft-leccion","title":"Prepositions after adjectives","sections":[{"heading":"Interested in","text":"Se dice interested in.","examples":["I am interested in art."]}]}')
    expect(l.sections[0].examples).toHaveLength(1)
    expect(() => parseLesson('{"title":"","sections":[]}')).toThrow(AiImportError)
    expect(() => parseLesson('{"formato":"b2ft-hoja","title":"x","sections":[{"heading":"a","text":"b"}]}')).toThrow(AiImportError)
  })
  it('hojas: mismo validador estricto que el resto (rechaza huecos que no cuadran)', () => {
    expect(() => parseErrorSheets('{"title":"x","tasks":[{"type":"openCloze","text":"no gaps","items":[{"answers":["in"]}]}]}')).toThrow()
    expect(buildSheetPrompt({ skill: 'grammar', topic: '', count: 1 })).toContain('b2ft-hoja')
  })
})
