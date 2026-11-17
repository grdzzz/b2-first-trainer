import { useEffect, useRef, useState } from 'react'
import { Circle, Mic, Square, Trash2 } from 'lucide-react'
import type { Recording } from '@shared/types'
import { formatDuration } from '@shared/stats'
import { AudioPlayer } from './AudioPlayer'
import { t } from '../i18n'

interface Props {
  attemptId: string
  questionId: string
  recording?: Recording
  onSaved(rec: Recording): void
  onRemoved(): void
  disabled?: boolean
}

function pickMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
  return candidates.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ?? ''
}

function micError(e: unknown): string {
  const name = (e as DOMException)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return t('recorder.denied')
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return t('recorder.noMic')
  if (name === 'NotReadableError') return t('recorder.busy')
  return t('recorder.failed', { error: (e as Error)?.message ?? String(e) })
}

export function Recorder({ attemptId, questionId, recording, onSaved, onRemoved, disabled }: Props) {
  const [state, setState] = useState<'idle' | 'starting' | 'recording' | 'saving'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const rec = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedAt = useRef(0)
  const raf = useRef(0)
  const audioCtx = useRef<AudioContext | null>(null)

  const cleanup = () => {
    cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach((tr) => tr.stop())
    stream.current = null
    void audioCtx.current?.close().catch(() => undefined)
    audioCtx.current = null
    setLevel(0)
  }

  useEffect(() => () => {
    if (rec.current && rec.current.state !== 'inactive') {
      rec.current.onstop = null
      rec.current.stop()
    }
    cleanup()
  }, [])

  useEffect(() => {
    if (state !== 'recording') return
    const id = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 250)
    return () => window.clearInterval(id)
  }, [state])

  const start = async () => {
    setError(null)
    setState('starting')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      stream.current = s
      const mime = pickMime()
      const r = new MediaRecorder(s, mime ? { mimeType: mime, audioBitsPerSecond: 96000 } : undefined)
      chunks.current = []
      r.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data)
      r.onstop = async () => {
        const durationSec = (Date.now() - startedAt.current) / 1000
        cleanup()
        setState('saving')
        try {
          const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })
          const bytes = new Uint8Array(await blob.arrayBuffer())
          const file = await window.api.saveRecording(attemptId, questionId, bytes, blob.type)
          const previous = recording?.file.storedName
          onSaved({ file, durationSec, createdAt: new Date().toISOString() })
          if (previous) void window.api.removeRecording(attemptId, previous).catch(() => undefined)
        } catch (e) {
          setError(t('recorder.saveFailed', { error: (e as Error).message }))
        } finally {
          setState('idle')
        }
      }
      // Medidor de nivel de entrada
      const ctx = new AudioContext()
      audioCtx.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      ctx.createMediaStreamSource(s).connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let peak = 0
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128))
        setLevel(Math.min(1, peak / 90))
        raf.current = requestAnimationFrame(tick)
      }
      tick()
      startedAt.current = Date.now()
      setElapsed(0)
      r.start(1000)
      rec.current = r
      setState('recording')
    } catch (e) {
      cleanup()
      setError(micError(e))
      setState('idle')
    }
  }

  const stop = () => {
    if (rec.current && rec.current.state !== 'inactive') rec.current.stop()
  }

  const remove = async () => {
    if (!recording) return
    await window.api.removeRecording(attemptId, recording.file.storedName).catch(() => undefined)
    onRemoved()
  }

  return (
    <div className="recorder">
      <div className="recorder-controls">
        {state === 'recording' ? (
          <button type="button" className="btn btn-danger" onClick={stop}>
            <Square size={16} aria-hidden /> {t('recorder.stop')}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={start} disabled={disabled || state !== 'idle'}>
            {recording ? <Circle size={16} aria-hidden /> : <Mic size={16} aria-hidden />}
            {state === 'starting' ? t('recorder.starting') : state === 'saving' ? t('recorder.saving') : recording ? t('recorder.again') : t('recorder.start')}
          </button>
        )}
        {state === 'recording' && (
          <div className="recorder-live" aria-live="polite">
            <span className="rec-dot" aria-hidden />
            <span className="tabular">{formatDuration(elapsed)}</span>
            <span className="rec-meter" aria-hidden>
              <span style={{ transform: `scaleX(${Math.max(0.03, level)})` }} />
            </span>
            <span className="sr-only">{t('recorder.recording')}</span>
          </div>
        )}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      {recording && state !== 'recording' && (
        <div className="recorder-take">
          <AudioPlayer
            compact
            sourceKey={recording.file.storedName}
            mime={recording.file.mime}
            knownDuration={recording.durationSec}
            load={() => window.api.readRecording(attemptId, recording.file.storedName)}
            title={t('recorder.yourRecording')}
          />
          <button type="button" className="icon-btn" onClick={remove} aria-label={t('recorder.delete')} title={t('recorder.delete')} disabled={disabled}>
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
