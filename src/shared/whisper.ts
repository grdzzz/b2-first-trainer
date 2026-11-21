// Datos compartidos de la transcripción local con Whisper.
export const WHISPER_MODEL_ID = 'whisper-base.en'
export const WHISPER_SAMPLE_RATE = 16000

export interface WhisperStatus {
  installed: boolean
  sizeBytes: number
}

/** Limpia la salida de Whisper: espacios, marcas de no-habla y repeticiones típicas en silencios. */
export function cleanTranscript(raw: string): string {
  return raw
    .replace(/\[(?:BLANK_AUDIO|MUSIC|NOISE|SILENCE|inaudible)[^\]]*\]/gi, ' ')
    .replace(/\((?:music|silence|inaudible|laughs?)\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim()
}

/**
 * Huella SHA-256 del manifest.json publicado en la release `whisper-base-en-v1`.
 * El manifiesto lleva a su vez la huella de cada archivo del modelo: así todo lo descargado queda
 * atado a lo que trae la app, no solo a lo que haya en GitHub en ese momento.
 */
export const WHISPER_MANIFEST_SHA256 = '6cc5ef2ae4049ae4e84b68c6d51d521835aa3d28f5b0167a5240141e29fd318c'
