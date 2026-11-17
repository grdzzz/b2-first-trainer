// Almacenamiento en archivos JSON con escritura atómica. No depende de Electron para poder probarlo.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import type { Attempt, Exam, FileRef, Settings } from '../shared/types'
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../shared/types'
import { isSafeId } from '../shared/ids'

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
  '.webm': 'audio/webm',
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
  get settingsFile() {
    return path.join(this.root, 'settings.json')
  }

  async init(): Promise<void> {
    for (const d of [this.root, this.examsDir, this.attemptsDir, this.filesDir, this.recordingsDir]) {
      await fs.mkdir(d, { recursive: true })
    }
    await Promise.all([cleanupTemps(this.root), cleanupTemps(this.examsDir), cleanupTemps(this.attemptsDir)])
  }

  // ---------- Ajustes ----------
  async getSettings(): Promise<Settings> {
    try {
      const raw = await readJson<Partial<Settings>>(this.settingsFile, {})
      return mergeSettings(raw)
    } catch (e) {
      if (e instanceof CorruptFileError) {
        await quarantine(this.root, this.settingsFile)
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
    const items: T[] = []
    const corrupt: string[] = []
    for (const name of entries) {
      if (!name.endsWith('.json')) continue
      const file = path.join(dir, name)
      try {
        const item = await readJson<T | null>(file, null)
        if (item && typeof item === 'object' && typeof item.id === 'string') items.push(item)
        else throw new CorruptFileError(file, 'estructura no válida')
      } catch (e) {
        if (e instanceof CorruptFileError) {
          corrupt.push(name)
          await quarantine(this.root, file)
        } else throw e
      }
    }
    return { items, corrupt }
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

export function mergeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const r = raw ?? {}
  const theme = r.theme === 'light' || r.theme === 'dark' || r.theme === 'system' ? r.theme : DEFAULT_SETTINGS.theme
  const fontScale = typeof r.fontScale === 'number' && Number.isFinite(r.fontScale) ? Math.min(1.5, Math.max(0.85, r.fontScale)) : DEFAULT_SETTINGS.fontScale
  const autosave = typeof r.autosaveSeconds === 'number' && Number.isFinite(r.autosaveSeconds) ? Math.min(60, Math.max(1, Math.round(r.autosaveSeconds))) : DEFAULT_SETTINGS.autosaveSeconds
  const g: Partial<Settings['grading']> = r.grading ?? {}
  return {
    schemaVersion: SCHEMA_VERSION,
    theme,
    fontScale,
    language: 'es',
    autosaveSeconds: autosave,
    grading: {
      ignoreCase: typeof g.ignoreCase === 'boolean' ? g.ignoreCase : DEFAULT_SETTINGS.grading.ignoreCase,
      ignoreExtraSpaces: typeof g.ignoreExtraSpaces === 'boolean' ? g.ignoreExtraSpaces : DEFAULT_SETTINGS.grading.ignoreExtraSpaces,
      ignoreAccents: typeof g.ignoreAccents === 'boolean' ? g.ignoreAccents : DEFAULT_SETTINGS.grading.ignoreAccents
    }
  }
}
