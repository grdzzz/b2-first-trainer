// Modelo de datos de la aplicación. Todo se guarda como JSON en la carpeta de datos del usuario.

export const SCHEMA_VERSION = 1

export type PaperType = 'reading' | 'writing' | 'listening' | 'speaking'

/** Cómo se responde una pregunta. */
export type QuestionKind = 'choice' | 'text' | 'essay' | 'speaking'

export interface FileRef {
  /** Nombre original del archivo importado. */
  name: string
  /** Nombre con el que se guarda dentro de la carpeta del examen. */
  storedName: string
  size: number
  mime: string
}

export interface PartFiles {
  pdf?: FileRef
  audio?: FileRef
}

export interface Question {
  id: string
  /** Número visible (en Cambridge la numeración es continua dentro de cada paper). */
  number: number
  kind: QuestionKind
  /** Etiquetas de opciones para `choice` (p. ej. ["A","B","C","D"]). */
  options?: string[]
  /** Respuestas aceptadas. Vacío o ausente = sin clave (no se corrige automáticamente). */
  answers?: string[]
  /** Puntos que vale la pregunta si es correcta. */
  points: number
  /** Enunciado o consigna (útil para Writing/Speaking y para "Copiar para corregir"). */
  prompt?: string
  minWords?: number
  maxWords?: number
}

export interface Part {
  id: string
  number: number
  title: string
  /** Tipo de tarea (se usa en estadísticas de fallos), p. ej. "Open cloze". */
  category: string
  instructions?: string
  /** Página (1..n) donde empieza la parte dentro del PDF común del paper. */
  pdfPage?: number
  files: PartFiles
  questions: Question[]
}

export interface Paper {
  id: string
  type: PaperType
  title: string
  /** Tiempo del modo examen en minutos. 0 o ausente = sin temporizador. */
  timeLimitMin?: number
  /** Archivos comunes a todo el paper (p. ej. un único PDF o un único audio). */
  files: PartFiles
  parts: Part[]
}

export interface Exam {
  id: string
  schemaVersion: number
  name: string
  importedAt: string
  notes?: string
  papers: Paper[]
}

export type AttemptMode = 'exam' | 'practice' | 'review'

export interface SelfAssessment {
  /** Criterio → puntuación 0..5 (escala de Cambridge). */
  scores: Record<string, number>
  notes?: string
}

export interface Recording {
  file: FileRef
  durationSec?: number
  createdAt: string
}

export interface AnswerValue {
  /** choice: etiqueta elegida; text/essay: texto. */
  value?: string
  /** Consigna escrita por el alumno (Writing/Speaking) si la pregunta no la trae. */
  prompt?: string
  recording?: Recording
  /** Transcripción o notas de lo dicho en Speaking. */
  transcript?: string
  /** En modo práctica: el alumno pidió ver la corrección. */
  revealed?: boolean
  updatedAt?: string
}

export interface QuestionResult {
  questionId: string
  partId: string
  number: number
  category: string
  kind: QuestionKind
  given: string
  expected: string[]
  /** null = sin clave, no se puede corregir. */
  correct: boolean | null
  points: number
  maxPoints: number
}

export interface PartResult {
  partId: string
  partNumber: number
  title: string
  category: string
  score: number
  maxScore: number
  correct: number
  gradedCount: number
  total: number
  /** true si la parte tenía clave (al menos una pregunta corregible). */
  graded: boolean
  /** Para Writing/Speaking: media de la autoevaluación (0..5) si existe. */
  selfScore?: number
  selfMax?: number
}

export interface AttemptResult {
  score: number
  maxScore: number
  /** Porcentaje 0..100, o null si no hay nada corregible ni autoevaluado. */
  percent: number | null
  parts: PartResult[]
  questions: QuestionResult[]
}

/** Corrección de una tarea de Writing/Speaking devuelta por un chat de IA (pegada por el alumno). */
export interface AiFeedback {
  /** Criterio → 0..5 (solo los que la IA ha podido valorar). */
  scores: Record<string, number>
  summary?: string
  errors: Array<{ original: string; correction: string; explanation: string }>
  tips: string[]
  improved?: string
  /** Writing Part 2: pregunta que eligió el alumno. */
  chosenTask?: string
  receivedAt: string
}

export interface Attempt {
  id: string
  schemaVersion: number
  examId: string
  examName: string
  paperId: string
  paperType: PaperType
  paperTitle: string
  mode: AttemptMode
  /** Partes incluidas en el intento. */
  partIds: string[]
  /** En modo repaso: solo estas preguntas. */
  questionIds?: string[]
  status: 'in-progress' | 'finished'
  startedAt: string
  finishedAt?: string
  /** Segundos de trabajo efectivo. */
  durationSec: number
  /** Límite aplicado (modo examen), en segundos. */
  timeLimitSec?: number
  /** Motivo de cierre. */
  endReason?: 'submitted' | 'timeout'
  answers: Record<string, AnswerValue>
  /** Autoevaluación por pregunta (Writing/Speaking). */
  selfAssessments: Record<string, SelfAssessment>
  result?: AttemptResult
  /** Corrección de IA por pregunta (Writing/Speaking). */
  aiFeedback?: Record<string, AiFeedback>
  /** Comentario general de la IA para todo el intento. */
  aiGeneral?: string
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  schemaVersion: number
  theme: ThemePreference
  /** Escala del texto: 0.9 .. 1.4 */
  fontScale: number
  language: 'es'
  grading: GradingOptions
  /** Segundos entre autoguardados. */
  autosaveSeconds: number
  /** Buscar actualizaciones al iniciar (necesita internet; sin conexión no pasa nada). */
  checkUpdates: boolean
}

export interface GradingOptions {
  ignoreCase: boolean
  ignoreExtraSpaces: boolean
  ignoreAccents: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: SCHEMA_VERSION,
  theme: 'system',
  fontScale: 1,
  language: 'es',
  grading: { ignoreCase: false, ignoreExtraSpaces: false, ignoreAccents: false },
  autosaveSeconds: 3,
  checkUpdates: true
}

export const PAPER_ORDER: PaperType[] = ['reading', 'writing', 'listening', 'speaking']

export const WRITING_CRITERIA = ['content', 'communicativeAchievement', 'organisation', 'language'] as const
export const SPEAKING_CRITERIA = [
  'grammarVocabulary',
  'discourseManagement',
  'pronunciation',
  'interactiveCommunication'
] as const

export function criteriaFor(type: PaperType): readonly string[] {
  if (type === 'writing') return WRITING_CRITERIA
  if (type === 'speaking') return SPEAKING_CRITERIA
  return []
}
