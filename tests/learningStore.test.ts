import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readdir, readFile, rm, writeFile, mkdir, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { isConflictCopy, LearningStore } from '../src/main/learningStore'
import { mergeSettings, nativeThemeOf } from '../src/main/storage'
import { emptyGame, grantXp, totalXp } from '../src/shared/learning/game'
import { emptyNotebook, recordFailure } from '../src/shared/learning/notebook'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'b2learn-'))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const draft = (id: string) => ({ id, source: 'manual' as const, ref: { kind: 'none' as const }, expected: ['x'], skill: 'useOfEnglish' as const, ownReview: true })

describe('almacén de aprendizaje', () => {
  it('reconoce copias en conflicto de carpetas sincronizadas', () => {
    expect(isConflictCopy('game (1).json', 'game')).toBe(true)
    expect(isConflictCopy('game-DESKTOP-conflict.json', 'game')).toBe(true)
    expect(isConflictCopy('game (Copia en conflicto de PC 2026-11-26).json', 'game')).toBe(true)
    expect(isConflictCopy('game.json', 'game')).toBe(false)
    expect(isConflictCopy('gamer.json', 'game')).toBe(false)
    expect(isConflictCopy('notebook (1).json', 'game')).toBe(false)
  })

  it('guarda, lee y fusiona con lo que hay en disco', async () => {
    const s = new LearningStore(dir)
    await s.init()
    const a = grantXp(emptyGame(), 'k1', { xp: 30, reason: 'sheet', at: '2026-11-26T10:00:00Z' }).doc
    await s.save('game', a)
    // Otro equipo guarda otra recompensa: al guardar se fusiona, no se pisa.
    const b = grantXp(emptyGame(), 'k2', { xp: 20, reason: 'review', at: '2026-11-26T11:00:00Z' }).doc
    const merged = await s.save('game', b)
    expect(totalXp(merged)).toBe(50)
    expect(totalXp((await s.read('game')).doc)).toBe(50)
  })

  it('fusiona las copias en conflicto y las borra', async () => {
    const s = new LearningStore(dir)
    await s.init()
    const one = recordFailure(emptyNotebook(), draft('m:1'), 'o', '2026-11-26T10:00:00Z', '2026-11-26').doc
    const two = recordFailure(emptyNotebook(), draft('m:2'), 'o', '2026-11-26T10:00:00Z', '2026-11-26').doc
    await writeFile(path.join(s.dir, 'notebook.json'), JSON.stringify(one))
    await writeFile(path.join(s.dir, 'notebook (1).json'), JSON.stringify(two))
    const { doc } = await s.read('notebook')
    expect(Object.keys(doc.records).sort()).toEqual(['m:1', 'm:2'])
    expect(await readdir(s.dir)).toEqual(['notebook.json'])
  })

  it('un archivo dañado se aparta a corrupt/ y la app sigue; si parece a medio sincronizar, se deja', async () => {
    const s = new LearningStore(dir)
    await s.init()
    const f = path.join(s.dir, 'plan.json')
    await writeFile(f, '{"config":')
    // Recién modificado: se considera sincronizándose.
    let r = await s.read('plan')
    expect(r.pending).toBe(true)
    expect(r.doc.config).toBeNull()
    const old = new Date(Date.now() - 60 * 60 * 1000)
    await utimes(f, old, old)
    r = await s.read('plan')
    expect(r.corrupt).toEqual(['plan.json'])
    expect((await readdir(path.join(dir, 'corrupt'))).length).toBe(1)
  })

  it('rechaza documentos no válidos', async () => {
    const s = new LearningStore(dir)
    await s.init()
    await expect(s.save('nope' as 'game', {})).rejects.toThrow()
    await expect(s.save('game', [] as unknown as object)).rejects.toThrow()
  })
})

describe('migración desde 1.9.2', () => {
  async function legacyData() {
    await mkdir(path.join(dir, 'attempts'), { recursive: true })
    await mkdir(path.join(dir, 'practice', 'progress'), { recursive: true })
    await mkdir(path.join(dir, 'files', 'exam_x'), { recursive: true })
    await writeFile(path.join(dir, 'settings.json'), JSON.stringify({ schemaVersion: 1, theme: 'dark', userName: 'Ana' }))
    await writeFile(path.join(dir, 'attempts', 'attempt_aaaaaaaa.json'), JSON.stringify({ id: 'attempt_aaaaaaaa' }))
    await writeFile(path.join(dir, 'practice', 'progress', 'fce_hoja01.json'), JSON.stringify({ id: 'fce_hoja01', answers: {}, checked: true, times: 1 }))
    await writeFile(path.join(dir, 'files', 'exam_x', 'big.pdf'), 'pdf')
  }

  it('hace copia de seguridad verificable, no toca los archivos existentes y es idempotente', async () => {
    await legacyData()
    const before = await readFile(path.join(dir, 'settings.json'), 'utf8')
    const s = new LearningStore(dir)
    const meta = await s.migrate('2.0.0', new Date('2026-11-26T10:00:00Z'))
    expect(meta.dataVersion).toBe(2)
    expect(meta.backupFiles).toBe(3)
    expect(meta.backup).toMatch(/^backups\/pre-2\.0\.0-/)
    const backupDir = path.join(dir, meta.backup!)
    expect(await readFile(path.join(backupDir, 'settings.json'), 'utf8')).toBe(before)
    expect(JSON.parse(await readFile(path.join(backupDir, 'attempts', 'attempt_aaaaaaaa.json'), 'utf8')).id).toBe('attempt_aaaaaaaa')
    // Los PDF/audio no se copian (la migración no los toca).
    await expect(readFile(path.join(backupDir, 'files', 'exam_x', 'big.pdf'))).rejects.toBeTruthy()
    expect(await readFile(path.join(dir, 'settings.json'), 'utf8')).toBe(before)
    // Segunda vez: no hace otra copia.
    const again = await s.migrate('2.0.1', new Date('2026-11-27T10:00:00Z'))
    expect(again.migratedAt).toBe(meta.migratedAt)
    expect((await readdir(path.join(dir, 'backups'))).length).toBe(1)
  })

  it('instalación nueva: sin copia (no hay nada que copiar)', async () => {
    const meta = await new LearningStore(dir).migrate('2.0.0')
    expect(meta.backup).toBeNull()
    expect(meta.backupFiles).toBe(0)
  })

  it('ajustes de 1.9.2 se leen con los valores nuevos por defecto', () => {
    const s = mergeSettings({ theme: 'dark', userName: 'Ana', mascot: false } as never)
    expect(s.theme).toBe('dark')
    expect(s.appearance).toEqual({ accent: 'indigo', density: 'comfortable', motion: 'full' })
    expect(s.gamification).toBe(true)
    expect(s.dashboard.order.length).toBeGreaterThan(5)
    expect(mergeSettings({ theme: 'oled', appearance: { accent: 'teal', density: 'compact', motion: 'none' }, dashboard: { order: ['goal', 'bogus'], hidden: ['quick'] } } as never)).toMatchObject({ theme: 'oled', appearance: { accent: 'teal', density: 'compact', motion: 'none' }, dashboard: { hidden: ['quick'] } })
    expect(mergeSettings({ theme: 'neon' } as never).theme).toBe('system')
    expect(nativeThemeOf('midnight')).toBe('dark')
  })
})
