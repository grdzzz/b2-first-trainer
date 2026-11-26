// i18n mínima y tipada. Para añadir un idioma: crear `locales/xx.ts` con la misma forma que `es.ts`
// y registrarlo en `dictionaries`.
import { es as es1 } from './es'
import { es2 } from './es2'

const es = { ...es1, ...es2, nav: { ...es1.nav, ...es2.nav2 }, settings: { ...es1.settings, themes: es2.themes }, home: { ...es1.home, ...es2.home2 }, review: { ...es1.review, ...es2.review2 }, common: { ...es1.common, ...es2.common2 }, sheet: { ...es1.sheet, ...es2.sheet2 } }

type Dict = typeof es
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : T[K] extends { one: string; other: string } ? never : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]
type Plurals<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? never : T[K] extends { one: string; other: string } ? `${P}${K}` : Plurals<T[K], `${P}${K}.`>
}[keyof T & string]

export type TPluralKey = Plurals<Dict>

export type TKey = Leaves<Dict>
export type Locale = 'es'

const dictionaries: Record<Locale, Dict> = { es }
let current: Locale = 'es'

export function setLocale(locale: Locale): void {
  current = locale
}

export function getLocale(): Locale {
  return current
}

export function t(key: TKey, vars?: Record<string, string | number>): string {
  const value = key.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown> | undefined)?.[k], dictionaries[current])
  if (typeof value !== 'string') return key
  if (!vars) return value
  return value.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`))
}

/** Plural sencillo: usa `key.one` o `key.other`. */
export function tn(key: TPluralKey, count: number, vars?: Record<string, string | number>): string {
  return t(`${key}.${count === 1 ? 'one' : 'other'}` as unknown as TKey, { count, ...vars })
}

const localeTag: Record<Locale, string> = { es: 'es-ES' }

export function formatDate(iso: string | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat(localeTag[current], opts).format(d)
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat(localeTag[current], { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n)
}
