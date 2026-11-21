// Hojas de práctica: ejercicios cortos (≈10 min) al estilo de Reading & Use of English del B2 First.
// No son exámenes: no aparecen en la biblioteca ni en el historial de intentos.
// Las 50 hojas incluidas son contenido original (no de Cambridge). El usuario puede añadir más
// pidiéndoselas a un chat de IA (copiar y pegar) o importando un archivo .json.

export const SHEET_FORMAT = 'b2ft-hoja'
export const SHEET_FORMAT_VERSION = 1

export type PracticeSkill = 'vocabulary' | 'grammar' | 'wordFormation' | 'reading' | 'mixed'
export const PRACTICE_SKILLS: PracticeSkill[] = ['vocabulary', 'grammar', 'wordFormation', 'reading', 'mixed']

/** Hueco de opción múltiple (Part 1). `answer` es el índice de la opción correcta (0 = A). */
export interface McItem {
  options: string[]
  answer: number
  explain?: string
}

/** Hueco abierto (Part 2): una palabra. */
export interface GapItem {
  answers: string[]
  explain?: string
}

/** Formación de palabras (Part 3): palabra base en mayúsculas. */
export interface WordItem {
  base: string
  answers: string[]
  explain?: string
}

/** Transformación con palabra clave (Part 4): de dos a cinco palabras, incluida la clave. */
export interface TransformItem {
  first: string
  keyword: string
  start: string
  end: string
  answers: string[]
  explain?: string
}

/** Pregunta de comprensión con opciones (Part 5). */
export interface QuestionItem {
  question: string
  options: string[]
  answer: number
  explain?: string
}

/** Pregunta de emparejamiento (Part 7): la respuesta es la etiqueta de un texto (A, B, C…). */
export interface MatchItem {
  question: string
  answer: string
  explain?: string
}

export interface MatchSection {
  label: string
  title?: string
  text: string
}

export type PracticeTask =
  | { type: 'mcCloze'; title?: string; text: string; items: McItem[] }
  | { type: 'openCloze'; title?: string; text: string; items: GapItem[] }
  | { type: 'wordFormation'; title?: string; text: string; items: WordItem[] }
  | { type: 'transformation'; items: TransformItem[] }
  | { type: 'readingMc'; title?: string; text: string; items: QuestionItem[] }
  | { type: 'matching'; title?: string; intro?: string; sections: MatchSection[]; items: MatchItem[] }

export type PracticeTaskType = PracticeTask['type']

export interface PracticeSheet {
  id: string
  /** Título en inglés (el contenido del ejercicio está en inglés). */
  title: string
  /** Tema en español: «Viajes», «Trabajo»… */
  topic: string
  skill: PracticeSkill
  /** Duración aproximada en minutos. */
  minutes: number
  /** Qué se practica, en español (una frase corta). */
  focus?: string
  /** Incluida con la app (no se guarda ni se puede borrar). */
  builtIn?: boolean
  /** Número de la hoja incluida (1–50). */
  number?: number
  createdAt?: string
  source?: 'ai' | 'file'
  tasks: PracticeTask[]
}

/** Progreso de una hoja. El id es el de la hoja. */
export interface PracticeProgress {
  id: string
  /** Respuestas por hueco: clave `tarea.ítem` (p. ej. "0.3"). Opción múltiple: índice como texto. */
  answers: Record<string, string>
  /** Se ha pulsado «Comprobar» y se ven las soluciones. */
  checked: boolean
  /** Nota de la última comprobación. */
  lastScore?: number
  total?: number
  best?: number
  /** Veces que se ha comprobado la hoja. */
  times: number
  lastAt?: string
  updatedAt?: string
  /** Fechas (AAAA-MM-DD) en las que se completó: sirven para la racha de días. */
  days?: string[]
}

export const TASK_INSTRUCTIONS: Record<PracticeTaskType, string> = {
  mcCloze: 'For each gap, choose the answer (A, B, C or D) that best fits.',
  openCloze: 'Write ONE word in each gap.',
  wordFormation: 'Use the word in capitals to form a word that fits in the gap.',
  transformation: 'Complete the second sentence so that it has a similar meaning to the first. Use the word given and do not change it. Write between TWO and FIVE words, including the word given.',
  readingMc: 'Read the text and choose the answer (A, B, C or D) that fits best.',
  matching: 'Read the texts and answer the questions. Write the letter of the text.'
}

export const TASK_PART: Record<PracticeTaskType, string> = {
  mcCloze: 'Part 1 · Multiple-choice cloze',
  openCloze: 'Part 2 · Open cloze',
  wordFormation: 'Part 3 · Word formation',
  transformation: 'Part 4 · Key word transformation',
  readingMc: 'Part 5 · Multiple choice',
  matching: 'Part 7 · Multiple matching'
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export function itemKey(taskIndex: number, itemIndex: number): string {
  return `${taskIndex}.${itemIndex}`
}

// ---------- Corrección ----------

const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bcan't\b|\bcannot\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/\bain't\b/g, 'am not'],
  [/n't\b/g, ' not'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'ll\b/g, ' will'],
  [/\bi'm\b/g, 'i am']
]

/**
 * Normaliza una respuesta escrita: sin distinguir mayúsculas, espacios sobrantes, apóstrofos tipográficos
 * ni el punto final; las contracciones equivalen a la forma completa («didn't» = «did not»).
 */
export function normalizePractice(raw: string): string {
  let s = (raw ?? '').normalize('NFC').toLowerCase().replace(/[‘’ʼ`´]/g, "'").replace(/[“”]/g, '"').replace(/[‐-―]/g, '-')
  s = s.replace(/[.!?,;:]+\s*$/, '').replace(/\s+/g, ' ').trim()
  for (const [re, to] of CONTRACTIONS) s = s.replace(re, to)
  return s.replace(/\s+/g, ' ').trim()
}

/** Respuestas aceptadas de un ítem (como texto) para mostrarlas al corregir. */
export function expectedAnswers(task: PracticeTask, itemIndex: number): string[] {
  switch (task.type) {
    case 'mcCloze':
    case 'readingMc': {
      const it = task.items[itemIndex]
      return [`${OPTION_LETTERS[it.answer]} · ${it.options[it.answer]}`]
    }
    case 'matching':
      return [task.items[itemIndex].answer]
    default:
      return task.items[itemIndex].answers
  }
}

/** ¿Es correcta la respuesta? null si no se ha respondido. */
export function checkItem(task: PracticeTask, itemIndex: number, given: string | undefined): boolean | null {
  const value = (given ?? '').trim()
  if (!value) return null
  switch (task.type) {
    case 'mcCloze':
    case 'readingMc':
      return Number(value) === task.items[itemIndex].answer
    case 'matching':
      return value.toUpperCase() === task.items[itemIndex].answer.toUpperCase()
    default: {
      const n = normalizePractice(value)
      return task.items[itemIndex].answers.some((a) => normalizePractice(a) === n)
    }
  }
}

export interface SheetScore {
  correct: number
  answered: number
  total: number
  percent: number
}

export function countItems(sheet: PracticeSheet): number {
  return sheet.tasks.reduce((n, t) => n + t.items.length, 0)
}

export function scoreSheet(sheet: PracticeSheet, answers: Record<string, string>): SheetScore {
  let correct = 0
  let answered = 0
  let total = 0
  sheet.tasks.forEach((task, ti) =>
    task.items.forEach((_, ii) => {
      total++
      const r = checkItem(task, ii, answers[itemKey(ti, ii)])
      if (r !== null) answered++
      if (r) correct++
    })
  )
  return { correct, answered, total, percent: total ? Math.round((correct / total) * 100) : 0 }
}

/** ¿La respuesta incluye la palabra clave (sin cambiarla)? Compara ya normalizado: «can’t» = «cannot». */
export function containsKeyword(answer: string, keyword: string): boolean {
  return ` ${normalizePractice(answer)} `.includes(` ${normalizePractice(keyword)} `)
}

/** Número de palabras de una respuesta de transformación, contando las contracciones como dos (criterio de Cambridge). */
export function transformationWords(answer: string): number {
  return normalizePractice(answer).split(' ').filter(Boolean).length
}

// ---------- Estadísticas ----------

export interface PracticeStats {
  done: number
  total: number
  average: number | null
  /** Días seguidos (hasta hoy o ayer) con al menos una hoja comprobada. */
  streak: number
  bySkill: Record<PracticeSkill, { done: number; total: number; average: number | null }>
}

export function localDay(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function practiceStreak(progress: PracticeProgress[], now = new Date()): number {
  const days = new Set(progress.flatMap((p) => p.days ?? []))
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1)
  let n = 0
  while (days.has(localDay(cursor))) {
    n++
    cursor.setDate(cursor.getDate() - 1)
  }
  return n
}

export function practiceStats(sheets: PracticeSheet[], progress: PracticeProgress[], now = new Date()): PracticeStats {
  const byId = new Map(progress.map((p) => [p.id, p]))
  const pct = (p: PracticeProgress) => (p.total ? ((p.best ?? p.lastScore ?? 0) / p.total) * 100 : 0)
  const bySkill = Object.fromEntries(PRACTICE_SKILLS.map((s) => [s, { done: 0, total: 0, average: null as number | null }])) as PracticeStats['bySkill']
  const sums: Record<string, number> = {}
  let done = 0
  let sum = 0
  for (const s of sheets) {
    const k = bySkill[s.skill]
    k.total++
    const p = byId.get(s.id)
    if (p && p.times > 0) {
      done++
      k.done++
      sum += pct(p)
      sums[s.skill] = (sums[s.skill] ?? 0) + pct(p)
    }
  }
  for (const s of PRACTICE_SKILLS) bySkill[s].average = bySkill[s].done ? Math.round(sums[s] / bySkill[s].done) : null
  return { done, total: sheets.length, average: done ? Math.round(sum / done) : null, streak: practiceStreak(progress, now), bySkill }
}

/** Siguiente hoja recomendada: la primera sin hacer; si están todas, la de peor nota. */
export function nextSheet(sheets: PracticeSheet[], progress: PracticeProgress[]): PracticeSheet | null {
  const byId = new Map(progress.map((p) => [p.id, p]))
  const inProgress = sheets.find((s) => {
    const p = byId.get(s.id)
    return p && !p.checked && Object.keys(p.answers).length > 0
  })
  if (inProgress) return inProgress
  const todo = sheets.find((s) => !(byId.get(s.id)?.times))
  if (todo) return todo
  let worst: PracticeSheet | null = null
  let worstPct = Infinity
  for (const s of sheets) {
    const p = byId.get(s.id)!
    const v = p.total ? (p.best ?? 0) / p.total : 0
    if (v < worstPct) {
      worstPct = v
      worst = s
    }
  }
  return worst
}

// ---------- Validación (hojas pegadas desde un chat de IA o importadas) ----------

export class SheetFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SheetFormatError'
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : typeof v === 'string' && v.trim() ? [v.trim()] : [])

function gapNumbers(text: string): number[] {
  return Array.from(text.matchAll(/\{(\d+)\}/g), (m) => Number(m[1]))
}

function checkGaps(text: string, n: number, where: string): void {
  const nums = gapNumbers(text)
  const expected = Array.from({ length: n }, (_, i) => i + 1)
  if (nums.length !== n || nums.some((x, i) => x !== expected[i])) {
    throw new SheetFormatError(`${where}: el texto debe tener los huecos {1} a {${n}} en orden, uno por pregunta (tiene ${nums.length}).`)
  }
}

function optionIndex(v: unknown, options: string[]): number {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < options.length) return v
  const s = str(v)
  const letter = OPTION_LETTERS.indexOf(s.toUpperCase())
  if (letter !== -1 && letter < options.length) return letter
  const byText = options.findIndex((o) => o.toLowerCase() === s.toLowerCase())
  return byText
}

function parseChoice(raw: Record<string, unknown>, where: string): { options: string[]; answer: number; explain?: string } {
  const options = strList(raw.options ?? raw.opciones)
  if (options.length < 3 || options.length > 4) throw new SheetFormatError(`${where}: hacen falta 3 o 4 opciones.`)
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) throw new SheetFormatError(`${where}: hay opciones repetidas.`)
  const answer = optionIndex(raw.answer ?? raw.respuesta, options)
  if (answer < 0) throw new SheetFormatError(`${where}: la respuesta debe ser A, B, C o D.`)
  return { options, answer, explain: str(raw.explain ?? raw.explicacion) || undefined }
}

function parseTask(raw: unknown, ti: number): PracticeTask {
  if (!raw || typeof raw !== 'object') throw new SheetFormatError(`Ejercicio ${ti + 1}: formato no válido.`)
  const r = raw as Record<string, unknown>
  const type = str(r.type ?? r.tipo) as PracticeTaskType
  const where = `Ejercicio ${ti + 1}`
  const items = Array.isArray(r.items) ? (r.items as Record<string, unknown>[]) : []
  if (items.length === 0) throw new SheetFormatError(`${where}: no tiene preguntas.`)
  if (items.length > 20) throw new SheetFormatError(`${where}: tiene demasiadas preguntas (máximo 20).`)
  const text = str(r.text ?? r.texto)
  const title = str(r.title ?? r.titulo) || undefined
  const explain = (it: Record<string, unknown>) => str(it.explain ?? it.explicacion) || undefined
  switch (type) {
    case 'mcCloze':
      checkGaps(text, items.length, where)
      return { type, title, text, items: items.map((it, i) => parseChoice(it, `${where}, hueco ${i + 1}`)) }
    case 'openCloze':
      checkGaps(text, items.length, where)
      return {
        type,
        title,
        text,
        items: items.map((it, i) => {
          const answers = strList(it.answers ?? it.respuestas)
          if (!answers.length) throw new SheetFormatError(`${where}, hueco ${i + 1}: falta la respuesta.`)
          if (answers.some((a) => /\s/.test(a))) throw new SheetFormatError(`${where}, hueco ${i + 1}: cada respuesta debe ser UNA palabra.`)
          return { answers, explain: explain(it) }
        })
      }
    case 'wordFormation':
      checkGaps(text, items.length, where)
      return {
        type,
        title,
        text,
        items: items.map((it, i) => {
          const base = str(it.base).toUpperCase()
          const answers = strList(it.answers ?? it.respuestas)
          if (!base || !answers.length) throw new SheetFormatError(`${where}, hueco ${i + 1}: faltan la palabra base o la respuesta.`)
          return { base, answers, explain: explain(it) }
        })
      }
    case 'transformation':
      return {
        type,
        items: items.map((it, i) => {
          const w = `${where}, frase ${i + 1}`
          const first = str(it.first ?? it.primera)
          const keyword = str(it.keyword ?? it.clave).toUpperCase()
          const start = str(it.start ?? it.inicio)
          const end = str(it.end ?? it.final)
          const answers = strList(it.answers ?? it.respuestas)
          if (!first || !keyword || !answers.length) throw new SheetFormatError(`${w}: faltan la frase, la palabra clave o la respuesta.`)
          if (!start && !end) throw new SheetFormatError(`${w}: falta el principio o el final de la segunda frase.`)
          for (const a of answers) {
            if (!containsKeyword(a, keyword)) throw new SheetFormatError(`${w}: la respuesta «${a}» no incluye la palabra clave ${keyword}.`)
            const n = transformationWords(a)
            if (n < 2 || n > 5) throw new SheetFormatError(`${w}: la respuesta «${a}» debe tener de 2 a 5 palabras.`)
          }
          return { first, keyword, start, end, answers, explain: explain(it) }
        })
      }
    case 'readingMc':
      if (text.length < 200) throw new SheetFormatError(`${where}: falta el texto de lectura.`)
      return {
        type,
        title,
        text,
        items: items.map((it, i) => {
          const question = str(it.question ?? it.pregunta)
          if (!question) throw new SheetFormatError(`${where}, pregunta ${i + 1}: falta el enunciado.`)
          return { question, ...parseChoice(it, `${where}, pregunta ${i + 1}`) }
        })
      }
    case 'matching': {
      const rawSections = Array.isArray(r.sections ?? r.textos) ? ((r.sections ?? r.textos) as Record<string, unknown>[]) : []
      const sections = rawSections.map((s, i) => ({ label: str(s.label ?? s.letra).toUpperCase() || OPTION_LETTERS[i], title: str(s.title ?? s.titulo) || undefined, text: str(s.text ?? s.texto) }))
      if (sections.length < 2 || sections.length > 6 || sections.some((s) => !s.text)) throw new SheetFormatError(`${where}: hacen falta de 2 a 6 textos.`)
      const labels = new Set(sections.map((s) => s.label))
      if (labels.size !== sections.length) throw new SheetFormatError(`${where}: las letras de los textos se repiten.`)
      return {
        type,
        title,
        intro: str(r.intro) || undefined,
        sections,
        items: items.map((it, i) => {
          const question = str(it.question ?? it.pregunta)
          const answer = str(it.answer ?? it.respuesta).toUpperCase()
          if (!question || !labels.has(answer)) throw new SheetFormatError(`${where}, pregunta ${i + 1}: la respuesta debe ser la letra de uno de los textos.`)
          return { question, answer, explain: explain(it) }
        })
      }
    }
    default:
      throw new SheetFormatError(`${where}: tipo de ejercicio desconocido («${type || 'vacío'}»).`)
  }
}

/** Convierte un objeto (de la IA o de un archivo) en una hoja válida. */
export function normalizeSheet(raw: unknown, now = new Date()): Omit<PracticeSheet, 'id'> {
  if (!raw || typeof raw !== 'object') throw new SheetFormatError('La hoja no tiene un formato válido.')
  const r = raw as Record<string, unknown>
  const tasks = Array.isArray(r.tasks ?? r.ejercicios) ? ((r.tasks ?? r.ejercicios) as unknown[]) : []
  if (tasks.length === 0) throw new SheetFormatError('La hoja no tiene ejercicios.')
  if (tasks.length > 4) throw new SheetFormatError('La hoja tiene demasiados ejercicios (máximo 4).')
  const parsed = tasks.map(parseTask)
  const skillRaw = str(r.skill ?? r.destreza) as PracticeSkill
  const skill: PracticeSkill = PRACTICE_SKILLS.includes(skillRaw) ? skillRaw : guessSkill(parsed)
  const minutes = Number(r.minutes ?? r.minutos)
  return {
    title: (str(r.title ?? r.titulo) || 'Practice sheet').slice(0, 80),
    topic: (str(r.topic ?? r.tema) || 'Varios').slice(0, 40),
    skill,
    minutes: Number.isFinite(minutes) && minutes > 0 ? Math.min(30, Math.round(minutes)) : 10,
    focus: str(r.focus ?? r.enfoque).slice(0, 140) || undefined,
    createdAt: now.toISOString(),
    tasks: parsed
  }
}

function guessSkill(tasks: PracticeTask[]): PracticeSkill {
  const types = new Set(tasks.map((t) => t.type))
  if (types.size > 2) return 'mixed'
  if (types.has('readingMc') || types.has('matching')) return 'reading'
  if (types.has('wordFormation')) return 'wordFormation'
  if (types.has('openCloze')) return 'grammar'
  if (types.has('mcCloze')) return 'vocabulary'
  return 'grammar'
}

/** Extrae el JSON de un texto pegado (puede venir con explicaciones o dentro de un bloque ```). */
function extractJson(text: string): unknown {
  const t = text.trim()
  const candidates: string[] = []
  for (const m of t.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) candidates.push(m[1])
  candidates.push(t)
  const first = t.search(/[[{]/)
  if (first !== -1) {
    const open = t[first]
    const last = t.lastIndexOf(open === '{' ? '}' : ']')
    if (last > first) candidates.push(t.slice(first, last + 1))
  }
  // Primero tal cual; después cambiando comillas tipográficas (algunos chats las ponen en lugar de las rectas).
  for (const c of [...candidates, ...candidates.map((x) => x.replace(/[“”]/g, '"'))]) {
    try {
      return JSON.parse(c)
    } catch {
      /* sigue */
    }
  }
  throw new SheetFormatError('No se ha encontrado una hoja en el texto pegado. Copia la respuesta completa del chat (el bloque de código JSON).')
}

/** Lee una o varias hojas de un texto pegado o de un archivo. */
export function parseSheets(text: string, now = new Date()): Array<Omit<PracticeSheet, 'id'>> {
  const data = extractJson(text) as Record<string, unknown> | unknown[]
  const list = Array.isArray(data) ? data : Array.isArray((data as Record<string, unknown>).hojas) ? ((data as Record<string, unknown>).hojas as unknown[]) : Array.isArray((data as Record<string, unknown>).sheets) ? ((data as Record<string, unknown>).sheets as unknown[]) : [data]
  if (list.length === 0) throw new SheetFormatError('No hay ninguna hoja en el texto pegado.')
  if (list.length > 10) throw new SheetFormatError('Como mucho se pueden añadir 10 hojas a la vez.')
  return list.map((raw, i) => {
    try {
      return normalizeSheet(raw, now)
    } catch (e) {
      if (e instanceof SheetFormatError && list.length > 1) throw new SheetFormatError(`Hoja ${i + 1}: ${e.message}`)
      throw e
    }
  })
}

/** Exporta una hoja al formato que la app sabe importar (sin datos internos). */
export function exportSheet(sheet: PracticeSheet): string {
  const { id: _id, builtIn: _b, number: _n, source: _s, ...rest } = sheet
  return JSON.stringify({ formato: SHEET_FORMAT, version: SHEET_FORMAT_VERSION, ...rest }, null, 2) + '\n'
}

// ---------- Instrucciones para pedir hojas nuevas a un chat de IA ----------

export interface SheetRequest {
  skill: PracticeSkill
  topic: string
  count: number
  /** Qué quiere reforzar el alumno (opcional, en español). */
  focus?: string
}

const SKILL_RECIPE: Record<PracticeSkill, string> = {
  vocabulary: 'un ejercicio "mcCloze" (texto de 120-170 palabras con 8 huecos de opción múltiple sobre colocaciones, phrasal verbs, expresiones fijas y matices de significado) y un ejercicio "transformation" con 4 frases',
  grammar: 'un ejercicio "openCloze" (texto de 120-170 palabras con 8 huecos de UNA palabra: preposiciones, auxiliares, pronombres relativos, conectores, artículos, cuantificadores…) y un ejercicio "transformation" con 4 frases',
  wordFormation: 'un ejercicio "wordFormation" (texto de 120-170 palabras con 8 huecos; prefijos, sufijos, negativos, plurales y cambios de categoría) y un ejercicio "transformation" con 3 frases',
  reading: 'un ejercicio "readingMc" (texto de 300-380 palabras, tipo artículo o relato, con 5 preguntas de 4 opciones que evalúen detalle, opinión, actitud, propósito y referencia) o bien un ejercicio "matching" (4 textos breves A-D de 70-90 palabras cada uno y 6 preguntas "Which person…")',
  mixed: 'tres ejercicios breves: "mcCloze" (5 huecos), "openCloze" (5 huecos) y "wordFormation" (5 huecos), cada uno con un texto de 70-110 palabras'
}

export function buildSheetPrompt(req: SheetRequest): string {
  const count = Math.max(1, Math.min(5, Math.round(req.count)))
  const example = {
    formato: SHEET_FORMAT,
    version: SHEET_FORMAT_VERSION,
    hojas: [
      {
        title: 'Título breve en inglés',
        topic: 'Tema en español',
        skill: req.skill,
        minutes: 10,
        focus: 'Qué se practica, en español (una frase)',
        tasks: [
          { type: 'mcCloze', text: 'Texto en inglés con huecos {1} … {2} …', items: [{ options: ['opción A', 'opción B', 'opción C', 'opción D'], answer: 'B', explain: 'Por qué es la correcta, en español (máx. 20 palabras)' }] },
          { type: 'openCloze', text: '… {1} …', items: [{ answers: ['palabra', 'alternativa válida'], explain: '…' }] },
          { type: 'wordFormation', text: '… {1} …', items: [{ base: 'HAPPY', answers: ['unhappiness'], explain: '…' }] },
          { type: 'transformation', items: [{ first: 'Primera frase completa.', keyword: 'WORD', start: 'Principio de la segunda frase', end: 'final de la segunda frase.', answers: ['respuesta de 2 a 5 palabras con WORD', 'otra variante válida'], explain: '…' }] },
          { type: 'readingMc', title: 'Título del texto', text: 'Texto de lectura (párrafos separados por una línea en blanco)', items: [{ question: 'Pregunta', options: ['…', '…', '…', '…'], answer: 'C', explain: '…' }] },
          { type: 'matching', title: 'Título', intro: 'Contexto breve en inglés', sections: [{ label: 'A', title: 'Nombre', text: '…' }], items: [{ question: 'Which person …?', answer: 'A', explain: '…' }] }
        ]
      }
    ]
  }
  return [
    `Eres un profesor experto en el examen Cambridge B2 First (FCE). Crea ${count === 1 ? 'UNA hoja de práctica nueva' : `${count} hojas de práctica nuevas y distintas entre sí`} para un estudiante hispanohablante.`,
    '',
    'REQUISITOS',
    `- Tema: ${req.topic.trim() || 'variado (elige temas habituales del B2 First: viajes, trabajo, tecnología, medio ambiente, salud, ocio…)'}.`,
    ...(req.focus?.trim() ? [`- El estudiante quiere reforzar: ${req.focus.trim()}.`] : []),
    `- Cada hoja debe tener ${SKILL_RECIPE[req.skill]}.`,
    '- Duración: unos 10 minutos por hoja. Nivel B2 real, con el estilo y las trampas típicas del Reading & Use of English.',
    '- Contenido 100 % original: no copies textos de exámenes publicados.',
    '- Los textos y preguntas, en inglés. "topic", "focus" y las explicaciones ("explain"), en español.',
    '- Marca cada hueco en el texto como {1}, {2}… en orden; el número de huecos debe coincidir con el de "items" de ese ejercicio.',
    '- Opción múltiple: exactamente 4 opciones y UNA sola correcta sin ambigüedad. "answer" es la letra (A, B, C o D).',
    '- Open cloze: UNA palabra por hueco. Incluye en "answers" todas las alternativas correctas.',
    '- Word formation: "base" en mayúsculas; la respuesta nunca es la palabra base sin cambios.',
    '- Transformation: la segunda frase significa lo mismo; la respuesta tiene de 2 a 5 palabras (las contracciones cuentan como 2) e incluye la palabra clave sin cambiarla. Incluye variantes válidas.',
    '- Matching: la respuesta es la letra del texto; cada texto debe ser la respuesta de al menos una pregunta.',
    '',
    'FORMATO DE RESPUESTA (obligatorio)',
    'Responde SOLO con un bloque de código JSON válido, sin texto antes ni después, con esta estructura (en "tasks" incluye solo los tipos de ejercicio pedidos):',
    '```json',
    JSON.stringify(example, null, 2),
    '```'
  ].join('\n')
}
