// Las 50 hojas de práctica incluidas con la app. Se intercalan por destreza para que el recorrido sea variado.
import type { PracticeSheet, PracticeSkill } from '../practice'
import type { SheetSpec } from './helpers'
import { VOCABULARY } from './vocabulary'
import { GRAMMAR } from './grammar'
import { WORD_FORMATION } from './wordFormation'
import { READING } from './reading'
import { MIXED } from './mixed'

const GROUPS: Array<[PracticeSkill, SheetSpec[], number]> = [
  ['vocabulary', VOCABULARY, 10],
  ['grammar', GRAMMAR, 10],
  ['wordFormation', WORD_FORMATION, 10],
  ['reading', READING, 12],
  ['mixed', MIXED, 12]
]

function build(): PracticeSheet[] {
  const out: PracticeSheet[] = []
  const rounds = Math.max(...GROUPS.map(([, list]) => list.length))
  for (let i = 0; i < rounds; i++) {
    for (const [skill, list, minutes] of GROUPS) {
      const spec = list[i]
      if (!spec) continue
      const number = out.length + 1
      out.push({ minutes, ...spec, id: `fce_hoja${String(number).padStart(2, '0')}`, skill, number, builtIn: true })
    }
  }
  return out
}

export const BUILT_IN_SHEETS: PracticeSheet[] = build()
