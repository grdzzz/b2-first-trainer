// Textos explicables para los motivos del motor y los patrones detectados (siempre con datos reales).
import type { Reason } from '@shared/learning/plan'
import type { Pattern } from '@shared/learning/competency'
import { competency, partLabel, type StudySkill } from '@shared/learning/taxonomy'
import { t, tn } from '../i18n'

function skillName(v: unknown): string {
  return typeof v === 'string' ? t(`skills.${v as StudySkill}`) : ''
}

export function reasonText(r: Reason, patterns: Pattern[] = []): string {
  const v = r.vars ?? {}
  switch (r.code) {
    case 'reviewDue':
      return tn('reasons.reviewDue', Number(v.n ?? 0))
    case 'pattern': {
      const p = patterns.find((x) => x.id === v.pattern)
      return p ? patternText(p) : t('reasons.patternGeneric')
    }
    case 'weakSkill':
      return t('reasons.weakSkill', { skill: skillName(v.skill), pct: v.pct ?? 0 })
    case 'weakPart':
      return t('reasons.weakPart', { part: partLabel(String(v.part)) ?? '', pct: v.pct ?? 0 })
    case 'unassessed':
      return t('reasons.unassessed', { skill: skillName(v.skill) })
    case 'insufficient':
      return t('reasons.insufficient', { skill: skillName(v.skill) })
    case 'stale':
      return t('reasons.stale', { skill: skillName(v.skill), days: v.days ?? 0 })
    case 'priority':
      return t('reasons.priority', { skill: skillName(v.skill) })
    case 'examSoon':
      return tn('reasons.examSoon', Number(v.days ?? 0))
    case 'mock':
      return tn('reasons.mock', Number(v.days ?? 0))
    case 'neverDone':
      return t('reasons.neverDone')
    case 'lowScore':
      return t('reasons.lowScore', { pct: v.pct ?? 0 })
    case 'balance':
      return t('reasons.balance', { skill: skillName(v.skill) })
    case 'welcomeBack':
      return tn('reasons.welcomeBack', Number(v.days ?? 0))
    case 'replaced':
      return t('reasons.replaced')
    case 'moved':
      return t('reasons.moved')
  }
}

/** Ejemplo: «Has cometido 8 errores relacionados con Prepositions durante tus últimas 5 sesiones». */
export function patternText(p: Pattern): string {
  switch (p.kind) {
    case 'category':
    case 'writing':
      if (p.accuracy !== undefined && p.total) return t('patterns.lowAccuracy', { name: competency(p.category)?.label ?? '', pct: Math.round(p.accuracy * 100), n: p.total })
      return t('patterns.category', { n: p.count, name: competency(p.category)?.label ?? '', sessions: p.window })
    case 'part':
      return t('patterns.part', { name: partLabel(p.part) ?? '', pct: Math.round((p.accuracy ?? 0) * 100), n: p.total ?? 0 })
    case 'confusion':
      return t('patterns.confusion', { a: p.words?.[0] ?? '', b: p.words?.[1] ?? '', n: p.count })
  }
}
