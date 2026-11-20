import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CorruptFileError, DataStore, mergeSettings, readJson, writeFileAtomic, writeJsonAtomic } from '../src/main/storage'
import { createExam } from '@shared/template'
import { newId } from '@shared/ids'
import type { Attempt } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'b2store-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('escritura atómica', () => {
  it('escribe, sobrescribe y no deja temporales', async () => {
    const f = path.join(dir, 'sub', 'a.json')
    await writeJsonAtomic(f, { a: 1 })
    await writeJsonAtomic(f, { a: 2 })
    expect(JSON.parse(await readFile(f, 'utf8'))).toEqual({ a: 2 })
    expect(await readdir(path.dirname(f))).toEqual(['a.json'])
  })

  it('escrituras concurrentes al mismo archivo terminan con un JSON válido (la última)', async () => {
    const f = path.join(dir, 'c.json')
    await Promise.all(Array.from({ length: 30 }, (_, i) => writeJsonAtomic(f, { i, pad: 'x'.repeat(5000) })))
    expect(JSON.parse(await readFile(f, 'utf8')).i).toBe(29)
    expect((await readdir(dir)).filter((n) => n.endsWith('.tmp'))).toEqual([])
  })

  it('si la escritura falla, el original queda intacto y se limpia el temporal', async () => {
    const f = path.join(dir, 'd.json')
    await writeJsonAtomic(f, { ok: true })
    // un directorio con el nombre de destino hace fallar el rename
    const target = path.join(dir, 'blocked')
    await writeJsonAtomic(path.join(target, 'x.json'), {})
    await expect(writeFileAtomic(target, 'data')).rejects.toBeTruthy()
    expect(JSON.parse(await readFile(f, 'utf8'))).toEqual({ ok: true })
    expect((await readdir(dir)).filter((n) => n.endsWith('.tmp'))).toEqual([])
  })

  it('readJson: fallback si no existe, error tipado si está dañado', async () => {
    expect(await readJson(path.join(dir, 'none.json'), 7)).toBe(7)
    const f = path.join(dir, 'bad.json')
    await writeFile(f, '{"a":')
    await expect(readJson(f, null)).rejects.toBeInstanceOf(CorruptFileError)
  })
})

describe('DataStore', () => {
  const attemptFor = (examId: string): Attempt => ({
    id: newId('attempt'), schemaVersion: 1, examId, examName: 'x', paperId: 'paper_x', paperType: 'reading', paperTitle: 'R',
    mode: 'practice', partIds: [], status: 'finished', startedAt: new Date().toISOString(), durationSec: 10, answers: {}, selfAssessments: {}
  })

  it('guarda y lista exámenes e intentos; borra en cascada', async () => {
    const s = new DataStore(dir)
    await s.init()
    const exam = createExam('Mock 1', ['reading'])
    await s.saveExam(exam)
    expect((await s.getExam(exam.id))?.name).toBe('Mock 1')
    const a = attemptFor(exam.id)
    await s.saveAttempt(a)
    const rec = await s.saveRecording(a.id, newId('q'), new Uint8Array([1, 2, 3]), 'audio/webm;codecs=opus')
    expect(rec.storedName).toMatch(/\.webm$/)
    expect(Array.from(await s.readRecording(a.id, rec.storedName))).toEqual([1, 2, 3])
    expect((await s.listAttempts()).items).toHaveLength(1)
    await s.deleteExam(exam.id)
    expect((await s.listExams()).items).toEqual([])
    expect((await s.listAttempts()).items).toEqual([])
  })

  it('importa archivos con nombre seguro y los lee', async () => {
    const s = new DataStore(dir)
    await s.init()
    const exam = createExam('E', ['listening'])
    const src = path.join(dir, 'Mi audio (1).MP3')
    await writeFile(src, 'abc')
    const ref = await s.importExamFile(exam.id, src, 'audio')
    expect(ref).toMatchObject({ name: 'Mi audio (1).MP3', size: 3, mime: 'audio/mpeg' })
    expect(ref.storedName).toMatch(/^audio-[a-z0-9]+-[a-f0-9]{8}\.mp3$/)
    expect(Buffer.from(await s.readExamFile(exam.id, ref.storedName)).toString()).toBe('abc')
  })

  it('rechaza rutas e identificadores peligrosos', async () => {
    const s = new DataStore(dir)
    await s.init()
    const exam = createExam('E', ['reading'])
    await expect(s.readExamFile(exam.id, '../settings.json')).rejects.toThrow(/no válido/)
    await expect(s.getExam('../../etc')).rejects.toThrow(/no válido/)
    await expect(s.saveExam({ ...exam, id: 'x/../y' })).rejects.toThrow(/no válido/)
  })

  it('aparta archivos dañados sin romper el listado', async () => {
    const s = new DataStore(dir)
    await s.init()
    const exam = createExam('Bueno', ['reading'])
    await s.saveExam(exam)
    await writeFile(path.join(s.examsDir, 'exam_broken000.json'), '{ roto')
    await writeFile(path.join(s.examsDir, 'leftover.json.123.tmp'), 'x')
    const r = await s.listExams()
    expect(r.items.map((e) => e.name)).toEqual(['Bueno'])
    expect(r.corrupt).toEqual(['exam_broken000.json'])
    expect(await readdir(path.join(dir, 'corrupt'))).toHaveLength(1)
    await s.init() // limpia temporales
    expect((await readdir(s.examsDir)).some((n) => n.endsWith('.tmp'))).toBe(false)
  })

  it('ajustes: valores por defecto, saneado y recuperación de archivo dañado', async () => {
    const s = new DataStore(dir)
    await s.init()
    expect(await s.getSettings()).toEqual(DEFAULT_SETTINGS)
    await s.saveSettings({ ...DEFAULT_SETTINGS, theme: 'dark', fontScale: 9 })
    expect(await s.getSettings()).toMatchObject({ theme: 'dark', fontScale: 1.5, checkUpdates: true })
    await s.saveSettings({ ...DEFAULT_SETTINGS, checkUpdates: false })
    expect((await s.getSettings()).checkUpdates).toBe(false)
    await writeFile(s.settingsFile, 'nope')
    expect(await s.getSettings()).toEqual(DEFAULT_SETTINGS)
    expect(mergeSettings({ theme: 'neon' as never, grading: { ignoreCase: true } as never }).grading).toEqual({ ignoreCase: true, ignoreExtraSpaces: false, ignoreAccents: false })
  })

  it('copia de seguridad', async () => {
    const s = new DataStore(path.join(dir, 'data'))
    await s.init()
    await s.saveExam(createExam('E', ['reading']))
    const out = await s.backupTo(dir, new Date('2026-01-02T03:04:05Z'))
    expect(path.basename(out)).toBe('b2-first-trainer-backup-2026-01-02-03-04-05')
    expect(await readdir(path.join(out, 'exams'))).toHaveLength(1)
  })
})

import { copyAppData, hasAppData, otherDeviceLock, releaseLock, resolveChosenFolder, writeLock } from '../src/main/storage'
import { mkdir, utimes } from 'node:fs/promises'

describe('carpetas sincronizadas', () => {
  it('ignora copias en conflicto: prefiere el archivo normal y si no, la copia más reciente', async () => {
    const s = new DataStore(dir)
    await s.init()
    const exam = createExam('Original', ['reading'])
    await s.saveExam(exam)
    await writeFile(path.join(s.examsDir, `${exam.id}-PORTATIL.json`), JSON.stringify({ ...exam, name: 'Copia en conflicto' }))
    let r = await s.listExams()
    expect(r.items.map((e) => e.name)).toEqual(['Original'])
    // Sin el archivo normal, se usa la copia más reciente
    await rm(path.join(s.examsDir, `${exam.id}.json`))
    await writeFile(path.join(s.examsDir, `${exam.id} (1).json`), JSON.stringify({ ...exam, name: 'Más reciente' }))
    const old = new Date(Date.now() - 60000)
    await utimes(path.join(s.examsDir, `${exam.id}-PORTATIL.json`), old, old)
    r = await s.listExams()
    expect(r.items.map((e) => e.name)).toEqual(['Más reciente'])
  })

  it('elige carpeta: usa datos existentes o propone la subcarpeta «B2 First Trainer»', async () => {
    const empty = path.join(dir, 'OneDrive')
    await mkdir(empty)
    expect(await resolveChosenFolder(empty)).toEqual({ target: path.join(empty, 'B2 First Trainer'), hasData: false })
    const s = new DataStore(path.join(empty, 'B2 First Trainer'))
    await s.init()
    await s.saveSettings({ ...DEFAULT_SETTINGS })
    expect(await resolveChosenFolder(empty)).toEqual({ target: path.join(empty, 'B2 First Trainer'), hasData: true })
    expect(await resolveChosenFolder(path.join(empty, 'B2 First Trainer'))).toEqual({ target: path.join(empty, 'B2 First Trainer'), hasData: true })
  })

  it('copia los datos completos sin tocar el original y se niega a sobrescribir', async () => {
    const src = new DataStore(path.join(dir, 'local'))
    await src.init()
    await src.saveExam(createExam('E', ['reading']))
    await writeFile(path.join(src.root, 'basura.tmp'), 'x')
    const dest = path.join(dir, 'nube', 'B2 First Trainer')
    const r = await copyAppData(src.root, dest)
    expect(r.files).toBe(1)
    expect(await hasAppData(dest)).toBe(true)
    expect(await hasAppData(src.root)).toBe(true)
    await expect(copyAppData(src.root, dest)).rejects.toThrow(/ya contiene/)
    await expect(copyAppData(src.root, path.join(src.root, 'dentro'))).rejects.toThrow(/dentro/)
  })

  it('bloqueo: detecta otro ordenador activo, ignora el propio y los caducados', async () => {
    const now = new Date('2026-01-01T10:00:00Z')
    await writeLock(dir, { host: 'PORTATIL', pid: 1, heartbeat: new Date(now.getTime() - 30000).toISOString() })
    expect((await otherDeviceLock(dir, 'SOBREMESA', now))?.host).toBe('PORTATIL')
    expect(await otherDeviceLock(dir, 'PORTATIL', now)).toBeNull()
    expect(await otherDeviceLock(dir, 'SOBREMESA', new Date(now.getTime() + 5 * 60000))).toBeNull()
    await releaseLock(dir, 'SOBREMESA', 1)
    expect(await otherDeviceLock(dir, 'SOBREMESA', now)).not.toBeNull()
    await releaseLock(dir, 'PORTATIL', 1)
    expect(await otherDeviceLock(dir, 'SOBREMESA', now)).toBeNull()
  })
})
