// Tipos y utilidades de actualización (lógica pura).

/** Dónde se publican las versiones: rama `descargas` del repositorio (pública). */
export const UPDATE_BASE_URL = 'https://raw.githubusercontent.com/grdzzz/first/descargas'
export const DOWNLOAD_PAGE_URL = 'https://github.com/grdzzz/first/releases/latest'

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'unsupported'; reason: 'dev' | 'portable' | 'platform' }
  | { state: 'checking' }
  | { state: 'up-to-date'; checkedAt: string }
  | { state: 'downloading'; version: string; percent: number }
  /** Descargada e instalable con un reinicio (versión instalada en Windows). */
  | { state: 'ready'; version: string }
  /** Hay versión nueva pero esta copia no se actualiza sola (portable, Linux): se descarga a mano. */
  | { state: 'available-manual'; version: string; url: string }
  | { state: 'error'; message: string }

/** Compara versiones semver simples ("1.2.3"). Devuelve >0 si a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split(/[.+-]/).slice(0, 3).map((x) => parseInt(x, 10) || 0)
  const pb = b.replace(/^v/, '').split(/[.+-]/).slice(0, 3).map((x) => parseInt(x, 10) || 0)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/** Lee el campo `version` de un latest.yml de electron-builder. */
export function versionFromLatestYml(yml: string): string | undefined {
  const m = /^version:\s*['"]?([0-9][^\s'"]*)['"]?\s*$/m.exec(yml)
  return m?.[1]
}
