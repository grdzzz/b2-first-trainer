// Destrezas del plan: mismo color e icono en toda la app (calendario, plan, errores, estadísticas).
import { BookOpen, Headphones, Mic, PenLine, Puzzle } from 'lucide-react'
import type { StudySkill } from '@shared/learning/taxonomy'
import { t } from '../i18n'

export const STUDY_SKILL_ICON: Record<StudySkill, typeof BookOpen> = {
  useOfEnglish: Puzzle,
  reading: BookOpen,
  writing: PenLine,
  listening: Headphones,
  speaking: Mic
}

export function studySkillLabel(skill: StudySkill): string {
  return t(`skills.${skill}`)
}

export function StudySkillIcon({ skill, size = 16 }: { skill: StudySkill; size?: number }) {
  const Icon = STUDY_SKILL_ICON[skill]
  return <Icon size={size} aria-hidden style={{ color: `var(--sk-${skill})` }} />
}

export function StudySkillChip({ skill, compact }: { skill: StudySkill; compact?: boolean }) {
  const Icon = STUDY_SKILL_ICON[skill]
  return (
    <span className={`study-chip sk-${skill}${compact ? ' is-compact' : ''}`} title={compact ? studySkillLabel(skill) : undefined}>
      <Icon size={13} aria-hidden />
      {compact ? <span className="sr-only">{studySkillLabel(skill)}</span> : studySkillLabel(skill)}
    </span>
  )
}
