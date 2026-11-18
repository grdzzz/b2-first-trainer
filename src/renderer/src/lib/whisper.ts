// Transcripción local de grabaciones de Speaking.
import WhisperWorker from './whisper.worker?worker&inline'
import { cleanTranscript, WHISPER_SAMPLE_RATE } from '@shared/whisper'

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve(text: string): void; reject(e: Error): void }>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new WhisperWorker()
  worker.onmessage = (e: MessageEvent<{ id: number; text?: string; error?: string }>) => {
    const p = pending.get(e.data.id)
    if (!p) return
    pending.delete(e.data.id)
    if (e.data.error !== undefined) p.reject(new Error(e.data.error))
    else p.resolve(e.data.text ?? '')
  }
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'Error en el motor de transcripción.'))
    pending.clear()
    worker?.terminate()
    worker = null
  }
  return worker
}

/** Decodifica cualquier audio que entienda Chromium (webm/opus, mp3, wav…) a mono 16 kHz. */
export async function decodeToMono16k(bytes: Uint8Array): Promise<Float32Array> {
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(bytes.slice().buffer)
    const frames = Math.max(1, Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE))
    const offline = new OfflineAudioContext(1, frames, WHISPER_SAMPLE_RATE)
    const src = offline.createBufferSource()
    src.buffer = decoded
    src.connect(offline.destination)
    src.start()
    const rendered = await offline.startRendering()
    return rendered.getChannelData(0)
  } finally {
    void ctx.close()
  }
}

export async function transcribeAudio(bytes: Uint8Array): Promise<string> {
  const audio = await decodeToMono16k(bytes)
  if (audio.length < WHISPER_SAMPLE_RATE / 2) throw new Error('La grabación es demasiado corta para transcribirla.')
  const id = ++seq
  const text = await new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, audio }, [audio.buffer])
  })
  return cleanTranscript(text)
}
