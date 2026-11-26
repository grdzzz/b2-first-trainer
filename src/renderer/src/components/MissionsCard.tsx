// Misiones opcionales: sin cuentas atrás ni penalizaciones. La XP se da al cumplirlas.
import { CheckCircle2, Circle, Target } from 'lucide-react'
import type { Mission } from '@shared/learning/missions'
import type { StudySkill } from '@shared/learning/taxonomy'
import type { PracticeSkill } from '@shared/practice'
import { useLearning } from '../lib/learning'
import { skillLabel } from './SkillBadge'
import { t } from '../i18n'

export function missionText(m: Mission): string {
  const vars = { ...m.vars }
  if (m.template === 'd-sheet') vars.skill = skillLabel(m.vars.skill as PracticeSkill).toLowerCase()
  if (m.template === 'd-neglected') vars.skill = t(`skills.${m.vars.skill as StudySkill}`)
  return t(`missions.text.${m.template}`, vars)
}

export function MissionsCard({ compact }: { compact?: boolean }) {
  const { missions } = useLearning()
  if (!missions.length) return null
  const groups: Array<['day' | 'week', Mission[]]> = [
    ['day', missions.filter((m) => m.period === 'day')],
    ['week', missions.filter((m) => m.period === 'week')]
  ]
  return (
    <section className={`card missions-card${compact ? ' is-compact' : ''}`} aria-labelledby="missions-title">
      <header className="card-head">
        <h2 id="missions-title" className="h-small"><Target size={16} aria-hidden /> {t('missions.title')}</h2>
        <span className="text-subtle text-xs">{t('missions.optional')}</span>
      </header>
      {groups.map(([period, list]) =>
        list.length ? (
          <div key={period} className="missions-group">
            <p className="eyebrow">{t(period === 'day' ? 'missions.daily' : 'missions.weekly')}</p>
            <ul className="missions-list">
              {list.map((m) => (
                <li key={m.id} className={m.done ? 'is-done' : ''}>
                  {m.done ? <CheckCircle2 size={16} aria-hidden className="mission-check" /> : <Circle size={16} aria-hidden className="text-subtle" />}
                  <span className="mission-text">{missionText(m)}</span>
                  {m.target > 1 && <span className="text-subtle text-xs tabular">{m.current}/{m.target}</span>}
                  <span className="mission-xp tabular">+{m.xp} XP</span>
                  <span className="sr-only">{m.done ? t('missions.done') : t('missions.pending')}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
    </section>
  )
}
