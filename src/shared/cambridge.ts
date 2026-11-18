// Estimación en la Cambridge English Scale (B2 First: 122–190) a partir del porcentaje.
// Es una aproximación: Cambridge no publica una conversión exacta para exámenes de práctica.
// Puntos de referencia habituales: 60 % ≈ 160 (aprobado B2), 75 % ≈ 173 (Grade B), 80 % ≈ 180 (Grade A, C1).
const ANCHORS: Array<[number, number]> = [
  [0, 122],
  [40, 140],
  [60, 160],
  [75, 173],
  [80, 180],
  [100, 190]
]

export function percentToScale(percent: number): number {
  const p = Math.max(0, Math.min(100, percent))
  for (let i = 1; i < ANCHORS.length; i++) {
    const [x0, y0] = ANCHORS[i - 1]
    const [x1, y1] = ANCHORS[i]
    if (p <= x1) return Math.round(y0 + ((p - x0) / (x1 - x0)) * (y1 - y0))
  }
  return 190
}

export type CambridgeBand = 'A' | 'B' | 'C' | 'B1' | 'none'

export interface CambridgeResult {
  scale: number
  band: CambridgeBand
  /** Nivel MCER que certificaría. */
  cefr: 'C1' | 'B2' | 'B1' | '—'
}

export function cambridgeResult(percent: number): CambridgeResult {
  const scale = percentToScale(percent)
  if (scale >= 180) return { scale, band: 'A', cefr: 'C1' }
  if (scale >= 173) return { scale, band: 'B', cefr: 'B2' }
  if (scale >= 160) return { scale, band: 'C', cefr: 'B2' }
  if (scale >= 140) return { scale, band: 'B1', cefr: 'B1' }
  return { scale, band: 'none', cefr: '—' }
}

/** Nota global: media de los papers con nota (en el examen real se promedian los cuatro). */
export function overallScale(paperPercents: Array<number | null>): number | null {
  const scales = paperPercents.filter((p): p is number => p !== null).map(percentToScale)
  return scales.length ? Math.round(scales.reduce((a, b) => a + b, 0) / scales.length) : null
}
