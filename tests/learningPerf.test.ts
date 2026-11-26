// Rendimiento con volúmenes grandes (un año de uso intenso). Límites holgados: detectan regresiones de orden
// de magnitud, no microdiferencias entre máquinas.
import { describe, expect, it } from 'vitest'
import { forecast, generateSession, type CatalogSheet, type EngineInput } from '../src/shared/learning/engine'
import { defaultPlanConfig } from '../src/shared/learning/plan'
import { emptyNotebook, filterErrors, recordFailure, type NotebookDoc } from '../src/shared/learning/notebook'
import type { ActivityEntry } from '../src/shared/learning/game'
import { addDays } from '../src/shared/review'
import { processEvents, learnerStats } from '../src/shared/learning/events'
import { reconcile } from '../src/shared/learning/sources'
import { allRight, checked, ctx, emptyState, SHEETS } from './learningFixtures'

const today = '2026-11-26'
const sheets: CatalogSheet[] = SHEETS.map((s) => ({ id: s.id, title: s.title, number: s.number, skill: s.skill, minutes: s.minutes, taskTypes: s.tasks.map((t) => t.type), builtIn: true }))

function bigActivity(n: number): ActivityEntry[] {
  return Array.from({ length: n }, (_, i): ActivityEntry => {
    const day = addDays(today, -Math.floor(i / 4))
    return { id: `a${i}`, kind: 'sheet', at: `${day}T10:00:00.000Z`, day, minutes: 10, ref: SHEETS[i % 50].id, practiceSkill: SHEETS[i % 50].skill, skill: 'useOfEnglish', correct: 7, total: 12, parts: { 'reading.p1': [5, 8], 'reading.p4': [2, 4] }, comp: { 'grammar.prepositions': [1, 2] } }
  }).reverse()
}

function bigNotebook(n: number): NotebookDoc {
  let nb = emptyNotebook()
  for (let i = 0; i < n; i++) {
    nb = recordFailure(nb, { id: `e${i}`, source: 'exam', ref: { kind: 'exam', examId: 'exam_1', paperId: 'p', questionId: `q${i}`, attemptId: 'a' }, question: `Question number ${i} about prepositions and phrasal verbs`, expected: ['on'], given: 'in', skill: 'useOfEnglish', category: i % 2 ? 'grammar.prepositions' : 'vocabulary.phrasalVerbs', ownReview: true }, `o${i}`, '2026-11-01T10:00:00.000Z', '2026-11-01').doc
  }
  return nb
}

describe('rendimiento', () => {
  const activity = bigActivity(1500)
  const nb = bigNotebook(3000)
  const errors = Object.values(nb.records)
  const input: EngineInput = { today, config: { ...defaultPlanConfig(new Date('2026-11-01T10:00:00Z')), minutesPerSession: 60 }, sheets, sheetStates: {}, exams: [], attempts: [], activity, placement: null, errors, dueReviews: 30, dueExamErrors: 0, history: {} }

  it('sesión del día con 1.500 actividades y 3.000 errores: < 300 ms', () => {
    const t0 = performance.now()
    generateSession(input)
    expect(performance.now() - t0).toBeLessThan(300)
  })

  it('previsión de 7 días para el inicio: < 1,5 s', () => {
    const t0 = performance.now()
    forecast(input, addDays(today, 1), 7)
    expect(performance.now() - t0).toBeLessThan(1500)
  })

  it('búsqueda instantánea en 3.000 errores (con erratas): < 150 ms', () => {
    const t0 = performance.now()
    const r = filterErrors(errors, { query: 'prepostions' }, { today, sheetReview: new Map() })
    expect(performance.now() - t0).toBeLessThan(150)
    expect(r.length).toBeGreaterThan(0)
  })

  it('migración de un historial de 50 hojas y estadísticas de logros: < 1,5 s', () => {
    const progress = SHEETS.map((s, i) => checked(s, allRight(s), `2026-10-${String((i % 28) + 1).padStart(2, '0')}T10:00:00.000Z`))
    const t0 = performance.now()
    const r = processEvents(emptyState(), reconcile({ sheets: SHEETS, progress, attempts: [], exams: [] }, emptyState().game, true), ctx(today))
    learnerStats(r.state, ctx(today))
    expect(performance.now() - t0).toBeLessThan(1500)
    expect(Object.keys(r.state.game.activity)).toHaveLength(50)
  })
})
