let counter = 0

/** Identificador corto, único y seguro para usar en nombres de archivo. */
export function newId(prefix: string): string {
  counter = (counter + 1) % 1296
  const rand =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(2, '0')}${rand}`
}

const SAFE_ID = /^[a-z]+_[a-z0-9]{6,40}$/

export function isSafeId(id: unknown): id is string {
  return typeof id === 'string' && SAFE_ID.test(id)
}
