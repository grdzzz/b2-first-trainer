import { COMPETENCY_GROUPS, competenciesOf } from '@shared/learning/taxonomy'
import { t } from '../i18n'

/** Opciones de competencia agrupadas (la pronunciación solo se puede poner a mano). */
export function CategoryOptions() {
  return (
    <>
      <option value="-">{t('notebook.noCategory')}</option>
      {COMPETENCY_GROUPS.map((g) => (
        <optgroup key={g} label={t(`groups.${g}`)}>
          {competenciesOf(g).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </optgroup>
      ))}
    </>
  )
}

