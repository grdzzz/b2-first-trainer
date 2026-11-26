// Logros: catálogo extensible y evaluación pura a partir de estadísticas del alumno.
// Para añadir uno: una entrada en ACHIEVEMENTS con un id estable (nunca se cambia una vez publicado).
import type { PaperType } from '../types'
import type { PracticeSkill } from '../practice'
import type { StreakStats } from './streaks'
import { ACHIEVEMENT_XP } from './game'

export type AchievementCategory = 'exams' | 'reading' | 'useOfEnglish' | 'writing' | 'listening' | 'speaking' | 'review' | 'consistency' | 'improvement' | 'exploration' | 'bubi' | 'secret'
export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = ['exams', 'reading', 'useOfEnglish', 'writing', 'listening', 'speaking', 'review', 'consistency', 'improvement', 'exploration', 'bubi', 'secret']

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary']

/** Glifo del icono (el marco de la medalla es propio; el glifo se elige en la interfaz). */
export type AchievementGlyph =
  | 'footprints' | 'stopwatch' | 'layers' | 'medal' | 'flag' | 'award' | 'crown'
  | 'book' | 'books' | 'eye' | 'puzzle' | 'compass' | 'shuffle' | 'hammer' | 'zap' | 'target' | 'gem'
  | 'pen' | 'scroll' | 'bot' | 'headphones' | 'radar' | 'mic' | 'message'
  | 'rotate' | 'brain' | 'bug' | 'sparkles' | 'swords' | 'notebook'
  | 'flame' | 'calendar' | 'sprout' | 'mountain' | 'check' | 'clipboard'
  | 'trending' | 'trophy' | 'rocket' | 'graduation'
  | 'map' | 'command' | 'palette' | 'wand' | 'plus'
  | 'heart' | 'shirt' | 'star' | 'moon' | 'sunrise' | 'timer'

export interface LearnerStats {
  sheetsDistinct: number
  sheetsBySkill: Record<PracticeSkill, number>
  sheetChecks: number
  perfectSheets: number
  records: number
  /** Aciertos por parte del examen («reading.p4»…), de hojas y exámenes. */
  partCorrect: Record<string, number>
  /** Aciertos por competencia. */
  compCorrect: Record<string, number>
  /** Papers terminados (modo examen o práctica) por tipo. */
  papersDone: Record<PaperType, number>
  /** Actividades de examen (paper o partes) por tipo. */
  examActivities: Record<PaperType, number>
  fullMocks: number
  passPaper: boolean
  gradeA: boolean
  allFourPapers: boolean
  finalBoss: boolean
  /** Mayor mejora (puntos porcentuales) entre el primer y el mejor resultado de un mismo tipo de paper. */
  paperImprovement: number
  reviewAnswers: number
  reviewSessions: number
  mastered: number
  recurringMastered: number
  notesWritten: number
  aiFeedbacks: number
  customSheets: number
  streak: StreakStats
  planSessions: number
  comeback: boolean
  level: number
  readinessReached: boolean
  flags: Record<string, number>
  cosmeticsUnlocked: number
  cosmeticEquipped: boolean
  nightOwl: boolean
  earlyBird: boolean
  maxMinutesDay: number
}

export interface AchievementProgress {
  done: boolean
  current?: number
  target?: number
}

export interface AchievementDef {
  id: string
  category: AchievementCategory
  rarity: Rarity
  glyph: AchievementGlyph
  /** Nombre en inglés (identidad del logro). */
  name: string
  /** Descripción en español. */
  description: string
  /** Pista para los secretos antes de desbloquearlos. */
  hint?: string
  secret?: boolean
  /** Accesorio de Bubi que se desbloquea con el logro. */
  cosmetic?: string
  check(s: LearnerStats): AchievementProgress
}

const atLeast = (current: number, target: number): AchievementProgress => ({ done: current >= target, current: Math.min(current, target), target })
const flag = (s: LearnerStats, f: string) => s.flags[f] ?? 0
const sum = (r: Record<string, number>, keys?: string[]) => (keys ?? Object.keys(r)).reduce((n, k) => n + (r[k] ?? 0), 0)

const A = (def: AchievementDef) => def

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---------- Exámenes ----------
  A({ id: 'first-paper', category: 'exams', rarity: 'common', glyph: 'footprints', name: 'First Steps', description: 'Termina tu primer paper de examen.', check: (s) => atLeast(sum(s.papersDone), 1) }),
  A({ id: 'dress-rehearsal', category: 'exams', rarity: 'rare', glyph: 'stopwatch', name: 'Dress Rehearsal', description: 'Completa un paper entero en modo examen, con el tiempo real.', check: (s) => atLeast(s.fullMocks, 1) }),
  A({ id: 'full-set', category: 'exams', rarity: 'epic', glyph: 'layers', name: 'The Full Set', description: 'Termina al menos una vez cada uno de los cuatro papers.', check: (s) => atLeast((['reading', 'writing', 'listening', 'speaking'] as PaperType[]).filter((p) => s.papersDone[p] > 0).length, 4) }),
  A({ id: 'exam-veteran', category: 'exams', rarity: 'rare', glyph: 'medal', name: 'Exam Veteran', description: 'Termina 10 papers.', check: (s) => atLeast(sum(s.papersDone), 10) }),
  A({ id: 'over-the-line', category: 'exams', rarity: 'rare', glyph: 'flag', name: 'Over the Line', description: 'Saca un 60 % o más en un paper corregido (≈160 en la escala Cambridge).', check: (s) => ({ done: s.passPaper }) }),
  A({ id: 'top-band', category: 'exams', rarity: 'epic', glyph: 'award', name: 'Top Band', description: 'Saca un 80 % o más en un paper con al menos 20 preguntas corregidas.', cosmetic: 'medal', check: (s) => ({ done: s.gradeA }) }),
  A({ id: 'final-boss', category: 'exams', rarity: 'legendary', glyph: 'crown', name: 'The Final Boss', description: 'Completa los cuatro papers de un mismo examen en modo examen.', cosmetic: 'crown', check: (s) => ({ done: s.finalBoss }) }),

  // ---------- Reading ----------
  A({ id: 'page-turner', category: 'reading', rarity: 'common', glyph: 'book', name: 'Page Turner', description: 'Completa 5 hojas de Reading.', cosmetic: 'book-pin', check: (s) => atLeast(s.sheetsBySkill.reading, 5) }),
  A({ id: 'bookworm', category: 'reading', rarity: 'rare', glyph: 'books', name: 'Bookworm', description: 'Completa 15 hojas de Reading.', check: (s) => atLeast(s.sheetsBySkill.reading, 15) }),
  A({ id: 'between-the-lines', category: 'reading', rarity: 'epic', glyph: 'eye', name: 'Between the Lines', description: 'Acierta 20 preguntas de inferencia o de actitud del autor.', check: (s) => atLeast((s.compCorrect['reading.inference'] ?? 0) + (s.compCorrect['reading.attitude'] ?? 0), 20) }),
  A({ id: 'matchmaker', category: 'reading', rarity: 'rare', glyph: 'shuffle', name: 'Matchmaker', description: 'Acierta 30 preguntas de Multiple matching (Part 7).', check: (s) => atLeast(s.partCorrect['reading.p7'] ?? 0, 30) }),

  // ---------- Use of English ----------
  A({ id: 'warm-up', category: 'useOfEnglish', rarity: 'common', glyph: 'zap', name: 'Warm-Up', description: 'Completa tu primera hoja de práctica.', check: (s) => atLeast(s.sheetsDistinct, 1) }),
  A({ id: 'grammar-master', category: 'useOfEnglish', rarity: 'rare', glyph: 'puzzle', name: 'Grammar Master', description: 'Completa 10 hojas de gramática distintas.', check: (s) => atLeast(s.sheetsBySkill.grammar, 10) }),
  A({ id: 'vocabulary-explorer', category: 'useOfEnglish', rarity: 'rare', glyph: 'compass', name: 'Vocabulary Explorer', description: 'Completa 10 hojas de vocabulario distintas.', check: (s) => atLeast(s.sheetsBySkill.vocabulary, 10) }),
  A({ id: 'transformation-expert', category: 'useOfEnglish', rarity: 'epic', glyph: 'hammer', name: 'Transformation Expert', description: 'Acierta 25 Key Word Transformations.', check: (s) => atLeast(s.partCorrect['reading.p4'] ?? 0, 25) }),
  A({ id: 'word-smith', category: 'useOfEnglish', rarity: 'rare', glyph: 'gem', name: 'Word Smith', description: 'Acierta 25 huecos de Word formation.', check: (s) => atLeast(s.partCorrect['reading.p3'] ?? 0, 25) }),
  A({ id: 'perfect-score', category: 'useOfEnglish', rarity: 'rare', glyph: 'target', name: 'Perfect Score', description: 'Termina una hoja sin ningún fallo.', check: (s) => atLeast(s.perfectSheets, 1) }),
  A({ id: 'flawless-five', category: 'useOfEnglish', rarity: 'epic', glyph: 'sparkles', name: 'Flawless Five', description: 'Termina 5 hojas sin ningún fallo.', check: (s) => atLeast(s.perfectSheets, 5) }),
  A({ id: 'all-rounder', category: 'useOfEnglish', rarity: 'rare', glyph: 'layers', name: 'All-Rounder', description: 'Completa al menos una hoja de cada tipo (vocabulario, gramática, formación de palabras, lectura y mixta).', check: (s) => atLeast((['vocabulary', 'grammar', 'wordFormation', 'reading', 'mixed'] as PracticeSkill[]).filter((k) => s.sheetsBySkill[k] > 0).length, 5) }),

  // ---------- Writing ----------
  A({ id: 'ink-on-paper', category: 'writing', rarity: 'common', glyph: 'pen', name: 'Ink on Paper', description: 'Termina tu primera tarea de Writing.', cosmetic: 'pencil', check: (s) => atLeast(s.examActivities.writing, 1) }),
  A({ id: 'prolific-writer', category: 'writing', rarity: 'rare', glyph: 'scroll', name: 'Prolific Writer', description: 'Termina 5 tareas de Writing.', check: (s) => atLeast(s.examActivities.writing, 5) }),
  A({ id: 'second-opinion', category: 'writing', rarity: 'common', glyph: 'bot', name: 'Second Opinion', description: 'Importa una corrección de IA de Writing o Speaking.', check: (s) => atLeast(s.aiFeedbacks, 1) }),

  // ---------- Listening ----------
  A({ id: 'all-ears', category: 'listening', rarity: 'common', glyph: 'headphones', name: 'All Ears', description: 'Termina tu primera actividad de Listening.', cosmetic: 'headphones', check: (s) => atLeast(s.examActivities.listening, 1) }),
  A({ id: 'sound-detective', category: 'listening', rarity: 'rare', glyph: 'radar', name: 'Sound Detective', description: 'Termina 10 actividades de Listening.', check: (s) => atLeast(s.examActivities.listening, 10) }),

  // ---------- Speaking ----------
  A({ id: 'breaking-the-ice', category: 'speaking', rarity: 'common', glyph: 'mic', name: 'Breaking the Ice', description: 'Termina tu primera actividad de Speaking.', check: (s) => atLeast(s.examActivities.speaking, 1) }),
  A({ id: 'smooth-talker', category: 'speaking', rarity: 'rare', glyph: 'message', name: 'Smooth Talker', description: 'Termina 5 actividades de Speaking.', cosmetic: 'bow-tie', check: (s) => atLeast(s.examActivities.speaking, 5) }),

  // ---------- Repaso ----------
  A({ id: 'second-chance', category: 'review', rarity: 'common', glyph: 'rotate', name: 'Second Chance', description: 'Completa tu primera sesión de repaso.', check: (s) => atLeast(s.reviewSessions, 1) }),
  A({ id: 'memory-builder', category: 'review', rarity: 'rare', glyph: 'brain', name: 'Memory Builder', description: 'Responde 100 preguntas en repasos.', check: (s) => atLeast(s.reviewAnswers, 100) }),
  A({ id: 'error-hunter', category: 'review', rarity: 'rare', glyph: 'bug', name: 'Error Hunter', description: 'Domina 10 errores.', check: (s) => atLeast(s.mastered, 10) }),
  A({ id: 'clean-slate', category: 'review', rarity: 'epic', glyph: 'sparkles', name: 'Clean Slate', description: 'Domina 50 errores.', check: (s) => atLeast(s.mastered, 50) }),
  A({ id: 'old-foe', category: 'review', rarity: 'rare', glyph: 'swords', name: 'Old Foe Defeated', description: 'Domina un error recurrente (uno que habías fallado varias veces).', check: (s) => atLeast(s.recurringMastered, 1) }),
  A({ id: 'note-taker', category: 'review', rarity: 'common', glyph: 'notebook', name: 'Note Taker', description: 'Añade una nota personal a un error de tu cuaderno.', check: (s) => atLeast(s.notesWritten, 1) }),

  // ---------- Constancia ----------
  A({ id: 'on-a-roll', category: 'consistency', rarity: 'common', glyph: 'flame', name: 'On a Roll', description: 'Estudia 3 días seguidos.', check: (s) => atLeast(s.streak.best, 3) }),
  A({ id: 'week-warrior', category: 'consistency', rarity: 'rare', glyph: 'calendar', name: 'Week Warrior', description: 'Estudia 7 días seguidos (o cumple tu plan 7 días, con sus descansos).', cosmetic: 'party-hat', check: (s) => atLeast(Math.max(s.streak.best, s.streak.planBest), 7) }),
  A({ id: 'unstoppable', category: 'consistency', rarity: 'epic', glyph: 'mountain', name: 'Unstoppable', description: 'Cumple tu plan 30 días seguidos (los descansos planificados cuentan).', check: (s) => atLeast(Math.max(s.streak.best, s.streak.planBest), 30) }),
  A({ id: 'habit-formed', category: 'consistency', rarity: 'epic', glyph: 'sprout', name: 'Habit Formed', description: 'Estudia 50 días en total.', check: (s) => atLeast(s.streak.totalDays, 50) }),
  A({ id: 'steady-pace', category: 'consistency', rarity: 'rare', glyph: 'check', name: 'Steady Pace', description: 'Estudia en 8 semanas distintas.', check: (s) => atLeast(s.streak.activeWeeks, 8) }),
  A({ id: 'planned-and-done', category: 'consistency', rarity: 'common', glyph: 'clipboard', name: 'Planned and Done', description: 'Completa una sesión de tu plan.', check: (s) => atLeast(s.planSessions, 1) }),
  A({ id: 'plan-keeper', category: 'consistency', rarity: 'epic', glyph: 'calendar', name: 'Plan Keeper', description: 'Completa 20 sesiones de tu plan.', check: (s) => atLeast(s.planSessions, 20) }),

  // ---------- Superación personal ----------
  A({ id: 'comeback-king', category: 'improvement', rarity: 'rare', glyph: 'rocket', name: 'Comeback King', description: 'Vuelve a estudiar después de una semana o más sin hacerlo. ¡Bienvenido de vuelta!', check: (s) => ({ done: s.comeback }) }),
  A({ id: 'personal-best', category: 'improvement', rarity: 'common', glyph: 'trending', name: 'Personal Best', description: 'Mejora tu mejor nota en una hoja.', check: (s) => atLeast(s.records, 1) }),
  A({ id: 'record-breaker', category: 'improvement', rarity: 'rare', glyph: 'trophy', name: 'Record Breaker', description: 'Mejora 10 veces tu mejor nota en una hoja.', check: (s) => atLeast(s.records, 10) }),
  A({ id: 'level-up-learner', category: 'improvement', rarity: 'rare', glyph: 'trending', name: 'Level Up Learner', description: 'Sube 10 puntos entre tu primer resultado y el mejor en un mismo tipo de paper.', check: (s) => atLeast(Math.round(s.paperImprovement), 10) }),
  A({ id: 'exam-ready', category: 'improvement', rarity: 'legendary', glyph: 'graduation', name: 'Exam Ready', description: 'Tu preparación estimada alcanza tu objetivo con una confianza media o alta.', cosmetic: 'mortarboard', check: (s) => ({ done: s.readinessReached }) }),
  A({ id: 'legend-in-the-making', category: 'improvement', rarity: 'legendary', glyph: 'star', name: 'Legend in the Making', description: 'Llega al nivel 25.', check: (s) => atLeast(s.level, 25) }),

  // ---------- Exploración ----------
  A({ id: 'mapmaker', category: 'exploration', rarity: 'common', glyph: 'map', name: 'Mapmaker', description: 'Configura tu plan de estudio.', check: (s) => atLeast(flag(s, 'plan-configured'), 1) }),
  A({ id: 'shortcut-seeker', category: 'exploration', rarity: 'common', glyph: 'command', name: 'Shortcut Seeker', description: 'Usa la paleta de comandos (Ctrl + K).', check: (s) => atLeast(flag(s, 'palette'), 1) }),
  A({ id: 'interior-designer', category: 'exploration', rarity: 'common', glyph: 'palette', name: 'Interior Designer', description: 'Cambia el tema o el color de acento.', check: (s) => atLeast(flag(s, 'appearance'), 1) }),
  A({ id: 'prompt-crafter', category: 'exploration', rarity: 'common', glyph: 'wand', name: 'Prompt Crafter', description: 'Prepara un prompt de ejercicios a partir de tus errores.', check: (s) => atLeast(flag(s, 'errors-prompt'), 1) }),
  A({ id: 'sheet-creator', category: 'exploration', rarity: 'rare', glyph: 'plus', name: 'Sheet Creator', description: 'Añade una hoja de práctica propia (de un chat de IA o de un archivo).', check: (s) => atLeast(s.customSheets, 1) }),

  // ---------- Bubi ----------
  A({ id: 'bubis-friend', category: 'bubi', rarity: 'common', glyph: 'heart', name: "Bubi's Friend", description: 'Saluda a Bubi haciéndole clic unas cuantas veces.', check: (s) => atLeast(flag(s, 'bubi-poke'), 5) }),
  A({ id: 'dressed-to-impress', category: 'bubi', rarity: 'common', glyph: 'shirt', name: 'Dressed to Impress', description: 'Ponle un accesorio a Bubi.', check: (s) => ({ done: s.cosmeticEquipped }) }),
  A({ id: 'fashion-icon', category: 'bubi', rarity: 'epic', glyph: 'star', name: 'Fashion Icon', description: 'Desbloquea 10 accesorios o colores para Bubi.', check: (s) => atLeast(s.cosmeticsUnlocked, 10) }),

  // ---------- Secretos ----------
  A({ id: 'night-owl', category: 'secret', rarity: 'rare', glyph: 'moon', name: 'Night Owl', description: 'Termina una actividad entre las 0:00 y las 5:00.', hint: 'Hay quien estudia cuando todos duermen…', secret: true, check: (s) => ({ done: s.nightOwl }) }),
  A({ id: 'early-bird', category: 'secret', rarity: 'rare', glyph: 'sunrise', name: 'Early Bird', description: 'Termina una actividad entre las 5:00 y las 7:00.', hint: 'Al que madruga…', secret: true, check: (s) => ({ done: s.earlyBird }) }),
  A({ id: 'marathon', category: 'secret', rarity: 'epic', glyph: 'timer', name: 'Marathon', description: 'Estudia 2 horas o más en un mismo día.', hint: 'Un día muy, muy largo.', secret: true, check: (s) => atLeast(s.maxMinutesDay, 120) })
]

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

export function achievementXp(def: AchievementDef): number {
  return ACHIEVEMENT_XP[def.rarity]
}

/** Logros nuevos que se cumplen ahora y no estaban desbloqueados. */
export function newlyUnlocked(stats: LearnerStats, unlocked: Record<string, unknown>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !unlocked[a.id] && a.check(stats).done)
}

export interface AchievementView {
  def: AchievementDef
  unlockedAt?: string
  retro?: boolean
  progress: AchievementProgress
}

export function achievementViews(stats: LearnerStats, unlocked: Record<string, { at: string; retro?: boolean }>): AchievementView[] {
  return ACHIEVEMENTS.map((def) => ({ def, unlockedAt: unlocked[def.id]?.at, retro: unlocked[def.id]?.retro, progress: unlocked[def.id] ? { done: true } : def.check(stats) }))
}
