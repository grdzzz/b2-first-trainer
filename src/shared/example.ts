// Examen de ejemplo incluido con la app para aprender a usarla.
// Todo el contenido es ORIGINAL (scripts/make-example-assets.cjs genera los PDF y el audio): no es material de Cambridge.
import type { Exam, FileRef, Paper, PaperType } from './types'
import { SCHEMA_VERSION } from './types'
import { buildPart, type PartSpec } from './template'
import { newId } from './ids'

export const EXAMPLE_EXAM_NAME = 'Examen de ejemplo'

/** Archivos del ejemplo: nombre en resources/example → paper y tipo. */
export const EXAMPLE_FILES: Array<{ file: string; paper: PaperType; kind: 'pdf' | 'audio' }> = [
  { file: 'reading.pdf', paper: 'reading', kind: 'pdf' },
  { file: 'writing.pdf', paper: 'writing', kind: 'pdf' },
  { file: 'listening.pdf', paper: 'listening', kind: 'pdf' },
  { file: 'listening.mp3', paper: 'listening', kind: 'audio' },
  { file: 'speaking.pdf', paper: 'speaking', kind: 'pdf' }
]

const WRITING_PROMPT = `1 In your English class you have been talking about technology and free time. Now your English teacher has asked you to write an essay.
Write your essay using all the notes and giving reasons for your point of view.
Young people spend too much time on their phones. Do you agree?
Notes — Write about:
1. friendships
2. studying
3. ……………… (your own idea)`

const SPEAKING_PROMPT = `• Where are you from? What do you like about living there?
• What do you enjoy doing in your free time?
• Tell us about a place you would like to visit, and why.`

function paper(type: PaperType, title: string, timeLimitMin: number, specs: Array<PartSpec & { answers?: Record<number, string[]>; prompt?: string }>, files: Partial<Record<'pdf' | 'audio', FileRef>>): Paper {
  let next = 1
  const parts = specs.map((spec, i) => {
    const part = buildPart(spec, i + 1, next)
    next += spec.count
    part.pdfPage = 1
    part.questions = part.questions.map((q) => ({ ...q, answers: spec.answers?.[q.number], prompt: spec.prompt }))
    return part
  })
  return { id: newId('paper'), type, title, timeLimitMin, files, parts }
}

export function buildExampleExam(files: Partial<Record<string, FileRef>>, now = new Date()): Exam {
  const f = (name: string) => files[name]
  return {
    id: newId('exam'),
    schemaVersion: SCHEMA_VERSION,
    name: EXAMPLE_EXAM_NAME,
    importedAt: now.toISOString(),
    isExample: true,
    notes: 'Examen corto de muestra para aprender a usar la app. Los textos y el audio son originales (voz sintética), no material de Cambridge. Puedes borrarlo cuando quieras.',
    papers: [
      paper('reading', 'Reading & Use of English', 10, [
        { title: 'Multiple-choice cloze', category: 'Multiple-choice cloze', count: 4, kind: 'choice', options: 4, points: 1, answers: { 1: ['A'], 2: ['B'], 3: ['B'], 4: ['C'] } },
        { title: 'Open cloze', category: 'Open cloze', count: 4, kind: 'text', points: 1, answers: { 5: ['before'], 6: ['how'], 7: ['without'], 8: ['take'] } },
        {
          title: 'Key word transformation',
          category: 'Key word transformation',
          count: 2,
          kind: 'text',
          points: 2,
          answers: { 9: ["didn't have to bring", 'did not have to bring'], 10: ['last time I saw'] }
        }
      ], { pdf: f('reading.pdf') }),
      paper('writing', 'Writing', 20, [
        { title: 'Essay', category: 'Essay', count: 1, kind: 'essay', points: 0, minWords: 140, maxWords: 190, prompt: WRITING_PROMPT }
      ], { pdf: f('writing.pdf') }),
      paper('listening', 'Listening', 5, [
        { title: 'Multiple choice (short extracts)', category: 'Multiple choice (listening)', count: 3, kind: 'choice', options: 3, points: 1, answers: { 1: ['B'], 2: ['A'], 3: ['B'] } }
      ], { pdf: f('listening.pdf'), audio: f('listening.mp3') }),
      paper('speaking', 'Speaking', 5, [
        { title: 'Interview', category: 'Speaking interview', count: 1, kind: 'speaking', points: 0, prompt: SPEAKING_PROMPT }
      ], { pdf: f('speaking.pdf') })
    ]
  }
}
