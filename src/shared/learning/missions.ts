// Misiones opcionales (diarias y semanales), adaptadas al plan. No duplican lo que ya pide el plan,
// no castigan si no se hacen y no tienen cuentas atrás: la recompensa se da en cuanto se cumplen.
// Las misiones de un periodo se eligen una vez (se guardan sus ids) y no cambian aunque cambien los datos.
import type { PracticeSkill } from '../practice'
import { PRACTICE_SKILLS } from '../practice'
import type { ActivityEntry } from './game'
import { XP_REWARDS } from './game'
import type { PlanSession } from './plan'
import { addDays } from '../review'
import { weekStart } from './streaks'
import { seeded } from './plan'
import { STUDY_SKILLS, type StudySkill } from './taxonomy'

export type MissionTemplate = 'd-sheet' | 'd-review' | 'd-master' | 'd-neglected' | 'w-plan' | 'w-listening' | 'w-writing' | 'w-improve' | 'w-errors' | 'w-days'

export interface Mission {
  id: string
  template: MissionTemplate
  period: 'day' | 'week'
  /** Variables del texto (destreza…). */
  vars: Record<string, string | number>
  target: number
  current: number
  done: boolean
  xp: number
}

export interface MissionInput {
  today: string
  activity: ActivityEntry[]
  plan: PlanSession | undefined
  hasPlan: boolean
  /** Destrezas de hoja con contenido. */
  sheetSkills: PracticeSkill[]
  /** Destrezas del plan con contenido. */
  available: StudySkill[]
  dueReviews: number
  liveErrors: number
  /** Destreza menos trabajada últimamente (con contenido). */
  neglected?: StudySkill
  /** Tipo de hoja más flojo según el perfil. */
  weakSheetSkill?: PracticeSkill
  missionsDone: Record<string, string>
  /** Misiones ya elegidas por periodo (día o lunes de la semana) → ids. */
  picks: Record<string, string[]>
}

export const DAILY_COUNT = 2
export const WEEKLY_COUNT = 3

/** Clave del periodo de una misión a partir de su id («d-sheet:grammar:2026-11-26» → «2026-11-26»). */
export function missionPeriod(id: string): string {
  return id.slice(id.lastIndexOf(':') + 1)
}

/** Construye una misión a partir de su id (plantilla, variables y periodo van en el id). */
export function buildMission(id: string, activity: ActivityEntry[], done: Record<string, string>): Mission | null {
  const parts = id.split(':')
  const template = parts[0] as MissionTemplate
  const period = parts[parts.length - 1]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period)) return null
  const daily = template.startsWith('d-')
  const acts = activity.filter((a) => !a.retro && (daily ? a.day === period : a.day >= period && a.day <= addDays(period, 6)))
  const xp = daily ? XP_REWARDS.missionDaily : XP_REWARDS.missionWeekly
  const make = (vars: Record<string, string | number>, target: number, current: number): Mission => ({ id, template, period: daily ? 'day' : 'week', vars, target, current: Math.min(current, target), done: current >= target || !!done[id], xp })
  switch (template) {
    case 'd-sheet': {
      const skill = parts[1] as PracticeSkill
      if (!PRACTICE_SKILLS.includes(skill)) return null
      return make({ skill }, 1, acts.filter((a) => a.kind === 'sheet' && a.practiceSkill === skill).length)
    }
    case 'd-review':
      return make({ n: 5 }, 5, acts.filter((a) => a.kind === 'review').reduce((n, a) => n + (a.total ?? 0), 0))
    case 'd-master':
      return make({ n: 1 }, 1, acts.reduce((n, a) => n + (a.mastered ?? 0), 0))
    case 'd-neglected': {
      const skill = parts[1] as StudySkill
      if (!STUDY_SKILLS.includes(skill)) return null
      return make({ skill }, 1, acts.filter((a) => a.skill === skill || (a.parts && Object.keys(a.parts).length > 0 && a.skill === skill)).length)
    }
    case 'w-plan':
      return make({ n: 3 }, 3, acts.filter((a) => a.kind === 'planSession').length)
    case 'w-listening':
      return make({}, 1, acts.filter((a) => a.kind === 'exam' && a.paperType === 'listening').length)
    case 'w-writing':
      return make({}, 1, acts.filter((a) => a.kind === 'exam' && a.paperType === 'writing').length)
    case 'w-improve':
      return make({}, 1, acts.filter((a) => a.record).length)
    case 'w-errors':
      return make({ n: 10 }, 10, acts.filter((a) => a.kind === 'review').reduce((n, a) => n + (a.total ?? 0), 0))
    case 'w-days':
      return make({ n: 4 }, 4, new Set(acts.map((a) => a.day)).size)
    default:
      return null
  }
}

/** Ids de misiones posibles hoy (diarias) y esta semana (semanales). */
export function eligibleMissions(input: MissionInput): { daily: string[]; weekly: string[] } {
  const { today } = input
  const ws = weekStart(today)
  const planKinds = new Set(input.plan?.activities.map((a) => a.kind) ?? [])
  const planSkills = new Set(input.plan?.activities.map((a) => a.skill) ?? [])
  const daily: string[] = []
  const sheetSkill = input.weakSheetSkill && input.sheetSkills.includes(input.weakSheetSkill) ? input.weakSheetSkill : input.sheetSkills[Math.floor(seeded(today + 'sk') * input.sheetSkills.length)]
  // Si el plan ya incluye una hoja de Use of English, la misión de hoja sería redundante.
  const planHasSheet = input.plan?.activities.some((a) => a.kind === 'sheet' && a.skill === (sheetSkill === 'reading' ? 'reading' : 'useOfEnglish'))
  if (sheetSkill && !planHasSheet) daily.push(`d-sheet:${sheetSkill}:${today}`)
  if (input.dueReviews >= 5 && !planKinds.has('review')) daily.push(`d-review:${today}`)
  if (input.liveErrors > 0) daily.push(`d-master:${today}`)
  if (input.neglected && !planSkills.has(input.neglected)) daily.push(`d-neglected:${input.neglected}:${today}`)
  const weekly: string[] = []
  if (input.hasPlan) weekly.push(`w-plan:${ws}`)
  if (input.available.includes('listening')) weekly.push(`w-listening:${ws}`)
  if (input.available.includes('writing')) weekly.push(`w-writing:${ws}`)
  if (input.activity.some((a) => a.kind === 'sheet')) weekly.push(`w-improve:${ws}`)
  if (input.liveErrors >= 5) weekly.push(`w-errors:${ws}`)
  weekly.push(`w-days:${ws}`)
  return { daily, weekly }
}

/** Elige `n` elementos de forma estable para un periodo. */
function pick(pool: string[], n: number, seed: string): string[] {
  return pool
    .map((x) => ({ x, k: seeded(`${seed}:${x.split(':')[0]}`) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((p) => p.x)
}

/**
 * Misiones vigentes. Si ya se eligieron para hoy/esta semana, se usan esas (no cambian aunque cambien los
 * datos); si no, se eligen ahora y se devuelven en `picks` para guardarlas.
 */
export function currentMissions(input: MissionInput): { missions: Mission[]; picks: Record<string, string[]>; changed: boolean } {
  const ws = weekStart(input.today)
  const picks = { ...input.picks }
  let changed = false
  const el = eligibleMissions(input)
  if (!picks[input.today]) {
    picks[input.today] = pick(el.daily, DAILY_COUNT, input.today)
    changed = true
  }
  if (!picks[`w${ws}`]) {
    picks[`w${ws}`] = pick(el.weekly, WEEKLY_COUNT, ws)
    changed = true
  }
  // Se guardan solo los periodos recientes.
  for (const k of Object.keys(picks)) {
    const day = k.startsWith('w') ? k.slice(1) : k
    if (day < addDays(input.today, -21)) {
      delete picks[k]
      changed = true
    }
  }
  const ids = [...picks[input.today], ...picks[`w${ws}`]]
  const missions = ids.map((id) => buildMission(id, input.activity, input.missionsDone)).filter((m): m is Mission => !!m)
  return { missions, picks, changed }
}
