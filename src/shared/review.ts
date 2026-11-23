// Repaso de fallos con repetición espaciada (sistema de cajas de Leitner).
// Cada pregunta fallada en una hoja de práctica vuelve al día siguiente; si se acierta, vuelve a los 3, 7 y 14 días.
// Tras acertarla en la última caja se da por dominada y sale del repaso. Si se falla, vuelve a empezar.
// El estado se guarda dentro del progreso de cada hoja (PracticeProgress.review), así se sincroniza igual.
import { checkItem, itemKey, localDay, OPTION_LETTERS, type PracticeProgress, type PracticeSheet, type PracticeTask } from './practice'

/** Días hasta el siguiente repaso según la caja (0 = recién fallada). */
export const REVIEW_INTERVALS = [1, 3, 7, 14]
/** Preguntas como mucho por sesión de repaso. */
export const REVIEW_SESSION_SIZE = 15

export interface ReviewState {
  /** Caja actual (0..3). */
  box: number
  /** Día (AAAA-MM-DD) a partir del cual toca repasarla. */
  due: string
  /** Veces que se ha fallado. */
  lapses: number
  addedAt: string
  lastAt?: string
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return localDay(new Date(y, m - 1, d + n))
}

/** Estado tras fallar una pregunta (nueva o que ya estaba en el repaso). */
export function failedState(prev: ReviewState | undefined, today: string, now = new Date()): ReviewState {
  return { box: 0, due: addDays(today, REVIEW_INTERVALS[0]), lapses: (prev?.lapses ?? 0) + 1, addedAt: prev?.addedAt ?? now.toISOString(), lastAt: now.toISOString() }
}

/** Estado tras responder en el repaso. null = dominada (sale del repaso). */
export function answerReview(prev: ReviewState, correct: boolean, today: string, now = new Date()): ReviewState | null {
  if (!correct) return failedState(prev, today, now)
  const box = prev.box + 1
  if (box >= REVIEW_INTERVALS.length) return null
  return { ...prev, box, due: addDays(today, REVIEW_INTERVALS[box]), lastAt: now.toISOString() }
}

/**
 * Actualiza el repaso al comprobar una hoja: las falladas (o sin responder) entran o vuelven a la caja 0;
 * las acertadas que ya tocaba repasar avanzan de caja. El resto no cambia.
 */
export function reviewAfterCheck(sheet: PracticeSheet, answers: Record<string, string>, prev: Record<string, ReviewState> | undefined, today: string, now = new Date()): { review: Record<string, ReviewState>; added: number; mastered: number } {
  const review: Record<string, ReviewState> = { ...(prev ?? {}) }
  let added = 0
  let mastered = 0
  sheet.tasks.forEach((task, ti) =>
    task.items.forEach((_, ii) => {
      const key = itemKey(ti, ii)
      const ok = checkItem(task, ii, answers[key]) === true
      const state = review[key]
      if (!ok) {
        if (!state) added++
        review[key] = failedState(state, today, now)
      } else if (state && state.due <= today) {
        const next = answerReview(state, true, today, now)
        if (next) review[key] = next
        else {
          delete review[key]
          mastered++
        }
      }
    })
  )
  return { review, added, mastered }
}

/**
 * Estado de repaso de una hoja. Las hojas comprobadas antes de existir el repaso no lo tienen:
 * se deduce de sus últimas respuestas (los fallos de entonces se repasan desde hoy).
 */
export function reviewOf(sheet: PracticeSheet, progress: PracticeProgress | undefined, today: string): Record<string, ReviewState> {
  if (!progress) return {}
  if (progress.review) return progress.review
  if (!progress.checked) return {}
  const out: Record<string, ReviewState> = {}
  const at = progress.lastAt ?? new Date().toISOString()
  sheet.tasks.forEach((task, ti) =>
    task.items.forEach((_, ii) => {
      const key = itemKey(ti, ii)
      if (checkItem(task, ii, progress.answers[key]) !== true) out[key] = { box: 0, due: today, lapses: 1, addedAt: at }
    })
  )
  return out
}

export interface ReviewItem {
  sheet: PracticeSheet
  taskIndex: number
  itemIndex: number
  key: string
  state: ReviewState
}

/** Todas las preguntas en repaso (de todas las hojas), las más atrasadas primero. */
export function allReviewItems(sheets: PracticeSheet[], progress: PracticeProgress[], today: string): ReviewItem[] {
  const byId = new Map(progress.map((p) => [p.id, p]))
  const out: ReviewItem[] = []
  for (const sheet of sheets) {
    const review = reviewOf(sheet, byId.get(sheet.id), today)
    for (const [key, state] of Object.entries(review)) {
      const [ti, ii] = key.split('.').map(Number)
      if (!sheet.tasks[ti]?.items[ii]) continue
      out.push({ sheet, taskIndex: ti, itemIndex: ii, key, state })
    }
  }
  return out.sort((a, b) => a.state.due.localeCompare(b.state.due) || a.state.box - b.state.box || b.state.lapses - a.state.lapses)
}

export interface ReviewSummary {
  /** Preguntas que toca repasar hoy (o atrasadas). */
  due: number
  /** Preguntas en repaso en total. */
  total: number
  /** Próximo día con repaso si hoy no hay ninguno. */
  nextDue: string | null
  /** Preguntas dominadas en total. */
  mastered: number
}

export function reviewSummary(sheets: PracticeSheet[], progress: PracticeProgress[], today: string): ReviewSummary {
  const items = allReviewItems(sheets, progress, today)
  const due = items.filter((i) => i.state.due <= today).length
  const later = items.filter((i) => i.state.due > today).map((i) => i.state.due).sort()
  return { due, total: items.length, nextDue: due ? null : (later[0] ?? null), mastered: progress.reduce((n, p) => n + (p.mastered ?? 0), 0) }
}

/** Preguntas para una sesión de repaso de hoy. */
export function reviewSession(sheets: PracticeSheet[], progress: PracticeProgress[], today: string, size = REVIEW_SESSION_SIZE): ReviewItem[] {
  return allReviewItems(sheets, progress, today)
    .filter((i) => i.state.due <= today)
    .slice(0, size)
}

/** Cuenta las preguntas que toca repasar hoy solo a partir del progreso (sin las hojas; para el recordatorio). */
export function dueCountFromProgress(progress: PracticeProgress[], today: string): number {
  return progress.reduce((n, p) => n + Object.values(p.review ?? {}).filter((s) => s.due <= today).length, 0)
}

// ---------- Contexto de una pregunta fuera de su hoja ----------

/** Texto que ocupa un hueco cuando no es el que se pregunta (se rellena con la respuesta correcta). */
function filledGap(task: PracticeTask, index: number): string {
  if (task.type === 'mcCloze') {
    const it = task.items[index]
    return it ? it.options[it.answer] : '…'
  }
  if (task.type === 'openCloze' || task.type === 'wordFormation') return task.items[index]?.answers[0] ?? '…'
  return '…'
}

/**
 * La frase que contiene el hueco pedido, con los demás huecos ya rellenos.
 * Devuelve el texto antes y después del hueco (sin las marcas {n}).
 */
export function gapContext(task: Extract<PracticeTask, { type: 'mcCloze' | 'openCloze' | 'wordFormation' }>, itemIndex: number): { before: string; after: string } {
  const marker = '\u0000'
  const text = task.text
    .replace(/\{(\d+)\}/g, (_, n: string) => (Number(n) - 1 === itemIndex ? marker : filledGap(task, Number(n) - 1)))
    .replace(/\s*\n\s*\n\s*/g, '\n')
  const at = text.indexOf(marker)
  if (at === -1) return { before: '', after: '' }
  // Inicio: después del último fin de frase (o salto de párrafo) antes del hueco.
  let start = 0
  const head = text.slice(0, at)
  const re = /[.!?]["”’)]?\s+|\n/g
  for (let m = re.exec(head); m; m = re.exec(head)) start = m.index + m[0].length
  // Final: el primer fin de frase después del hueco.
  const tail = text.slice(at + 1)
  const end = tail.search(/[.!?]["”’)]?(\s|$)|\n/)
  const after = end === -1 ? tail : tail.slice(0, end + 1).replace(/\s+$/, '')
  return { before: text.slice(start, at).trim(), after: after.replace(/\n/g, ' ').trim() }
}

/** Etiqueta de una opción («B · invented»). */
export function optionLabel(options: string[], index: number): string {
  return `${OPTION_LETTERS[index]} · ${options[index]}`
}
