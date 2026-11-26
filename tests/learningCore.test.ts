import { describe, expect, it } from 'vitest'
import { editDistance, fuzzyFilter, fuzzyScore } from '../src/shared/fuzzy'
import { classifyError, COMPETENCIES, competency, skillOfPart, taskTypeFromCategory } from '../src/shared/learning/taxonomy'
import {
  addManualError,
  emptyNotebook,
  errorStatus,
  exportErrorsCsv,
  filterErrors,
  mergeNotebooks,
  notebookSummary,
  parseNotebook,
  patchError,
  recordFailure,
  recordSelfReview,
  recordSuccess,
  selectSessionErrors,
  sortErrors,
  type ErrorDraft,
  type StatusContext
} from '../src/shared/learning/notebook'
import { emptyGame, grantXp, levelInfo, mergeGames, parseGame, rankOf, RANKS, totalXp, xpForLevel, xpToNext, XP_REWARDS } from '../src/shared/learning/game'
import { computeStreaks, heatmapCells, weekdayOf } from '../src/shared/learning/streaks'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, newlyUnlocked, type LearnerStats } from '../src/shared/learning/achievements'
import { COSMETICS, effectiveOutfit, unlockedCosmetics } from '../src/shared/learning/cosmetics'
import { buildMission, currentMissions, type MissionInput } from '../src/shared/learning/missions'

const today = '2026-11-26'
const ctx: StatusContext = { today, sheetReview: new Map() }

describe('búsqueda tolerante', () => {
  it('encuentra con erratas, prefijos y sin tildes', () => {
    expect(fuzzyScore('gramar', 'Grammar Master')).toBeGreaterThan(0)
    expect(fuzzyScore('prepo', 'Prepositions')).toBeGreaterThan(0)
    expect(fuzzyScore('practica', 'Práctica')).toBeGreaterThan(0)
    expect(fuzzyScore('estadsiticas', 'Estadísticas')).toBeGreaterThan(0)
    expect(fuzzyScore('zzzz', 'Grammar Master')).toBe(0)
  })
  it('todas las palabras deben aparecer y lo exacto va primero', () => {
    expect(fuzzyScore('mis errores', 'Ir a Mis errores')).toBeGreaterThan(0)
    expect(fuzzyScore('mis zebra', 'Ir a Mis errores')).toBe(0)
    const list = fuzzyFilter(['Repaso', 'Ajustes', 'Repasar errores'], 'repaso', (x) => x)
    expect(list[0]).toBe('Repaso')
  })
  it('distancia de edición con transposición', () => {
    expect(editDistance('teh', 'the')).toBe(1)
    expect(editDistance('abc', 'abc')).toBe(0)
  })
})

describe('taxonomía', () => {
  it('tiene todas las competencias pedidas con ids únicos', () => {
    expect(new Set(COMPETENCIES.map((c) => c.id)).size).toBe(COMPETENCIES.length)
    for (const id of ['grammar.tenses', 'grammar.conditionals', 'grammar.passive', 'grammar.reportedSpeech', 'grammar.modals', 'grammar.relativeClauses', 'grammar.articles', 'grammar.prepositions', 'grammar.gerundsInfinitives', 'grammar.comparatives', 'grammar.quantifiers', 'grammar.wordOrder', 'vocabulary.phrasalVerbs', 'vocabulary.collocations', 'vocabulary.idioms', 'vocabulary.confusingWords', 'vocabulary.synonyms', 'vocabulary.wordFormation', 'vocabulary.affixes', 'vocabulary.falseFriends', 'reading.mainIdea', 'reading.detail', 'reading.inference', 'reading.attitude', 'reading.reference', 'reading.structure', 'writing.grammar', 'writing.vocabulary', 'writing.organisation', 'writing.register', 'writing.cohesion', 'writing.task', 'listening.detail', 'listening.gist', 'speaking.fluency', 'speaking.pronunciation']) {
      expect(competency(id), id).toBeTruthy()
    }
  })
  it('clasifica solo con pistas claras', () => {
    expect(classifyError({ taskType: 'openCloze', skill: 'useOfEnglish', expected: ['the'] }).category).toBe('grammar.articles')
    expect(classifyError({ taskType: 'openCloze', skill: 'useOfEnglish', expected: ['at', 'on'] }).category).toBe('grammar.prepositions')
    expect(classifyError({ taskType: 'openCloze', skill: 'useOfEnglish', expected: ['which', 'that'] }).category).toBeUndefined()
    expect(classifyError({ taskType: 'wordFormation', skill: 'useOfEnglish', expected: ['unhappiness'] }).category).toBe('vocabulary.wordFormation')
    expect(classifyError({ taskType: 'transformation', skill: 'useOfEnglish', explanation: 'Pasiva con «be + participio».' }).category).toBe('grammar.passive')
    expect(classifyError({ taskType: 'mcCloze', skill: 'useOfEnglish', explanation: 'Phrasal verb: put off = posponer' }).category).toBe('vocabulary.phrasalVerbs')
    expect(classifyError({ taskType: 'mcCloze', skill: 'useOfEnglish', explanation: '' }).category).toBeUndefined()
    expect(classifyError({ taskType: 'readingMc', skill: 'reading', question: 'What does the writer suggest about…?' }).category).toBe('reading.inference')
    expect(classifyError({ taskType: 'readingMc', skill: 'reading', question: 'How does the writer feel about the plan?' }).category).toBe('reading.attitude')
  })
  it('nunca deduce la pronunciación (ni de una transcripción)', () => {
    expect(classifyError({ skill: 'speaking', explanation: 'Pronunciación incorrecta de «comfortable»', original: 'comfortable' }).category).not.toBe('speaking.pronunciation')
    expect(competency('speaking.pronunciation')?.manualOnly).toBe(true)
  })
  it('partes y destrezas', () => {
    expect(skillOfPart('reading.p4')).toBe('useOfEnglish')
    expect(skillOfPart('reading.p6')).toBe('reading')
    expect(skillOfPart('listening.p2')).toBe('listening')
    expect(taskTypeFromCategory('Open cloze')).toBe('openCloze')
    expect(taskTypeFromCategory('Key word transformation')).toBe('transformation')
  })
})

function draft(id: string, extra: Partial<ErrorDraft> = {}): ErrorDraft {
  return { id, source: 'exam', ref: { kind: 'exam', examId: 'exam_1', paperId: 'p', questionId: id, attemptId: 'a' }, expected: ['on'], given: 'in', skill: 'useOfEnglish', category: 'grammar.prepositions', ownReview: true, autoCheck: true, ...extra }
}

describe('cuaderno de errores', () => {
  it('registra, no duplica la misma ocurrencia y cuenta fallos', () => {
    let nb = emptyNotebook()
    nb = recordFailure(nb, draft('e1'), 'attempt:1', '2026-11-20T10:00:00Z', '2026-11-20').doc
    const again = recordFailure(nb, draft('e1'), 'attempt:1', '2026-11-20T10:00:00Z', '2026-11-20')
    expect(again.changed).toBe(false)
    nb = recordFailure(nb, draft('e1'), 'attempt:2', '2026-11-22T10:00:00Z', '2026-11-22').doc
    const r = nb.records.e1
    expect(r.fails).toBe(2)
    expect(r.firstAt).toBe('2026-11-20T10:00:00Z')
    expect(r.lastAt).toBe('2026-11-22T10:00:00Z')
    expect(r.review).toMatchObject({ box: 0, due: '2026-11-23' })
  })
  it('estados: nuevo, pendiente, recurrente y dominado (Leitner hasta el final)', () => {
    let nb = recordFailure(emptyNotebook(), draft('e1'), 'o1', '2026-11-25T10:00:00Z', '2026-11-25').doc
    expect(errorStatus(nb.records.e1, ctx)).toBe('due')
    expect(errorStatus(nb.records.e1, { ...ctx, today: '2026-11-25' })).toBe('new')
    for (let i = 0; i < 2; i++) nb = recordFailure(nb, draft('e1'), `x${i}`, '2026-11-26T10:00:00Z', '2026-11-26').doc
    expect(errorStatus(nb.records.e1, { ...ctx, today: '2026-11-26' })).toBe('recurring')
    let mastered = false
    for (let i = 0; i < 4; i++) {
      const r = recordSuccess(nb, 'e1', `ok${i}`, '2026-12-30T10:00:00Z', '2026-12-30', { advanceOwnReview: true })
      nb = r.doc
      mastered = mastered || r.mastered
    }
    expect(mastered).toBe(true)
    expect(errorStatus(nb.records.e1, ctx)).toBe('mastered')
    // Se conserva el historial.
    expect(nb.records.e1.fails).toBe(3)
    expect(nb.records.e1.successes).toBe(4)
  })
  it('Writing/Speaking: solo se domina con repaso manual completo, nunca solo', () => {
    let nb = recordFailure(emptyNotebook(), draft('w1', { source: 'writing', skill: 'writing', autoCheck: false, category: undefined }), 'ai', '2026-11-20T10:00:00Z', '2026-11-20').doc
    const once = recordSelfReview(nb, 'w1', true, 'r1', '2026-11-21T10:00:00Z', '2026-11-21')
    expect(once.mastered).toBe(false)
    nb = once.doc
    expect(nb.records.w1.mastered).toBeFalsy()
    nb = recordSelfReview(nb, 'w1', false, 'r2', '2026-11-22T10:00:00Z', '2026-11-22').doc
    expect(nb.records.w1.review?.box).toBe(0)
  })
  it('las ediciones del usuario no se pisan al volver a fallar', () => {
    let nb = recordFailure(emptyNotebook(), draft('e1', { category: undefined, explanation: 'auto' }), 'o1', '2026-11-20T10:00:00Z', '2026-11-20').doc
    nb = patchError(nb, 'e1', { category: 'grammar.articles', explanation: 'Mía', notes: 'ojo' }, '2026-11-21T10:00:00Z')
    nb = recordFailure(nb, draft('e1', { category: 'grammar.prepositions', explanation: 'auto 2' }), 'o2', '2026-11-22T10:00:00Z', '2026-11-22').doc
    expect(nb.records.e1.category).toBe('grammar.articles')
    expect(nb.records.e1.explanation).toBe('Mía')
    expect(nb.records.e1.notes).toBe('ojo')
  })
  it('borrar deja una marca que la sincronización respeta; volver a fallar lo recupera', () => {
    let nb = recordFailure(emptyNotebook(), draft('e1'), 'o1', '2026-11-20T10:00:00Z', '2026-11-20').doc
    const deleted = patchError(nb, 'e1', { deleted: true }, '2026-11-21T10:00:00Z')
    expect(mergeNotebooks(nb, deleted).records.e1.deleted).toBe(true)
    expect(mergeNotebooks(deleted, nb).records.e1.deleted).toBe(true)
    nb = recordFailure(deleted, draft('e1'), 'o2', '2026-11-22T10:00:00Z', '2026-11-22').doc
    expect(nb.records.e1.deleted).toBe(false)
  })
  it('búsqueda, filtros, orden, sesiones y exportación', () => {
    let nb = emptyNotebook()
    nb = recordFailure(nb, draft('a', { question: 'interested ___ art', category: 'grammar.prepositions' }), 'o1', '2026-11-26T09:00:00Z', today).doc
    nb = recordFailure(nb, draft('b', { question: 'The book ___ I read', expected: ['that'], category: 'grammar.relativeClauses' }), 'o1', '2026-10-01T09:00:00Z', '2026-10-01').doc
    nb = addManualError(nb, { id: 'm:1', skill: 'writing', question: 'Register', expected: ['I would like to'], given: 'I want', category: 'writing.register' }, '2026-11-26T11:00:00Z', today)
    const all = Object.values(nb.records)
    expect(filterErrors(all, { query: 'intrested' }, ctx).map((r) => r.id)).toEqual(['a'])
    expect(filterErrors(all, { skills: ['writing'] }, ctx).map((r) => r.id)).toEqual(['m:1'])
    expect(filterErrors(all, { categories: ['grammar.relativeClauses'] }, ctx).map((r) => r.id)).toEqual(['b'])
    expect(sortErrors(all, 'recent', ctx)[0].id).toBe('m:1')
    expect(selectSessionErrors(all, { kind: 'old' }, ctx).map((r) => r.id)).toEqual(['b'])
    expect(selectSessionErrors(all, { kind: 'today' }, ctx).map((r) => r.id).sort()).toEqual(['a', 'm:1'])
    expect(selectSessionErrors(all, { kind: 'competency', value: 'grammar.prepositions' }, ctx).map((r) => r.id)).toEqual(['a'])
    const s = notebookSummary(all, ctx)
    expect(s.total).toBe(3)
    expect(s.bySkill.writing).toBe(1)
    const csv = exportErrorsCsv(all, ctx)
    expect(csv.split('\n')[0]).toContain('your_answer')
    expect(csv).toContain('The book ___ I read')
  })
  it('valida datos editados a mano y la fusión es conmutativa', () => {
    const doc = parseNotebook({ records: { x: { id: 'x', expected: ['a'], skill: 'bad', category: 'nope', fails: -3 }, y: 5 } })
    expect(Object.keys(doc.records)).toEqual(['x'])
    expect(doc.records.x.skill).toBe('useOfEnglish')
    expect(doc.records.x.category).toBeUndefined()
    const a = recordFailure(emptyNotebook(), draft('e1'), 'o1', '2026-11-20T10:00:00Z', '2026-11-20').doc
    const b = recordFailure(emptyNotebook(), draft('e2'), 'o2', '2026-11-21T10:00:00Z', '2026-11-21').doc
    expect(Object.keys(mergeNotebooks(a, b).records).sort()).toEqual(Object.keys(mergeNotebooks(b, a).records).sort())
  })
})

describe('XP y niveles', () => {
  it('curva progresiva y niveles sin tope', () => {
    expect(xpToNext(1)).toBe(100)
    expect(xpToNext(10)).toBeGreaterThan(xpToNext(9))
    expect(levelInfo(0).level).toBe(1)
    expect(levelInfo(99).level).toBe(1)
    expect(levelInfo(100).level).toBe(2)
    expect(levelInfo(xpForLevel(60)).level).toBe(60)
    expect(levelInfo(xpForLevel(200) + 5).level).toBe(200)
  })
  it('rangos originales, independientes de A1…C2', () => {
    expect(rankOf(1).name).toBe('Newcomer')
    expect(RANKS.every((r) => !/\b(A1|A2|B1|B2|C1|C2)\b/.test(r.name))).toBe(true)
  })
  it('una recompensa no se concede dos veces y la fusión no duplica', () => {
    let g = emptyGame()
    g = grantXp(g, 'sheet:x', { xp: XP_REWARDS.sheetCompleted, reason: 'sheet', at: '2026-11-26T10:00:00Z' }).doc
    expect(grantXp(g, 'sheet:x', { xp: 30, reason: 'sheet', at: '2026-11-26T11:00:00Z' }).granted).toBe(false)
    const other = grantXp(emptyGame(), 'sheet:x', { xp: 30, reason: 'sheet', at: '2026-11-26T10:00:00Z' }).doc
    expect(totalXp(mergeGames(g, other))).toBe(30)
    const roundtrip = parseGame(JSON.parse(JSON.stringify(g)))
    expect(totalXp(roundtrip)).toBe(30)
    expect(totalXp(parseGame({ ledger: { evil: { xp: 999999, reason: 'sheet', at: 'x' } } }))).toBe(0)
  })
})

describe('rachas', () => {
  it('cuenta la racha y la mejor racha; el descanso planificado no rompe la del plan', () => {
    // 23 (lunes) … 26 (jueves). Fin de semana de descanso.
    expect(weekdayOf('2026-11-23')).toBe(0)
    const days = ['2026-11-19', '2026-11-20', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26']
    const s = computeStreaks(days, [5, 6], today)
    expect(s.current).toBe(4)
    expect(s.planCurrent).toBe(6)
    expect(s.best).toBe(4)
    expect(s.totalDays).toBe(6)
    expect(s.activeWeeks).toBe(2)
    // Sin estudiar hoy, la racha sigue viva (cuenta hasta ayer).
    expect(computeStreaks(days.slice(0, -1), [5, 6], today).current).toBe(3)
  })
  it('calendario de actividad estilo GitHub', () => {
    const cells = heatmapCells(new Map([[today, 40]]), today, 4)
    expect(cells).toHaveLength(28)
    expect(cells.find((c) => c.day === today)?.level).toBe(3)
    expect(cells.some((c) => c.future)).toBe(true)
  })
})

function stats(over: Partial<LearnerStats> = {}): LearnerStats {
  return {
    sheetsDistinct: 0, sheetsBySkill: { vocabulary: 0, grammar: 0, wordFormation: 0, reading: 0, mixed: 0 }, sheetChecks: 0, perfectSheets: 0, records: 0, partCorrect: {}, compCorrect: {},
    papersDone: { reading: 0, writing: 0, listening: 0, speaking: 0 }, examActivities: { reading: 0, writing: 0, listening: 0, speaking: 0 }, fullMocks: 0, passPaper: false, gradeA: false, allFourPapers: false, finalBoss: false, paperImprovement: 0,
    reviewAnswers: 0, reviewSessions: 0, mastered: 0, recurringMastered: 0, notesWritten: 0, aiFeedbacks: 0, customSheets: 0,
    streak: computeStreaks([], [], today), planSessions: 0, comeback: false, level: 1, readinessReached: false, flags: {}, cosmeticsUnlocked: 0, cosmeticEquipped: false, nightOwl: false, earlyBird: false, maxMinutesDay: 0,
    ...over
  }
}

describe('logros', () => {
  it('al menos 40, ids estables y únicos, en todas las categorías y rarezas', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length)
    for (const c of ACHIEVEMENT_CATEGORIES) expect(ACHIEVEMENTS.some((a) => a.category === c), c).toBe(true)
    for (const r of ['common', 'rare', 'epic', 'legendary']) expect(ACHIEVEMENTS.some((a) => a.rarity === r)).toBe(true)
    for (const n of ['First Steps', 'Grammar Master', 'Error Hunter', 'Comeback King', 'Perfect Score', 'Exam Ready', 'Vocabulary Explorer', 'Transformation Expert', "Bubi's Friend", 'The Final Boss']) expect(ACHIEVEMENTS.some((a) => a.name === n), n).toBe(true)
  })
  it('se desbloquean por condición y muestran progreso', () => {
    expect(newlyUnlocked(stats(), {})).toEqual([])
    const s = stats({ sheetsDistinct: 1, perfectSheets: 1, sheetsBySkill: { vocabulary: 1, grammar: 10, wordFormation: 0, reading: 0, mixed: 0 } })
    const ids = newlyUnlocked(s, {}).map((a) => a.id)
    expect(ids).toEqual(expect.arrayContaining(['warm-up', 'perfect-score', 'grammar-master']))
    expect(newlyUnlocked(s, { 'warm-up': {} }).map((a) => a.id)).not.toContain('warm-up')
    const te = ACHIEVEMENTS.find((a) => a.id === 'transformation-expert')!
    expect(te.check(stats({ partCorrect: { 'reading.p4': 7 } }))).toEqual({ done: false, current: 7, target: 25 })
  })
  it('cada accesorio por logro apunta a un logro que existe', () => {
    for (const c of COSMETICS) if (c.achievement) expect(ACHIEVEMENTS.some((a) => a.id === c.achievement), c.id).toBe(true)
    expect(unlockedCosmetics(1, {}).map((c) => c.id)).toEqual(['classic'])
    expect(effectiveOutfit({ head: 'crown', eyes: 'round-glasses' }, 2, {})).toEqual({ eyes: 'round-glasses' })
    expect(effectiveOutfit({ head: 'crown' }, 1, { 'final-boss': {} })).toEqual({ head: 'crown' })
    // Modo administrador: todo desbloqueado solo para mostrar (sin logros ni nivel reales).
    expect(effectiveOutfit({ head: 'crown', color: 'gold' }, 1, {}, true)).toEqual({ head: 'crown', color: 'gold' })
  })
})

describe('misiones', () => {
  const base: MissionInput = { today, activity: [], plan: undefined, hasPlan: true, sheetSkills: ['grammar', 'vocabulary'], available: ['useOfEnglish', 'listening'], dueReviews: 8, liveErrors: 10, neglected: 'listening', missionsDone: {}, picks: {} }
  it('elige 2 diarias y 3 semanales y no cambian en el día', () => {
    const r = currentMissions(base)
    expect(r.missions.filter((m) => m.period === 'day')).toHaveLength(2)
    expect(r.missions.filter((m) => m.period === 'week')).toHaveLength(3)
    const again = currentMissions({ ...base, dueReviews: 0, liveErrors: 0, picks: r.picks })
    expect(again.missions.map((m) => m.id)).toEqual(r.missions.map((m) => m.id))
    expect(again.changed).toBe(false)
  })
  it('no duplica lo que ya pide el plan', () => {
    const plan = { date: today, generatedAt: '', fingerprint: '', activities: [{ id: 'x', kind: 'review' as const, skill: 'useOfEnglish' as const, title: '', minutes: 5, reasons: [], target: { kind: 'review' as const, session: { kind: 'due' as const } }, status: 'todo' as const }], budget: 30, restDay: false, gaps: [], updatedAt: '' }
    const r = currentMissions({ ...base, plan })
    expect(r.missions.some((m) => m.template === 'd-review')).toBe(false)
  })
  it('el progreso sale de la actividad real', () => {
    const m = buildMission(`d-sheet:grammar:${today}`, [{ id: 'a', kind: 'sheet', at: `${today}T10:00:00Z`, day: today, practiceSkill: 'grammar', minutes: 10 }], {})
    expect(m).toMatchObject({ done: true, current: 1, target: 1 })
    expect(buildMission('w-days:2026-11-23', [], {})).toMatchObject({ done: false, current: 0, target: 4 })
  })
})
