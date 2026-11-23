// Transcripción local (Whisper): descarga única y verificada del modelo, y protocolo interno
// `b2ft-asset://` para que la interfaz lea el modelo y el motor .wasm sin internet.
import { app, net, protocol } from 'electron'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { WhisperStatus } from '../shared/whisper'
import { WHISPER_MODEL_ID, WHISPER_MANIFEST_SHA256 } from '../shared/whisper'
import { testOverrideUrl } from '../shared/updates'

const TEST_URL = testOverrideUrl(process.env.B2FT_WHISPER_URL, app.isPackaged)
const MODEL_BASE_URL = TEST_URL || 'https://github.com/grdzzz/b2-first-trainer/releases/download/whisper-base-en-v1'

interface ManifestFile {
  asset: string
  path: string
  size: number
  sha256: string
}

const SCHEME = 'b2ft-asset'

/** Debe llamarse antes de `app.whenReady()`. */
/** Registra los protocolos internos. Solo se puede llamar una vez: por eso recibe también los de otros módulos. */
export function registerAssetScheme(extra: Electron.CustomScheme[] = []): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
    ...extra
  ])
}

function modelsRoot(): string {
  return path.join(app.getPath('userData'), 'models')
}

function modelDir(): string {
  return path.join(modelsRoot(), WHISPER_MODEL_ID)
}

function ortDir(): string {
  return app.isPackaged ? path.join(process.resourcesPath, 'ort') : path.join(app.getAppPath(), 'node_modules', 'onnxruntime-web', 'dist')
}

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.onnx': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.mjs': 'text/javascript'
}

/** Resuelve una ruta dentro de `base` sin permitir salir de ella. */
function safeJoin(base: string, rel: string): string | null {
  const target = path.resolve(base, rel)
  return target.startsWith(path.resolve(base) + path.sep) ? target : null
}

export function handleAssetProtocol(): void {
  protocol.handle(SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      const base = url.hostname === 'models' ? modelsRoot() : url.hostname === 'ort' ? ortDir() : null
      const file = base ? safeJoin(base, rel) : null
      if (!file) return new Response('Not found', { status: 404 })
      const data = await fs.readFile(file)
      return new Response(data, {
        headers: { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'access-control-allow-origin': '*' }
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

let downloading: Promise<WhisperStatus> | null = null

export async function whisperStatus(): Promise<WhisperStatus> {
  try {
    const info = JSON.parse(await fs.readFile(path.join(modelDir(), 'installed.json'), 'utf8')) as { size: number }
    return { installed: true, sizeBytes: info.size }
  } catch {
    return { installed: false, sizeBytes: 0 }
  }
}

async function fetchOk(url: string): Promise<Response> {
  const res = await net.fetch(url, { cache: 'no-store' })
  if (!res.ok || !res.body) throw new Error(`Error ${res.status} al descargar ${path.basename(new URL(url).pathname)}.`)
  return res
}

/** Descarga el modelo una vez, verificando tamaño y SHA-256 de cada archivo. */
export function downloadWhisper(onProgress: (received: number, total: number) => void): Promise<WhisperStatus> {
  if (downloading) return downloading
  downloading = (async () => {
    const manifestBytes = new Uint8Array(await (await fetchOk(`${MODEL_BASE_URL}/manifest.json`)).arrayBuffer())
    const manifestText = new TextDecoder().decode(manifestBytes)
    // Con la dirección oficial, el manifiesto debe ser exactamente el que conoce la app (huella de los bytes).
    if (!TEST_URL && createHash('sha256').update(manifestBytes).digest('hex') !== WHISPER_MANIFEST_SHA256) {
      throw new Error('El manifiesto del modelo no coincide con el esperado. No se ha descargado nada.')
    }
    const manifest = JSON.parse(manifestText) as { files: ManifestFile[] }
    if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error('El manifiesto del modelo no es válido.')
    const total = manifest.files.reduce((a, f) => a + f.size, 0)
    const tmp = path.join(modelsRoot(), `.${WHISPER_MODEL_ID}.download`)
    await fs.rm(tmp, { recursive: true, force: true })
    let received = 0
    onProgress(0, total)
    try {
      for (const f of manifest.files) {
        const dest = safeJoin(tmp, f.path)
        if (!dest || !/^[A-Za-z0-9_.-]+$/.test(f.asset)) throw new Error('Ruta no válida en el manifiesto del modelo.')
        await fs.mkdir(path.dirname(dest), { recursive: true })
        const res = await fetchOk(`${MODEL_BASE_URL}/${f.asset}`)
        const hash = createHash('sha256')
        const handle = await fs.open(dest, 'w')
        try {
          const reader = res.body!.getReader()
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            hash.update(value)
            await handle.write(value)
            received += value.byteLength
            onProgress(received, total)
          }
        } finally {
          await handle.close()
        }
        const stat = await fs.stat(dest)
        if (stat.size !== f.size || hash.digest('hex') !== f.sha256) throw new Error(`El archivo ${f.asset} se ha descargado incompleto o dañado. Vuelve a intentarlo.`)
      }
      await fs.writeFile(path.join(tmp, 'installed.json'), JSON.stringify({ size: total, installedAt: new Date().toISOString() }))
      await fs.rm(modelDir(), { recursive: true, force: true })
      await fs.rename(tmp, modelDir())
      return { installed: true, sizeBytes: total }
    } catch (e) {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => undefined)
      throw e
    }
  })().finally(() => {
    downloading = null
  })
  return downloading
}

export async function removeWhisper(): Promise<void> {
  await fs.rm(modelDir(), { recursive: true, force: true })
}
