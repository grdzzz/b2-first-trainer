// Tipos de pregunta que el alumno puede elegir al responder (sobre todo con un vídeo o audio sin PDF).
import type { AnswerStyle, Part, QuestionKind } from './types'
import { resizePart } from './template'

export interface AnswerStyleInfo {
  id: AnswerStyle
  kind: QuestionKind
  /** Número de opciones (solo opción múltiple). */
  options?: number
}

export const ANSWER_STYLES: AnswerStyleInfo[] = [
  { id: 'mc3', kind: 'choice', options: 3 },
  { id: 'mc4', kind: 'choice', options: 4 },
  { id: 'match', kind: 'choice', options: 8 },
  { id: 'word', kind: 'text' },
  { id: 'phrase', kind: 'text' }
]

/** Tipo de pregunta de una parte: el elegido o el que se deduce de sus preguntas. */
export function styleOfPart(part: Part): AnswerStyle | null {
  if (part.answerStyle) return part.answerStyle
  const q = part.questions[0]
  if (!q) return null
  if (q.kind === 'text') return 'word'
  if (q.kind !== 'choice') return null
  const n = q.options?.length ?? 4
  return n <= 3 ? 'mc3' : n === 4 ? 'mc4' : 'match'
}

/** Cambia el tipo de pregunta de una parte conservando los identificadores de las preguntas. */
export function applyStyle(part: Part, style: AnswerStyle): Part {
  const info = ANSWER_STYLES.find((s) => s.id === style)!
  const resized = resizePart(part, part.questions.length, info.kind, info.options)
  return { ...resized, answerStyle: style }
}

/** ¿Se puede cambiar el tipo de una parte? Solo si es de respuesta corta u opción múltiple y no tiene clave. */
export function canChooseStyle(part: Part): boolean {
  const kind = part.questions[0]?.kind
  return (kind === 'choice' || kind === 'text') && !part.questions.some((q) => (q.answers?.length ?? 0) > 0)
}
