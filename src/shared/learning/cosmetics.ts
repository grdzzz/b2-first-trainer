// Armario de Bubi: accesorios y colores desbloqueables (por nivel o por logro).
// El dibujo de cada accesorio está en la interfaz (Mascot.tsx); aquí solo el catálogo y las reglas.
import type { CosmeticSlot } from './game'

export interface CosmeticDef {
  id: string
  slot: CosmeticSlot
  /** Nombre en español. */
  name: string
  /** Se desbloquea al llegar a este nivel… */
  level?: number
  /** …o con este logro. */
  achievement?: string
}

/** Variantes de color del cuerpo (degradado claro → oscuro y color de brazos/mechón). Compatibles con la marca. */
export const BUBI_COLORS: Record<string, { from: string; to: string; limb: string; tuft: string }> = {
  classic: { from: '#6b80ff', to: '#2f3fae', limb: '#3448c4', tuft: '#6b80ff' },
  ocean: { from: '#4fc3d9', to: '#16708a', limb: '#1b7f96', tuft: '#4fc3d9' },
  violet: { from: '#a98bff', to: '#5b3bb0', limb: '#6544c2', tuft: '#a98bff' },
  sunset: { from: '#ff9b7a', to: '#c0485a', limb: '#c8505e', tuft: '#ff9b7a' },
  forest: { from: '#6fd39a', to: '#1f7a55', limb: '#238560', tuft: '#6fd39a' },
  midnight: { from: '#5a6bd8', to: '#1c2266', limb: '#27307f', tuft: '#7d8cf0' },
  gold: { from: '#ffd36e', to: '#c2841c', limb: '#c98d22', tuft: '#ffe29a' }
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'classic', slot: 'color', name: 'Azul clásico', level: 1 },
  { id: 'ocean', slot: 'color', name: 'Océano', level: 4 },
  { id: 'violet', slot: 'color', name: 'Violeta', level: 7 },
  { id: 'forest', slot: 'color', name: 'Bosque', level: 11 },
  { id: 'sunset', slot: 'color', name: 'Atardecer', level: 16 },
  { id: 'midnight', slot: 'color', name: 'Medianoche', level: 22 },
  { id: 'gold', slot: 'color', name: 'Dorado', achievement: 'legend-in-the-making' },

  { id: 'beanie', slot: 'head', name: 'Gorro de lana', level: 3 },
  { id: 'party-hat', slot: 'head', name: 'Gorro de fiesta', achievement: 'week-warrior' },
  { id: 'beret', slot: 'head', name: 'Boina', level: 12 },
  { id: 'mortarboard', slot: 'head', name: 'Birrete', achievement: 'exam-ready' },
  { id: 'cap', slot: 'head', name: 'Gorra', level: 18 },
  { id: 'crown', slot: 'head', name: 'Corona', achievement: 'final-boss' },

  { id: 'round-glasses', slot: 'eyes', name: 'Gafas redondas', level: 2 },
  { id: 'star-shades', slot: 'eyes', name: 'Gafas de estrella', level: 9 },

  { id: 'headphones', slot: 'ears', name: 'Auriculares', achievement: 'all-ears' },

  { id: 'scarf', slot: 'neck', name: 'Bufanda', level: 5 },
  { id: 'bow-tie', slot: 'neck', name: 'Pajarita', achievement: 'smooth-talker' },
  { id: 'medal', slot: 'neck', name: 'Medalla', achievement: 'top-band' },

  { id: 'pencil', slot: 'accessory', name: 'Lápiz en la oreja', achievement: 'ink-on-paper' },
  { id: 'book-pin', slot: 'accessory', name: 'Chapa de libro', achievement: 'page-turner' },
  { id: 'star-pin', slot: 'accessory', name: 'Chapa de estrella', level: 14 }
]

export const COSMETIC_BY_ID = new Map(COSMETICS.map((c) => [c.id, c]))

export function isUnlocked(c: CosmeticDef, level: number, achievements: Record<string, unknown>): boolean {
  if (c.level !== undefined && level >= c.level) return true
  if (c.achievement && achievements[c.achievement]) return true
  return false
}

export function unlockedCosmetics(level: number, achievements: Record<string, unknown>): CosmeticDef[] {
  return COSMETICS.filter((c) => isUnlocked(c, level, achievements))
}

/** Lo que lleva puesto Bubi, descartando lo que no esté desbloqueado (p. ej. datos editados a mano). */
export function effectiveOutfit(equipped: Partial<Record<CosmeticSlot, string>>, level: number, achievements: Record<string, unknown>): Partial<Record<CosmeticSlot, string>> {
  const out: Partial<Record<CosmeticSlot, string>> = {}
  for (const [slot, id] of Object.entries(equipped) as Array<[CosmeticSlot, string]>) {
    const c = COSMETIC_BY_ID.get(id)
    if (c && c.slot === slot && isUnlocked(c, level, achievements)) out[slot] = id
  }
  return out
}
