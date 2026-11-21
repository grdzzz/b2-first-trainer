import { BookOpen, Languages, Puzzle, Shapes, Shuffle } from 'lucide-react'
import type { PracticeSkill } from '@shared/practice'
import { t } from '../i18n'

export const SKILL_ICON: Record<PracticeSkill, typeof BookOpen> = {
  vocabulary: Languages,
  grammar: Puzzle,
  wordFormation: Shapes,
  reading: BookOpen,
  mixed: Shuffle
}

export function skillLabel(skill: PracticeSkill, short = false): string {
  return t(`practice.${short ? 'skillsShort' : 'skills'}.${skill}`)
}

/** Etiqueta de color con el icono de la destreza. */
export function SkillBadge({ skill }: { skill: PracticeSkill }) {
  const Icon = SKILL_ICON[skill]
  return (
    <span className={`skill-badge skill-${skill}`}>
      <Icon size={13} aria-hidden />
      {skillLabel(skill)}
    </span>
  )
}
