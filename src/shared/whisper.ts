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
