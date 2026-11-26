// Búsqueda tolerante a pequeños errores tipográficos (paleta de comandos, cuaderno de errores).
// Sin dependencias: cada palabra de la búsqueda debe aparecer en el texto, exacta, como prefijo, como
// subsecuencia o con una o dos letras cambiadas (distancia de Damerau-Levenshtein).

export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[’`´]/g, "'")
}

function tokens(s: string): string[] {
  return normalizeSearch(s).split(/[^a-z0-9ñ']+/).filter(Boolean)
}

/** Distancia de Damerau-Levenshtein (transposición de letras vecinas incluida), con tope. */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      rowMin = Math.min(rowMin, d[i][j])
    }
    if (rowMin > max) return max + 1
  }
  return d[a.length][b.length]
}

function isSubsequence(q: string, t: string): boolean {
  let i = 0
  for (let j = 0; j < t.length && i < q.length; j++) if (q[i] === t[j]) i++
  return i === q.length
}

/** Puntuación de una palabra de la búsqueda frente a las palabras del texto (0 = no aparece). */
function tokenScore(q: string, words: string[], full: string): number {
  if (full.includes(q)) {
    let best = 6
    for (const w of words) {
      if (w === q) return 12
      if (w.startsWith(q)) best = Math.max(best, 9)
    }
    return best
  }
  let best = 0
  const max = q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0
  for (const w of words) {
    if (max > 0) {
      // Compara también con el principio de palabras largas («gramar» ~ «grammar»).
      const cand = w.length > q.length + max ? w.slice(0, q.length + 1) : w
      const dist = editDistance(q, cand, max)
      if (dist <= max) best = Math.max(best, 5 - dist)
    }
    if (q.length >= 3 && w.length <= q.length * 2.5 && isSubsequence(q, w)) best = Math.max(best, 3)
  }
  return best
}

/** Puntuación de un texto para una búsqueda. 0 si no encaja; más alto = mejor. */
export function fuzzyScore(query: string, text: string): number {
  const qs = tokens(query)
  if (qs.length === 0) return 1
  const full = normalizeSearch(text)
  const words = tokens(text)
  let total = 0
  for (const q of qs) {
    const s = tokenScore(q, words, full)
    if (s === 0) return 0
    total += s
  }
  // Coincidencia al principio del texto: un poco mejor.
  if (full.startsWith(normalizeSearch(query.trim()))) total += 4
  return total
}

/** Ordena y filtra una lista por la búsqueda. */
export function fuzzyFilter<T>(items: T[], query: string, text: (item: T) => string, limit = 50): T[] {
  if (!query.trim()) return items.slice(0, limit)
  return items
    .map((item, i) => ({ item, i, s: fuzzyScore(query, text(item)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.item)
}
