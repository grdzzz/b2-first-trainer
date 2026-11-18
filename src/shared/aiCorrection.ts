// Corrección de Writing/Speaking con un chat de IA (ChatGPT, Claude.ai…), sin llamar a ninguna API:
// 1) la app genera UN texto con todas las tareas del intento y un formato de respuesta obligatorio;
// 2) el alumno lo pega en el chat y copia la respuesta;
// 3) la app lee esa respuesta y reparte nota, errores y consejos en cada tarea.
import type { AiFeedback, Attempt, Paper, PaperType } from './types'
import { SPEAKING_CRITERIA, WRITING_CRITERIA, criteriaFor } from './types'
import { countWords } from './grading'
import { SPEAKING_CRITERIA_TEXT, WRITING_CRITERIA_TEXT } from './aiPrompt'

export const AI_FORMAT = 'b2ft-correccion'
export const AI_FORMAT_VERSION = 1

export interface AiTask {
  /** Identificador corto que la IA debe devolver: W1, W2… (Writing) o S1… (Speaking). */
  id: string
  questionId: string
  partNumber: number
  partTitle: string
  kind: 'essay' | 'speaking'
  prompt: string
  /** Texto del alumno (redacción o transcripción). */
  text: string
  words: number
  minWords?: number
  maxWords?: number
  durationSec?: number
}

/** Tareas de Writing/Speaking de un intento, en orden, con su identificador corto. */
export function tasksForAttempt(attempt: Attempt, paper: Paper): AiTask[] {
  const only = attempt.questionIds ? new Set(attempt.questionIds) : null
  const prefix = paper.type === 'speaking' ? 'S' : 'W'
  const tasks: AiTask[] = []
  for (const part of paper.parts) {
    if (!attempt.partIds.includes(part.id)) continue
    for (const q of part.questions) {
      if (only && !only.has(q.id)) continue
      if (q.kind !== 'essay' && q.kind !== 'speaking') continue
      const a = attempt.answers[q.id]
      const text = (q.kind === 'essay' ? a?.value : a?.transcript) ?? ''
      tasks.push({
        id: `${prefix}${tasks.length + 1}`,
        questionId: q.id,
        partNumber: part.number,
        partTitle: part.title,
        kind: q.kind,
        prompt: (q.prompt ?? a?.prompt ?? '').trim(),
        text: text.trim(),
        words: countWords(text),
        minWords: q.minWords,
        maxWords: q.maxWords,
        durationSec: a?.recording?.durationSec
      })
    }
  }
  return tasks
}

function criteriaKeys(type: PaperType): readonly string[] {
  return type === 'speaking' ? SPEAKING_CRITERIA : WRITING_CRITERIA
}

/** Texto único para pegar en el chat: todas las tareas y el formato de respuesta que la app sabe leer. */
export function buildBulkCorrectionPrompt(input: { examName: string; paperType: 'writing' | 'speaking'; tasks: AiTask[] }): string {
  const writing = input.paperType === 'writing'
  const keys = criteriaKeys(input.paperType)
  const crit = writing ? WRITING_CRITERIA_TEXT : SPEAKING_CRITERIA_TEXT
  const example = {
    formato: AI_FORMAT,
    version: AI_FORMAT_VERSION,
    tareas: [
      {
        id: input.tasks[0]?.id ?? (writing ? 'W1' : 'S1'),
        ...(writing ? { tarea_elegida: 'solo en Part 2: número de la pregunta que respondió (2, 3 o 4)' } : {}),
        puntuaciones: Object.fromEntries(keys.map((k) => [k, k === 'pronunciation' ? 'número 0-5 o null' : 'número 0-5'])),
        resumen: '2-4 frases en español con la valoración general',
        errores: [{ original: 'fragmento exacto del alumno', correccion: 'versión correcta', explicacion: 'breve, en español' }],
        consejos: ['consejo concreto en español'],
        version_mejorada: writing ? 'el texto mejorado en inglés, respetando el límite de palabras' : 'una respuesta modelo en inglés con sus ideas'
      }
    ],
    comentario_general: 'valoración global en español y si alcanzaría el B2'
  }

  const lines: string[] = [
    `Actúa como examinador/a oficial de Cambridge English: B2 First (FCE), ${writing ? 'Writing' : 'Speaking'} paper.`,
    'Corrige TODAS las tareas siguientes con los criterios oficiales. Nivel objetivo: B2 (CEFR).',
    `Exam: ${input.examName}`,
    '',
    `=== ASSESSMENT CRITERIA (each scored 0–5) ===`,
    ...crit.map(([name, desc], i) => `- ${keys[i]} (${name}): ${desc}`),
    ''
  ]
  if (!writing) {
    lines.push('Las respuestas de Speaking son transcripciones: la pronunciación no se puede valorar bien con texto; pon "pronunciation": null si no puedes valorarla.', '')
  }
  for (const task of input.tasks) {
    lines.push(`=== TAREA ${task.id} · Part ${task.partNumber}: ${task.partTitle} ===`)
    if (writing) {
      const range = task.minWords && task.maxWords ? `${task.minWords}–${task.maxWords}` : 'not specified'
      lines.push(`Required length: ${range} words. Student's word count: ${task.words}.`)
    } else if (task.durationSec) {
      lines.push(`Recording length: ${Math.round(task.durationSec)} s.`)
    }
    lines.push('--- TASK / PROMPT ---', task.prompt || '(El alumno no copió la consigna; evalúa el texto como respuesta a esta parte del examen.)')
    if (writing && task.partNumber > 1 && /\n\s*[2-4]\s/.test(`\n${task.prompt}`)) {
      lines.push('(El alumno eligió UNA de estas preguntas; indica cuál en "tarea_elegida".)')
    }
    lines.push(writing ? "--- STUDENT'S TEXT ---" : '--- TRANSCRIPT OF THE STUDENT ---', task.text || '(vacío)', '')
  }
  lines.push(
    '=== FORMATO DE RESPUESTA OBLIGATORIO ===',
    'Responde ÚNICAMENTE con un bloque de código ```json``` (sin texto antes ni después) que siga exactamente esta estructura.',
    `Incluye un objeto en "tareas" por cada tarea (${input.tasks.map((t) => t.id).join(', ')}), con el mismo "id".`,
    'Las puntuaciones son números enteros del 0 al 5. Cita en "errores" el fragmento exacto del alumno. No inventes errores.',
    'Escapa correctamente las comillas y los saltos de línea dentro de las cadenas JSON.',
    '',
    '```json',
    JSON.stringify(example, null, 2),
    '```'
  )
  return lines.join('\n')
}

export class AiParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiParseError'
  }
}

export interface ParsedAiCorrection {
  /** Por identificador de tarea (W1, S2…). */
  tasks: Record<string, AiFeedback>
  general?: string
  warnings: string[]
}

/** Extrae el JSON de la respuesta aunque venga con texto alrededor o dentro de ```json```. */
function extractJson(text: string): unknown {
  const clean = text.replace(/^﻿/, '').trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(clean)
  const candidates: string[] = []
  if (fenced) candidates.push(fenced[1])
  const first = clean.indexOf('{')
  const last = clean.lastIndexOf('}')
  if (first !== -1 && last > first) candidates.push(clean.slice(first, last + 1))
  if (candidates.length === 0) throw new AiParseError('No se ha encontrado el bloque de corrección. Copia la respuesta completa del chat.')
  let lastError: unknown
  for (const c of candidates) {
    for (const variant of [c, c.replace(/,\s*([}\]])/g, '$1')]) {
      try {
        return JSON.parse(variant)
      } catch (e) {
        lastError = e
      }
    }
  }
  throw new AiParseError(`La respuesta no es un JSON válido (${(lastError as Error)?.message ?? 'formato incorrecto'}). Pide al chat que repita la respuesta solo con el bloque JSON.`)
}

const ALIASES: Record<string, string> = {}
for (const k of [...WRITING_CRITERIA, ...SPEAKING_CRITERIA]) ALIASES[k.toLowerCase()] = k
Object.assign(ALIASES, {
  communicative: 'communicativeAchievement',
  communicativeachievement: 'communicativeAchievement',
  grammarandvocabulary: 'grammarVocabulary',
  grammarvocabulary: 'grammarVocabulary',
  grammar: 'grammarVocabulary',
  discoursemanagement: 'discourseManagement',
  discourse: 'discourseManagement',
  interactivecommunication: 'interactiveCommunication',
  interaction: 'interactiveCommunication'
})

function criterionKey(raw: string): string | undefined {
  return ALIASES[raw.toLowerCase().replace(/[^a-z]/g, '')]
}

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (k in obj) return obj[k]
  return undefined
}

function str(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() || undefined
  if (typeof v === 'number') return String(v)
  return undefined
}

function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter((x): x is string => !!x)
  const s = str(v)
  return s ? [s] : []
}

/**
 * Lee la respuesta del chat. `expectedIds` son los identificadores de las tareas (W1, W2…).
 * Es tolerante: acepta claves en español o en inglés, nombres de criterio con espacios, números como texto
 * y tareas sin "id" si vienen en el mismo orden.
 */
export function parseAiCorrection(text: string, expectedIds: string[], paperType: PaperType): ParsedAiCorrection {
  const data = extractJson(text)
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AiParseError('El bloque de corrección debe ser un objeto JSON.')
  const root = data as Record<string, unknown>
  const rawTasks = pick(root, 'tareas', 'tasks', 'correcciones')
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) throw new AiParseError('La respuesta no contiene la lista "tareas".')

  const warnings: string[] = []
  const valid = criteriaFor(paperType)
  const expected = new Map(expectedIds.map((id) => [id.toUpperCase(), id]))
  const tasks: Record<string, AiFeedback> = {}
  const now = new Date().toISOString()

  rawTasks.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return
    const t = raw as Record<string, unknown>
    let id = str(pick(t, 'id', 'tarea', 'task'))?.toUpperCase()
    if (!id || !expected.has(id)) {
      if (rawTasks.length === expectedIds.length && expectedIds[index]) {
        if (id) warnings.push(`La tarea "${id}" no existe; se asigna por orden a ${expectedIds[index]}.`)
        id = expectedIds[index].toUpperCase()
      } else {
        warnings.push(`Se ignora una tarea con identificador desconocido (${id ?? 'sin id'}).`)
        return
      }
    }
    const taskId = expected.get(id)!
    const scores: Record<string, number> = {}
    const rawScores = pick(t, 'puntuaciones', 'scores', 'notas')
    if (rawScores && typeof rawScores === 'object' && !Array.isArray(rawScores)) {
      for (const [k, v] of Object.entries(rawScores as Record<string, unknown>)) {
        const key = criterionKey(k)
        if (!key || !valid.includes(key)) {
          warnings.push(`${taskId}: criterio "${k}" desconocido, se ignora.`)
          continue
        }
        if (v === null || v === undefined || v === '') continue
        const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
        if (!Number.isFinite(n)) {
          warnings.push(`${taskId}: la nota de ${key} no es un número.`)
          continue
        }
        scores[key] = Math.max(0, Math.min(5, Math.round(n)))
      }
    }
    const missing = valid.filter((c) => !(c in scores))
    if (missing.length) warnings.push(`${taskId}: sin nota en ${missing.join(', ')}; puntúalo tú.`)

    const rawErrors = pick(t, 'errores', 'errors', 'mistakes')
    const errors = Array.isArray(rawErrors)
      ? rawErrors.flatMap((e) => {
          if (typeof e === 'string') return [{ original: e, correction: '', explanation: '' }]
          if (!e || typeof e !== 'object') return []
          const o = e as Record<string, unknown>
          const original = str(pick(o, 'original', 'error', 'incorrecto')) ?? ''
          const correction = str(pick(o, 'correccion', 'corrección', 'correction', 'correcto')) ?? ''
          const explanation = str(pick(o, 'explicacion', 'explicación', 'explanation', 'motivo')) ?? ''
          return original || correction ? [{ original, correction, explanation }] : []
        })
      : []

    tasks[taskId] = {
      scores,
      summary: str(pick(t, 'resumen', 'summary', 'comentario', 'valoracion')),
      errors,
      tips: strList(pick(t, 'consejos', 'tips', 'mejoras', 'recomendaciones')),
      improved: str(pick(t, 'version_mejorada', 'versión_mejorada', 'improved', 'improved_version', 'respuesta_modelo')),
      chosenTask: str(pick(t, 'tarea_elegida', 'chosen_task', 'pregunta_elegida')),
      receivedAt: now
    }
  })

  for (const id of expectedIds) if (!tasks[id]) warnings.push(`No hay corrección para la tarea ${id}.`)
  if (Object.keys(tasks).length === 0) throw new AiParseError('No se ha podido asociar ninguna corrección a las tareas de este intento.')
  return { tasks, general: str(pick(root, 'comentario_general', 'general', 'resumen_general', 'overall')), warnings }
}

/** Aplica la corrección al intento: guarda los comentarios y vuelca las notas en la autoevaluación. */
export function applyAiCorrection(attempt: Attempt, tasks: AiTask[], parsed: ParsedAiCorrection): Attempt {
  const aiFeedback = { ...(attempt.aiFeedback ?? {}) }
  const selfAssessments = { ...attempt.selfAssessments }
  for (const task of tasks) {
    const fb = parsed.tasks[task.id]
    if (!fb) continue
    aiFeedback[task.questionId] = fb
    const prev = selfAssessments[task.questionId]
    selfAssessments[task.questionId] = { ...prev, scores: { ...(prev?.scores ?? {}), ...fb.scores } }
  }
  return { ...attempt, aiFeedback, aiGeneral: parsed.general ?? attempt.aiGeneral, selfAssessments }
}

