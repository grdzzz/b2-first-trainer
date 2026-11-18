// Worker de transcripción: ejecuta Whisper (transformers.js + ONNX Runtime en WebAssembly) fuera del hilo de la interfaz.
// Todo se lee del protocolo interno b2ft-asset:// — no hay ninguna petición a internet.
import { env, pipeline } from '@huggingface/transformers'
import { WHISPER_MODEL_ID } from '@shared/whisper'

env.allowRemoteModels = false
env.allowLocalModels = true
env.localModelPath = 'b2ft-asset://models/'
env.useBrowserCache = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wasm = (env.backends.onnx as any).wasm
wasm.wasmPaths = 'b2ft-asset://ort/'
wasm.numThreads = 1
wasm.proxy = false

type Transcriber = (audio: Float32Array, opts: Record<string, unknown>) => Promise<{ text: string } | Array<{ text: string }>>
let asr: Promise<Transcriber> | null = null

self.onmessage = async (e: MessageEvent<{ id: number; audio: Float32Array }>) => {
  const { id, audio } = e.data
  try {
    asr ??= pipeline('automatic-speech-recognition', WHISPER_MODEL_ID, { dtype: 'q8', device: 'wasm' }) as unknown as Promise<Transcriber>
    const run = await asr
    const out = await run(audio, { chunk_length_s: 30, stride_length_s: 5 })
    const text = Array.isArray(out) ? out.map((o) => o.text).join(' ') : out.text
    self.postMessage({ id, text })
  } catch (err) {
    asr = null
    self.postMessage({ id, error: (err as Error)?.message ?? String(err) })
  }
}
