// Almacenamiento en archivos JSON con escritura atómica. No depende de Electron para poder probarlo.
import { promises as fs, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import type { Attempt, Exam, FileRef, Settings } from '../shared/types'
import type { PracticeProgress, PracticeSheet } from '../shared/practice'
import { ACCENTS, DASHBOARD_MODULES, DEFAULT_APPEARANCE, DEFAULT_SETTINGS, SCHEMA_VERSION, THEMES, type DashboardModule } from '../shared/types'
import { isSafeId } from '../shared/ids'
import { parsePlacement } from '../shared/placement'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Cola por ruta: evita que dos escrituras simultáneas al mismo archivo se pisen. */
const queues = new Map<string, Promise<unknown>>()

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve()
  const next = prev.then(task, task)
  const tail = next.catch(() => undefined)
  queues.set(key, tail)
  void tail.then(() => {
    if (queues.get(key) === tail) queues.delete(key)
  })
  return next
}

/** Renombra con reintentos: en Windows un antivirus o el indexador pueden bloquear el archivo un instante. */
async function renameWithRetry(from: string, to: string, attempts = 6): Promise<void> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      await fs.rename(from, to)
      return
    } catch (e) {
      lastError = e
      const code = (e as NodeJS.ErrnoException).code
      if (code !== 'EPERM' && code !== 'EACCES' && code !== 'EBUSY') break
      await sleep(25 * 2 ** i)
    }
  }
  throw lastError
}

/**
 * Escribe un archivo de forma atómica: primero en un temporal del mismo directorio,
 * fuerza el volcado a disco y después lo renombra sobre el destino.
 * Si la app se cierra a mitad, el archivo original queda intacto.
 */
export async function writeFileAtomic(file: string, data: string | Uint8Array): Promise<void> {
  const target = path.resolve(file)
  return enqueue(target, async () => {
    await fs.mkdir(path.dirname(target), { recursive: true })
    const tmp = `${target}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
    let handle: fs.FileHandle | undefined
    try {
      handle = await fs.open(tmp, 'w')
      await handle.writeFile(data)
      await handle.sync()
      await handle.close()
      handle = undefined
      await renameWithRetry(tmp, target)
    } catch (e) {
      if (handle) await handle.close().catch(() => undefined)
      await fs.rm(tmp, { force: true }).catch(() => undefined)
      throw e
    }
  })
}

export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  await writeFileAtomic(file, JSON.stringify(value, null, 2) + '\n')
}

export class CorruptFileError extends Error {
  constructor(public file: string, cause: unknown) {
    super(`Archivo dañado: ${file} (${(cause as Error)?.message ?? cause})`)
    this.name = 'CorruptFileError'
  }
}

/** Lee un JSON. Devuelve `fallback` si no existe; lanza CorruptFileError si no se puede interpretar. */
export async function readJson<T>(file: string, fallback: T): Promise<T> {
  let text: string
  try {
    text = await fs.readFile(file, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return fallback
    throw e
  }
  try {
    return JSON.parse(text.replace(/^﻿/, '')) as T
  } catch (e) {
    throw new CorruptFileError(file, e)
  }
}

/**
 * Un archivo que no se puede leer pero se modificó hace poco (o está vacío) probablemente se está
 * sincronizando (OneDrive, Drive, iCloud, Dropbox…). Esos no se apartan a `corrupt/`: se ignoran por ahora,
 * porque moverlos también se sincronizaría y el examen desaparecería en los dos ordenadores.
 */
export const SYNC_GRACE_MS = 10 * 60 * 1000

/** Lee un JSON reintentando un par de veces si no se puede interpretar (la nube puede estar escribiéndolo). */
export async function readJsonPatient<T>(file: string, fallback: T, retries = 2, waitMs = 300): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await readJson(file, fallback)
    } catch (e) {
      if (!(e instanceof CorruptFileError) || i >= retries) throw e
      await sleep(waitMs)
    }
  }
}

/** ¿Parece un archivo a medio sincronizar (vacío o modificado hace muy poco)? */
export async function looksMidSync(file: string, now = Date.now()): Promise<boolean> {
  try {
    const st = await fs.stat(file)
    return st.size === 0 || now - st.mtimeMs < SYNC_GRACE_MS
  } catch {
    return true
  }
}

/** Mueve un archivo dañado a la carpeta `corrupt/` para no perderlo y no bloquear la app. */
async function quarantine(root: string, file: string): Promise<void> {
  const dir = path.join(root, 'corrupt')
  await fs.mkdir(dir, { recursive: true })
  const dest = path.join(dir, `${Date.now()}-${path.basename(file)}`)
  await fs.rename(file, dest).catch(() => undefined)
}

/** Limpia temporales que hayan quedado de un cierre inesperado. */
async function cleanupTemps(dir: string): Promise<void> {
  const entries = await fs.readdir(dir).catch(() => [] as string[])
  await Promise.all(entries.filter((e) => e.endsWith('.tmp')).map((e) => fs.rm(path.join(dir, e), { force: true }).catch(() => undefined)))
}

function assertId(id: unknown): asserts id is string {
  if (!isSafeId(id)) throw new Error(`Identificador no válido: ${String(id)}`)
}

const SAFE_FILE = /^[A-Za-z0-9_.-]{1,120}$/

export function assertSafeFileName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || !SAFE_FILE.test(name) || name.includes('..')) {
    throw new Error(`Nombre de archivo no válido: ${String(name)}`)
  }
}

export function safeStoredName(original: string, prefix: string): string {
  const ext = path.extname(original).toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 10)
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}${ext}`
}

const MIME_BY_EXT: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.flac': 'audio/flac',
  '.json': 'application/json',
  '.txt': 'text/plain'
}

export function mimeFor(file: string): string {
  return MIME_BY_EXT[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

export interface LoadReport<T> {
  items: T[]
  /** Archivos que no se pudieron leer y se movieron a `corrupt/`. */
  corrupt: string[]
  /** Archivos que no se pudieron leer pero parecen a medio sincronizar: se ignoran sin moverlos. */
  pending?: string[]
}

export class DataStore {
  readonly root: string

  constructor(root: string) {
    this.root = path.resolve(root)
  }

  get examsDir() {
    return path.join(this.root, 'exams')
  }
  get attemptsDir() {
    return path.join(this.root, 'attempts')
  }
  get filesDir() {
    return path.join(this.root, 'files')
  }
  get recordingsDir() {
    return path.join(this.root, 'recordings')
  }
  get practiceDir() {
    return path.join(this.root, 'practice')
  }
  get practiceProgressDir() {
    return path.join(this.root, 'practice', 'progress')
  }
  get settingsFile() {
    return path.join(this.root, 'settings.json')
  }

  async init(): Promise<void> {
    for (const d of [this.root, this.examsDir, this.attemptsDir, this.filesDir, this.recordingsDir, this.practiceDir, this.practiceProgressDir]) {
      await fs.mkdir(d, { recursive: true })
    }
    await Promise.all([this.root, this.examsDir, this.attemptsDir, this.practiceDir, this.practiceProgressDir].map(cleanupTemps))
  }

  // ---------- Ajustes ----------
  async getSettings(): Promise<Settings> {
    try {
      const raw = await readJsonPatient<Partial<Settings>>(this.settingsFile, {})
      return mergeSettings(raw)
    } catch (e) {
      if (e instanceof CorruptFileError) {
        if (!(await looksMidSync(this.settingsFile))) await quarantine(this.root, this.settingsFile)
        return { ...DEFAULT_SETTINGS }
      }
      throw e
    }
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    const merged = mergeSettings(settings)
    await writeJsonAtomic(this.settingsFile, merged)
    return merged
  }

  // ---------- Colecciones ----------
  private async loadDir<T extends { id: string }>(dir: string): Promise<LoadReport<T>> {
    const entries = await fs.readdir(dir).catch(() => [] as string[])
    const byId = new Map<string, { item: T; canonical: boolean; mtime: number }>()
    const corrupt: string[] = []
    const pending: string[] = []
    for (const name of entries) {
      if (!name.endsWith('.json')) continue
      const file = path.join(dir, name)
      try {
        const item = await readJsonPatient<T | null>(file, null)
        if (!item || typeof item !== 'object' || typeof item.id !== 'string') throw new CorruptFileError(file, 'estructura no válida')
        // Las carpetas sincronizadas (OneDrive, Drive, Dropbox…) pueden crear «copias en conflicto» del mismo
        // archivo. Se usa el archivo con el nombre normal y, si no existe, la copia más reciente.
        const canonical = name === `${item.id}.json`
        const mtime = (await fs.stat(file)).mtimeMs
        const prev = byId.get(item.id)
        if (!prev || (canonical && !prev.canonical) || (canonical === prev.canonical && mtime > prev.mtime)) {
          byId.set(item.id, { item, canonical, mtime })
        }
      } catch (e) {
        if (e instanceof CorruptFileError) {
          if (await looksMidSync(file)) {
            pending.push(name)
          } else {
            corrupt.push(name)
            await quarantine(this.root, file)
          }
        } else throw e
      }
    }
    return { items: Array.from(byId.values(), (v) => v.item), corrupt, pending }
  }

  async listExams(): Promise<LoadReport<Exam>> {
    const r = await this.loadDir<Exam>(this.examsDir)
    r.items.sort((a, b) => b.importedAt.localeCompare(a.importedAt))
    return r
  }

  async getExam(id: string): Promise<Exam | null> {
    assertId(id)
    return readJson<Exam | null>(path.join(this.examsDir, `${id}.json`), null)
  }

  async saveExam(exam: Exam): Promise<Exam> {
    assertId(exam.id)
    const value = { ...exam, schemaVersion: SCHEMA_VERSION }
    await writeJsonAtomic(path.join(this.examsDir, `${exam.id}.json`), value)
    return value
  }

  /** Borra el examen, sus archivos y sus intentos. */
  async deleteExam(id: string): Promise<void> {
    assertId(id)
    const { items } = await this.listAttempts()
    for (const a of items.filter((a) => a.examId === id)) await this.deleteAttempt(a.id)
    await fs.rm(path.join(this.filesDir, id), { recursive: true, force: true })
    await fs.rm(path.join(this.examsDir, `${id}.json`), { force: true })
  }

  async listAttempts(): Promise<LoadReport<Attempt>> {
    const r = await this.loadDir<Attempt>(this.attemptsDir)
    r.items.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    return r
  }

  async getAttempt(id: string): Promise<Attempt | null> {
    assertId(id)
    return readJson<Attempt | null>(path.join(this.attemptsDir, `${id}.json`), null)
  }

  async saveAttempt(attempt: Attempt): Promise<Attempt> {
    assertId(attempt.id)
    assertId(attempt.examId)
    const value = { ...attempt, schemaVersion: SCHEMA_VERSION }
    await writeJsonAtomic(path.join(this.attemptsDir, `${attempt.id}.json`), value)
    return value
  }

  async deleteAttempt(id: string): Promise<void> {
    assertId(id)
    await fs.rm(path.join(this.recordingsDir, id), { recursive: true, force: true })
    await fs.rm(path.join(this.attemptsDir, `${id}.json`), { force: true })
  }

  // ---------- Práctica ----------
  async listPracticeSheets(): Promise<LoadReport<PracticeSheet>> {
    const r = await this.loadDir<PracticeSheet>(this.practiceDir)
    r.items.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    return r
  }

  async savePracticeSheet(sheet: PracticeSheet): Promise<PracticeSheet> {
    assertId(sheet.id)
    await writeJsonAtomic(path.join(this.practiceDir, `${sheet.id}.json`), sheet)
    return sheet
  }

  async deletePracticeSheet(id: string): Promise<void> {
    assertId(id)
    await fs.rm(path.join(this.practiceDir, `${id}.json`), { force: true })
    await fs.rm(path.join(this.practiceProgressDir, `${id}.json`), { force: true })
  }

  listPracticeProgress(): Promise<LoadReport<PracticeProgress>> {
    return this.loadDir<PracticeProgress>(this.practiceProgressDir)
  }

  async savePracticeProgress(progress: PracticeProgress): Promise<PracticeProgress> {
    assertId(progress.id)
    await writeJsonAtomic(path.join(this.practiceProgressDir, `${progress.id}.json`), progress)
    return progress
  }

  async deletePracticeProgress(id: string): Promise<void> {
    assertId(id)
    await fs.rm(path.join(this.practiceProgressDir, `${id}.json`), { force: true })
  }

  // ---------- Archivos ----------
  examFilePath(examId: string, storedName: string): string {
    assertId(examId)
    assertSafeFileName(storedName)
    return path.join(this.filesDir, examId, storedName)
  }

  async importExamFile(examId: string, sourcePath: string, prefix: string): Promise<FileRef> {
    assertId(examId)
    const stat = await fs.stat(sourcePath)
    if (!stat.isFile()) throw new Error('No es un archivo.')
    const storedName = safeStoredName(sourcePath, prefix)
    const dest = this.examFilePath(examId, storedName)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    const tmp = `${dest}.tmp`
    await fs.copyFile(sourcePath, tmp)
    await renameWithRetry(tmp, dest)
    return { name: path.basename(sourcePath), storedName, size: stat.size, mime: mimeFor(sourcePath) }
  }

  async readExamFile(examId: string, storedName: string): Promise<Uint8Array> {
    return fs.readFile(this.examFilePath(examId, storedName))
  }

  async removeExamFile(examId: string, storedName: string): Promise<void> {
    await fs.rm(this.examFilePath(examId, storedName), { force: true })
  }

  recordingPath(attemptId: string, storedName: string): string {
    assertId(attemptId)
    assertSafeFileName(storedName)
    return path.join(this.recordingsDir, attemptId, storedName)
  }

  async saveRecording(attemptId: string, questionId: string, bytes: Uint8Array, mime: string): Promise<FileRef> {
    assertId(questionId)
    const ext = mime.includes('ogg') ? '.ogg' : mime.includes('mp4') ? '.m4a' : '.webm'
    const storedName = `${questionId}-${Date.now().toString(36)}${ext}`
    await writeFileAtomic(this.recordingPath(attemptId, storedName), bytes)
    return { name: storedName, storedName, size: bytes.byteLength, mime: mime || 'audio/webm' }
  }

  async readRecording(attemptId: string, storedName: string): Promise<Uint8Array> {
    return fs.readFile(this.recordingPath(attemptId, storedName))
  }

  async removeRecording(attemptId: string, storedName: string): Promise<void> {
    await fs.rm(this.recordingPath(attemptId, storedName), { force: true })
  }

  /** Copia toda la carpeta de datos a `destDir/<nombre>` y devuelve la ruta creada. */
  async backupTo(destDir: string, now = new Date()): Promise<string> {
    const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const dest = path.join(destDir, `b2-first-trainer-backup-${stamp}`)
    await fs.cp(this.root, dest, { recursive: true, errorOnExist: true, force: false })
    return dest
  }
}

function mergeReminder(raw: unknown): Settings['reminder'] {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings['reminder']>
  const d = DEFAULT_SETTINGS.reminder
  const time = typeof r.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) ? r.time : d.time
  return {
    enabled: typeof r.enabled === 'boolean' ? r.enabled : d.enabled,
    time,
    background: typeof r.background === 'boolean' ? r.background : d.background,
    openAtLogin: typeof r.openAtLogin === 'boolean' ? r.openAtLogin : d.openAtLogin
  }
}

function mergeAppearance(raw: unknown): Settings['appearance'] {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings['appearance']>
  return {
    accent: ACCENTS.includes(r.accent as Settings['appearance']['accent']) ? (r.accent as Settings['appearance']['accent']) : DEFAULT_APPEARANCE.accent,
    density: r.density === 'compact' ? 'compact' : 'comfortable',
    motion: r.motion === 'reduced' || r.motion === 'none' ? r.motion : 'full'
  }
}

function mergeDashboard(raw: unknown): Settings['dashboard'] {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Settings['dashboard']>
  const valid = (v: unknown): v is DashboardModule => DASHBOARD_MODULES.includes(v as DashboardModule)
  const order = Array.isArray(r.order) ? Array.from(new Set(r.order.filter(valid))) : []
  // Los módulos nuevos (de versiones posteriores) se añaden al final.
  for (const m of DASHBOARD_MODULES) if (!order.includes(m)) order.push(m)
  const hidden = Array.isArray(r.hidden) ? Array.from(new Set(r.hidden.filter(valid))) : []
  return { order, hidden }
}

/** Tema nativo de la ventana (OLED y Midnight son variantes oscuras). */
export function nativeThemeOf(theme: Settings['theme']): 'system' | 'light' | 'dark' {
  return theme === 'system' || theme === 'light' ? theme : 'dark'
}

export function mergeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const r = raw ?? {}
  const theme = THEMES.includes(r.theme as Settings['theme']) ? (r.theme as Settings['theme']) : DEFAULT_SETTINGS.theme
  const fontScale = typeof r.fontScale === 'number' && Number.isFinite(r.fontScale) ? Math.min(1.5, Math.max(0.85, r.fontScale)) : DEFAULT_SETTINGS.fontScale
  const autosave = typeof r.autosaveSeconds === 'number' && Number.isFinite(r.autosaveSeconds) ? Math.min(60, Math.max(1, Math.round(r.autosaveSeconds))) : DEFAULT_SETTINGS.autosaveSeconds
  const g: Partial<Settings['grading']> = r.grading ?? {}
  return {
    schemaVersion: SCHEMA_VERSION,
    theme,
    fontScale,
    language: 'es',
    autosaveSeconds: autosave,
    checkUpdates: typeof r.checkUpdates === 'boolean' ? r.checkUpdates : DEFAULT_SETTINGS.checkUpdates,
    userName: typeof r.userName === 'string' ? r.userName.replace(/\s+/g, ' ').trim().slice(0, 40) : DEFAULT_SETTINGS.userName,
    onboarded: typeof r.onboarded === 'boolean' ? r.onboarded : DEFAULT_SETTINGS.onboarded,
    mascot: typeof r.mascot === 'boolean' ? r.mascot : DEFAULT_SETTINGS.mascot,
    reminder: mergeReminder(r.reminder),
    placement: parsePlacement(r.placement),
    appearance: mergeAppearance(r.appearance),
    gamification: typeof r.gamification === 'boolean' ? r.gamification : DEFAULT_SETTINGS.gamification,
    dashboard: mergeDashboard(r.dashboard),
    grading: {
      ignoreCase: typeof g.ignoreCase === 'boolean' ? g.ignoreCase : DEFAULT_SETTINGS.grading.ignoreCase,
      ignoreExtraSpaces: typeof g.ignoreExtraSpaces === 'boolean' ? g.ignoreExtraSpaces : DEFAULT_SETTINGS.grading.ignoreExtraSpaces,
      ignoreAccents: typeof g.ignoreAccents === 'boolean' ? g.ignoreAccents : DEFAULT_SETTINGS.grading.ignoreAccents
    }
  }
}

// ---------- Carpeta de datos (sincronización entre dispositivos) ----------

/** ¿La carpeta contiene datos de la app? */
export async function hasAppData(dir: string): Promise<boolean> {
  try {
    if ((await fs.stat(path.join(dir, 'settings.json'))).isFile()) return true
  } catch {
    /* sigue */
  }
  const exams = await fs.readdir(path.join(dir, 'exams')).catch(() => [] as string[])
  return exams.some((f) => f.endsWith('.json'))
}

export const DATA_FOLDER_NAME = 'B2 First Trainer'

/**
 * Decide qué carpeta usar a partir de la que elige el usuario:
 * si ya contiene datos (o su subcarpeta «B2 First Trainer» los contiene), se usan;
 * si no, se propone crear «B2 First Trainer» dentro y mover allí los datos actuales.
 */
export async function resolveChosenFolder(chosen: string): Promise<{ target: string; hasData: boolean }> {
  const dir = path.resolve(chosen)
  if (await hasAppData(dir)) return { target: dir, hasData: true }
  const sub = path.join(dir, DATA_FOLDER_NAME)
  if (await hasAppData(sub)) return { target: sub, hasData: true }
  return { target: path.basename(dir) === DATA_FOLDER_NAME ? dir : sub, hasData: false }
}

/** Copia todos los datos a otra carpeta y comprueba que no falta nada. La carpeta original no se toca. */
export async function copyAppData(src: string, dest: string): Promise<{ files: number }> {
  if (path.resolve(src) === path.resolve(dest)) throw new Error('La carpeta de destino es la misma que la actual.')
  if (path.resolve(dest).startsWith(path.resolve(src) + path.sep)) throw new Error('La carpeta de destino no puede estar dentro de la carpeta de datos actual.')
  if (await hasAppData(dest)) throw new Error('La carpeta de destino ya contiene datos de la app.')
  await fs.mkdir(dest, { recursive: true })
  await fs.cp(src, dest, { recursive: true, force: false, errorOnExist: false, filter: (from) => !from.endsWith('.tmp') && !isLockFile(path.basename(from)) })
  const count = async (dir: string): Promise<number> => {
    let n = 0
    for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (e.isDirectory()) n += await count(path.join(dir, e.name))
      else if (!e.name.endsWith('.tmp') && !isLockFile(e.name)) n++
    }
    return n
  }
  const [a, b] = [await count(src), await count(dest)]
  if (b < a) throw new Error(`La copia está incompleta (${b} de ${a} archivos).`)
  return { files: b }
}

/** Archivo de bloqueo antiguo (un solo archivo para todos los equipos). Se sigue leyendo por compatibilidad. */
export const LOCK_FILE = 'abierta-en.json'
/** Un bloqueo sin renovar en este tiempo se considera abandonado (la app se cerró de golpe). */
export const LOCK_STALE_MS = 2 * 60 * 1000

export interface LockInfo {
  host: string
  pid: number
  heartbeat: string
  /** Identificador aleatorio de esta instalación: distingue dos ordenadores con el mismo nombre. */
  device?: string
}

/** ¿Es este bloqueo de este mismo ordenador? Con identificador de instalación se usa ese; si no, el nombre. */
function isOwnLock(lock: LockInfo, host: string, device?: string): boolean {
  if (device && typeof lock.device === 'string') return lock.device === device
  return lock.host === host
}

/** ¿Es un archivo de bloqueo (de cualquier equipo)? No se copian al mover los datos. */
export function isLockFile(name: string): boolean {
  return /^abierta-en(-[A-Za-z0-9_-]+)?\.json$/.test(name)
}

/**
 * Cada equipo escribe su propio archivo («abierta-en-<equipo>.json»). Así dos ordenadores no se pisan
 * el latido y la nube no crea copias en conflicto: cada uno ve el archivo del otro mientras la app está abierta.
 */
export function lockFileFor(host: string, device?: string): string {
  const slug = host.normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'equipo'
  const id = (device ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8)
  return id ? `abierta-en-${slug}-${id}.json` : `abierta-en-${slug}.json`
}

/** Devuelve el bloqueo activo más reciente de OTRO ordenador; null si no hay o están caducados. */
export async function otherDeviceLock(dir: string, host: string, now = new Date(), device?: string): Promise<LockInfo | null> {
  const names = (await fs.readdir(dir).catch(() => [] as string[])).filter(isLockFile)
  let best: LockInfo | null = null
  for (const name of names) {
    const lock = await readJson<LockInfo | null>(path.join(dir, name), null).catch(() => null)
    if (!lock || typeof lock.host !== 'string' || typeof lock.heartbeat !== 'string' || isOwnLock(lock, host, device)) continue
    const age = now.getTime() - new Date(lock.heartbeat).getTime()
    // Se admite un pequeño desfase de reloj entre equipos.
    if (!Number.isFinite(age) || age < -LOCK_STALE_MS || age >= LOCK_STALE_MS) continue
    if (!best || lock.heartbeat > best.heartbeat) best = lock
  }
  return best
}

export async function writeLock(dir: string, info: LockInfo): Promise<void> {
  await writeJsonAtomic(path.join(dir, lockFileFor(info.host, info.device)), info)
}

/** Igual que releaseLock pero síncrono: al cerrar la app no da tiempo a terminar operaciones asíncronas. */
export function releaseLockSync(dir: string, host: string, pid: number, device?: string): void {
  for (const name of [lockFileFor(host, device), lockFileFor(host), LOCK_FILE]) {
    const file = path.join(dir, name)
    try {
      const lock = JSON.parse(readFileSync(file, 'utf8')) as LockInfo
      if (lock && lock.host === host && lock.pid === pid) rmSync(file, { force: true })
    } catch {
      /* no existe o está dañado */
    }
  }
}

export async function releaseLock(dir: string, host: string, pid: number, device?: string): Promise<void> {
  for (const name of [lockFileFor(host, device), lockFileFor(host), LOCK_FILE]) {
    const file = path.join(dir, name)
    const lock = await readJson<LockInfo | null>(file, null).catch(() => null)
    if (lock && lock.host === host && lock.pid === pid) await fs.rm(file, { force: true })
  }
}
