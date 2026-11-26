// Taxonomía de competencias (extensible) y clasificación de errores.
//
// Reglas: solo se asigna una categoría cuando se puede deducir de los datos (tipo de tarea, respuesta
// correcta o explicación). Si no hay pistas suficientes, la categoría queda sin asignar y el usuario puede
// ponerla a mano. La pronunciación nunca se deduce automáticamente: una transcripción (Whisper) o una
// corrección de IA hecha sobre una transcripción no permiten evaluarla.
import type { PracticeSkill, PracticeTaskType } from '../practice'
import type { PaperType } from '../types'

/** Destrezas del plan de estudio (independientes de los papers y de las hojas). */
export type StudySkill = 'useOfEnglish' | 'reading' | 'writing' | 'listening' | 'speaking'
export const STUDY_SKILLS: StudySkill[] = ['useOfEnglish', 'reading', 'writing', 'listening', 'speaking']

export type CompetencyGroup = 'grammar' | 'vocabulary' | 'reading' | 'writing' | 'listening' | 'speaking'
export const COMPETENCY_GROUPS: CompetencyGroup[] = ['grammar', 'vocabulary', 'reading', 'writing', 'listening', 'speaking']

export interface Competency {
  id: string
  group: CompetencyGroup
  /** Nombre en inglés (es contenido educativo). */
  label: string
  skill: StudySkill
  /** Solo se puede asignar a mano o con feedback específico (p. ej. pronunciación). */
  manualOnly?: boolean
}

const C = (group: CompetencyGroup, key: string, label: string, skill: StudySkill, manualOnly?: boolean): Competency => ({ id: `${group}.${key}`, group, label, skill, ...(manualOnly ? { manualOnly } : {}) })

export const COMPETENCIES: Competency[] = [
  C('grammar', 'tenses', 'Verb tenses', 'useOfEnglish'),
  C('grammar', 'conditionals', 'Conditionals', 'useOfEnglish'),
  C('grammar', 'passive', 'Passive voice', 'useOfEnglish'),
  C('grammar', 'reportedSpeech', 'Reported speech', 'useOfEnglish'),
  C('grammar', 'modals', 'Modal verbs', 'useOfEnglish'),
  C('grammar', 'relativeClauses', 'Relative clauses', 'useOfEnglish'),
  C('grammar', 'articles', 'Articles', 'useOfEnglish'),
  C('grammar', 'prepositions', 'Prepositions', 'useOfEnglish'),
  C('grammar', 'gerundsInfinitives', 'Gerunds and infinitives', 'useOfEnglish'),
  C('grammar', 'comparatives', 'Comparatives', 'useOfEnglish'),
  C('grammar', 'quantifiers', 'Quantifiers', 'useOfEnglish'),
  C('grammar', 'wordOrder', 'Word order', 'useOfEnglish'),
  C('grammar', 'linkers', 'Linkers and connectors', 'useOfEnglish'),
  C('vocabulary', 'phrasalVerbs', 'Phrasal verbs', 'useOfEnglish'),
  C('vocabulary', 'collocations', 'Collocations', 'useOfEnglish'),
  C('vocabulary', 'idioms', 'Idioms and fixed phrases', 'useOfEnglish'),
  C('vocabulary', 'confusingWords', 'Confusing words', 'useOfEnglish'),
  C('vocabulary', 'synonyms', 'Synonyms and meaning', 'useOfEnglish'),
  C('vocabulary', 'wordFormation', 'Word formation', 'useOfEnglish'),
  C('vocabulary', 'affixes', 'Prefixes and suffixes', 'useOfEnglish'),
  C('vocabulary', 'falseFriends', 'False friends', 'useOfEnglish'),
  C('reading', 'mainIdea', 'Main idea', 'reading'),
  C('reading', 'detail', 'Detail', 'reading'),
  C('reading', 'inference', 'Inference', 'reading'),
  C('reading', 'attitude', "Writer's attitude", 'reading'),
  C('reading', 'reference', 'Reference', 'reading'),
  C('reading', 'structure', 'Text structure', 'reading'),
  C('writing', 'grammar', 'Grammar (writing)', 'writing'),
  C('writing', 'vocabulary', 'Vocabulary (writing)', 'writing'),
  C('writing', 'organisation', 'Organisation', 'writing'),
  C('writing', 'register', 'Register', 'writing'),
  C('writing', 'cohesion', 'Cohesion', 'writing'),
  C('writing', 'task', 'Task achievement', 'writing'),
  C('listening', 'detail', 'Listening for detail', 'listening'),
  C('listening', 'gist', 'Listening for gist', 'listening'),
  C('speaking', 'fluency', 'Fluency', 'speaking'),
  C('speaking', 'vocabulary', 'Vocabulary (speaking)', 'speaking'),
  C('speaking', 'grammar', 'Grammar (speaking)', 'speaking'),
  C('speaking', 'discourse', 'Discourse management', 'speaking'),
  C('speaking', 'pronunciation', 'Pronunciation', 'speaking', true)
]

const BY_ID = new Map(COMPETENCIES.map((c) => [c.id, c]))

export function competency(id: string | undefined): Competency | undefined {
  return id ? BY_ID.get(id) : undefined
}

export function isCompetencyId(id: unknown): id is string {
  return typeof id === 'string' && BY_ID.has(id)
}

export function competenciesOf(group: CompetencyGroup): Competency[] {
  return COMPETENCIES.filter((c) => c.group === group)
}

// ---------- Partes del examen ----------

/** Identificador estable de una parte del examen: «reading.p4», «listening.p2»… */
export type ExamPartId = string

export const SHEET_TASK_PART: Record<PracticeTaskType, ExamPartId> = {
  mcCloze: 'reading.p1',
  openCloze: 'reading.p2',
  wordFormation: 'reading.p3',
  transformation: 'reading.p4',
  readingMc: 'reading.p5',
  matching: 'reading.p7'
}

export const PART_LABELS: Record<string, string> = {
  'reading.p1': 'Use of English · Part 1 · Multiple-choice cloze',
  'reading.p2': 'Use of English · Part 2 · Open cloze',
  'reading.p3': 'Use of English · Part 3 · Word formation',
  'reading.p4': 'Use of English · Part 4 · Key word transformations',
  'reading.p5': 'Reading · Part 5 · Multiple choice',
  'reading.p6': 'Reading · Part 6 · Gapped text',
  'reading.p7': 'Reading · Part 7 · Multiple matching',
  'writing.p1': 'Writing · Part 1 · Essay',
  'writing.p2': 'Writing · Part 2',
  'listening.p1': 'Listening · Part 1',
  'listening.p2': 'Listening · Part 2',
  'listening.p3': 'Listening · Part 3',
  'listening.p4': 'Listening · Part 4',
  'speaking.p1': 'Speaking · Part 1',
  'speaking.p2': 'Speaking · Part 2',
  'speaking.p3': 'Speaking · Part 3',
  'speaking.p4': 'Speaking · Part 4'
}

export function partLabel(id: ExamPartId | undefined): string | undefined {
  return id ? (PART_LABELS[id] ?? id) : undefined
}

export function examPartId(paper: PaperType, partNumber: number): ExamPartId {
  return `${paper}.p${partNumber}`
}

/** Destreza del plan de una parte del examen (Reading & Use of English: partes 1–4 son Use of English). */
export function skillOfPart(part: ExamPartId): StudySkill {
  const [paper, p] = part.split('.p')
  if (paper === 'reading') return Number(p) <= 4 ? 'useOfEnglish' : 'reading'
  if (paper === 'writing' || paper === 'listening' || paper === 'speaking') return paper
  return 'useOfEnglish'
}

export function skillOfPracticeSkill(skill: PracticeSkill): StudySkill {
  return skill === 'reading' ? 'reading' : 'useOfEnglish'
}

/** Destreza de una pregunta de examen según el paper y la parte. */
export function skillOfPaperPart(paper: PaperType, partNumber: number): StudySkill {
  return skillOfPart(examPartId(paper, partNumber))
}

/** Tipo de tarea de Use of English que corresponde a una categoría libre de examen («Open cloze»…). */
export function taskTypeFromCategory(category: string | undefined): PracticeTaskType | undefined {
  const c = (category ?? '').toLowerCase()
  if (/multiple[- ]choice cloze|opci[oó]n m[uú]ltiple.*hueco|part 1/.test(c) && !/reading/.test(c)) return 'mcCloze'
  if (/open cloze|huecos abiertos/.test(c)) return 'openCloze'
  if (/word formation|formaci[oó]n de palabras/.test(c)) return 'wordFormation'
  if (/transformation|transformaci/.test(c)) return 'transformation'
  if (/multiple matching|emparejamiento/.test(c)) return 'matching'
  if (/multiple choice|opci[oó]n m[uú]ltiple/.test(c)) return 'readingMc'
  return undefined
}

// ---------- Clasificación automática (solo con pistas claras) ----------

const PREPOSITIONS = new Set(['in', 'on', 'at', 'of', 'for', 'to', 'from', 'by', 'with', 'about', 'into', 'onto', 'over', 'under', 'between', 'among', 'through', 'during', 'since', 'until', 'towards', 'against', 'without', 'within', 'despite', 'beyond', 'upon', 'across', 'behind', 'beside', 'besides', 'off', 'out', 'up', 'down', 'like'])
const ARTICLES = new Set(['a', 'an', 'the'])
const QUANTIFIERS = new Set(['much', 'many', 'few', 'little', 'enough', 'several', 'some', 'any', 'each', 'every', 'all', 'both', 'either', 'neither', 'none', 'plenty', 'lots', 'most', 'less', 'fewer'])
const MODALS = new Set(['can', 'could', 'must', 'should', 'might', 'may', 'would', 'ought', 'shall', 'need', 'needn'])
const RELATIVES = new Set(['who', 'whom', 'whose', 'which', 'where', 'when', 'whereby'])
const LINKERS = new Set(['although', 'though', 'however', 'whereas', 'unless', 'because', 'since', 'therefore', 'moreover', 'furthermore', 'despite', 'spite', 'nevertheless', 'otherwise', 'whether', 'while', 'whilst', 'so', 'but', 'yet', 'as', 'even', 'order'])

type Rule = [RegExp, string]

/** Pistas en la explicación (en español o inglés). El orden importa: primero lo más específico. */
const EXPLAIN_RULES: Rule[] = [
  [/phrasal/i, 'vocabulary.phrasalVerbs'],
  [/colocaci[oó]n|collocation|se dice ['«"]?(make|do|take|have|get)/i, 'vocabulary.collocations'],
  [/false friend|falso amigo/i, 'vocabulary.falseFriends'],
  [/\bidiom|expresi[oó]n (fija|idiom[aá]tica|hecha)|fixed (phrase|expression)/i, 'vocabulary.idioms'],
  [/\b(make|do)\b.*\b(make|do)\b|confund|confusing|se confunde/i, 'vocabulary.confusingWords'],
  [/sin[oó]nimo|synonym|matiz|significado|meaning/i, 'vocabulary.synonyms'],
  [/prefijo|prefix|sufijo|suffix/i, 'vocabulary.affixes'],
  [/condicional|conditional|third conditional|second conditional|if \+/i, 'grammar.conditionals'],
  [/pasiva|passive/i, 'grammar.passive'],
  [/estilo indirecto|reported speech|reporting verb/i, 'grammar.reportedSpeech'],
  [/relativ/i, 'grammar.relativeClauses'],
  [/\bmodal/i, 'grammar.modals'],
  [/gerundio|gerund|infinitiv/i, 'grammar.gerundsInfinitives'],
  [/comparativ|superlativ|comparative|superlative/i, 'grammar.comparatives'],
  [/cuantificador|quantifier|incontable|uncountable|contable/i, 'grammar.quantifiers'],
  [/art[ií]culo|article/i, 'grammar.articles'],
  [/preposici[oó]n|preposition|r[eé]gimen/i, 'grammar.prepositions'],
  [/orden de (las )?palabras|word order|inversi[oó]n|inversion/i, 'grammar.wordOrder'],
  [/conector|linker|connector|contraste|concesi[oó]n/i, 'grammar.linkers'],
  [/present perfect|past perfect|past simple|tiempo verbal|verb tense|\btense|pret[eé]rito|futuro|continuous|pluscuamperfecto/i, 'grammar.tenses']
]

const READING_RULES: Rule[] = [
  [/attitude|feel about|opinion|think about|tone|view of|actitud/i, 'reading.attitude'],
  [/suggest|impl(y|ies|ied)|infer|most likely|probably|why does the writer mention/i, 'reading.inference'],
  [/\brefer|\b'it'|\b'this'|\b'they'|\b'these'|\bline \d/i, 'reading.reference'],
  [/purpose|paragraph|structure|organi[sz]|in order to show/i, 'reading.structure'],
  [/main (point|idea)|mainly|overall|summari[sz]e|conclusion|title/i, 'reading.mainIdea'],
  [/according to|what does .* say|what did|when did|where|how many|which of the following is true/i, 'reading.detail']
]

const WRITING_RULES: Rule[] = [
  [/registro|register|formal|informal|tono|tone/i, 'writing.register'],
  [/conector|cohesi[oó]n|cohesion|linking|enlace|repetici[oó]n|referencia/i, 'writing.cohesion'],
  [/p[aá]rrafo|paragraph|organi[sz]|estructura|structure|introducci[oó]n|conclusi[oó]n/i, 'writing.organisation'],
  [/consigna|task|punto (que falta|de la tarea)|no responde|content|contenido/i, 'writing.task'],
  [/vocabulario|palabra|word choice|colocaci[oó]n|collocation|l[eé]xico|vocabulary/i, 'writing.vocabulary'],
  [/gram[aá]tic|tiempo verbal|tense|concordancia|agreement|art[ií]culo|preposici[oó]n|plural|verbo|verb/i, 'writing.grammar']
]

const SPEAKING_RULES: Rule[] = [
  [/fluidez|fluency|pausa|hesita|vacila/i, 'speaking.fluency'],
  [/organi[sz]|discurso|discourse|coherencia|relevan|desarroll/i, 'speaking.discourse'],
  [/vocabulario|palabra|word choice|colocaci[oó]n|collocation|l[eé]xico|vocabulary/i, 'speaking.vocabulary'],
  [/gram[aá]tic|tiempo verbal|tense|concordancia|agreement|art[ií]culo|preposici[oó]n|plural|verbo|verb/i, 'speaking.grammar']
]

function firstMatch(rules: Rule[], text: string): string | undefined {
  for (const [re, id] of rules) if (re.test(text)) return id
  return undefined
}

function words(s: string): string[] {
  return s.toLowerCase().replace(/[’']/g, "'").split(/[^a-z']+/).filter(Boolean)
}

/** Por la respuesta correcta de un hueco de una palabra (Open cloze). */
function classifyByAnswer(answers: string[]): string | undefined {
  const w = answers.map((a) => a.trim().toLowerCase()).filter(Boolean)
  if (!w.length || w.some((a) => /\s/.test(a))) return undefined
  const all = (set: Set<string>) => w.every((a) => set.has(a))
  if (all(ARTICLES)) return 'grammar.articles'
  if (all(RELATIVES)) return 'grammar.relativeClauses'
  if (all(MODALS)) return 'grammar.modals'
  if (all(QUANTIFIERS)) return 'grammar.quantifiers'
  if (all(LINKERS)) return 'grammar.linkers'
  if (all(PREPOSITIONS)) return 'grammar.prepositions'
  if (w.every((a) => ['than', 'more', 'most', 'less', 'least', 'as'].includes(a))) return 'grammar.comparatives'
  if (w.every((a) => ['been', 'being', 'had', 'has', 'have', 'did', 'does', 'was', 'were', 'will'].includes(a))) return 'grammar.tenses'
  return undefined
}

export interface ClassifyInput {
  /** Tipo de tarea de Use of English / Reading, si se conoce. */
  taskType?: PracticeTaskType
  skill: StudySkill
  question?: string
  expected?: string[]
  explanation?: string
  /** Para Writing/Speaking: texto original y corrección. */
  original?: string
  correction?: string
}

export interface Classification {
  category?: string
  subcategory?: string
}

/** Clasifica un error. Devuelve la categoría solo si se puede deducir; nunca pronunciación. */
export function classifyError(input: ClassifyInput): Classification {
  const explain = input.explanation ?? ''
  switch (input.taskType) {
    case 'wordFormation': {
      const base = (input.question ?? '').match(/\b[A-Z]{3,}\b/)?.[0]
      const exp = input.expected?.[0]?.toLowerCase() ?? ''
      const affix = /^(un|in|im|il|ir|dis|mis|over|under|re|non)/.test(exp) && base && !exp.startsWith(base.toLowerCase().slice(0, 2))
      const sub = /prefijo|prefix|negativ/i.test(explain) || affix ? 'Prefixes' : /sufijo|suffix|plural|adverbio|adjetivo|sustantivo|noun|adjective|adverb/i.test(explain) ? 'Suffixes' : undefined
      return { category: 'vocabulary.wordFormation', subcategory: sub }
    }
    case 'openCloze':
      return { category: classifyByAnswer(input.expected ?? []) ?? firstMatch(EXPLAIN_RULES, explain) }
    case 'mcCloze': {
      const byExplain = firstMatch(EXPLAIN_RULES, explain)
      if (byExplain) return { category: byExplain }
      const opts = (input.expected ?? []).join(' ')
      if (words(opts).some((w) => ['up', 'out', 'off', 'down', 'over'].includes(w)) && words(opts).length >= 2) return { category: 'vocabulary.phrasalVerbs' }
      return {}
    }
    case 'transformation': {
      const cat = firstMatch(EXPLAIN_RULES, explain)
      return { category: cat }
    }
    case 'readingMc':
      return { category: firstMatch(READING_RULES, input.question ?? '') }
    case 'matching':
      // Emparejar afirmaciones con textos es buscar información concreta.
      return { category: 'reading.detail' }
  }
  const text = [explain, input.original, input.correction].filter(Boolean).join(' · ')
  if (input.skill === 'writing') return { category: firstMatch(WRITING_RULES, text) }
  if (input.skill === 'speaking') return { category: firstMatch(SPEAKING_RULES, text) }
  if (input.skill === 'reading') return { category: firstMatch(READING_RULES, input.question ?? '') }
  if (input.skill === 'useOfEnglish') return { category: classifyByAnswer(input.expected ?? []) ?? firstMatch(EXPLAIN_RULES, explain) }
  return {}
}
