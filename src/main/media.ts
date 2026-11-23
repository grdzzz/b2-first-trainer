// Protocolo interno `b2ft-media://` para reproducir vídeos y audios importados sin cargarlos enteros en memoria.
// Sirve el archivo a trozos (cabecera Range), que es lo que necesita el reproductor para saltar a cualquier minuto.
import { protocol } from 'electron'
import { createReadStream, promises as fs } from 'node:fs'
import { Readable } from 'node:stream'
import type { DataStore } from './storage'
import { mimeFor } from './storage'

export const MEDIA_SCHEME = 'b2ft-media'

export const mediaSchemePrivileges: Electron.CustomScheme = {
  scheme: MEDIA_SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
}

/** Interpreta una cabecera Range («bytes=inicio-fin»). null si no hay o no es válida. */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header || size <= 0) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m || (m[1] === '' && m[2] === '')) return null
  let start: number
  let end: number
  if (m[1] === '') {
    // «bytes=-500»: los últimos 500 bytes.
    const n = Number(m[2])
    start = Math.max(0, size - n)
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1)
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null
  return { start, end }
}

/** Atiende b2ft-media://exam/<examId>/<archivo>. Solo archivos importados de los exámenes. */
export function handleMediaProtocol(store: DataStore): void {
  protocol.handle(MEDIA_SCHEME, async (request) => {
    try {
      const url = new URL(request.url)
      if (url.hostname !== 'exam') return new Response('Not found', { status: 404 })
      const [examId, name] = decodeURIComponent(url.pathname).replace(/^\/+/, '').split('/')
      const file = store.examFilePath(examId, name) // valida los nombres (sin rutas fuera de la carpeta)
      const { size } = await fs.stat(file)
      const type = mimeFor(file)
      const range = parseRange(request.headers.get('range'), size)
      if (request.headers.get('range') && !range) {
        return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } })
      }
      const start = range?.start ?? 0
      const end = range?.end ?? size - 1
      const body = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream
      return new Response(body, {
        status: range ? 206 : 200,
        headers: {
          'content-type': type,
          'content-length': String(end - start + 1),
          'accept-ranges': 'bytes',
          ...(range ? { 'content-range': `bytes ${start}-${end}/${size}` } : {})
        }
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
