import { describe, expect, it } from 'vitest'
import { applyDetection, detectKey, detectPaperType, detectStructure, detectTime, itemsToLines, reflow } from '@shared/detect'
import { applyKey, parseKeyText } from '@shared/keys'
import { createExam } from '@shared/template'

// Textos inventados que imitan el formato de las instrucciones (no son contenido real de exámenes).
const page = (s: string) => s.trim().split('\n').map((l) => l.trim())

describe('itemsToLines', () => {
  it('agrupa por línea, ordena y respeta los huecos reales entre fragmentos', () => {
    const lines = itemsToLines([
      { str: 'second line', x: 10, y: 80, w: 60, h: 10 },
      { str: 'Wr', x: 10, y: 100, w: 12, h: 10 },
      { str: 'iting', x: 22, y: 100.5, w: 20, h: 10 },
      { str: 'Part 1', x: 60, y: 100, w: 30, h: 10 },
      { str: '  ', x: 0, y: 50 }
    ])
    expect(lines).toEqual(['Writing Part 1', 'second line'])
  })
})

describe('utilidades', () => {
  it('tiempo', () => {
    expect(detectTime('Time 1 hour 20 minutes')).toBe(80)
    expect(detectTime('within the time limit. Time: 1 hour 15 minutes')).toBe(75)
    expect(detectTime('Approximately 40 minutes')).toBe(40)
    expect(detectTime('no time here')).toBeUndefined()
  })
  it('tipo de paper', () => {
    expect(detectPaperType('SAMPLE\nReading and Use of English\n')).toBe('reading')
    expect(detectPaperType('Listening test')).toBe('listening')
    expect(detectPaperType('Mathematics')).toBeUndefined()
  })
  it('reflow une frases cortadas pero no títulos ni listas', () => {
    expect(reflow(['1 Your teacher', 'wants an essay.', 'Notes', 'Write about:', '1. money'])).toBe('1 Your teacher wants an essay.\nNotes\nWrite about:\n1. money')
  })
})

describe('detectStructure: Reading & Use of English', () => {
  const pages = [
    page(`Reading and Use of English
      Time 1 hour 15 minutes`),
    page(`2
      Part 1
      For questions 1 – 8, read the text below and decide which answer (A, B, C or D) best fits each gap.
      Example: 0 A going B coming C taking D making
      1 A one B two C three D four`),
    page(`Part 2
      For questions 9 – 16, read the text below and think of the word which best fits each gap. Use only one word in each gap.`),
    page(`Part 3
      For questions 17 – 24, read the text below. Use the word given in capitals at the end of some of the lines to form a word that fits in the gap.
      Part 4
      For questions 25 – 30, complete the second sentence so that it has a similar meaning to the first sentence, using the word given.`),
    page(`Part 5
      You are going to read a story. For questions 31 – 36, choose the answer (A, B, C or D) which you think fits best according to the text.
      Part 6
      Six sentences have been removed from the article. Choose from the sentences A – G the one which fits each gap (37 – 42).
      Part 7
      For questions 43 – 52, choose from the sections (A – D). The sections may be chosen more than once.
      © UCLES`)
  ]
  const d = detectStructure(pages, 'reading')

  it('encuentra las 7 partes con tipo, preguntas, opciones, puntos y página', () => {
    expect(d.timeLimitMin).toBe(75)
    expect(d.parts.map((p) => [p.number, p.category, p.kind, p.firstQuestion, p.count, p.options ?? null, p.points, p.page])).toEqual([
      [1, 'Multiple-choice cloze', 'choice', 1, 8, 4, 1, 2],
      [2, 'Open cloze', 'text', 9, 8, null, 1, 3],
      [3, 'Word formation', 'text', 17, 8, null, 1, 4],
      [4, 'Key word transformation', 'text', 25, 6, null, 2, 4],
      [5, 'Multiple choice (reading)', 'choice', 31, 6, 4, 2, 5],
      [6, 'Gapped text', 'choice', 37, 6, 7, 2, 5],
      [7, 'Multiple matching (reading)', 'choice', 43, 10, 4, 1, 5]
    ])
    expect(d.parts.every((p) => p.recognized)).toBe(true)
    expect(d.warnings).toEqual([])
  })

  it('applyDetection crea el paper, conserva ids/archivos y la clave compatible', () => {
    const exam = createExam('E', ['reading'])
    const keyed = applyKey(exam, parseKeyText('1 B\n9 which'), { paperId: exam.papers[0].id }).exam
    const before = keyed.papers[0]
    const withFile = { ...before, parts: before.parts.map((p, i) => (i === 0 ? { ...p, files: { pdf: { name: 'a.pdf', storedName: 'pdf-x.pdf', size: 1, mime: 'application/pdf' } } } : p)) }
    const after = applyDetection(withFile, d, { applyTime: true })
    expect(after.timeLimitMin).toBe(75)
    expect(after.parts[0].id).toBe(before.parts[0].id)
    expect(after.parts[0].files.pdf?.storedName).toBe('pdf-x.pdf')
    expect(after.parts[0].questions[0].answers).toEqual(['B'])
    expect(after.parts[1].questions[0].answers).toEqual(['which'])
    expect(after.parts[6].questions[0].options).toEqual(['A', 'B', 'C', 'D'])
    expect(after.parts.map((p) => p.pdfPage)).toEqual([2, 3, 4, 4, 5, 5, 5])
    expect(applyDetection(withFile, d).timeLimitMin).toBe(before.timeLimitMin)
  })
})

describe('detectStructure: Listening y Writing', () => {
  it('Listening con partes reconocidas', () => {
    const d = detectStructure([
      page(`Listening  Approximately 40 minutes
        Part 1
        You will hear people talking in eight different situations. For questions 1 – 8, choose the best answer (A, B or C).
        Part 2
        You will hear a talk. For questions 9 – 18, complete the sentences with a word or short phrase.
        Part 3
        You will hear five short extracts. For questions 19 – 23, choose from the list (A – H) what each speaker says.
        Part 4
        You will hear an interview. For questions 24 – 30, choose the best answer (A, B or C).`)
    ], 'listening')
    expect(d.timeLimitMin).toBe(40)
    expect(d.parts.map((p) => [p.category, p.kind, p.firstQuestion, p.count, p.options ?? null])).toEqual([
      ['Multiple choice (listening)', 'choice', 1, 8, 3],
      ['Sentence completion', 'text', 9, 10, null],
      ['Multiple matching (listening)', 'choice', 19, 5, 8],
      ['Multiple choice (listening)', 'choice', 24, 7, 3]
    ])
  })

  it('Writing: consignas y palabras, y aviso si el PDF es de otro paper', () => {
    const pages = [
      page(`Writing
        Time 1 hour 20 minutes`),
      page(`Writing • Part 1
        You must answer this question. Write your answer in 140 – 190 words.
        1 Your teacher has asked you to write an essay
        about city life.
        Notes
        3
        Write about:`),
      page(`Writing • Part 2
        Write an answer to one of the questions 2 – 4. Write your answer in 140 – 190 words.
        2 A magazine wants reviews. Write your review.
        3 Your friend sent an email. Write your email.`)
    ]
    const d = detectStructure(pages, 'writing')
    expect(d.parts.map((p) => [p.title, p.kind, p.firstQuestion, p.count, p.minWords, p.maxWords])).toEqual([
      ['Essay', 'essay', 1, 1, 140, 190],
      ['Review / email', 'essay', 2, 1, 140, 190]
    ])
    expect(d.parts[0].prompt).toBe('1 Your teacher has asked you to write an essay about city life.\nNotes\nWrite about:')
    expect(d.timeLimitMin).toBe(80)
    expect(detectStructure(pages, 'speaking').warnings[0]).toMatch(/parece de writing/)
  })

  it('PDF sin texto (escaneo) y sin encabezados', () => {
    expect(detectStructure([[], ['']], 'reading')).toMatchObject({ hasText: false, parts: [] })
    const d = detectStructure([page('Some long text without any useful headings at all, just words and more words to pass the minimum length limit of the detector easily.')], 'reading')
    expect(d.parts).toEqual([])
    expect(d.warnings.join()).toMatch(/Part 1/)
  })
})

describe('detectKey', () => {
  it('lee claves en columnas y en filas, y se integra con parseKeyText', () => {
    const k = detectKey([page('Part 7 text…'), page(`Answer key
      1 B 2 C 3 A 4 D
      9 which
      10 at
      25 IN SPITE OF the rain`)])
    expect(k?.count).toBe(7)
    expect(parseKeyText(k!.text).loose).toMatchObject({ 1: ['B'], 4: ['D'], 9: ['which'], 25: ['IN SPITE OF the rain'] })
  })
  it('sin sección de clave no inventa nada', () => {
    expect(detectKey([page('1 A one B two\n2 A three')])).toBeUndefined()
  })
})

describe('limpieza de texto', () => {
  it('convierte viñetas de fuentes de símbolos en •', () => {
    expect(itemsToLines([{ str: ' a challenge', x: 0, y: 10 }])).toEqual(['• a challenge'])
  })
})
