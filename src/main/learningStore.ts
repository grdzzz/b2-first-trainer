// Datos de aprendizaje de 2.0 (cuaderno de errores, progresión, plan) en `learning/`.
//
// - Cada documento es un JSON versionado. Al leer se fusionan el archivo normal y las «copias en conflicto»
//   que crean las carpetas sincronizadas (OneDrive, Drive, Dropbox…): la fusión es por registro (unión o el
//   más reciente), así no se pierde nada. Después se guarda el resultado y se borran las copias.
// - Al guardar se vuelve a fusionar con lo que hay en disco (por si otro equipo lo cambió entretanto).
// - Migración desde 1.x: antes de crear nada se hace una copia de seguridad de los datos (JSON) en
//   `backups/pre-2.0.0-<fecha>/`. La migración no modifica ningún archivo existente: solo añade `learning/`.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { CorruptFileError, looksMidSync, readJsonPatient, writeJsonAtomic } from './storage'
import { mergeNotebooks, parseNotebook, type NotebookDoc } from '../shared/learning/notebook'
import { mergeGames, parseGame, type GameDoc } from '../shared/learning/game'
import { mergePlans, parsePlan, type PlanDoc } from '../shared/learning/plan'

export type LearningDocName = 'notebook' | 'game' | 'plan'
export const LEARNING_DOCS: LearningDocName[] = ['notebook', 'game', 'plan']

export interface LearningMeta {
  dataVersion: number
  migratedAt: string
  /** Versión de la app que hizo la migración. */
  appVersion: string
  /** Carpeta de la copia previa (relativa a la carpeta de datos) o null si no había datos que copiar. */
  backup: string | null
  backupFiles: number
  backupError?: string
}

export const LEARNING_DATA_VERSION = 2
/** Tamaño máximo de un documento (protección ante datos anómalos). */
export const MAX_DOC_BYTES = 25 * 1024 * 1024

interface DocSpec<T> {
  parse(raw: unknown): T
  merge(a: T, b: T): T
}

const SPECS: { notebook: DocSpec<NotebookDoc>; game: DocSpec<GameDoc>; plan: DocSpec<PlanDoc> } = {
  notebook: { parse: parseNotebook, merge: mergeNotebooks },
  game: { parse: parseGame, merge: mergeGames },
  plan: { parse: parsePlan, merge: mergePlans }
}

type DocOf<N extends LearningDocName> = N extends 'notebook' ? NotebookDoc : N extends 'game' ? GameDoc : PlanDoc

/** ¿Es una copia en conflicto de `name`.json? («game (1).json», «game-PC-conflict.json», «game (Copia en conflicto…).json») */
export function isConflictCopy(file: string, name: string): boolean {
  if (!file.endsWith('.json') || file === `${name}.json`) return false
  const stem = file.slice(0, -5)
  return stem.startsWith(name) && /^[\s_.(-]/.test(stem.slice(name.length))
}

export class LearningStore {
  constructor(readonly root: string) {}

  get dir(): string {
    return path.join(this.root, 'learning')
  }

  private file(name: LearningDocName): string {
    return path.join(this.dir, `${name}.json`)
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true })
    const entries = await fs.readdir(this.dir).catch(() => [] as string[])
    await Promise.all(entries.filter((e) => e.endsWith('.tmp')).map((e) => fs.rm(path.join(this.dir, e), { force: true }).catch(() => undefined)))
  }

  /** Lee un documento fusionando las copias en conflicto. Un archivo dañado se aparta (si no se está sincronizando). */
  async read<N extends LearningDocName>(name: N): Promise<{ doc: DocOf<N>; pending: boolean; corrupt: string[] }> {
    const spec = SPECS[name] as unknown as DocSpec<DocOf<N>>
    const entries = await fs.readdir(this.dir).catch(() => [] as string[])
    const files = entries.filter((f) => f === `${name}.json` || isConflictCopy(f, name))
    let doc: DocOf<N> | null = null
    let pending = false
    const corrupt: string[] = []
    const merged: string[] = []
    for (const f of files) {
      const full = path.join(this.dir, f)
      try {
        const raw = await readJsonPatient<unknown>(full, null)
        if (raw === null) continue
        const parsed = spec.parse(raw)
        doc = doc ? spec.merge(doc, parsed) : parsed
        merged.push(f)
      } catch (e) {
        if (!(e instanceof CorruptFileError)) throw e
        if (await looksMidSync(full)) pending = true
        else {
          corrupt.push(f)
          const q = path.join(this.root, 'corrupt')
          await fs.mkdir(q, { recursive: true })
          await fs.rename(full, path.join(q, `${Date.now()}-learning-${f}`)).catch(() => undefined)
        }
      }
    }
    const result = doc ?? spec.parse({})
    // Copias en conflicto ya fusionadas: se guarda el resultado y se borran.
    if (merged.some((f) => f !== `${name}.json`)) {
      await writeJsonAtomic(this.file(name), result)
      await Promise.all(merged.filter((f) => f !== `${name}.json`).map((f) => fs.rm(path.join(this.dir, f), { force: true }).catch(() => undefined)))
    }
    return { doc: result, pending, corrupt }
  }

  /** Guarda un documento fusionándolo con lo que haya en disco. Devuelve el documento resultante. */
  async save<N extends LearningDocName>(name: N, value: unknown): Promise<DocOf<N>> {
    if (!LEARNING_DOCS.includes(name)) throw new Error('Documento no válido.')
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Datos no válidos.')
    const size = JSON.stringify(value).length
    if (size > MAX_DOC_BYTES) throw new Error('Los datos son demasiado grandes.')
    const spec = SPECS[name] as unknown as DocSpec<DocOf<N>>
    const incoming = spec.parse(value)
    const { doc: current } = await this.read(name)
    const merged = spec.merge(current, incoming)
    await writeJsonAtomic(this.file(name), merged)
    return merged
  }

  async readMeta(): Promise<LearningMeta | null> {
    try {
      const m = await readJsonPatient<LearningMeta | null>(path.join(this.dir, 'meta.json'), null)
      return m && typeof m.dataVersion === 'number' ? m : null
    } catch {
      return null
    }
  }

  /**
   * Migración a 2.0 (idempotente): si no hay `learning/meta.json`, copia de seguridad de los datos JSON y
   * escritura de la meta. Los documentos de aprendizaje se inicializan después desde la interfaz con el
   * historial (ver shared/learning/sources.ts), sin tocar los archivos de siempre.
   */
  async migrate(appVersion: string, now = new Date()): Promise<LearningMeta> {
    const existing = await this.readMeta()
    if (existing && existing.dataVersion >= LEARNING_DATA_VERSION) return existing
    await this.init()
    const meta: LearningMeta = { dataVersion: LEARNING_DATA_VERSION, migratedAt: now.toISOString(), appVersion, backup: null, backupFiles: 0 }
    try {
      const r = await backupLegacyData(this.root, now)
      meta.backup = r.dir
      meta.backupFiles = r.files
    } catch (e) {
      // Sin copia no se bloquea la app (la migración no modifica nada), pero queda constancia.
      meta.backupError = (e as Error)?.message ?? String(e)
    }
    await writeJsonAtomic(path.join(this.dir, 'meta.json'), meta)
    return meta
  }
}

/** Archivos JSON de los datos de 1.x (sin PDF, audio ni grabaciones, que la migración no toca). */
async function legacyJsonFiles(root: string): Promise<string[]> {
  const out: string[] = []
  const add = async (rel: string) => {
    const full = path.join(root, rel)
    const st = await fs.stat(full).catch(() => null)
    if (!st) return
    if (st.isFile() && rel.endsWith('.json')) out.push(rel)
    else if (st.isDirectory()) for (const e of await fs.readdir(full)) await add(path.join(rel, e))
  }
  for (const rel of ['settings.json', 'exams', 'attempts', 'practice']) await add(rel)
  return out
}

/** Copia de seguridad previa a la migración. Comprueba que la copia está completa y es legible. */
export async function backupLegacyData(root: string, now = new Date()): Promise<{ dir: string | null; files: number }> {
  const files = await legacyJsonFiles(root)
  if (!files.length) return { dir: null, files: 0 }
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const rel = path.join('backups', `pre-2.0.0-${stamp}`)
  const dest = path.join(root, rel)
  for (const f of files) {
    const to = path.join(dest, f)
    await fs.mkdir(path.dirname(to), { recursive: true })
    await fs.copyFile(path.join(root, f), to)
  }
  // Verificación: mismo número de archivos y mismos tamaños.
  for (const f of files) {
    const [a, b] = await Promise.all([fs.stat(path.join(root, f)), fs.stat(path.join(dest, f))])
    if (a.size !== b.size) throw new Error(`La copia de ${f} está incompleta.`)
  }
  await writeJsonAtomic(path.join(dest, 'LEEME.json'), {
    descripcion: 'Copia de seguridad automática de tus datos antes de actualizar a B2 First Trainer 2.0. Para restaurarla, cierra la app y copia estas carpetas y archivos sobre la carpeta de datos.',
    creada: now.toISOString(),
    archivos: files.length
  })
  return { dir: rel.split(path.sep).join('/'), files: files.length }
}
