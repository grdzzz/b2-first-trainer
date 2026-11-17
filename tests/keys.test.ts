import { describe, expect, it } from 'vitest'
import { applyKey, exportKeyJson, keyToText, KeyParseError, parseKey, parseKeyJson, parseKeyText, splitAlternatives } from '@shared/keys'
import { createExam } from '@shared/template'

describe('parseKeyJson', () => {
  it('lee el formato completo con varios papers y alternativas', () => {
    const k = parseKeyJson(JSON.stringify({ format: 'b2-first-key', version: 1, papers: { reading: { '1': 'B', '9': ['at', 'in'] }, listening: { '1': 'C' } } }))
    expect(k.papers.reading).toEqual({ 1: ['B'], 9: ['at', 'in'] })
    expect(k.papers.listening).toEqual({ 1: ['C'] })
    expect(k.warnings).toEqual([])
  })
  it('acepta el formato de una parte y el mínimo', () => {
    expect(parseKeyJson('{"answers":{"1":"A","2":"b"}}').loose).toEqual({ 1: ['A'], 2: ['b'] })
    expect(parseKeyJson('{"3":"which"}').loose).toEqual({ 3: ['which'] })
  })
  it('tolera BOM, números como valor y avisa de claves no numéricas', () => {
    const k = parseKeyJson('﻿{"answers":{"1":4,"x":"A"}}')
    expect(k.loose).toEqual({ 1: ['4'] })
    expect(k.warnings.join()).toMatch(/"x"/)
  })
  it('lanza errores claros', () => {
    expect(() => parseKeyJson('{nope')).toThrow(KeyParseError)
    expect(() => parseKeyJson('[]')).toThrow(/objeto/)
    expect(() => parseKeyJson('{}')).toThrow(/ninguna respuesta/)
    expect(() => parseKeyJson('{"papers": 3}')).toThrow(KeyParseError)
  })
  it('avisa de papers desconocidos y respuestas vacías', () => {
    const k = parseKeyJson('{"papers":{"maths":{"1":"A"},"reading":{"1":"","2":"C"}}}')
    expect(k.papers.reading).toEqual({ 2: ['C'] })
    expect(k.warnings.length).toBe(2)
  })
})

describe('parseKeyText', () => {
  it('lee varias notaciones de línea, secciones y comentarios', () => {
    const k = parseKeyText(`// clave\n[Reading]\n1 B\n2. c\n3) at / in\n4: was not | wasn't\n\nListening:\n1-A\n`)
    expect(k.papers.reading).toEqual({ 1: ['B'], 2: ['c'], 3: ['at', 'in'], 4: ['was not', "wasn't"] })
    expect(k.papers.listening).toEqual({ 1: ['A'] })
  })
  it('sin secciones va a "loose" y avisa de líneas raras o repetidas', () => {
    const k = parseKeyText('1 A\nhola\n1 B')
    expect(k.loose).toEqual({ 1: ['B'] })
    expect(k.warnings).toHaveLength(2)
  })
  it('falla si no hay respuestas', () => {
    expect(() => parseKeyText('\n\n// nada')).toThrow(KeyParseError)
  })
  it('parseKey detecta el formato', () => {
    expect(parseKey(' {"1":"A"} ').loose).toEqual({ 1: ['A'] })
    expect(parseKey('1 A').loose).toEqual({ 1: ['A'] })
  })
  it('splitAlternatives', () => {
    expect(splitAlternatives(' a/ b |c ')).toEqual(['a', 'b', 'c'])
  })
})

describe('applyKey', () => {
  const exam = createExam('Test', ['reading', 'writing', 'listening'])
  const reading = exam.papers.find((p) => p.type === 'reading')!
  const listening = exam.papers.find((p) => p.type === 'listening')!

  it('aplica claves por paper y valida opciones', () => {
    const key = parseKeyJson(JSON.stringify({ papers: { reading: { '1': 'b', '2': 'Z', '9': ['at', 'in'], '99': 'x' }, listening: { '1': 'C' } } }))
    const { exam: out, report } = applyKey(exam, key)
    const r = out.papers.find((p) => p.type === 'reading')!
    expect(r.parts[0].questions[0].answers).toEqual(['B'])
    expect(r.parts[0].questions[1].answers).toBeUndefined()
    expect(r.parts[1].questions[0].answers).toEqual(['at', 'in'])
    expect(out.papers.find((p) => p.type === 'listening')!.parts[0].questions[0].answers).toEqual(['C'])
    expect(report.applied).toBe(3)
    expect(report.invalid[0]).toMatch(/"Z"/)
    expect(report.unmatched).toEqual(['Reading & Use of English 99'])
    // no muta el original
    expect(reading.parts[0].questions[0].answers).toBeUndefined()
  })

  it('limita la clave suelta a una parte', () => {
    const key = parseKeyText('1 A\n9 which')
    const { exam: out, report } = applyKey(exam, key, { paperId: reading.id, partId: reading.parts[1].id })
    const r = out.papers.find((p) => p.id === reading.id)!
    expect(r.parts[0].questions[0].answers).toBeUndefined()
    expect(r.parts[1].questions[0].answers).toEqual(['which'])
    expect(report.applied).toBe(1)
    expect(report.unmatched[0]).toMatch(/fuera de esta parte/)
  })

  it('exige destino si la clave no indica paper y hay varios', () => {
    expect(() => applyKey(exam, parseKeyText('1 A'))).toThrow(KeyParseError)
  })

  it('replace borra las respuestas no incluidas del ámbito', () => {
    const first = applyKey(exam, parseKeyText('1 A\n2 B'), { paperId: listening.id }).exam
    const second = applyKey(first, parseKeyText('1 C'), { paperId: listening.id, replace: true }).exam
    const qs = second.papers.find((p) => p.id === listening.id)!.parts[0].questions
    expect(qs[0].answers).toEqual(['C'])
    expect(qs[1].answers).toBeUndefined()
  })

  it('exporta y reimporta la clave sin pérdidas', () => {
    const withKey = applyKey(exam, parseKeyJson('{"papers":{"reading":{"1":"A","25":["was not allowed to","wasn\'t allowed to"]}}}')).exam
    const json = exportKeyJson(withKey)
    const again = applyKey(exam, parseKeyJson(json)).exam
    expect(again.papers[0].parts[3].questions[0].answers).toEqual(['was not allowed to', "wasn't allowed to"])
    expect(keyToText(again.papers[0])).toBe("1 A\n25 was not allowed to / wasn't allowed to")
  })
})
