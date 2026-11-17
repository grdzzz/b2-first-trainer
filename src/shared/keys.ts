// Parseo, validación y aplicación de claves de respuestas (JSON o texto simple).
import type { Exam, Paper, PaperType, Part } from './types'
import { PAPER_ORDER } from './types'

export const KEY_FORMAT = 'b2-first-key'
export const KEY_VERSION = 1

/** Número de pregunta → respuestas aceptadas. */
export type AnswerMap = Record<number, string[]>

export interface ParsedKey {
  /** Claves agrupadas por paper. */
  papers: Partial<Record<PaperType, AnswerMap>>
  /** Claves sin paper indicado (se aplican al paper/parte de destino). */
  loose: AnswerMap
  warnings: string[]
}

export class KeyParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KeyParseError'
  }
}

const PAPER_ALIASES: Record<string, PaperType> = {
  reading: 'reading',
  'reading-use-of-english': 'reading',
  'reading & use of english': 'reading',
  'reading and use of english': 'reading',
  'use of english': 'reading',
  rue: 'reading',
  writing: 'writing',
  listening: 'listening',
  speaking: 'speaking'
}

export function paperTypeFromName(name: string): PaperType | undefined {
  return PAPER_ALIASES[name.trim().toLowerCase()]
}

function cleanAnswers(raw: unknown, ctx: string, warnings: string[]): string[] | null {
  const list = Array.isArray(raw) ? raw : [raw]
  const out: string[] = []
  for (const item of list) {
    if (typeof item === 'number') out.push(String(item))
    else if (typeof item === 'string') {
      const t = item.trim()
      if (t) out.push(t)
    } else {
      warnings.push(`${ctx}: valor no válido (se esperaba texto o lista de textos).`)
      return null
    }
  }
  if (out.length === 0) {
    warnings.push(`${ctx}: respuesta vacía, se ignora.`)
    return null
  }
  return Array.from(new Set(out))
}

function parseAnswerObject(obj: unknown, ctx: string, warnings: string[]): AnswerMap {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new KeyParseError(`${ctx}: se esperaba un objeto { "número": "respuesta" }.`)
  }
  const map: AnswerMap = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const n = Number(k.trim())
    if (!Number.isInteger(n) || n <= 0) {
      warnings.push(`${ctx}: "${k}" no es un número de pregunta válido, se ignora.`)
      continue
    }
    const answers = cleanAnswers(v, `${ctx} pregunta ${n}`, warnings)
    if (answers) map[n] = answers
  }
  return map
}

/**
 * Formatos JSON aceptados:
 *  1) Completo: { "format": "b2-first-key", "version": 1, "papers": { "reading": { "1": "B", "9": ["at", "in"] } } }
 *  2) Una parte/paper: { "answers": { "1": "B" } }
 *  3) Mínimo: { "1": "B", "2": "C" }
 */
export function parseKeyJson(text: string): ParsedKey {
  let data: unknown
  try {
    data = JSON.parse(text.replace(/^﻿/, ''))
  } catch (e) {
    throw new KeyParseError(`El archivo no es un JSON válido: ${(e as Error).message}`)
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new KeyParseError('La clave debe ser un objeto JSON.')
  }
  const obj = data as Record<string, unknown>
  const warnings: string[] = []
  const result: ParsedKey = { papers: {}, loose: {}, warnings }

  if (obj.format !== undefined && obj.format !== KEY_FORMAT) {
    warnings.push(`Formato "${String(obj.format)}" desconocido; se intenta leer igualmente.`)
  }
  if (obj.version !== undefined && obj.version !== KEY_VERSION) {
    warnings.push(`Versión ${String(obj.version)} no reconocida; se intenta leer como versión ${KEY_VERSION}.`)
  }

  if ('papers' in obj) {
    const papers = obj.papers
    if (!papers || typeof papers !== 'object' || Array.isArray(papers)) {
      throw new KeyParseError('"papers" debe ser un objeto con claves reading, listening…')
    }
    for (const [name, answers] of Object.entries(papers as Record<string, unknown>)) {
      const type = paperTypeFromName(name)
      if (!type) {
        warnings.push(`Paper "${name}" desconocido, se ignora.`)
        continue
      }
      result.papers[type] = { ...(result.papers[type] ?? {}), ...parseAnswerObject(answers, name, warnings) }
    }
  } else if ('answers' in obj) {
    result.loose = parseAnswerObject(obj.answers, 'answers', warnings)
  } else {
    const meta = new Set(['format', 'version', 'name', 'exam'])
    const rest = Object.fromEntries(Object.entries(obj).filter(([k]) => !meta.has(k)))
    result.loose = parseAnswerObject(rest, 'clave', warnings)
  }

  if (countAnswers(result) === 0) throw new KeyParseError('La clave no contiene ninguna respuesta.')
  return result
}

const LINE_RE = /^(\d+)\s*[.):\-–=]?\s+(.+)$|^(\d+)\s*[.):\-–=]\s*(.+)$/
const SECTION_RE = /^\s*(?:\[\s*([^\]]+?)\s*\]|#{1,3}\s*(.+?)|([A-Za-z &]+?):)\s*$/

/** Separa alternativas escritas como "at / in" o "at | in". */
export function splitAlternatives(raw: string): string[] {
  return raw
    .split(/\s*[|/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Formato de texto simple (una respuesta por línea):
 *   [reading]
 *   1 B
 *   9 which
 *   10 at / in
 * Las líneas que empiezan por "//" o ";" son comentarios. Los encabezados de sección son opcionales.
 */
export function parseKeyText(text: string): ParsedKey {
  const warnings: string[] = []
  const result: ParsedKey = { papers: {}, loose: {}, warnings }
  let current: AnswerMap = result.loose
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  lines.forEach((rawLine, i) => {
    const line = rawLine.trim()
    if (!line || line.startsWith('//') || line.startsWith(';')) return
    const section = SECTION_RE.exec(line)
    if (section && !/^\d/.test(line)) {
      const name = section[1] ?? section[2] ?? section[3] ?? ''
      const type = paperTypeFromName(name)
      if (type) {
        result.papers[type] = result.papers[type] ?? {}
        current = result.papers[type]!
      } else {
        warnings.push(`Línea ${i + 1}: sección "${name}" desconocida, se ignora.`)
      }
      return
    }
    const m = LINE_RE.exec(line)
    if (!m) {
      warnings.push(`Línea ${i + 1}: no se entiende "${line}" (formato esperado: "1 B").`)
      return
    }
    const n = Number(m[1] ?? m[3])
    const answers = splitAlternatives(m[2] ?? m[4] ?? '')
    if (answers.length === 0) {
      warnings.push(`Línea ${i + 1}: respuesta vacía.`)
      return
    }
    if (current[n]) warnings.push(`Línea ${i + 1}: la pregunta ${n} estaba repetida; se usa la última.`)
    current[n] = answers
  })
  if (countAnswers(result) === 0) throw new KeyParseError('No se ha encontrado ninguna respuesta. Usa una línea por pregunta, por ejemplo "1 B".')
  return result
}

/** Detecta el formato automáticamente. */
export function parseKey(text: string): ParsedKey {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return parseKeyJson(trimmed)
  return parseKeyText(trimmed)
}

export function countAnswers(key: ParsedKey): number {
  let n = Object.keys(key.loose).length
  for (const m of Object.values(key.papers)) n += Object.keys(m ?? {}).length
  return n
}

export interface KeyTarget {
  /** Si se indica, la clave "suelta" se aplica a este paper. */
  paperId?: string
  /** Si se indica, solo se tocan preguntas de esta parte. */
  partId?: string
  /** Si es true, las preguntas del ámbito sin respuesta en la clave quedan sin clave. */
  replace?: boolean
}

export interface ApplyKeyReport {
  applied: number
  /** Números de pregunta de la clave sin pregunta correspondiente. */
  unmatched: string[]
  /** Respuestas descartadas por no ser válidas para la pregunta. */
  invalid: string[]
  warnings: string[]
}

function applyToPaper(paper: Paper, answers: AnswerMap, partId: string | undefined, replace: boolean, report: ApplyKeyReport, label: string): Paper {
  const inScope = (part: Part) => !partId || part.id === partId
  const known = new Set<number>()
  const parts = paper.parts.map((part) => {
    if (!inScope(part)) return part
    return {
      ...part,
      questions: part.questions.map((q) => {
        known.add(q.number)
        const given = answers[q.number]
        if (!given) return replace ? { ...q, answers: undefined } : q
        if (q.kind === 'essay' || q.kind === 'speaking') {
          report.invalid.push(`${label} ${q.number}: las preguntas de redacción o speaking no usan clave.`)
          return q
        }
        if (q.kind === 'choice') {
          const opts = q.options ?? []
          const valid = given.map((a) => a.trim().toUpperCase()).filter((a) => opts.includes(a))
          const bad = given.filter((a) => !opts.includes(a.trim().toUpperCase()))
          if (bad.length) report.invalid.push(`${label} ${q.number}: "${bad.join(', ')}" no es una opción (${opts.join(', ')}).`)
          if (valid.length === 0) return q
          report.applied++
          return { ...q, answers: Array.from(new Set(valid)) }
        }
        report.applied++
        return { ...q, answers: given }
      })
    }
  })
  for (const n of Object.keys(answers)) if (!known.has(Number(n))) report.unmatched.push(`${label} ${n}`)
  return { ...paper, parts }
}

/** Aplica una clave a un examen sin mutarlo. */
export function applyKey(exam: Exam, key: ParsedKey, target: KeyTarget = {}): { exam: Exam; report: ApplyKeyReport } {
  const report: ApplyKeyReport = { applied: 0, unmatched: [], invalid: [], warnings: [...key.warnings] }
  const replace = target.replace ?? false
  const hasLoose = Object.keys(key.loose).length > 0
  if (hasLoose && !target.paperId) {
    const keyed = exam.papers.filter((p) => p.type === 'reading' || p.type === 'listening')
    if (keyed.length !== 1) {
      throw new KeyParseError('La clave no indica a qué paper pertenece. Impórtala desde una parte concreta o usa el formato con "papers".')
    }
  }
  const papers = exam.papers.map((paper) => {
    let next = paper
    const byType = key.papers[paper.type]
    if (byType && (!target.paperId || target.paperId === paper.id)) {
      next = applyToPaper(next, byType, target.paperId === paper.id ? target.partId : undefined, replace, report, paper.title)
    }
    const looseTarget = target.paperId
      ? target.paperId === paper.id
      : (paper.type === 'reading' || paper.type === 'listening') &&
        exam.papers.filter((p) => p.type === 'reading' || p.type === 'listening').length === 1
    if (hasLoose && looseTarget) {
      next = applyToPaper(next, key.loose, target.partId, replace, report, paper.title)
    }
    return next
  })
  if (target.partId) {
    // En importación por parte, los números fuera de la parte no son un error: solo se avisa.
    report.unmatched = report.unmatched.map((u) => `${u} (fuera de esta parte)`)
  }
  return { exam: { ...exam, papers }, report }
}

/** Convierte las respuestas de un paper (o de una parte) a texto editable. */
export function keyToText(paper: Paper, partId?: string): string {
  const lines: string[] = []
  for (const part of paper.parts) {
    if (partId && part.id !== partId) continue
    for (const q of part.questions) {
      if (q.answers?.length) lines.push(`${q.number} ${q.answers.join(' / ')}`)
    }
  }
  return lines.join('\n')
}

/** Exporta la clave completa del examen en el formato JSON documentado. */
export function exportKeyJson(exam: Exam): string {
  const papers: Record<string, Record<string, string | string[]>> = {}
  for (const type of PAPER_ORDER) {
    for (const paper of exam.papers.filter((p) => p.type === type)) {
      for (const part of paper.parts) {
        for (const q of part.questions) {
          if (!q.answers?.length) continue
          papers[type] = papers[type] ?? {}
          papers[type][String(q.number)] = q.answers.length === 1 ? q.answers[0] : q.answers
        }
      }
    }
  }
  return JSON.stringify({ format: KEY_FORMAT, version: KEY_VERSION, exam: exam.name, papers }, null, 2)
}
