import { describe, expect, it } from 'vitest'
import { compareVersions, versionFromLatestYml } from '@shared/updates'

describe('actualizaciones', () => {
  it('compara versiones', () => {
    expect(compareVersions('1.1.0', '1.0.9')).toBeGreaterThan(0)
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('1.0.0', '1.0.10')).toBeLessThan(0)
    expect(compareVersions('2.0', '1.9.9')).toBeGreaterThan(0)
    expect(compareVersions('1.2.0-beta', '1.2.0')).toBe(0)
  })
  it('lee la versión de latest.yml', () => {
    const yml = "version: 1.1.0\nfiles:\n  - url: B2-First-Trainer-1.1.0-setup.exe\n    sha512: abc\npath: B2-First-Trainer-1.1.0-setup.exe\nreleaseDate: '2026-11-18T10:00:00.000Z'\n"
    expect(versionFromLatestYml(yml)).toBe('1.1.0')
    expect(versionFromLatestYml("version: '2.0.1'")).toBe('2.0.1')
    expect(versionFromLatestYml('nada')).toBeUndefined()
  })
})
