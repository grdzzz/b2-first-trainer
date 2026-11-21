// Atajos para escribir las hojas incluidas de forma compacta.
import type { GapItem, MatchItem, McItem, PracticeSheet, QuestionItem, TransformItem, WordItem } from '../practice'

type Letter = 'A' | 'B' | 'C' | 'D'
const idx = (l: Letter) => 'ABCD'.indexOf(l)
const list = (v: string | string[]) => (Array.isArray(v) ? v : [v])

export type SheetSpec = Omit<PracticeSheet, 'id' | 'skill' | 'builtIn' | 'number' | 'minutes'> & { minutes?: number }

/** Opción múltiple: cuatro opciones y la letra correcta. */
export const mc = (options: [string, string, string, string], answer: Letter, explain: string): McItem => ({ options, answer: idx(answer), explain })
/** Hueco abierto: una palabra (o varias alternativas). */
export const gap = (answers: string | string[], explain: string): GapItem => ({ answers: list(answers), explain })
/** Formación de palabras. */
export const wf = (base: string, answers: string | string[], explain: string): WordItem => ({ base, answers: list(answers), explain })
/** Transformación: frase original, palabra clave, inicio y final de la segunda frase. */
export const tr = (first: string, keyword: string, start: string, end: string, answers: string | string[], explain: string): TransformItem => ({ first, keyword, start, end, answers: list(answers), explain })
/** Pregunta de lectura con cuatro opciones. */
export const q = (question: string, options: [string, string, string, string], answer: Letter, explain: string): QuestionItem => ({ question, options, answer: idx(answer), explain })
/** Pregunta de emparejamiento. */
export const mt = (question: string, answer: string, explain: string): MatchItem => ({ question, answer, explain })
