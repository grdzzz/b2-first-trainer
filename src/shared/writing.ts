// Ayuda para Writing: guía por tipo de texto del B2 First y revisión automática mientras se escribe.
// Todo es local y orientativo: no sustituye a la corrección (autoevaluación o IA).
import { countWords } from './grading'

export type WritingType = 'essay' | 'article' | 'email' | 'report' | 'review'
export const WRITING_TYPES: WritingType[] = ['essay', 'article', 'email', 'report', 'review']

export interface WritingGuide {
  /** Nombre en español. */
  label: string
  /** Para qué sirve y a quién va dirigido. */
  purpose: string
  register: string
  structure: Array<{ title: string; text: string }>
  phrases: Array<{ group: string; items: string[] }>
  checklist: string[]
}

export const WRITING_GUIDES: Record<WritingType, WritingGuide> = {
  essay: {
    label: 'Essay (redacción)',
    purpose: 'Das tu opinión sobre un tema para tu profesor. Es la tarea obligatoria de la Part 1: debes tratar las dos ideas que te dan y añadir una tuya.',
    register: 'Formal o neutro. Sin contracciones (do not, it is) ni expresiones coloquiales.',
    structure: [
      { title: 'Introducción', text: 'Presenta el tema con tus palabras (no copies la pregunta) y adelanta que hay distintos puntos de vista.' },
      { title: 'Párrafo 1', text: 'Primera idea de las notas, con una razón o un ejemplo.' },
      { title: 'Párrafo 2', text: 'Segunda idea de las notas, con otra razón o ejemplo.' },
      { title: 'Párrafo 3', text: 'Tu propia idea (la tercera), bien desarrollada.' },
      { title: 'Conclusión', text: 'Responde a la pregunta con tu opinión clara, resumiendo los argumentos.' }
    ],
    phrases: [
      { group: 'Introducir', items: ['It is often said that…', 'Nowadays, many people believe that…', 'There is no doubt that…'] },
      { group: 'Añadir ideas', items: ['Firstly, …', 'In addition, …', 'What is more, …', 'Another important point is that…'] },
      { group: 'Contrastar', items: ['However, …', 'On the other hand, …', 'Although …,', 'Despite the fact that…'] },
      { group: 'Dar ejemplos', items: ['For example, …', 'For instance, …', 'such as…'] },
      { group: 'Concluir', items: ['In conclusion, …', 'All things considered, …', 'To sum up, …', 'On balance, I believe that…'] }
    ],
    checklist: ['He tratado las dos ideas de las notas y he añadido una propia.', 'Hay introducción, párrafos y conclusión con mi opinión.', 'Uso conectores variados.', 'No hay contracciones ni lenguaje coloquial.', 'Estoy entre 140 y 190 palabras.']
  },
  article: {
    label: 'Article (artículo)',
    purpose: 'Escribes para una revista o web. Tienes que interesar y entretener al lector, no solo informar.',
    register: 'Neutro o informal, cercano. Se permiten contracciones y preguntas al lector.',
    structure: [
      { title: 'Título', text: 'Corto y llamativo.' },
      { title: 'Introducción', text: 'Engancha al lector con una pregunta, un dato curioso o una anécdota.' },
      { title: 'Desarrollo (2 párrafos)', text: 'Responde a todas las preguntas del enunciado, con ejemplos y experiencias personales.' },
      { title: 'Cierre', text: 'Una frase final que deje pensando al lector o le anime a hacer algo.' }
    ],
    phrases: [
      { group: 'Enganchar', items: ['Have you ever wondered…?', 'Imagine…', 'Believe it or not, …', 'Let me tell you about…'] },
      { group: 'Hablar al lector', items: ['You might think that…, but…', 'If you are anything like me, …', 'Why not give it a try?'] },
      { group: 'Experiencia personal', items: ['I will never forget…', 'For me, …', 'What I love most about … is…'] },
      { group: 'Cerrar', items: ['So, what are you waiting for?', 'All in all, …', 'Next time you…, remember…'] }
    ],
    checklist: ['Tiene un título atractivo.', 'La introducción engancha (pregunta, dato o anécdota).', 'Respondo a todas las preguntas del enunciado.', 'Me dirijo al lector y uso un tono cercano.', 'Estoy entre 140 y 190 palabras.']
  },
  email: {
    label: 'Email / letter (correo o carta)',
    purpose: 'Respondes a alguien (un amigo, una empresa, un club…). Debes contestar a todo lo que te pide, en el registro adecuado.',
    register: 'Depende del destinatario: informal con amigos (contracciones, tono cercano), formal con desconocidos o instituciones.',
    structure: [
      { title: 'Saludo', text: 'Dear Mr Smith, (formal) / Hi Anna, (informal).' },
      { title: 'Apertura', text: 'Di por qué escribes o reacciona al correo recibido.' },
      { title: 'Desarrollo (1-2 párrafos)', text: 'Responde a cada punto del enunciado, en orden.' },
      { title: 'Cierre y despedida', text: 'Una frase final y la despedida: Yours sincerely / Best wishes / See you soon.' }
    ],
    phrases: [
      { group: 'Abrir (informal)', items: ['Thanks for your email.', 'It was great to hear from you!', 'Sorry I haven’t written for ages.'] },
      { group: 'Abrir (formal)', items: ['I am writing to…', 'I am writing in response to…', 'I would like to enquire about…'] },
      { group: 'Responder y sugerir', items: ['As for…, …', 'Why don’t you…?', 'If I were you, I would…', 'I would be grateful if you could…'] },
      { group: 'Cerrar', items: ['Write back soon!', 'Can’t wait to see you.', 'I look forward to hearing from you.', 'Best wishes, / Yours sincerely,'] }
    ],
    checklist: ['Tiene saludo y despedida adecuados al destinatario.', 'Respondo a todos los puntos del enunciado.', 'El registro (formal/informal) es coherente de principio a fin.', 'Estoy entre 140 y 190 palabras.']
  },
  report: {
    label: 'Report (informe)',
    purpose: 'Informas a un superior (director, jefe, club) sobre algo y das recomendaciones. Debe ser claro y fácil de leer.',
    register: 'Formal e impersonal. Sin contracciones. Frases claras.',
    structure: [
      { title: 'Título y objetivo', text: 'Un título y un párrafo «Introduction» que diga el propósito del informe.' },
      { title: 'Apartados con encabezado', text: 'Un apartado por cada punto del enunciado, cada uno con su encabezado.' },
      { title: 'Recomendación', text: 'Un apartado final «Recommendation(s)» o «Conclusion» con tu propuesta.' }
    ],
    phrases: [
      { group: 'Objetivo', items: ['The aim of this report is to…', 'This report describes… and makes recommendations…'] },
      { group: 'Presentar datos', items: ['According to most students, …', 'It was found that…', 'The majority of… / A few…'] },
      { group: 'Recomendar', items: ['I would recommend that…', 'It would be a good idea to…', 'It is suggested that…'] }
    ],
    checklist: ['Tiene título y encabezados para cada apartado.', 'El primer apartado explica el objetivo.', 'Hay recomendaciones al final.', 'Registro formal, sin contracciones.', 'Estoy entre 140 y 190 palabras.']
  },
  review: {
    label: 'Review (reseña)',
    purpose: 'Describes y valoras algo (una película, un libro, un restaurante, una app…) para una revista o web, y lo recomiendas o no.',
    register: 'Neutro o informal, con opinión personal y adjetivos expresivos.',
    structure: [
      { title: 'Introducción', text: 'Qué reseñas y una primera impresión.' },
      { title: 'Descripción', text: 'De qué trata o cómo es, sin contar demasiado.' },
      { title: 'Valoración', text: 'Lo mejor y lo peor, con adjetivos variados.' },
      { title: 'Recomendación', text: 'Si lo recomiendas y a quién.' }
    ],
    phrases: [
      { group: 'Presentar', items: ['I recently watched/read/visited…', '… is set in…', 'It tells the story of…'] },
      { group: 'Valorar', items: ['What impressed me most was…', 'The only drawback is that…', 'It is well worth…'] },
      { group: 'Recomendar', items: ['I would highly recommend it to…', 'It is perfect for anyone who…', 'I would give it four out of five.'] }
    ],
    checklist: ['Digo claramente qué reseño.', 'Describo sin contarlo todo.', 'Doy mi opinión con adjetivos variados (no solo good/bad).', 'Termino con una recomendación clara.', 'Estoy entre 140 y 190 palabras.']
  }
}

/** Deduce el tipo de texto de la consigna. La Part 1 del Writing siempre es un essay. */
export function detectWritingType(prompt: string, partNumber?: number): WritingType {
  if (partNumber === 1) return 'essay'
  const p = prompt.toLowerCase()
  const checks: Array<[WritingType, RegExp]> = [
    ['report', /\breport\b/],
    ['review', /\breview\b/],
    ['article', /\barticle\b/],
    ['email', /\be-?mail\b|\bletter\b/],
    ['essay', /\bessay\b/]
  ]
  for (const [type, re] of checks) if (re.test(p)) return type
  return 'essay'
}

// ---------- Revisión automática ----------

export const CONNECTORS = [
  'however', 'although', 'though', 'even though', 'despite', 'in spite of', 'whereas', 'while', 'on the other hand', 'nevertheless', 'yet',
  'firstly', 'first of all', 'secondly', 'finally', 'lastly', 'in addition', 'moreover', 'furthermore', 'what is more', "what's more", 'besides', 'also',
  'for example', 'for instance', 'such as', 'because', 'since', 'as a result', 'therefore', 'consequently', 'so that', 'in order to',
  'in conclusion', 'to sum up', 'all things considered', 'on balance', 'overall', 'all in all', 'in my opinion', 'personally', 'to my mind'
]

const STOPWORDS = new Set(
  'a an the and or but if so to of in on at for with by from as is are was were be been being it its this that these those there their they them he she his her him i me my we our us you your not no do does did have has had will would can could should may might must than then very also just more most much many some any all about into out up over what which who when where how why too one'.split(' ')
)

export interface WritingCheck {
  level: 'ok' | 'tip' | 'warn'
  text: string
}

export interface WritingAnalysis {
  words: number
  paragraphs: number
  sentences: number
  connectors: string[]
  repeated: Array<{ word: string; count: number }>
  checks: WritingCheck[]
}

function countPhrase(text: string, phrase: string): number {
  const re = new RegExp(`(^|[^a-z'])${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]")}(?=$|[^a-z'])`, 'g')
  return (text.match(re) ?? []).length
}

/** Revisa un texto de Writing y devuelve avisos y consejos en español. */
export function analyzeWriting(raw: string, type: WritingType, minWords = 140, maxWords = 190): WritingAnalysis {
  const text = raw.replace(/\r/g, '')
  const lower = text.toLowerCase().replace(/[‘’]/g, "'")
  const words = countWords(text)
  const paragraphs = text.split(/\n\s*\n|\n(?=\s*\S)/).filter((p) => p.trim().length > 0).length
  const sentenceList = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => /[a-z]/i.test(s))
  const connectors = CONNECTORS.filter((c) => countPhrase(lower, c) > 0)
  const counts = new Map<string, number>()
  for (const w of lower.match(/[a-z][a-z'-]+/g) ?? []) {
    const word = w.replace(/'s$/, '')
    if (word.length < 4 || STOPWORDS.has(word)) continue
    counts.set(word, (counts.get(word) ?? 0) + 1)
  }
  const repeated = Array.from(counts, ([word, count]) => ({ word, count })).filter((r) => r.count >= 4).sort((a, b) => b.count - a.count).slice(0, 5)
  const checks: WritingCheck[] = []
  if (words === 0) return { words, paragraphs: 0, sentences: 0, connectors, repeated, checks }

  const enough = words >= 60
  // Extensión
  if (minWords && words < minWords) checks.push({ level: enough ? 'warn' : 'tip', text: `Te faltan ${minWords - words} palabras para el mínimo (${minWords}).` })
  else if (maxWords && words > maxWords) checks.push({ level: 'warn', text: `Te pasas en ${words - maxWords} palabras del máximo (${maxWords}). Recorta repeticiones o ideas secundarias.` })
  else if (minWords) checks.push({ level: 'ok', text: `Extensión correcta (${words} palabras).` })

  if (enough) {
    // Organización
    if (paragraphs < 3) checks.push({ level: 'warn', text: 'Divide el texto en párrafos (al menos 3-4): la organización cuenta en la nota.' })
    else checks.push({ level: 'ok', text: `Bien organizado en ${paragraphs} párrafos.` })
    if (connectors.length < 3) checks.push({ level: 'warn', text: 'Usa más conectores para enlazar ideas (however, in addition, for example…).' })
    else checks.push({ level: 'ok', text: `Usas ${connectors.length} conectores distintos.` })
    // Repeticiones
    for (const r of repeated.slice(0, 2)) checks.push({ level: 'tip', text: `Repites «${r.word}» ${r.count} veces: busca sinónimos o reformula.` })
    const very = countPhrase(lower, 'very')
    if (very >= 3) checks.push({ level: 'tip', text: `Usas «very» ${very} veces: prueba adjetivos más precisos (huge, fascinating, exhausted…).` })
    const longOnes = sentenceList.filter((s) => countWords(s) > 35).length
    if (longOnes) checks.push({ level: 'tip', text: `Hay ${longOnes === 1 ? 'una frase muy larga' : `${longOnes} frases muy largas`} (más de 35 palabras): divídela para que se lea mejor.` })
  }

  // Según el tipo de texto
  const contractions = (lower.match(/\b[a-z]+n't\b|\b(i|you|we|they|he|she|it|that|there)'(m|re|s|ve|ll|d)\b/g) ?? []).length
  if ((type === 'essay' || type === 'report') && contractions > 0) checks.push({ level: 'warn', text: `Registro formal: evita las contracciones (${contractions}). Escribe «do not», «it is»…` })
  if (type === 'essay' && enough && !/(in conclusion|to sum up|all things considered|on balance|to conclude|overall)/.test(lower)) checks.push({ level: 'tip', text: 'Añade una conclusión clara (In conclusion, … / All things considered, …).' })
  if (type === 'email') {
    if (!/^\s*(dear|hi|hello|hey)\b/.test(lower)) checks.push({ level: 'warn', text: 'Empieza con un saludo (Dear… / Hi…).' })
    if (enough && !/(regards|yours (sincerely|faithfully)|best wishes|love|take care|see you|all the best|write (back )?soon|speak soon|cheers)[\s\S]{0,60}$/.test(lower)) checks.push({ level: 'warn', text: 'Termina con una despedida (Best wishes, / Yours sincerely, …).' })
  }
  if (type === 'article' && enough) {
    const firstLine = text.trim().split('\n')[0] ?? ''
    if (countWords(firstLine) > 10 || /[.]$/.test(firstLine.trim())) checks.push({ level: 'tip', text: 'Pon un título corto y llamativo en la primera línea.' })
    if (!text.includes('?')) checks.push({ level: 'tip', text: 'Haz alguna pregunta al lector para implicarlo (Have you ever…?).' })
  }
  if (type === 'report' && enough) {
    const headings = text.split('\n').filter((l) => l.trim() && countWords(l) <= 5 && !/[.!?]$/.test(l.trim())).length
    if (headings < 2) checks.push({ level: 'warn', text: 'Un report necesita título y encabezados para cada apartado (Introduction, …, Recommendations).' })
    if (!/(recommend|suggest|advise|would be a good idea)/.test(lower)) checks.push({ level: 'tip', text: 'Incluye recomendaciones al final (I would recommend that…).' })
  }
  if (type === 'review' && enough && !/(recommend|worth|must-see|must see|give it)/.test(lower)) checks.push({ level: 'tip', text: 'Termina recomendando (o no) lo que reseñas y a quién.' })

  return { words, paragraphs, sentences: sentenceList.length, connectors, repeated, checks }
}
