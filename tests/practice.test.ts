import { describe, expect, it } from 'vitest'
import { BUILT_IN_SHEETS } from '../src/shared/practiceSheets'
import {
  buildSheetPrompt,
  checkItem,
  containsKeyword,
  exportSheet,
  itemKey,
  nextSheet,
  normalizePractice,
  normalizeSheet,
  parseSheets,
  practiceStats,
  practiceStreak,
  sameAnswer,
  scoreSheet,
  SheetFormatError,
  transformationWords,
  type PracticeProgress,
  type PracticeSheet
} from '../src/shared/practice'
import { isSafeId } from '../src/shared/ids'

describe('hojas incluidas', () => {
  it('son 50, con ids seguros y únicos, 10 de cada destreza', () => {
    expect(BUILT_IN_SHEETS).toHaveLength(50)
    expect(new Set(BUILT_IN_SHEETS.map((s) => s.id)).size).toBe(50)
    for (const s of BUILT_IN_SHEETS) expect(isSafeId(s.id)).toBe(true)
    const bySkill: Record<string, number> = {}
    for (const s of BUILT_IN_SHEETS) bySkill[s.skill] = (bySkill[s.skill] ?? 0) + 1
    expect(Object.values(bySkill)).toEqual([10, 10, 10, 10, 10])
    expect(BUILT_IN_SHEETS.map((s) => s.number)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1))
  })

  it('tienen títulos distintos', () => {
    expect(new Set(BUILT_IN_SHEETS.map((s) => s.title)).size).toBe(50)
  })

  // Cada hoja pasa la misma validación que una hoja pegada desde un chat de IA.
  for (const sheet of BUILT_IN_SHEETS) {
    it(`${sheet.number}. ${sheet.title} es válida`, () => {
      const back = normalizeSheet(JSON.parse(exportSheet(sheet)))
      expect(back.tasks).toHaveLength(sheet.tasks.length)
      const total = sheet.tasks.reduce((n, t) => n + t.items.length, 0)
      expect(total).toBeGreaterThanOrEqual(5)
      expect(total).toBeLessThanOrEqual(16)
      for (const task of sheet.tasks) {
        for (const item of task.items as Array<{ explain?: string }>) expect(item.explain, `${sheet.title}: falta explicación`).toBeTruthy()
        if (task.type === 'mcCloze' || task.type === 'readingMc') {
          for (const it of task.items) {
            expect(it.options).toHaveLength(4)
            expect(new Set(it.options).size).toBe(4)
          }
        }
        if (task.type === 'wordFormation') {
          for (const it of task.items) for (const a of it.answers) expect(a.toUpperCase()).not.toBe(it.base)
        }
        if (task.type === 'transformation') {
          for (const it of task.items) {
            for (const a of it.answers) {
              expect(containsKeyword(a, it.keyword), `${sheet.title}: «${a}» sin ${it.keyword}`).toBe(true)
              expect(transformationWords(a), `${sheet.title}: «${a}»`).toBeGreaterThanOrEqual(2)
              expect(transformationWords(a), `${sheet.title}: «${a}»`).toBeLessThanOrEqual(5)
            }
            expect(containsKeyword(it.first, it.keyword), `${sheet.title}: la clave ${it.keyword} ya está en la frase`).toBe(false)
          }
        }
        if (task.type === 'matching') {
          const used = new Set(task.items.map((i) => i.answer))
          for (const s of task.sections) expect(used.has(s.label), `${sheet.title}: texto ${s.label} sin pregunta`).toBe(true)
        }
        if (task.type === 'readingMc') {
          const answers = task.items.map((i) => i.answer)
          expect(new Set(answers).size, `${sheet.title}: respuestas poco variadas`).toBeGreaterThan(1)
        }
      }
    })
  }

  it('las respuestas de cada hoja dan el 100 %', () => {
    for (const sheet of BUILT_IN_SHEETS) {
      const answers: Record<string, string> = {}
      sheet.tasks.forEach((task, ti) =>
        task.items.forEach((it, ii) => {
          answers[itemKey(ti, ii)] = 'answers' in it ? it.answers[0] : typeof it.answer === 'number' ? String(it.answer) : it.answer
        })
      )
      expect(scoreSheet(sheet, answers).percent).toBe(100)
    }
  })
})

describe('corrección', () => {
  it('normaliza mayúsculas, espacios, apóstrofos y contracciones', () => {
    expect(normalizePractice('  Wish I’d   Brought. ')).toBe("wish i'd brought")
    expect(normalizePractice("hadn't been")).toBe(normalizePractice('had not been'))
    expect(normalizePractice("can't have been")).toBe(normalizePractice('cannot have been'))
    expect(normalizePractice("won't")).toBe('will not')
    expect(transformationWords("didn't go")).toBe(3)
    expect(transformationWords("wish I'd brought")).toBe(4)
    expect(transformationWords("it's worth buying")).toBe(4)
    expect(transformationWords("Tom's car")).toBe(2)
  })

  it("acepta «'d» y «'s» como sus formas completas (y al revés)", () => {
    expect(sameAnswer("I'd rather stay", 'I would rather stay')).toBe(true)
    expect(sameAnswer('I had better go', "I'd better go")).toBe(true)
    expect(sameAnswer("it's been raining", 'it has been raining')).toBe(true)
    expect(sameAnswer('he is bound to', "he's bound to")).toBe(true)
    expect(sameAnswer("Tom's car", 'Tom is car')).toBe(false)
    expect(sameAnswer('I would go', 'I had go')).toBe(false)
  })

  it('corrige cada tipo de ejercicio', () => {
    const [sheet] = BUILT_IN_SHEETS
    const mc = sheet.tasks[0]
    expect(checkItem(mc, 0, '0')).toBe(true)
    expect(checkItem(mc, 0, '1')).toBe(false)
    expect(checkItem(mc, 0, '')).toBeNull()
    const tr = sheet.tasks[1]
    expect(checkItem(tr, 0, 'wish I had brought')).toBe(true)
    expect(checkItem(tr, 0, "Wish I'd brought.")).toBe(true)
    expect(checkItem(tr, 0, 'wish I brought')).toBe(false)
  })

  it('calcula la nota de una hoja', () => {
    const sheet = BUILT_IN_SHEETS[0]
    const score = scoreSheet(sheet, { '0.0': '0', '0.1': '0', '1.2': 'no point going' })
    expect(score).toMatchObject({ correct: 2, answered: 3, total: 12 })
  })
})

describe('progreso', () => {
  const sheets = BUILT_IN_SHEETS.slice(0, 3)
  const p = (id: string, best: number, total: number, extra: Partial<PracticeProgress> = {}): PracticeProgress => ({ id, answers: {}, checked: true, best, lastScore: best, total, times: 1, ...extra })

  it('estadísticas por destreza y media', () => {
    const stats = practiceStats(sheets, [p(sheets[0].id, 6, 12), p(sheets[1].id, 12, 12)])
    expect(stats.done).toBe(2)
    expect(stats.average).toBe(75)
    expect(stats.bySkill.vocabulary).toMatchObject({ done: 1, total: 1, average: 50 })
  })

  it('racha de días seguidos', () => {
    const now = new Date(2026, 10, 21, 18)
    expect(practiceStreak([p('a', 1, 1, { days: ['2026-11-21', '2026-11-20', '2026-11-19', '2026-11-17'] })], now)).toBe(3)
    expect(practiceStreak([p('a', 1, 1, { days: ['2026-11-20', '2026-11-19'] })], now)).toBe(2)
    expect(practiceStreak([p('a', 1, 1, { days: ['2026-11-18'] })], now)).toBe(0)
  })

  it('recomienda la hoja empezada, luego la primera sin hacer y al final la peor', () => {
    expect(nextSheet(sheets, [])?.id).toBe(sheets[0].id)
    expect(nextSheet(sheets, [p(sheets[0].id, 5, 12)])?.id).toBe(sheets[1].id)
    expect(nextSheet(sheets, [p(sheets[0].id, 5, 12), { id: sheets[2].id, answers: { '0.0': 'x' }, checked: false, times: 0 }])?.id).toBe(sheets[2].id)
    expect(nextSheet(sheets, [p(sheets[0].id, 10, 12), p(sheets[1].id, 4, 12), p(sheets[2].id, 8, 12)])?.id).toBe(sheets[1].id)
  })
})

describe('hojas nuevas (IA o archivo)', () => {
  const sample = {
    formato: 'b2ft-hoja',
    version: 1,
    hojas: [
      {
        title: 'At the airport',
        topic: 'Viajes',
        skill: 'vocabulary',
        minutes: 8,
        tasks: [
          { type: 'mcCloze', text: 'We {1} off early and {2} the plane.', items: [{ options: ['set', 'went', 'put', 'got'], answer: 'A', explain: 'set off' }, { options: ['caught', 'took', 'got', 'made'], answer: 'B' }] },
          { type: 'transformation', items: [{ first: 'I regret not coming.', keyword: 'WISH', start: 'I', end: '.', answers: ['wish I had come', "wish I'd come"] }] }
        ]
      }
    ]
  }

  it('lee la respuesta de un chat dentro de un bloque de código', () => {
    const text = 'Aquí tienes tu hoja:\n```json\n' + JSON.stringify(sample) + '\n```\n¡Suerte!'
    const [sheet] = parseSheets(text)
    expect(sheet.title).toBe('At the airport')
    expect(sheet.skill).toBe('vocabulary')
    expect(sheet.minutes).toBe(8)
    const t = sheet.tasks[0]
    expect(t.type === 'mcCloze' && t.items[1].answer).toBe(1)
  })

  it('acepta una hoja suelta y deduce la destreza', () => {
    const one = { ...sample.hojas[0], skill: undefined }
    const [sheet] = parseSheets(JSON.stringify(one))
    expect(sheet.skill).toBe('vocabulary')
  })

  it('explica los errores en español', () => {
    const bad = structuredClone(sample)
    bad.hojas[0].tasks[0].text = 'We {1} off early.'
    expect(() => parseSheets(JSON.stringify(bad))).toThrow(SheetFormatError)
    expect(() => parseSheets(JSON.stringify(bad))).toThrow(/huecos/)
    const bad2 = structuredClone(sample)
    ;(bad2.hojas[0].tasks[1].items[0] as { answers: string[] }).answers = ['I wish I had come here yesterday']
    expect(() => parseSheets(JSON.stringify(bad2))).toThrow(/2 a 5 palabras/)
    expect(() => parseSheets('hola')).toThrow(/No se ha encontrado/)
  })

  it('las instrucciones para la IA incluyen el formato y el tema', () => {
    const prompt = buildSheetPrompt({ skill: 'grammar', topic: 'Deportes', count: 2, focus: 'preposiciones' })
    expect(prompt).toContain('b2ft-hoja')
    expect(prompt).toContain('Deportes')
    expect(prompt).toContain('preposiciones')
    expect(prompt).toContain('2 hojas')
  })

  it('exportar e importar conserva la hoja', () => {
    const sheet: PracticeSheet = BUILT_IN_SHEETS[3]
    const [back] = parseSheets(exportSheet(sheet))
    expect(back.tasks).toEqual(sheet.tasks)
  })
})
