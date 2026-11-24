import { describe, expect, it } from 'vitest'
import { levelOfScore, parsePlacement, PLACEMENT_PASSAGES, PLACEMENT_QUESTIONS, placementTips, scorePlacement, type PlacementAnswers } from '../src/shared/placement'
import { changesSince, CHANGELOG } from '../src/shared/changelog'

const all = (pick: (q: (typeof PLACEMENT_QUESTIONS)[number]) => number): PlacementAnswers =>
  Object.fromEntries(PLACEMENT_QUESTIONS.map((q) => [q.id, pick(q)]))

describe('prueba de nivel', () => {
  it('tiene 24 preguntas bien formadas, 6 por nivel y 8 por destreza', () => {
    expect(PLACEMENT_QUESTIONS).toHaveLength(24)
    const ids = new Set(PLACEMENT_QUESTIONS.map((q) => q.id))
    expect(ids.size).toBe(24)
    for (const q of PLACEMENT_QUESTIONS) {
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThan(q.options.length)
      expect(new Set(q.options).size).toBe(q.options.length)
      if (q.passage) expect(PLACEMENT_PASSAGES[q.passage]).toBeTruthy()
      if (q.skill !== 'reading') expect(q.prompt).toContain('___')
    }
    for (const b of ['A2', 'B1', 'B2', 'C1']) expect(PLACEMENT_QUESTIONS.filter((q) => q.band === b)).toHaveLength(6)
    for (const s of ['grammar', 'vocabulary', 'reading']) expect(PLACEMENT_QUESTIONS.filter((q) => q.skill === s)).toHaveLength(8)
  })

  it('no se puede aprobar marcando siempre la misma letra', () => {
    for (let letter = 0; letter < 4; letter++) {
      const r = scorePlacement(all(() => letter))
      expect(r.level === 'A1' || r.level === 'A2').toBe(true)
    }
  })

  it('todo bien = C1 (190) y nada = por debajo de A2 (110)', () => {
    const best = scorePlacement(all((q) => q.answer))
    expect(best.score).toBe(190)
    expect(best.level).toBe('C1')
    expect(best.correct).toBe(24)
    expect(best.skills).toEqual({ grammar: 100, vocabulary: 100, reading: 100 })
    const none = scorePlacement(all(() => -1))
    expect(none.score).toBe(110)
    expect(none.level).toBe('A1')
  })

  it('sube de nivel según los niveles que se dominan', () => {
    const upTo = (bands: string[]) => scorePlacement(all((q) => (bands.includes(q.band) ? q.answer : -1)))
    expect(upTo(['A2']).level).toBe('A2')
    expect(upTo(['A2', 'B1']).level).toBe('B1')
    expect(upTo(['A2', 'B1', 'B2']).level).toBe('B2')
    expect(upTo(['A2', 'B1', 'B2']).score).toBe(170)
  })

  it('niveles de la escala Cambridge', () => {
    expect(levelOfScore(119)).toBe('A1')
    expect(levelOfScore(120)).toBe('A2')
    expect(levelOfScore(140)).toBe('B1')
    expect(levelOfScore(160)).toBe('B2')
    expect(levelOfScore(180)).toBe('C1')
  })

  it('recomienda reforzar la destreza más floja y según el nivel', () => {
    const tips = placementTips({ level: 'B1', skills: { grammar: 90, vocabulary: 40, reading: 80 } })
    expect(tips[0]).toBe('vocabulary')
    expect(tips).toContain('wordFormation')
    expect(tips.length).toBeLessThanOrEqual(3)
    expect(placementTips({ level: 'C1', skills: { grammar: 100, vocabulary: 100, reading: 100 } })).toEqual(['timed', 'fullExam'])
    expect(placementTips({ level: 'A2', skills: { grammar: 100, vocabulary: 100, reading: 100 } }, true)).toContain('review')
  })

  it('valida resultados guardados', () => {
    expect(parsePlacement(null)).toBeNull()
    expect(parsePlacement({ score: 'x' })).toBeNull()
    const r = parsePlacement({ score: 171.4, skills: { grammar: 150, vocabulary: -3 }, date: 'nope', correct: 99, total: 24 })!
    expect(r.score).toBe(171)
    expect(r.level).toBe('B2')
    expect(r.skills).toEqual({ grammar: 100, vocabulary: 0, reading: 0 })
    expect(r.correct).toBe(24)
    expect(r.dismissed).toBe(false)
  })
})

describe('novedades', () => {
  it('cada versión tiene cambios y van de la más nueva a la más antigua', () => {
    for (const e of CHANGELOG) expect(e.items.length).toBeGreaterThan(0)
    const versions = CHANGELOG.map((e) => e.version)
    expect([...versions].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))).toEqual(versions)
  })

  it('enseña solo lo nuevo desde la última versión vista', () => {
    expect(changesSince('1.8.0', '1.9.0').map((e) => e.version)).toEqual(['1.9.0'])
    expect(changesSince('1.6.1', '1.9.0').map((e) => e.version)).toEqual(['1.9.0', '1.8.0', '1.7.0'])
    expect(changesSince('1.9.0', '1.9.0')).toEqual([])
    expect(changesSince(null, '1.9.0', 1).map((e) => e.version)).toEqual(['1.9.0'])
    // Una versión de prueba anterior no enseña cambios futuros.
    expect(changesSince('1.7.0', '1.8.0').map((e) => e.version)).toEqual(['1.8.0'])
  })
})
