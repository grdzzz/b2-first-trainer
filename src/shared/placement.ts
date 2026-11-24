// Prueba de nivel inicial: siempre la misma, corta (24 preguntas, ~10 minutos) y orientativa.
// Material original escrito para la app (no es material de Cambridge).
//
// Cada pregunta tiene un nivel (A2, B1, B2 o C1). La nota sale de cuántas aciertas en cada nivel, descontando
// lo que se acertaría al azar, y se expresa en la escala Cambridge English (y el nivel MCER correspondiente).

export type PlacementSkill = 'grammar' | 'vocabulary' | 'reading'
export type PlacementBand = 'A2' | 'B1' | 'B2' | 'C1'
/** Nivel resultante («A1» = por debajo de A2). */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export const PLACEMENT_VERSION = 1

export interface PlacementQuestion {
  id: string
  skill: PlacementSkill
  band: PlacementBand
  /** Texto de lectura asociado (solo en Reading). */
  passage?: string
  /** Enunciado; «___» marca el hueco. */
  prompt: string
  options: string[]
  answer: number
}

export const PLACEMENT_PASSAGES: Record<string, { title: string; text: string }> = {
  edinburgh: {
    title: 'A message from Edinburgh',
    text:
      'Hi Laura,\n\n' +
      "Thanks for your message! I'm writing from Edinburgh. I arrived on Monday and the course started the next day. Classes are in the morning from nine to one, and in the afternoon we visit museums or walk around the old town.\n\n" +
      'My host family are lovely, but their house is quite far from the school, so I have to catch a bus at eight o\'clock. The weather has been cold and windy – I should have brought a warmer coat! On Saturday the school is organising a trip to a castle by the sea, and I can\'t wait.\n\n' +
      'See you soon,\nMarta'
  },
  multitasking: {
    title: 'The myth of multitasking',
    text:
      'For decades, the conventional wisdom was that multitasking made us more productive. Answering emails during meetings, or listening to podcasts while studying, seemed like an efficient use of limited time. Yet a growing body of research suggests the opposite.\n\n' +
      'What we call multitasking is, for the most part, rapid switching between tasks, and every switch carries a hidden cost: the brain needs a moment to refocus, and errors creep in. Interestingly, people who multitask most often tend to rate themselves as particularly good at it, while performing worse on tests of attention than those who rarely do.\n\n' +
      'None of this means we should abandon all parallel activity – walking while talking poses few problems – but it does suggest that demanding tasks deserve our undivided attention.'
  }
}

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // ---------- Gramática ----------
  { id: 'g1', skill: 'grammar', band: 'A2', prompt: 'I ___ to the cinema with my cousins last Saturday.', options: ['go', 'went', 'have gone', 'am going'], answer: 1 },
  { id: 'g2', skill: 'grammar', band: 'A2', prompt: "There aren't ___ apples left in the fridge.", options: ['some', 'any', 'much', 'no'], answer: 1 },
  { id: 'g3', skill: 'grammar', band: 'B1', prompt: 'If it rains tomorrow, we ___ the picnic.', options: ['cancel', 'would cancel', 'will cancel', 'cancelled'], answer: 2 },
  { id: 'g4', skill: 'grammar', band: 'B1', prompt: 'She has lived in Valencia ___ 2019.', options: ['for', 'since', 'during', 'from'], answer: 1 },
  { id: 'g5', skill: 'grammar', band: 'B2', prompt: 'By the time we got to the cinema, the film ___.', options: ['already started', 'has already started', 'had already started', 'was already starting'], answer: 2 },
  { id: 'g6', skill: 'grammar', band: 'B2', prompt: "I'd rather you ___ my laptop without asking me first.", options: ["don't use", "didn't use", 'not use', "won't use"], answer: 1 },
  { id: 'g7', skill: 'grammar', band: 'C1', prompt: 'Not until the results were published ___ how close the race had been.', options: ['we realised', 'did we realise', 'we did realise', 'had realised we'], answer: 1 },
  { id: 'g8', skill: 'grammar', band: 'C1', prompt: '___ the weather been better, the match would have gone ahead.', options: ['Had', 'If', 'Should', 'Were'], answer: 0 },

  // ---------- Vocabulario ----------
  { id: 'v1', skill: 'vocabulary', band: 'A2', prompt: 'Could you ___ me a favour and close the window?', options: ['give', 'make', 'do', 'take'], answer: 2 },
  { id: 'v2', skill: 'vocabulary', band: 'A2', prompt: 'My neighbour is very ___ – she always helps older people with their shopping.', options: ['kind', 'lazy', 'rude', 'boring'], answer: 0 },
  { id: 'v3', skill: 'vocabulary', band: 'B1', prompt: 'Our train was ___ because of the snow, so we arrived two hours late.', options: ['stopped', 'missed', 'lost', 'delayed'], answer: 3 },
  { id: 'v4', skill: 'vocabulary', band: 'B1', prompt: 'We had to ___ off the meeting until next week because the manager was ill.', options: ['take', 'put', 'give', 'bring'], answer: 1 },
  { id: 'v5', skill: 'vocabulary', band: 'B2', prompt: 'She ___ a lot of effort into her final project and got the top mark.', options: ['put', 'made', 'did', 'gave'], answer: 0 },
  { id: 'v6', skill: 'vocabulary', band: 'B2', prompt: 'Despite the bad reviews, the film was a huge ___ at the box office.', options: ['victory', 'winner', 'hit', 'prize'], answer: 2 },
  { id: 'v7', skill: 'vocabulary', band: 'C1', prompt: "The minister's answer was so ___ that nobody could work out what she actually meant.", options: ['blunt', 'vague', 'concise', 'vivid'], answer: 1 },
  { id: 'v8', skill: 'vocabulary', band: 'C1', prompt: 'After months of negotiations, the two sides finally ___ a deal.', options: ['held', 'did', 'took', 'struck'], answer: 3 },

  // ---------- Lectura ----------
  { id: 'r1', skill: 'reading', band: 'A2', passage: 'edinburgh', prompt: "When did Marta's course start?", options: ['On Monday', 'On Tuesday', 'On Saturday'], answer: 1 },
  { id: 'r2', skill: 'reading', band: 'A2', passage: 'edinburgh', prompt: 'What does Marta usually do in the afternoons?', options: ['She has more classes.', 'She goes sightseeing.', 'She stays with her host family.'], answer: 1 },
  { id: 'r3', skill: 'reading', band: 'B1', passage: 'edinburgh', prompt: 'Why does Marta take the bus?', options: ["It's too cold to walk.", 'Her host family leave home early.', 'She lives a long way from the school.'], answer: 2 },
  { id: 'r4', skill: 'reading', band: 'B1', passage: 'edinburgh', prompt: 'What does Marta regret?', options: ['not packing suitable clothes', 'choosing a host family', 'missing the trip to the castle'], answer: 0 },
  { id: 'r5', skill: 'reading', band: 'B2', passage: 'multitasking', prompt: 'According to the text, what is multitasking really?', options: ['doing two things at exactly the same time', 'moving quickly from one task to another', 'a skill that improves with practice'], answer: 1 },
  { id: 'r6', skill: 'reading', band: 'B2', passage: 'multitasking', prompt: 'What does the writer say about people who multitask a lot?', options: ['They avoid demanding tasks.', 'They do well on attention tests.', 'They overestimate their own ability.'], answer: 2 },
  { id: 'r7', skill: 'reading', band: 'C1', passage: 'multitasking', prompt: 'The phrase "errors creep in" suggests that mistakes…', options: ['appear gradually, almost without being noticed.', 'are deliberately ignored.', 'only happen at the start of a task.'], answer: 0 },
  { id: 'r8', skill: 'reading', band: 'C1', passage: 'multitasking', prompt: "What is the writer's overall conclusion?", options: ['Multitasking should be avoided in every situation.', 'Simple activities can be combined, but complex ones need full concentration.', 'The research on multitasking is still inconclusive.'], answer: 1 }
]

export const PLACEMENT_SKILLS: PlacementSkill[] = ['grammar', 'vocabulary', 'reading']
const BANDS: PlacementBand[] = ['A2', 'B1', 'B2', 'C1']

/** Respuestas: índice de la opción elegida, o -1 si la persona marca «No lo sé». */
export type PlacementAnswers = Record<string, number>

export interface PlacementResult {
  version: number
  /** Puntuación en la escala Cambridge English (110–190). */
  score: number
  level: CefrLevel
  correct: number
  total: number
  /** Porcentaje de aciertos en cada destreza. */
  skills: Record<PlacementSkill, number>
  date: string
  /** La tarjeta del inicio se ha ocultado. */
  dismissed: boolean
}

export function levelOfScore(score: number): CefrLevel {
  if (score >= 180) return 'C1'
  if (score >= 160) return 'B2'
  if (score >= 140) return 'B1'
  if (score >= 120) return 'A2'
  return 'A1'
}

/**
 * Corrige la prueba. Por cada nivel se calcula la proporción de aciertos descontando el azar
 * ((aciertos − azar) / (1 − azar)); cada nivel dominado suma 20 puntos sobre una base de 110.
 * Todo bien = 190 (C1); nada = 110 (por debajo de A2); acertar A2 y B1 y adivinar el resto ≈ 150 (B1).
 */
export function scorePlacement(answers: PlacementAnswers, questions = PLACEMENT_QUESTIONS, now = new Date()): Omit<PlacementResult, 'dismissed'> {
  let sum = 0
  for (const band of BANDS) {
    const qs = questions.filter((q) => q.band === band)
    if (!qs.length) continue
    const raw = qs.filter((q) => answers[q.id] === q.answer).length / qs.length
    const chance = qs.reduce((a, q) => a + 1 / q.options.length, 0) / qs.length
    sum += Math.max(0, (raw - chance) / (1 - chance))
  }
  const score = Math.round(110 + 20 * sum)
  const skills = {} as Record<PlacementSkill, number>
  for (const s of PLACEMENT_SKILLS) {
    const qs = questions.filter((q) => q.skill === s)
    skills[s] = qs.length ? Math.round((qs.filter((q) => answers[q.id] === q.answer).length / qs.length) * 100) : 0
  }
  return {
    version: PLACEMENT_VERSION,
    score,
    level: levelOfScore(score),
    correct: questions.filter((q) => answers[q.id] === q.answer).length,
    total: questions.length,
    skills,
    date: now.toISOString()
  }
}

/** Recomendaciones según el resultado (identificadores; los textos están en la interfaz). */
export type PlacementTip = 'grammar' | 'vocabulary' | 'reading' | 'dailySheets' | 'wordFormation' | 'fullExam' | 'timed' | 'review' | 'reminder'

export function placementTips(r: Pick<PlacementResult, 'level' | 'skills'>, reminderOn = false): PlacementTip[] {
  const tips: PlacementTip[] = []
  // La destreza más floja (si no está ya muy bien).
  const weakest = [...PLACEMENT_SKILLS].sort((a, b) => r.skills[a] - r.skills[b])[0]
  if (r.skills[weakest] < 75) tips.push(weakest)
  switch (r.level) {
    case 'A1':
    case 'A2':
      tips.push('dailySheets', reminderOn ? 'review' : 'reminder')
      break
    case 'B1':
      tips.push('dailySheets', 'wordFormation')
      break
    case 'B2':
      tips.push('fullExam', 'review')
      break
    case 'C1':
      tips.push('timed', 'fullExam')
      break
  }
  return Array.from(new Set(tips)).slice(0, 3)
}

/** Valida un resultado guardado (ajustes de otro equipo, archivos editados a mano…). */
export function parsePlacement(raw: unknown): PlacementResult | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<PlacementResult>
  if (typeof r.score !== 'number' || !Number.isFinite(r.score)) return null
  const score = Math.min(230, Math.max(80, Math.round(r.score)))
  const skills = {} as Record<PlacementSkill, number>
  const s = (r.skills ?? {}) as Partial<Record<PlacementSkill, unknown>>
  for (const k of PLACEMENT_SKILLS) {
    const v = s[k]
    skills[k] = typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0
  }
  const date = typeof r.date === 'string' && !Number.isNaN(Date.parse(r.date)) ? r.date : new Date(0).toISOString()
  const total = typeof r.total === 'number' && r.total > 0 ? Math.round(r.total) : PLACEMENT_QUESTIONS.length
  const correct = typeof r.correct === 'number' ? Math.min(total, Math.max(0, Math.round(r.correct))) : 0
  return {
    version: typeof r.version === 'number' ? r.version : PLACEMENT_VERSION,
    score,
    level: levelOfScore(score),
    correct,
    total,
    skills,
    date,
    dismissed: r.dismissed === true
  }
}
