import { describe, expect, it } from 'vitest'
import { cambridgeResult, overallScale, percentToScale } from '@shared/cambridge'

describe('Cambridge English Scale', () => {
  it('convierte con los puntos de referencia', () => {
    expect(percentToScale(0)).toBe(122)
    expect(percentToScale(60)).toBe(160)
    expect(percentToScale(75)).toBe(173)
    expect(percentToScale(80)).toBe(180)
    expect(percentToScale(100)).toBe(190)
    expect(percentToScale(50)).toBe(150)
    expect(percentToScale(150)).toBe(190)
  })
  it('bandas y nivel', () => {
    expect(cambridgeResult(85)).toMatchObject({ band: 'A', cefr: 'C1' })
    expect(cambridgeResult(76)).toMatchObject({ band: 'B', cefr: 'B2' })
    expect(cambridgeResult(62)).toMatchObject({ band: 'C', cefr: 'B2' })
    expect(cambridgeResult(45)).toMatchObject({ band: 'B1', cefr: 'B1' })
    expect(cambridgeResult(10)).toMatchObject({ band: 'none', cefr: '—' })
  })
  it('media global', () => {
    expect(overallScale([60, 80, null])).toBe(170)
    expect(overallScale([null])).toBeNull()
  })
})
