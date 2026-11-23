import { describe, expect, it } from 'vitest'
import { BUILT_IN_SHEETS } from '../src/shared/practiceSheets'
import { itemKey, type PracticeProgress } from '../src/shared/practice'
import { addDays, answerReview, allReviewItems, dueCountFromProgress, gapContext, reviewAfterCheck, reviewOf, reviewSession, reviewSummary } from '../src/shared/review'

const sheet = BUILT_IN_SHEETS[0] // vocabulario: 8 de opción múltiple + 4 transformaciones
const today = '2026-11-23'
const allRight = (): Record<string, string> => {
  const a: Record<string, string> = {}
  sheet.tasks.forEach((task, ti) => task.items.forEach((it, ii) => (a[itemKey(ti, ii)] = 'answers' in it ? it.answers[0] : String((it as { answer: number }).answer))))
  return a
}

describe('repaso espaciado', () => {
  it('suma días respetando meses y años', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('las falladas entran mañana; las acertadas no', () => {
    const answers = allRight()
    answers['0.0'] = '3'
    delete answers['1.1']
    const { review, added } = reviewAfterCheck(sheet, answers, undefined, today)
    expect(added).toBe(2)
    expect(Object.keys(review).sort()).toEqual(['0.0', '1.1'])
    expect(review['0.0']).toMatchObject({ box: 0, due: '2026-11-24', lapses: 1 })
  })

  it('cajas: 1, 3, 7 y 14 días; al acertar la última, dominada; al fallar, vuelve a empezar', () => {
    let s = reviewAfterCheck(sheet, { '0.0': '3' }, undefined, today).review['0.0']
    const dues: string[] = []
    for (let i = 0; i < 3; i++) {
      s = answerReview(s, true, today)!
      dues.push(s.due)
    }
    expect(dues).toEqual([addDays(today, 3), addDays(today, 7), addDays(today, 14)])
    expect(answerReview(s, true, today)).toBeNull()
    expect(answerReview(s, false, today)).toMatchObject({ box: 0, due: addDays(today, 1), lapses: 2 })
  })

  it('acertar en la hoja una pregunta que tocaba repasar la hace avanzar', () => {
    const prev = { '0.0': { box: 1, due: today, lapses: 1, addedAt: 'x' } }
    const { review } = reviewAfterCheck(sheet, allRight(), prev, today)
    expect(review['0.0'].box).toBe(2)
  })

  it('las hojas comprobadas antes del repaso aportan sus fallos', () => {
    const p: PracticeProgress = { id: sheet.id, answers: { '0.0': '0', '0.1': '0' }, checked: true, times: 1 }
    const r = reviewOf(sheet, p, today)
    expect(r['0.0']).toBeUndefined()
    expect(r['0.1']).toBeDefined()
    expect(Object.keys(r)).toHaveLength(11)
  })

  it('sesión: solo lo de hoy, lo más atrasado primero, y resumen', () => {
    const p: PracticeProgress = {
      id: sheet.id,
      answers: {},
      checked: true,
      times: 1,
      review: {
        '0.2': { box: 0, due: '2026-11-20', lapses: 1, addedAt: 'x' },
        '0.1': { box: 1, due: today, lapses: 1, addedAt: 'x' },
        '1.0': { box: 2, due: '2026-12-01', lapses: 1, addedAt: 'x' }
      },
      mastered: 4
    }
    expect(reviewSession([sheet], [p], today).map((i) => i.key)).toEqual(['0.2', '0.1'])
    expect(reviewSummary([sheet], [p], today)).toEqual({ due: 2, total: 3, nextDue: null, mastered: 4 })
    expect(reviewSummary([sheet], [p], '2026-11-19').nextDue).toBe('2026-11-20')
    expect(dueCountFromProgress([p], today)).toBe(2)
    expect(allReviewItems([sheet], [p], today)).toHaveLength(3)
  })

  it('contexto: la frase del hueco con los demás huecos rellenos', () => {
    const task = sheet.tasks[0]
    if (task.type !== 'mcCloze') throw new Error('tipo')
    const c = gapContext(task, 2)
    expect(c.before).toBe('On the very first day, the car')
    expect(c.after).toBe('down in the middle of nowhere, and we had to wait three hours for a mechanic.')
    const first = gapContext(task, 0)
    expect(first.before).toBe('Last summer my sister and I decided to')
    expect(first.after).toContain('off on a road trip')
  })

  it('todas las preguntas de huecos de las 50 hojas tienen contexto', () => {
    for (const s of BUILT_IN_SHEETS)
      s.tasks.forEach((t) => {
        if (t.type !== 'mcCloze' && t.type !== 'openCloze' && t.type !== 'wordFormation') return
        t.items.forEach((_, ii) => {
          const c = gapContext(t, ii)
          expect((c.before + c.after).length, `${s.title} hueco ${ii + 1}`).toBeGreaterThan(8)
          expect(c.before + c.after).not.toMatch(/\{\d+\}/)
        })
      })
  })
})

import { reminderDue, reminderMessage } from '../src/shared/reminder'
import { mergeSettings } from '../src/main/storage'

describe('recordatorio', () => {
  it('avisa a partir de la hora elegida', () => {
    expect(reminderDue('19:30', new Date(2026, 10, 23, 19, 29))).toBe(false)
    expect(reminderDue('19:30', new Date(2026, 10, 23, 19, 30))).toBe(true)
    expect(reminderDue('19:30', new Date(2026, 10, 23, 22, 0))).toBe(true)
  })

  it('Bubi prioriza el repaso, después la racha', () => {
    const now = new Date(2026, 10, 23, 20)
    const p = (extra: Partial<PracticeProgress>): PracticeProgress => ({ id: 'fce_hoja01', answers: {}, checked: true, times: 1, ...extra })
    expect(reminderMessage([p({ review: { '0.0': { box: 0, due: '2026-11-23', lapses: 1, addedAt: 'x' } } })], now)).toMatchObject({ route: 'review' })
    expect(reminderMessage([p({ days: ['2026-11-22', '2026-11-21'] })], now).body).toMatch(/2 días seguidos/)
    expect(reminderMessage([], now)).toMatchObject({ route: 'practice' })
  })

  it('ajustes del recordatorio: valores por defecto y saneado', () => {
    expect(mergeSettings({}).reminder).toEqual({ enabled: false, time: '19:00', background: true, openAtLogin: false })
    expect(mergeSettings({ reminder: { enabled: true, time: '25:99' } as never }).reminder).toMatchObject({ enabled: true, time: '19:00' })
    expect(mergeSettings({ reminder: { time: '07:05' } as never }).reminder.time).toBe('07:05')
    expect(mergeSettings({}).mascot).toBe(true)
  })
})
