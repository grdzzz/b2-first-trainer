// Ejercicios y explicaciones personalizados a partir de tus errores, con un chat de IA (copiar y pegar).
// Nada se envía solo: la app prepara el texto, el alumno elige qué datos incluye, lo copia y pega la
// respuesta. Toda respuesta se valida estrictamente antes de guardarla.
import { buildSheetPrompt, parseSheets, SHEET_FORMAT, SHEET_FORMAT_VERSION, type PracticeSheet, type PracticeSkill } from '../practice'
import { competency, COMPETENCIES, isCompetencyId } from './taxonomy'
import { partLabel } from './taxonomy'
import type { ErrorRecord } from './notebook'

export type ErrorPromptMode = 'sheets' | 'explanations' | 'lesson' | 'variations' | 'recurring'
export const ERROR_PROMPT_MODES: ErrorPromptMode[] = ['sheets', 'variations', 'recurring', 'explanations', 'lesson']

export interface ErrorPromptOptions {
  mode: ErrorPromptMode
  /** Datos de cada error que se incluyen en el texto. */
  include: { given: boolean; context: boolean; explanation: boolean; notes: boolean; category: boolean }
  difficulty: 'easier' | 'same' | 'harder'
  /** Hojas a pedir (modos de ejercicios). */
  count: number
}

export const DEFAULT_PROMPT_OPTIONS: ErrorPromptOptions = {
  mode: 'sheets',
  include: { given: true, context: true, explanation: true, notes: false, category: true },
  difficulty: 'same',
  count: 1
}

export const MAX_PROMPT_ERRORS = 25

/** Alias que ven la IA y el alumno (E1, E2…): los ids internos no salen de la app. */
export function aliasOf(index: number): string {
  return `E${index + 1}`
}

function describe(r: ErrorRecord, i: number, inc: ErrorPromptOptions['include']): string {
  const lines = [`${aliasOf(i)}.`]
  if (r.part) lines.push(`   Parte: ${partLabel(r.part)}`)
  if (r.question) lines.push(`   Pregunta: ${r.question}`)
  if (inc.context && r.context) lines.push(`   Contexto: ${r.context}`)
  if (inc.given) lines.push(`   Respuesta del estudiante: ${r.given || '(sin respuesta)'}`)
  lines.push(`   Respuesta correcta: ${r.expected.join(' / ') || '(no disponible)'}`)
  if (inc.explanation && r.explanation) lines.push(`   Explicación actual: ${r.explanation}`)
  if (inc.category && r.category) lines.push(`   Competencia: ${competency(r.category)?.label}${r.subcategory ? ` (${r.subcategory})` : ''}`)
  if (inc.notes && r.notes) lines.push(`   Notas del estudiante: ${r.notes}`)
  if (r.fails > 1) lines.push(`   Veces fallado: ${r.fails}`)
  return lines.join('\n')
}

function dominantSkill(errors: ErrorRecord[]): PracticeSkill {
  const groups = errors.map((e) => competency(e.category)?.group)
  const count = (g: string) => groups.filter((x) => x === g).length
  if (errors.every((e) => e.skill === 'reading')) return 'reading'
  if (errors.every((e) => e.category === 'vocabulary.wordFormation' || e.part === 'reading.p3')) return 'wordFormation'
  if (count('grammar') > count('vocabulary') * 2) return 'grammar'
  if (count('vocabulary') > count('grammar') * 2) return 'vocabulary'
  return 'mixed'
}

/** Texto para copiar en un chat de IA. */
export function buildErrorsPrompt(errors: ErrorRecord[], opts: ErrorPromptOptions): string {
  const list = errors.slice(0, MAX_PROMPT_ERRORS)
  const block = list.map((r, i) => describe(r, i, opts.include)).join('\n\n')
  const level = opts.difficulty === 'easier' ? 'un poco más fácil que el B2 (B1+), para afianzar' : opts.difficulty === 'harder' ? 'algo más exigente que el B2 (B2+/C1)' : 'nivel B2 real'
  const head = ['Eres un profesor experto en el examen Cambridge B2 First (FCE). Estos son errores reales de un estudiante hispanohablante:', '', block, '']

  if (opts.mode === 'explanations') {
    const cats = COMPETENCIES.filter((c) => !c.manualOnly).map((c) => c.id).join(', ')
    return [
      ...head,
      'TAREA',
      '- Para cada error, explica en español (máx. 60 palabras) por qué la respuesta correcta es la buena y cuál es la regla o el matiz. Incluye un ejemplo nuevo en inglés.',
      `- Si lo ves claro, indica la competencia con uno de estos identificadores: ${cats}. Si no estás seguro, no pongas "category".`,
      '- No evalúes la pronunciación.',
      '',
      'FORMATO DE RESPUESTA (obligatorio)',
      'Responde SOLO con un bloque de código JSON válido, sin texto antes ni después:',
      '```json',
      JSON.stringify({ formato: 'b2ft-explicaciones', version: 1, items: [{ id: 'E1', explanation: 'Explicación en español con un ejemplo en inglés.', category: 'grammar.prepositions' }] }, null, 2),
      '```'
    ].join('\n')
  }

  if (opts.mode === 'lesson') {
    return [
      ...head,
      'TAREA',
      '- Escribe una lección breve y personalizada (en español, con ejemplos en inglés) que explique lo que tienen en común estos errores y cómo evitarlos en el examen.',
      '- De 2 a 6 secciones; cada una con un título, un texto (máx. 150 palabras) y de 1 a 4 ejemplos en inglés.',
      '- Contenido original. No evalúes la pronunciación.',
      '',
      'FORMATO DE RESPUESTA (obligatorio)',
      'Responde SOLO con un bloque de código JSON válido, sin texto antes ni después:',
      '```json',
      JSON.stringify({ formato: 'b2ft-leccion', version: 1, title: 'Título de la lección', sections: [{ heading: 'Título de la sección', text: 'Explicación…', examples: ['Example sentence.'] }] }, null, 2),
      '```'
    ].join('\n')
  }

  // Modos de ejercicios: se pide una hoja en el formato de siempre (validación estricta al importar).
  const focus =
    opts.mode === 'variations'
      ? `ejercicios ORIGINALES equivalentes a estos errores (mismas estructuras y trampas, con otras frases y otros temas), ${level}`
      : opts.mode === 'recurring'
        ? `ejercicios centrados en los errores que más se repiten (los que tienen más fallos), ${level}`
        : `ejercicios ORIGINALES que practiquen las mismas competencias, ${level}`
  const base = buildSheetPrompt({ skill: dominantSkill(list), topic: '', count: opts.count, focus })
  return [...head, 'Usa estos errores solo como referencia: NO los copies literalmente en los ejercicios.', '', base].join('\n')
}

// ---------- Importación ----------

export class AiImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiImportError'
  }
}

function extract(text: string): unknown {
  const t = text.trim()
  const candidates: string[] = []
  for (const m of t.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) candidates.push(m[1])
  candidates.push(t)
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first !== -1 && last > first) candidates.push(t.slice(first, last + 1))
  for (const c of [...candidates, ...candidates.map((x) => x.replace(/[“”]/g, '"'))]) {
    try {
      return JSON.parse(c)
    } catch {
      /* sigue */
    }
  }
  throw new AiImportError('No se ha encontrado un JSON válido en el texto pegado. Copia la respuesta completa del chat (el bloque de código).')
}

export interface ExplanationImport {
  /** Índice del error en la lista enviada. */
  index: number
  explanation: string
  category?: string
}

export function parseExplanations(text: string, count: number): ExplanationImport[] {
  const data = extract(text) as Record<string, unknown>
  if (!data || typeof data !== 'object') throw new AiImportError('Formato no válido.')
  if (data.formato !== undefined && data.formato !== 'b2ft-explicaciones') throw new AiImportError('Esto no son explicaciones de errores (formato distinto).')
  const items = Array.isArray(data.items) ? data.items : null
  if (!items || !items.length) throw new AiImportError('No hay explicaciones en la respuesta.')
  if (items.length > count) throw new AiImportError(`Hay más explicaciones (${items.length}) que errores enviados (${count}).`)
  const seen = new Set<number>()
  return items.map((raw, i) => {
    const it = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const m = /^E(\d{1,3})$/i.exec(String(it.id ?? '').trim())
    if (!m) throw new AiImportError(`Explicación ${i + 1}: falta el identificador (E1, E2…).`)
    const index = Number(m[1]) - 1
    if (index < 0 || index >= count) throw new AiImportError(`Explicación ${i + 1}: ${it.id} no corresponde a ningún error enviado.`)
    if (seen.has(index)) throw new AiImportError(`${it.id} aparece dos veces.`)
    seen.add(index)
    const explanation = typeof it.explanation === 'string' ? it.explanation.trim() : ''
    if (explanation.length < 10) throw new AiImportError(`${it.id}: la explicación está vacía o es demasiado corta.`)
    if (explanation.length > 1500) throw new AiImportError(`${it.id}: la explicación es demasiado larga.`)
    const cat = it.category
    if (cat !== undefined && cat !== null && cat !== '' && (!isCompetencyId(cat) || competency(cat as string)?.manualOnly)) throw new AiImportError(`${it.id}: la competencia «${String(cat)}» no es válida.`)
    return { index, explanation, ...(isCompetencyId(cat) && !competency(cat)?.manualOnly ? { category: cat } : {}) }
  })
}

export interface LessonImport {
  title: string
  sections: Array<{ heading: string; text: string; examples: string[] }>
}

export function parseLesson(text: string): LessonImport {
  const data = extract(text) as Record<string, unknown>
  if (!data || typeof data !== 'object') throw new AiImportError('Formato no válido.')
  if (data.formato !== undefined && data.formato !== 'b2ft-leccion') throw new AiImportError('Esto no es una lección (formato distinto).')
  const title = typeof data.title === 'string' ? data.title.trim() : ''
  if (!title || title.length > 160) throw new AiImportError('La lección necesita un título (máx. 160 caracteres).')
  const sections = Array.isArray(data.sections) ? data.sections : []
  if (sections.length < 1 || sections.length > 8) throw new AiImportError('La lección debe tener de 1 a 8 secciones.')
  return {
    title,
    sections: sections.map((raw, i) => {
      const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
      const heading = typeof s.heading === 'string' ? s.heading.trim() : ''
      const body = typeof s.text === 'string' ? s.text.trim() : ''
      if (!heading || !body) throw new AiImportError(`Sección ${i + 1}: faltan el título o el texto.`)
      if (body.length > 3000) throw new AiImportError(`Sección ${i + 1}: el texto es demasiado largo.`)
      const examples = Array.isArray(s.examples) ? s.examples.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim().slice(0, 300)).slice(0, 6) : []
      return { heading: heading.slice(0, 160), text: body, examples }
    })
  }
}

/** Hojas de práctica generadas a partir de errores: mismo validador estricto que el resto de hojas. */
export function parseErrorSheets(text: string): Array<Omit<PracticeSheet, 'id'>> {
  return parseSheets(text)
}

export { SHEET_FORMAT, SHEET_FORMAT_VERSION }
