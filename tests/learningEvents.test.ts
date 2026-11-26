import { describe, expect, it } from 'vitest'
import { processEvents, learnerStats, MAX_EVENTS, type DomainEvent } from '../src/shared/learning/events'
import { reconcile, sheetItemDraft } from '../src/shared/learning/sources'
import { totalXp, XP_REWARDS } from '../src/shared/learning/game'
import { errorIdFor } from '../src/shared/learning/notebook'
import { answerReview } from '../src/shared/review'
import { allRight, checked, ctx, emptyState, examWithKey, finishedReading, SHEETS } from './learningFixtures'

const sheet = SHEETS[0]
const today = '2026-11-26'

function run(state: ReturnType<typeof emptyState>, events: DomainEvent[]) {
  return processEvents(state, events, ctx(today))
}

describe('integración: hoja completada', () => {
  it('registra errores, XP, actividad, competencias y logros (flujo completo)', () => {
    const answers = allRight(sheet)
    answers['0.0'] = String((Number(answers['0.0']) + 1) % 4)
    answers['1.0'] = 'wrong answer'
    const p = checked(sheet, answers, '2026-11-26T10:00:00.000Z')
    const events = reconcile({ sheets: SHEETS, progress: [p], attempts: [], exams: [] }, emptyState().game, false)
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('PRACTICE_COMPLETED')
    const r = run(emptyState(), events)
    const ids = Object.keys(r.state.notebook.records)
    expect(ids.sort()).toEqual([errorIdFor({ kind: 'sheet', sheetId: sheet.id, key: '0.0' }), errorIdFor({ kind: 'sheet', sheetId: sheet.id, key: '1.0' })].sort())
    const rec = r.state.notebook.records[ids[0]]
    expect(rec.expected.length).toBeGreaterThan(0)
    expect(rec.review).toBeUndefined() // el Leitner de las hojas vive en su progreso
    const act = Object.values(r.state.game.activity)[0]
    expect(act).toMatchObject({ kind: 'sheet', ref: sheet.id, correct: p.lastScore, total: p.total, first: true })
    expect(act.parts?.['reading.p1']?.[1]).toBeGreaterThan(0)
    expect(r.state.game.ledger[`sheet:${sheet.id}`].xp).toBe(XP_REWARDS.sheetCompleted)
    expect(r.state.game.achievements['warm-up']).toBeTruthy()
    const types = r.emitted.map((e) => e.type)
    expect(types).toEqual(expect.arrayContaining(['PRACTICE_COMPLETED', 'ANSWER_INCORRECT', 'XP_EARNED', 'ACHIEVEMENT_UNLOCKED']))
  })

  it('es idempotente: reconciliar otra vez no genera nada; procesar dos veces el mismo evento no suma', () => {
    const p = checked(sheet, allRight(sheet), '2026-11-26T10:00:00.000Z')
    const src = { sheets: SHEETS, progress: [p], attempts: [], exams: [] }
    const first = run(emptyState(), reconcile(src, emptyState().game, false))
    expect(reconcile(src, first.state.game, false)).toEqual([])
    const ev = reconcile(src, emptyState().game, false)
    const twice = run(first.state, ev)
    expect(totalXp(twice.state.game)).toBe(totalXp(first.state.game))
    expect(Object.keys(twice.state.game.activity)).toHaveLength(1)
  })

  it('repetir sin mejorar da poca XP (una vez al día); mejorar da récord', () => {
    const a1 = allRight(sheet)
    a1['0.0'] = String((Number(a1['0.0']) + 1) % 4)
    let p = checked(sheet, a1, '2026-11-26T10:00:00.000Z')
    let s = run(emptyState(), reconcile({ sheets: SHEETS, progress: [p], attempts: [], exams: [] }, emptyState().game, false)).state
    const xp1 = totalXp(s.game)
    // Misma nota dos veces más el mismo día.
    for (const at of ['2026-11-26T11:00:00.000Z', '2026-11-26T12:00:00.000Z']) {
      p = checked(sheet, a1, at, p)
      s = run(s, reconcile({ sheets: SHEETS, progress: [p], attempts: [], exams: [] }, s.game, false)).state
    }
    expect(totalXp(s.game) - xp1).toBe(XP_REWARDS.sheetRepeat)
    // Mejora.
    p = checked(sheet, allRight(sheet), '2026-11-26T13:00:00.000Z', p)
    const r = run(s, reconcile({ sheets: SHEETS, progress: [p], attempts: [], exams: [] }, s.game, false))
    expect(r.emitted.some((e) => e.type === 'XP_EARNED' && e.reason === 'record')).toBe(true)
    expect(Object.values(r.state.game.activity).some((a) => a.record)).toBe(true)
  })

  it('una pregunta que sale del repaso al rehacer la hoja queda dominada (sin duplicar repasos)', () => {
    const wrong = allRight(sheet)
    wrong['0.0'] = String((Number(wrong['0.0']) + 1) % 4)
    let p = checked(sheet, wrong, '2026-11-20T10:00:00.000Z')
    let s = run(emptyState(), reconcile({ sheets: SHEETS, progress: [p], attempts: [], exams: [] }, emptyState().game, false)).state
    // Simula que su Leitner llega al final (como en el repaso) y luego se acierta en la hoja.
    let st = p.review!['0.0']
    for (let i = 0; i < 3; i++) st = answerReview(st, true, '2026-11-25')!
    p = { ...p, review: { '0.0': { ...st, due: '2026-11-20' } } }
    p = checked(sheet, allRight(sheet), '2026-11-26T10:00:00.000Z', p)
    expect(p.review?.['0.0']).toBeUndefined()
    const r = run(s, reconcile({ sheets: SHEETS, progress: [p], attempts: [], exams: [] }, s.game, false))
    s = r.state
    const id = errorIdFor({ kind: 'sheet', sheetId: sheet.id, key: '0.0' })
    expect(s.notebook.records[id].mastered).toBe(true)
    expect(r.emitted.some((e) => e.type === 'ERROR_MASTERED')).toBe(true)
    expect(s.game.ledger[`mastered:${id}`].xp).toBe(XP_REWARDS.questionMastered)
  })
})

describe('integración: exámenes', () => {
  it('registra los fallos del examen con estado Leitner propio y XP del paper', () => {
    const exam = examWithKey()
    const a = finishedReading(exam, { 1: 'A', 2: 'C', 3: 'C' }, '2026-11-26T10:00:00.000Z')
    const r = run(emptyState(), reconcile({ sheets: [], progress: [], attempts: [a], exams: [exam] }, emptyState().game, false))
    const recs = Object.values(r.state.notebook.records)
    expect(recs.length).toBeGreaterThanOrEqual(1)
    expect(recs.every((x) => x.source === 'exam' && !!x.review)).toBe(true)
    expect(recs.find((x) => x.given === 'C')?.expected).toEqual(['B'])
    const act = Object.values(r.state.game.activity)[0]
    expect(act).toMatchObject({ kind: 'exam', paperType: 'reading', full: true })
    expect(r.state.game.ledger[`examDay:${a.paperId}:full:2026-11-26`].xp).toBe(XP_REWARDS.examPaper)
    expect(r.state.game.achievements['first-paper']).toBeTruthy()
  })

  it('acertar después en un repaso del examen hace avanzar su Leitner', () => {
    const exam = examWithKey()
    const a1 = finishedReading(exam, { 1: 'B' }, '2026-11-20T10:00:00.000Z')
    let s = run(emptyState(), reconcile({ sheets: [], progress: [], attempts: [a1], exams: [exam] }, emptyState().game, false)).state
    const q1 = exam.papers[0].parts[0].questions[0].id
    const id = errorIdFor({ kind: 'exam', examId: exam.id, paperId: a1.paperId, questionId: q1, attemptId: a1.id })
    expect(s.notebook.records[id].review?.box).toBe(0)
    const a2 = finishedReading(exam, { 1: 'A' }, '2026-11-22T10:00:00.000Z', 'review', [q1])
    s = run(s, reconcile({ sheets: [], progress: [], attempts: [a1, a2], exams: [exam] }, s.game, false)).state
    expect(s.notebook.records[id].review?.box).toBe(1)
    expect(s.notebook.records[id].successes).toBe(1)
  })
})

describe('migración desde 1.x (historial anterior)', () => {
  it('inicializa errores, actividad y logros sin celebraciones y respeta el Leitner existente', () => {
    const exam = examWithKey()
    const wrong = allRight(sheet)
    wrong['0.1'] = String((Number(wrong['0.1']) + 1) % 4)
    const p = checked(sheet, wrong, '2026-10-01T10:00:00.000Z')
    // Una pregunta que se falló en una comprobación anterior y sigue en el repaso.
    p.review = { ...p.review, '0.2': { box: 1, due: '2026-10-04', lapses: 1, addedAt: '2026-09-01T10:00:00.000Z' } }
    const a = finishedReading(exam, { 1: 'B', 2: 'B' }, '2026-10-02T10:00:00.000Z', 'exam')
    const src = { sheets: SHEETS, progress: [p], attempts: [a], exams: [exam] }
    const events = reconcile(src, emptyState().game, true)
    expect(events.every((e) => e.retro)).toBe(true)
    const r = run(emptyState(), events)
    const recs = r.state.notebook.records
    expect(recs[errorIdFor({ kind: 'sheet', sheetId: sheet.id, key: '0.1' })]).toBeTruthy()
    expect(recs[errorIdFor({ kind: 'sheet', sheetId: sheet.id, key: '0.2' })]).toBeTruthy()
    expect(Object.values(r.state.game.achievements).every((x) => x.retro)).toBe(true)
    expect(Object.values(r.state.game.ledger).every((x) => x.retro)).toBe(true)
    expect(r.emitted.filter((e) => e.type === 'LEVEL_UP' || e.type === 'ACHIEVEMENT_UNLOCKED').every((e) => e.retro)).toBe(true)
    // Volver a ejecutar la migración no cambia nada.
    expect(reconcile(src, r.state.game, true)).toEqual([])
  })
})

describe('repasos, sesiones y bucles', () => {
  it('REVIEW_ANSWERED de una hoja usa su Leitner; REVIEW_COMPLETED da XP limitada', () => {
    const draft = sheetItemDraft(sheet, 0, 0, '3')
    let s = emptyState()
    s = run(s, [{ type: 'REVIEW_ANSWERED', id: 'r1', at: '2026-11-26T10:00:00Z', errorId: draft.id, correct: true, sheetMastered: true, draft }]).state
    expect(s.notebook.records[draft.id].mastered).toBe(true)
    const done = (n: number, id: string): DomainEvent => ({ type: 'REVIEW_COMPLETED', id, at: '2026-11-26T11:00:00Z', session: { kind: 'due' }, answered: n, correct: n, mastered: 0, minutes: 5 })
    s = run(s, [done(1, 'tiny')]).state
    expect(Object.keys(s.game.ledger).some((k) => k.startsWith('review:'))).toBe(false)
    for (let i = 0; i < 5; i++) s = run(s, [done(5, `big${i}`)]).state
    expect(Object.keys(s.game.ledger).filter((k) => k.startsWith('review:'))).toHaveLength(3)
  })

  it('la sesión del plan se completa una sola vez y da su XP', () => {
    let s = emptyState()
    s.plan = {
      ...s.plan,
      sessions: {
        [today]: { date: today, generatedAt: '', fingerprint: '', activities: [{ id: 'a1', kind: 'sheet', skill: 'useOfEnglish', title: 'x', minutes: 10, reasons: [], target: { kind: 'sheet', sheetId: sheet.id }, status: 'todo' }], budget: 30, restDay: false, gaps: [], updatedAt: '' }
      }
    }
    const p = checked(sheet, allRight(sheet), `${today}T10:00:00`)
    const r = run(s, reconcile({ sheets: SHEETS, progress: [p], attempts: [], exams: [] }, s.game, false))
    expect(r.state.plan.sessions[today].activities[0].status).toBe('done')
    expect(r.emitted.some((e) => e.type === 'STUDY_SESSION_COMPLETED')).toBe(true)
    expect(r.state.game.ledger[`plan:${today}`].xp).toBe(XP_REWARDS.planSession)
    s = r.state
    const again = run(s, [{ type: 'STUDY_SESSION_COMPLETED', id: `plan-session:${today}`, at: `${today}T12:00:00`, date: today, minutes: 10 }])
    expect(totalXp(again.state.game)).toBe(totalXp(s.game))
  })

  it('no hay bucles infinitos: el lote está acotado y los logros se estabilizan', () => {
    const many: DomainEvent[] = Array.from({ length: MAX_EVENTS + 50 }, (_, i) => ({ type: 'FEATURE_USED', id: `f${i}`, at: '2026-11-26T10:00:00Z', feature: 'bubi-poke' }))
    const r = run(emptyState(), many)
    expect(r.emitted.filter((e) => e.type === 'FEATURE_USED').length).toBeLessThanOrEqual(MAX_EVENTS)
    expect(r.state.game.achievements['bubis-friend']).toBeTruthy()
    const stats = learnerStats(r.state, ctx(today))
    expect(stats.flags['bubi-poke']).toBeGreaterThan(5)
  })

  it('los errores de IA (Writing) se registran sin categoría inventada ni pronunciación', () => {
    const exam = examWithKey()
    const paper = exam.papers.find((p) => p.type === 'writing')!
    const a = { ...finishedReading(exam, {}, '2026-11-26T10:00:00.000Z'), paperId: paper.id, paperType: 'writing' as const, aiFeedback: { q1: { scores: {}, errors: [{ original: 'I am agree', correction: 'I agree', explanation: 'Agree es un verbo: no lleva «am».' }, { original: 'Hi guys', correction: 'Dear Sir or Madam', explanation: 'Registro demasiado informal para una carta formal.' }], tips: [], receivedAt: '2026-11-26T11:00:00.000Z' } } }
    const r = run(emptyState(), reconcile({ sheets: [], progress: [], attempts: [a], exams: [exam] }, emptyState().game, false))
    const recs = Object.values(r.state.notebook.records).filter((x) => x.source === 'writing')
    expect(recs).toHaveLength(2)
    expect(recs.find((x) => x.given === 'Hi guys')?.category).toBe('writing.register')
    expect(recs.every((x) => x.autoCheck === false && !!x.review)).toBe(true)
    expect(r.state.game.achievements['second-opinion']).toBeTruthy()
  })
})
