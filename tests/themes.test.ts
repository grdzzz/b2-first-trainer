// Contraste de todos los temas y colores de acento (WCAG AA) leyendo directamente tokens.css.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ACCENTS } from '../src/shared/types'

const css = readFileSync(path.resolve(__dirname, '../src/renderer/src/styles/tokens.css'), 'utf8')

function block(selector: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = new RegExp(`${selector.replace(/[[\]()'.*]/g, (c) => `\\${c}`)}\\s*\\{([^}]*)\\}`, 'g')
  for (const m of css.matchAll(re)) for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim()
  return out
}

function lum(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const light = block(':root')
const dark = { ...light, ...block(":root[data-theme='dark']") }
const themes: Record<string, Record<string, string>> = {
  light,
  dark,
  oled: { ...dark, ...block(":root[data-theme='dark'][data-variant='oled']") },
  midnight: { ...dark, ...block(":root[data-theme='dark'][data-variant='midnight']") }
}

describe('temas: contraste AA', () => {
  for (const [name, t] of Object.entries(themes)) {
    it(`${name}: texto sobre fondo y superficies`, () => {
      for (const fg of ['--text', '--text-muted', '--text-subtle']) {
        for (const bg of ['--bg', '--surface', '--surface-raised']) {
          expect(contrast(t[fg], t[bg]), `${fg} / ${bg}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    })
    for (const accent of ACCENTS) {
      it(`${name} + acento ${accent}`, () => {
        const isDark = name !== 'light'
        const over = accent === 'indigo' ? {} : block(isDark ? `:root[data-theme='dark'][data-accent='${accent}']` : `:root[data-accent='${accent}']`)
        const v = { ...t, ...over }
        expect(contrast(v['--accent-text'], v['--surface']), 'accent-text / surface').toBeGreaterThanOrEqual(4.5)
        expect(contrast(v['--accent-text'], v['--bg']), 'accent-text / bg').toBeGreaterThanOrEqual(4.5)
        expect(contrast(v['--text-on-accent'], v['--accent']), 'text-on-accent / accent').toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})
