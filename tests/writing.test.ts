import { describe, expect, it } from 'vitest'
import { analyzeWriting, detectWritingType, WRITING_GUIDES, WRITING_TYPES } from '../src/shared/writing'

const para = (n: number, word = 'idea') => Array.from({ length: n }, (_, i) => (i % 9 === 8 ? `${word}.` : 'student')).join(' ')

describe('writing', () => {
  it('deduce el tipo de texto de la consigna', () => {
    expect(detectWritingType('Write your essay.', 1)).toBe('essay')
    expect(detectWritingType('Write your article for the school magazine.', 2)).toBe('article')
    expect(detectWritingType('Write your review.', 3)).toBe('review')
    expect(detectWritingType('Write your email to Sam.', 2)).toBe('email')
    expect(detectWritingType('Write a letter of application.', 2)).toBe('email')
    expect(detectWritingType('The principal has asked you to write a report.', 4)).toBe('report')
  })

  it('cada tipo tiene guía completa', () => {
    for (const t of WRITING_TYPES) {
      const g = WRITING_GUIDES[t]
      expect(g.structure.length).toBeGreaterThanOrEqual(3)
      expect(g.phrases.length).toBeGreaterThanOrEqual(3)
      expect(g.checklist.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('avisa de extensión, párrafos, conectores, contracciones y conclusión en un essay', () => {
    const text = `${para(90)} I don't think so. It's clear.`
    const a = analyzeWriting(text, 'essay', 140, 190)
    const all = a.checks.map((c) => c.text).join(' | ')
    expect(all).toMatch(/Te faltan/)
    expect(all).toMatch(/párrafos/)
    expect(all).toMatch(/conectores/)
    expect(all).toMatch(/contracciones \(2\)/)
    expect(all).toMatch(/conclusión/)
    expect(a.repeated[0]).toMatchObject({ word: 'student' })
  })

  it('un buen texto recibe confirmaciones', () => {
    const body = (s: string) => `${s} ${para(40)}`
    const text = [body('Nowadays, many people believe that cities are noisy.'), body('However, there are parks. For example, the river.'), body('In addition, transport is good.'), body('In conclusion, I agree.')].join('\n\n')
    const a = analyzeWriting(text, 'essay', 140, 190)
    expect(a.paragraphs).toBe(4)
    expect(a.checks.filter((c) => c.level === 'ok').length).toBeGreaterThanOrEqual(3)
    expect(a.connectors).toEqual(expect.arrayContaining(['however', 'for example', 'in addition', 'in conclusion']))
  })

  it('email: saludo y despedida; texto vacío sin avisos', () => {
    const a = analyzeWriting(para(100), 'email')
    expect(a.checks.map((c) => c.text).join(' ')).toMatch(/saludo.*despedida|despedida/)
    expect(analyzeWriting('', 'essay').checks).toEqual([])
  })
})
