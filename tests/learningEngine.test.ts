import { describe, expect, it } from 'vitest'
import { alternativesFor, buildContext, forecast, generateSession, markDone, needsReplan, percentForScale, sessionMinutes, type CatalogExam, type CatalogSheet, type EngineInput } from '../src/shared/learning/engine'
import { budgetFor, defaultPlanConfig, isRestDay, mergePlans, parsePlan, parsePlanConfig, planMilestones, emptyPlan, type PlanConfig } from '../src/shared/learning/plan'
import { computeProfile, detectPatterns } from '../src/shared/learning/competency'
import { computeReadiness, readinessReached } from '../src/shared/learning/readiness'
import type { ActivityEntry } from '../src/shared/learning/game'
import { recordFailure, emptyNotebook } from '../src/shared/learning/notebook'
import { SHEETS } from './learningFixtures'

const today = '2026-11-26' // jueves
const config: PlanConfig = { ...defaultPlanConfig(new Date('2026-11-01T10:00:00Z')), minutesPerSession: 30, studyDays: [0, 1, 2, 3, 4] }

const sheets: CatalogSheet[] = SHEETS.map((s) => ({ id: s.id, title: s.title, number: s.number, skill: s.skill, minutes: s.minutes, taskTypes: s.tasks.map((t) => t.type), builtIn: true }))

const exams: CatalogExam[] = [
  {
    id: 'exam_a',
    name: 'Mock A',
    isExample: false,
    papers: [
      { id: 'pl', type: 'listening', title: 'Listening', timeLimitMin: 40, parts: [1, 2, 3, 4].map((n) => ({ id: `pl${n}`, number: n, title: `Part ${n}`, questions: 8, gradable: true, playable: true })) },
      { id: 'pw', type: 'writing', title: 'Writing', timeLimitMin: 80, parts: [1, 2].map((n) => ({ id: `pw${n}`, number: n, title: `Part ${n}`, questions: 1, gradable: true, playable: true })) }
    ]
  }
]

function input(over: Partial<EngineInput> = {}): EngineInput {
  return { today, config, sheets, sheetStates: {}, exams, attempts: [], activity: [], placement: null, errors: [], dueReviews: 0, dueExamErrors: 0, history: {}, ...over }
}

function act(day: string, parts: Record<string, [number, number]>, extra: Partial<ActivityEntry> = {}): ActivityEntry {
  return { id: `a-${day}-${Object.keys(parts).join()}`, kind: 'sheet', at: `${day}T10:00:00.000Z`, day, minutes: 10, parts, ...extra }
}

describe('plan: configuración y días', () => {
  it('valida y acota la configuración', () => {
    const c = parsePlanConfig({ targetScore: 250, minutesPerSession: 3, studyDays: [9, 1, 1], examDate: 'mañana', preferences: ['short', 'x'], prioritySkills: ['writing', 'nope'] })!
    expect(c.targetScore).toBe(190)
    expect(c.minutesPerSession).toBe(10)
    expect(c.studyDays).toEqual([1])
    expect(c.examDate).toBeNull()
    expect(c.preferences).toEqual(['short'])
    expect(c.prioritySkills).toEqual(['writing'])
  })
  it('días de descanso y presupuesto (nunca supera el máximo)', () => {
    expect(isRestDay(config, '2026-11-28')).toBe(true) // sábado
    expect(isRestDay({ ...config, restDates: [today] }, today)).toBe(true)
    expect(budgetFor(config, today)).toBe(30)
    expect(budgetFor({ ...config, intensity: 'light' }, today)).toBeLessThanOrEqual(30)
    expect(budgetFor(config, '2026-11-29')).toBe(0)
  })
  it('hitos: examen, mitad, cuenta atrás y simulacros; plan continuo con puntos de control', () => {
    const m = planMilestones({ ...config, examDate: '2027-01-30' }, today)
    expect(m.map((x) => x.kind)).toEqual(expect.arrayContaining(['exam', 'halfway', 'twoWeeks', 'oneWeek', 'mockSuggested']))
    expect(planMilestones(config, today).some((x) => x.kind === 'checkpoint')).toBe(true)
  })
  it('fusión de planes: gana la configuración más reciente', () => {
    const a = { ...emptyPlan(), config: { ...config, updatedAt: '2026-11-01T00:00:00Z', minutesPerSession: 20 } }
    const b = { ...emptyPlan(), config: { ...config, updatedAt: '2026-11-02T00:00:00Z', minutesPerSession: 45 } }
    expect(mergePlans(a, b).config?.minutesPerSession).toBe(45)
    expect(mergePlans(b, a).config?.minutesPerSession).toBe(45)
    expect(parsePlan(JSON.parse(JSON.stringify(mergePlans(a, b)))).config?.minutesPerSession).toBe(45)
  })
})

describe('perfil de competencias', () => {
  it('distingue sin evaluar, pocos datos y bajo rendimiento; no inventa puntuaciones', () => {
    const p0 = computeProfile([], null, today)
    expect(p0.skills.listening).toMatchObject({ status: 'unassessed', accuracy: null, n: 0 })
    const p1 = computeProfile([act('2026-11-25', { 'reading.p4': [1, 4] })], null, today)
    expect(p1.skills.useOfEnglish.status).toBe('insufficient')
    const p2 = computeProfile([act('2026-11-20', { 'reading.p4': [3, 12] }), act('2026-11-24', { 'reading.p2': [4, 10] })], null, today)
    expect(p2.skills.useOfEnglish.status).toBe('weak')
    expect(p2.parts['reading.p4'].status).toBe('weak')
  })
  it('la prueba de nivel es solo un punto de partida', () => {
    const placement = { version: 1, score: 168, level: 'B2' as const, correct: 17, total: 24, skills: { grammar: 88, vocabulary: 63, reading: 75 }, date: '2026-11-20T10:00:00.000Z', dismissed: false }
    const p = computeProfile([], placement, today)
    expect(p.skills.useOfEnglish.placementOnly).toBe(true)
    expect(p.skills.writing.status).toBe('unassessed')
  })
  it('detecta patrones con datos reales', () => {
    let nb = emptyNotebook()
    const acts: ActivityEntry[] = []
    for (let i = 0; i < 5; i++) {
      const id = `s${i}`
      acts.push({ id, kind: 'sheet', at: `2026-11-2${i}T10:00:00Z`, day: `2026-11-2${i}`, minutes: 10 })
      nb = recordFailure(nb, { id: `e${i}`, source: 'sheet', ref: { kind: 'sheet', sheetId: 'x', key: `0.${i}` }, expected: ['on'], given: 'in', skill: 'useOfEnglish', category: 'grammar.prepositions', ownReview: false }, id, `2026-11-2${i}T10:00:00Z`, `2026-11-2${i}`).doc
    }
    nb = recordFailure(nb, { id: 'md', source: 'sheet', ref: { kind: 'sheet', sheetId: 'x', key: '1.0' }, expected: ['make'], given: 'do', skill: 'useOfEnglish', ownReview: false }, 's1', '2026-11-21T10:00:00Z', '2026-11-21').doc
    nb = recordFailure(nb, { id: 'md', source: 'sheet', ref: { kind: 'sheet', sheetId: 'x', key: '1.0' }, expected: ['make'], given: 'do', skill: 'useOfEnglish', ownReview: false }, 's2', '2026-11-22T10:00:00Z', '2026-11-22').doc
    const pats = detectPatterns(Object.values(nb.records), acts, computeProfile(acts, null, today))
    expect(pats.find((p) => p.category === 'grammar.prepositions')).toMatchObject({ count: 5, window: 5 })
    expect(pats.find((p) => p.kind === 'confusion')?.words).toEqual(['make', 'do'])
    expect(detectPatterns([], [], computeProfile([], null, today))).toEqual([])
  })
})

describe('motor adaptativo: sesiones', () => {
  it('respeta el tiempo máximo y es determinista', () => {
    const a = generateSession(input(), new Date('2026-11-26T08:00:00Z')).session
    const b = generateSession(input(), new Date('2026-11-26T08:00:00Z')).session
    expect(a.activities.map((x) => x.id)).toEqual(b.activities.map((x) => x.id))
    expect(sessionMinutes(a).planned).toBeLessThanOrEqual(30)
    expect(a.activities.length).toBeGreaterThan(0)
    for (const x of a.activities) {
      expect(x.reasons.length).toBeGreaterThan(0)
      expect(x.minutes).toBeGreaterThan(0)
    }
  })
  it('día de descanso: sesión vacía', () => {
    const s = generateSession(input({ today: '2026-11-28' })).session
    expect(s.restDay).toBe(true)
    expect(s.activities).toEqual([])
  })
  it('pone el repaso pendiente primero y no se centra en una sola destreza', () => {
    const s = generateSession(input({ dueReviews: 12, config: { ...config, minutesPerSession: 60 } })).session
    expect(s.activities[0].kind).toBe('review')
    const skills = new Set(s.activities.filter((a) => a.kind !== 'review').map((a) => a.skill))
    expect(skills.size).toBeGreaterThan(1)
    expect(sessionMinutes(s).planned).toBeLessThanOrEqual(60)
  })
  it('no repite la hoja hecha recientemente', () => {
    const first = generateSession(input()).session
    const sheetAct = first.activities.find((a) => a.target.kind === 'sheet')!
    const sid = sheetAct.target.kind === 'sheet' ? sheetAct.target.sheetId : ''
    const activity: ActivityEntry[] = [{ id: 'x', kind: 'sheet', at: '2026-11-25T10:00:00Z', day: '2026-11-25', minutes: 10, ref: sid, practiceSkill: 'vocabulary', skill: 'useOfEnglish', correct: 5, total: 12, parts: { 'reading.p1': [3, 8] } }]
    const next = generateSession(input({ activity, sheetStates: { [sid]: { times: 1, best: 5, total: 12, inProgress: false } } })).session
    expect(next.activities.some((a) => a.target.kind === 'sheet' && a.target.sheetId === sid)).toBe(false)
  })
  it('sin contenido para una destreza la marca como hueco (y propone otras)', () => {
    const s = generateSession(input({ exams: [] })).session
    expect(s.gaps).toEqual(expect.arrayContaining(['writing', 'listening', 'speaking']))
    expect(s.activities.length).toBeGreaterThan(0)
  })
  it('prioriza lo débil, lo no evaluado y lo que el alumno elige', () => {
    const ctx = buildContext(input({ activity: [act('2026-11-25', { 'reading.p1': [10, 12], 'reading.p2': [11, 12] })], config: { ...config, prioritySkills: ['listening'] } }))
    expect(ctx.priorities[0].skill).toBe('listening')
    const uoe = ctx.priorities.find((p) => p.skill === 'useOfEnglish')!
    const reading = ctx.priorities.find((p) => p.skill === 'reading')!
    expect(reading.score).toBeGreaterThan(uoe.score)
  })
  it('vuelta tras varios días: sesión más ligera con mensaje de bienvenida', () => {
    const s = generateSession(input({ activity: [act('2026-11-10', { 'reading.p1': [5, 8] })], config: { ...config, minutesPerSession: 40 } })).session
    expect(s.welcomeBack).toBe(16)
    expect(s.budget).toBeLessThan(40)
  })
  it('cerca del examen propone un simulacro si cabe (como mucho uno por semana)', () => {
    const s = generateSession(input({ config: { ...config, examDate: '2026-12-10', minutesPerSession: 60 } })).session
    expect(s.activities.some((a) => a.kind === 'mock')).toBe(true)
    const history = { '2026-11-24': { ...s, date: '2026-11-24' } }
    const later = generateSession(input({ config: { ...config, examDate: '2026-12-10', minutesPerSession: 60 }, history })).session
    expect(later.activities.some((a) => a.kind === 'mock')).toBe(false)
  })
})

describe('replanificación', () => {
  it('rehace solo si cambian los datos y la sesión no ha empezado', () => {
    const inp = input()
    const s = generateSession(inp).session
    expect(needsReplan(s, inp)).toBe(false)
    const changed = input({ dueReviews: 5 })
    expect(needsReplan(s, changed)).toBe(true)
    const started = markDone(s, (a) => a.id === s.activities[0].id, '2026-11-26T10:00:00Z')
    expect(started.changed).toHaveLength(1)
    expect(needsReplan(started.session, changed)).toBe(false)
    expect(needsReplan(undefined, inp)).toBe(true)
    // Cambiar la configuración también replanifica (si no ha empezado).
    expect(needsReplan(s, input({ config: { ...config, minutesPerSession: 45 } }))).toBe(true)
  })
  it('sustituir: alternativas equivalentes de la misma destreza', () => {
    const inp = input()
    const s = generateSession(inp).session
    const target = s.activities.find((a) => a.kind === 'sheet')!
    const alts = alternativesFor(inp, target, s)
    expect(alts.length).toBeGreaterThan(0)
    expect(alts.every((a) => a.skill === target.skill && a.replacedFrom === target.id)).toBe(true)
  })
  it('previsión: rota contenido entre días y respeta los descansos', () => {
    const days = forecast(input(), today, 7)
    expect(days.map((d) => d.restDay)).toEqual([false, false, true, true, false, false, false])
    const keys = days.flatMap((d) => d.activities.filter((a) => a.target.kind === 'sheet').map((a) => (a.target.kind === 'sheet' ? a.target.sheetId : '')))
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('preparación para el examen', () => {
  it('sin datos: sin estimación ni confianza', () => {
    const r = computeReadiness([], computeProfile([], null, today), null, 160, today)
    expect(r.estimate).toBeNull()
    expect(r.confidence).toBe('none')
    expect(r.unassessed).toHaveLength(5)
    expect(readinessReached(r)).toBe(false)
  })
  it('con pocos datos la confianza es baja; con varios papers recientes, alta', () => {
    const one: ActivityEntry[] = [{ id: 'e1', kind: 'exam', at: '2026-11-20T10:00:00Z', day: '2026-11-20', paperType: 'reading', mode: 'exam', full: true, minutes: 75, percent: 70 }]
    const r1 = computeReadiness(one, computeProfile(one, null, today), null, 160, today)
    expect(r1.confidence).toBe('low')
    expect(r1.estimate!.high - r1.estimate!.low).toBeGreaterThan(10)
    const many: ActivityEntry[] = []
    for (const type of ['reading', 'listening', 'writing'] as const) for (let i = 0; i < 3; i++) many.push({ id: `${type}${i}`, kind: 'exam', at: `2026-11-2${i}T10:00:00Z`, day: `2026-11-2${i}`, paperType: type, mode: 'exam', full: true, minutes: 60, percent: 72 })
    const r2 = computeReadiness(many, computeProfile(many, null, today), null, 160, today)
    expect(r2.confidence).toBe('high')
    expect(r2.estimate!.scale).toBeGreaterThanOrEqual(160)
    expect(readinessReached(r2)).toBe(true)
    expect(r2.unassessed).toContain('speaking')
  })
  it('equivalencia escala ↔ porcentaje', () => {
    expect(percentForScale(160)).toBe(60)
    expect(percentForScale(180)).toBe(80)
  })
})
