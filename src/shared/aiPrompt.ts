// Genera un texto listo para pegar en un chat de IA y pedir corrección de Writing o Speaking.
// No llama a ninguna API: solo construye texto.
import { countWords } from './grading'

export const WRITING_CRITERIA_TEXT: Array<[string, string]> = [
  ['Content', 'Are all the content points of the task covered and relevant? Is the target reader fully informed?'],
  ['Communicative Achievement', 'Does the text use the conventions of the task type (essay, article, email, review, report…) and hold the reader\'s attention with an appropriate register?'],
  ['Organisation', 'Is the text well organised and coherent, using a variety of linking words and cohesive devices?'],
  ['Language', 'Is there a range of everyday and less common vocabulary and of simple and complex grammatical forms, with good control? Do errors impede communication?']
]

export const SPEAKING_CRITERIA_TEXT: Array<[string, string]> = [
  ['Grammar and Vocabulary', 'Control of simple and some complex grammatical forms; range of appropriate vocabulary on familiar topics.'],
  ['Discourse Management', 'Extended stretches of language with little hesitation; relevant contributions; organisation with a range of cohesive devices.'],
  ['Pronunciation', 'Intelligibility; intonation; sentence and word stress; individual sounds.'],
  ['Interactive Communication', 'Initiating and responding; linking contributions to those of others; maintaining and developing the interaction; negotiating towards an outcome.']
]

export interface WritingPromptInput {
  examName: string
  taskTitle: string
  taskPrompt: string
  studentText: string
  minWords?: number
  maxWords?: number
}

export function buildWritingCorrectionPrompt(input: WritingPromptInput): string {
  const words = countWords(input.studentText)
  const range = input.minWords && input.maxWords ? `${input.minWords}–${input.maxWords} words` : 'not specified'
  return [
    'Actúa como examinador/a oficial de Cambridge English: B2 First (FCE), Writing paper.',
    'Corrige el texto del alumno con los criterios oficiales y responde en español, pero cita los ejemplos del texto en inglés.',
    '',
    'Target level: B2 (CEFR) — Cambridge B2 First.',
    `Exam: ${input.examName}`,
    `Task: ${input.taskTitle}`,
    `Required length: ${range}. Student\'s word count: ${words}.`,
    '',
    '=== TASK / PROMPT ===',
    input.taskPrompt.trim() || '(El alumno no ha copiado la consigna. Evalúa el texto como respuesta a la tarea indicada.)',
    '',
    '=== STUDENT\'S TEXT ===',
    input.studentText.trim() || '(vacío)',
    '',
    '=== ASSESSMENT CRITERIA (Cambridge B2 First, each scored 0–5) ===',
    ...WRITING_CRITERIA_TEXT.map(([name, desc]) => `- ${name}: ${desc}`),
    '',
    '=== WHAT I NEED ===',
    '1. Una puntuación de 0 a 5 para cada criterio, con una justificación breve.',
    '2. Puntuación total sobre 20 y si el texto alcanzaría el nivel B2.',
    '3. Lista de errores (gramática, vocabulario, ortografía, puntuación) con la corrección y una explicación corta.',
    '4. Tres mejoras concretas para subir de nota.',
    '5. Una versión mejorada del texto que mantenga mis ideas y respete el límite de palabras.'
  ].join('\n')
}

export interface SpeakingPromptInput {
  examName: string
  partTitle: string
  taskPrompt: string
  transcript: string
  durationSec?: number
}

export function buildSpeakingCorrectionPrompt(input: SpeakingPromptInput): string {
  const dur = input.durationSec ? `${Math.round(input.durationSec)} s` : 'unknown'
  return [
    'Actúa como examinador/a oficial de Cambridge English: B2 First (FCE), Speaking paper.',
    'Evalúa mi respuesta a partir de la transcripción y responde en español, citando ejemplos en inglés.',
    '',
    'Target level: B2 (CEFR) — Cambridge B2 First.',
    `Exam: ${input.examName}`,
    `Part: ${input.partTitle}`,
    `Recording length: ${dur}`,
    '',
    '=== TASK / PROMPT ===',
    input.taskPrompt.trim() || '(No se ha indicado la consigna.)',
    '',
    '=== TRANSCRIPT OF MY ANSWER ===',
    input.transcript.trim() || '(No hay transcripción. Transcribe tu grabación y pégala aquí antes de enviar.)',
    '',
    '=== ASSESSMENT CRITERIA (Cambridge B2 First, each scored 0–5) ===',
    ...SPEAKING_CRITERIA_TEXT.map(([name, desc]) => `- ${name}: ${desc}`),
    '',
    'Nota: la pronunciación no se puede valorar con una transcripción; indícalo y céntrate en lo demás.',
    '',
    '=== WHAT I NEED ===',
    '1. Una puntuación de 0 a 5 por criterio con justificación breve.',
    '2. Errores de gramática y vocabulario con su corrección.',
    '3. Expresiones y conectores B2 que podría haber usado.',
    '4. Una versión modelo de la respuesta con mis ideas.'
  ].join('\n')
}
