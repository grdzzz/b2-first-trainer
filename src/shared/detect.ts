// Detección automática de la estructura de un paper a partir del texto de su PDF.
// Lógica pura: recibe el texto por página y propone partes, preguntas, tipos, tiempo, consignas y clave.
// La propuesta nunca se aplica sola: el usuario la revisa y la confirma.
import type { Paper, PaperType, Part, QuestionKind } from './types'
import { buildPart, optionLabels, type PartSpec } from './template'

export interface TextItem {
  str: string
  x: number
  y: number
  /** Ancho del fragmento (para saber si hay espacio entre fragmentos). */
  w?: number
  h?: number
}

/** Agrupa los fragmentos de texto de pdf.js en líneas (de arriba abajo, de izquierda a derecha). */
export function itemsToLines(items: TextItem[]): string[] {
  const parts = items.filter((i) => i.str.trim() !== '')
  if (parts.length === 0) return []
  const sorted = [...parts].sort((a, b) => b.y - a.y || a.x - b.x)
  const rows: TextItem[][] = []
  for (const it of sorted) {
    const row = rows[rows.length - 1]
    const tol = Math.max(2, (it.h ?? 10) * 0.45)
    if (row && Math.abs(row[0].y - it.y) <= tol) row.push(it)
    else rows.push([it])
  }
  return rows.map((r) => {
    r.sort((a, b) => a.x - b.x)
    let out = ''
    let prevEnd: number | null = null
    for (const it of r) {
      const gapNeeded = prevEnd === null || it.w === undefined ? out !== '' : it.x - prevEnd > Math.max(1, (it.h ?? 10) * 0.12)
      if (gapNeeded && !/\s$/.test(out) && !/^\s/.test(it.str)) out += ' '
      out += it.str
      prevEnd = it.w === undefined ? null : it.x + it.w
    }
    // Las fuentes de símbolos de algunos PDF usan caracteres privados para las viñetas.
    return out.replace(/[\uE000-\uF8FF\u25AA\u25A0\u2022]/g, '•').replace(/\s+/g, ' ').trim()
  })
}

export interface DetectedPart {
  number: number
  title: string
  category: string
  kind: QuestionKind
  firstQuestion: number
  count: number
  options?: number
  points: number
  minWords?: number
  maxWords?: number
  /** Página (1..n) donde empieza. */
  page: number
  prompt?: string
  /** true si el tipo de tarea se ha reconocido por sus instrucciones. */
  recognized: boolean
}

export interface Detection {
  /** ¿El PDF tiene texto seleccionable? Si no, probablemente es un escaneo. */
  hasText: boolean
  paperType?: PaperType
  timeLimitMin?: number
  parts: DetectedPart[]
  /** Clave encontrada, en el formato de texto simple ("1 B"). */
  keyText?: string
  keyCount: number
  warnings: string[]
}

const DASH = '[-–—]'
const PAPER_NAMES: Array<[PaperType, RegExp]> = [
  ['reading', /reading\s*(?:and|&)\s*use\s*of\s*english/i],
  ['writing', /\bwriting\b/i],
  ['listening', /\blistening\b/i],
  ['speaking', /\bspeaking\b/i]
]

const HEADING = /^(?:(reading\s*(?:and|&)\s*use\s*of\s*english|writing|listening|speaking)\s*[^\w\s]{0,2}\s*)?part\s+(\d{1,2})\b(.{0,30})$/i

/** Líneas que no son contenido (números de página, pies, avisos). */
function isNoise(line: string): boolean {
  return (
    /^\d{1,3}$/.test(line) ||
    /^blank page$/i.test(line) ||
    /©|ucles|turn over|^\[?turn over\]?$/i.test(line) ||
    /^\d{3}\/\d{4}\/\d$/.test(line) ||
    /^cambridge english/i.test(line)
  )
}

export function detectPaperType(text: string): PaperType | undefined {
  const head = text.slice(0, 2500)
  for (const [type, re] of PAPER_NAMES) if (re.test(head)) return type
  return undefined
}

export function detectTime(text: string): number | undefined {
  const re = /\b(?:time|approximately|approx\.?)\s*:?\s*(?:(\d+)\s*hours?)?\s*(?:and\s*)?(?:(\d+)\s*min(?:ute)?s?)?/gi
  for (const m of text.matchAll(re)) {
    if (!m[1] && !m[2]) continue
    const total = Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)
    if (total > 0 && total <= 300) return total
  }
  return undefined
}

function optionCount(text: string): number | undefined {
  const range = new RegExp(`\\(?\\b([A-H])\\s*${DASH}\\s*([A-H])\\b\\)?`).exec(text)
  if (range) {
    const n = range[2].charCodeAt(0) - range[1].charCodeAt(0) + 1
    if (n >= 2 && n <= 12) return n
  }
  const list = /\(?\b(A),\s*B(?:,\s*([C-H]))*(?:,?\s*(?:or|and)\s*([B-H]))\)?/.exec(text)
  if (list) {
    const last = list[3] ?? list[2] ?? 'B'
    return last.charCodeAt(0) - 64
  }
  return undefined
}

interface TaskRule {
  test: RegExp
  category: string
  title: string
  kind: QuestionKind
  points: number
  options?: number
}

const RULES: Record<PaperType, TaskRule[]> = {
  reading: [
    { test: /word given in capitals|form a word that fits/i, category: 'Word formation', title: 'Word formation', kind: 'text', points: 1 },
    { test: /second sentence so that it has a similar meaning|using the word given/i, category: 'Key word transformation', title: 'Key word transformation', kind: 'text', points: 2 },
    { test: /think of the word which best fits|use only one word in each gap/i, category: 'Open cloze', title: 'Open cloze', kind: 'text', points: 1 },
    { test: /sentences have been removed|paragraphs have been removed|fits each gap.*sentences|choose from the sentences/i, category: 'Gapped text', title: 'Gapped text', kind: 'choice', points: 2, options: 7 },
    { test: /read the text below and decide which answer|best fits each gap/i, category: 'Multiple-choice cloze', title: 'Multiple-choice cloze', kind: 'choice', points: 1, options: 4 },
    { test: /choose from the (?:sections|people|reviews|texts|paragraphs|extracts|candidates|writers|places)|which (?:section|person|paragraph|text)/i, category: 'Multiple matching (reading)', title: 'Multiple matching', kind: 'choice', points: 1, options: 6 },
    { test: /choose the answer \(?A, B, C or D\)?|which you think fits best according to the text/i, category: 'Multiple choice (reading)', title: 'Multiple choice', kind: 'choice', points: 2, options: 4 }
  ],
  listening: [
    { test: /complete the sentences|complete the notes|complete each sentence/i, category: 'Sentence completion', title: 'Sentence completion', kind: 'text', points: 1 },
    { test: /choose from the list|five (?:short )?extracts|five different people/i, category: 'Multiple matching (listening)', title: 'Multiple matching', kind: 'choice', points: 1, options: 8 },
    { test: /interview|conversation between/i, category: 'Multiple choice (listening)', title: 'Multiple choice (interview)', kind: 'choice', points: 1, options: 3 },
    { test: /different situations|choose the best answer/i, category: 'Multiple choice (listening)', title: 'Multiple choice (short extracts)', kind: 'choice', points: 1, options: 3 }
  ],
  writing: [],
  speaking: []
}

const SPEAKING_TITLES: Record<number, [string, string]> = {
  1: ['Interview', 'Speaking interview'],
  2: ['Long turn', 'Speaking long turn'],
  3: ['Collaborative task', 'Speaking collaborative task'],
  4: ['Discussion', 'Speaking discussion']
}

interface RawPart {
  number: number
  page: number
  lines: string[]
}

/** Divide el documento en partes según los encabezados "Part N". */
function splitParts(pages: string[][]): RawPart[] {
  const parts: RawPart[] = []
  let current: RawPart | null = null
  pages.forEach((lines, p) => {
    for (const line of lines) {
      const h = HEADING.exec(line)
      if (h) {
        const n = Number(h[2])
        const seen = parts.find((x) => x.number === n)
        // Un encabezado repetido (p. ej. "Part 1 (continued)") sigue en la misma parte.
        if (seen) {
          current = seen
          continue
        }
        current = { number: n, page: p + 1, lines: [] }
        parts.push(current)
        continue
      }
      if (current && !isNoise(line)) current.lines.push(line)
    }
  })
  return parts.sort((a, b) => a.number - b.number)
}

function questionRange(text: string): [number, number] | undefined {
  const m = new RegExp(`questions?\\s+(\\d{1,2})\\s*(?:${DASH}|to)\\s*(\\d{1,2})`, 'i').exec(text)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (b >= a && b - a < 60) return [a, b]
  }
  // "…fits each gap (37 – 42)."
  const p = new RegExp(`\\((\\d{1,2})\\s*${DASH}\\s*(\\d{1,2})\\)`).exec(text)
  if (p) {
    const a = Number(p[1])
    const b = Number(p[2])
    if (b >= a && b - a < 60) return [a, b]
  }
  return undefined
}

/** Números de pregunta al inicio de línea ("1 In your English class…"), en orden creciente. */
function numberedLines(lines: string[]): number[] {
  const nums: number[] = []
  for (const l of lines) {
    const m = /^(\d{1,2})\s+[A-Za-z(“"'‘]/.exec(l)
    if (!m) continue
    const n = Number(m[1])
    if (nums.length === 0 || n === nums[nums.length - 1] + 1) nums.push(n)
  }
  return nums
}

function words(text: string): { min: number; max: number } | undefined {
  const m = new RegExp(`(\\d{2,3})\\s*${DASH}\\s*(\\d{2,3})\\s*words`, 'i').exec(text)
  if (!m) return undefined
  const min = Number(m[1])
  const max = Number(m[2])
  return max > min ? { min, max } : undefined
}

/** Une líneas cortadas a mitad de frase (el PDF parte los párrafos por el ancho de la página). */
export function reflow(lines: string[]): string {
  const out: string[] = []
  for (const line of lines) {
    const prev = out[out.length - 1]
    if (prev !== undefined && !/[.?!:;)"”…]$/.test(prev) && /^[a-z(,]/.test(line)) out[out.length - 1] = `${prev} ${line}`
    else out.push(line)
  }
  return out.join('\n').trim()
}

/** Consigna de Writing/Speaking: el texto desde la primera pregunta numerada (o tras las instrucciones). */
function extractPrompt(lines: string[]): string {
  let start = lines.findIndex((l) => /^\d{1,2}\s+\S/.test(l))
  if (start === -1) start = 0
  return reflow(lines.slice(start))
}

function writingTitle(number: number, text: string): [string, string] {
  if (number === 1) return ['Essay', 'Essay']
  const genres = Array.from(new Set(Array.from(text.matchAll(/write your (\w+)/gi), (m) => m[1].toLowerCase()))).filter((g) => !['answer', 'answers', 'name'].includes(g))
  const title = genres.length ? genres.join(' / ') : 'Article / email / letter / report / review'
  return [title.charAt(0).toUpperCase() + title.slice(1), 'Writing part 2']
}

/** Busca una clave de respuestas ("Answer key") y la devuelve en formato de texto simple. */
export function detectKey(pages: string[][]): { text: string; count: number } | undefined {
  const out = new Map<number, string>()
  let inKey = false
  for (const lines of pages) {
    for (const line of lines) {
      if (/^(?:answer\s+key|key|answers)\b/i.test(line) || /\banswer key\b/i.test(line)) {
        inKey = true
        continue
      }
      if (!inKey) continue
      // Varios pares en una línea: "1 B 2 C 3 A"
      const pairs = Array.from(line.matchAll(/(?:^|\s)(\d{1,2})\s*[.):]?\s+([A-H])(?=\s|$)/g))
      if (pairs.length > 1 && /^(?:\s*\d{1,2}\s*[.):]?\s+[A-H](?=\s|$))+\s*$/.test(line)) {
        for (const p of pairs) if (!out.has(Number(p[1]))) out.set(Number(p[1]), p[2])
        continue
      }
      const m = /^(\d{1,2})\s*[.):]?\s+(.{1,80})$/.exec(line)
      if (m && !out.has(Number(m[1]))) out.set(Number(m[1]), m[2].trim())
    }
  }
  if (out.size < 3) return undefined
  const text = Array.from(out.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([n, a]) => `${n} ${a}`)
    .join('\n')
  return { text, count: out.size }
}

/**
 * Detecta la estructura. `pages` es el texto de cada página, ya dividido en líneas.
 * `expected` es el tipo de paper desde el que se lanza la detección.
 */
export function detectStructure(pages: string[][], expected: PaperType): Detection {
  const all = pages.map((l) => l.join('\n')).join('\n')
  const warnings: string[] = []
  const hasText = all.replace(/\s/g, '').length > 80
  if (!hasText) return { hasText, parts: [], keyCount: 0, warnings: ['El PDF no tiene texto seleccionable (probablemente es un escaneo).'] }

  const paperType = detectPaperType(all)
  if (paperType && paperType !== expected) warnings.push(`El PDF parece de ${paperType}, no de ${expected}. Revisa que sea el archivo correcto.`)
  const type = expected
  const raw = splitParts(pages)
  if (raw.length === 0) warnings.push('No se han encontrado encabezados "Part 1", "Part 2"…')

  const parts: DetectedPart[] = []
  let next = 1
  for (const r of raw) {
    const text = r.lines.join('\n')
    const range = questionRange(text)
    let first = range?.[0]
    let count = range ? range[1] - range[0] + 1 : undefined
    let recognized = false
    let spec: Pick<DetectedPart, 'title' | 'category' | 'kind' | 'points' | 'options' | 'minWords' | 'maxWords' | 'prompt'>

    if (type === 'writing') {
      const w = words(text)
      const [title, category] = writingTitle(r.number, text)
      recognized = !!w
      // Writing: una respuesta por parte (en la parte 2 se elige una de las tareas).
      first = next
      count = 1
      spec = { title, category, kind: 'essay', points: 0, minWords: w?.min ?? 140, maxWords: w?.max ?? 190, prompt: extractPrompt(r.lines) }
    } else if (type === 'speaking') {
      const [title, category] = SPEAKING_TITLES[r.number] ?? [`Part ${r.number}`, 'Speaking']
      recognized = r.number in SPEAKING_TITLES
      first = next
      count = 1
      spec = { title, category, kind: 'speaking', points: 0, prompt: extractPrompt(r.lines) }
    } else {
      const rule = RULES[type].find((x) => x.test.test(text))
      recognized = !!rule
      const opts = optionCount(text) ?? rule?.options
      const kind: QuestionKind = rule?.kind ?? (opts ? 'choice' : 'text')
      spec = {
        title: rule?.title ?? `Part ${r.number}`,
        category: rule?.category ?? `Part ${r.number}`,
        kind,
        points: rule?.points ?? 1,
        options: kind === 'choice' ? opts ?? 4 : undefined
      }
      if (!range) {
        const nums = numberedLines(r.lines)
        if (nums.length > 0) {
          first = nums[0]
          count = nums.length
        }
      }
      if (!first || !count) {
        warnings.push(`Parte ${r.number}: no se ha encontrado el número de preguntas; revisa la cantidad.`)
        first = next
        count = 5
      }
      if (!recognized) warnings.push(`Parte ${r.number}: no se ha reconocido el tipo de tarea.`)
    }
    if (first !== next && parts.length > 0) warnings.push(`Parte ${r.number}: la numeración no es continua (empieza en ${first}, se esperaba ${next}).`)
    parts.push({ number: r.number, page: r.page, firstQuestion: first, count, recognized, ...spec })
    next = first + count
  }

  const missing = parts.map((p) => p.number).filter((n, i) => n !== i + 1)
  if (missing.length) warnings.push('Faltan partes intermedias o hay números de parte repetidos.')

  const key = type === 'reading' || type === 'listening' ? detectKey(pages) : undefined
  return { hasText, paperType, timeLimitMin: detectTime(all), parts, keyText: key?.text, keyCount: key?.count ?? 0, warnings }
}

/**
 * Sustituye las partes del paper por las detectadas. Conserva, por posición, los identificadores
 * y archivos de las partes existentes y la clave de las preguntas que mantienen número y tipo.
 */
export function applyDetection(paper: Paper, det: Detection, opts: { applyTime?: boolean } = {}): Paper {
  const parts: Part[] = det.parts.map((d, i) => {
    const spec: PartSpec = { title: d.title, category: d.category, count: d.count, kind: d.kind, options: d.options, points: d.points, minWords: d.minWords, maxWords: d.maxWords }
    const built = buildPart(spec, i + 1, d.firstQuestion)
    const old = paper.parts[i]
    const oldQs = new Map((old?.questions ?? []).map((q) => [q.number, q]))
    return {
      ...built,
      id: old?.id ?? built.id,
      files: old?.files ?? {},
      instructions: old?.instructions,
      pdfPage: d.page,
      questions: built.questions.map((q) => {
        const prev = oldQs.get(q.number)
        const keep = prev && prev.kind === q.kind && (q.kind !== 'choice' || (prev.answers ?? []).every((a) => q.options?.includes(a)))
        return {
          ...q,
          id: prev?.id ?? q.id,
          answers: keep ? prev!.answers : undefined,
          prompt: d.prompt || prev?.prompt,
          options: q.kind === 'choice' ? optionLabels(d.options ?? 4) : undefined
        }
      })
    }
  })
  return { ...paper, parts, timeLimitMin: opts.applyTime && det.timeLimitMin ? det.timeLimitMin : paper.timeLimitMin }
}
