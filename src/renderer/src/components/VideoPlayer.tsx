import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Film } from 'lucide-react'
import type { FileRef } from '@shared/types'
import { t } from '../i18n'

/** ¿El archivo importado es un vídeo? (los .webm pueden ser solo audio: el reproductor lo detecta). */
export function isVideoFile(ref: FileRef | undefined): boolean {
  return !!ref && ref.mime.startsWith('video/')
}

/** Dirección interna del archivo: se sirve a trozos, sin cargarlo entero en memoria. */
export function mediaUrl(examId: string, storedName: string): string {
  return `b2ft-media://exam/${encodeURIComponent(examId)}/${encodeURIComponent(storedName)}`
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

const RATES = [0.75, 1, 1.25]

/** Reproductor de vídeo grande, con controles del sistema y los mismos atajos que el de audio. */
export function VideoPlayer({ src, title, shortcuts, large }: { src: string; title: string; shortcuts?: boolean; large?: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [audioOnly, setAudioOnly] = useState(false)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    if (!shortcuts) return
    const onKey = (e: KeyboardEvent) => {
      const v = video.current
      if (!v || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      // Si el foco está en el propio vídeo, sus controles ya responden al teclado.
      if (e.target === v) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (v.paused) void v.play().catch((err: Error) => setError(err.message))
        else v.pause()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const max = Number.isFinite(v.duration) ? v.duration : Infinity
        v.currentTime = Math.max(0, Math.min(max, v.currentTime + (e.key === 'ArrowLeft' ? -5 : 5)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts])

  useEffect(() => {
    if (video.current) video.current.playbackRate = rate
  }, [rate])

  return (
    <div className={`video-player${large ? ' is-large' : ''}${audioOnly ? ' is-audio-only' : ''}`}>
      <div className="video-bar">
        <Film size={15} aria-hidden />
        <span className="video-title" title={title}>{title}</span>
        <span className="spacer" />
        <label className="inline-field text-sm">
          <span className="text-subtle">{t('video.speed')}</span>
          <select className="input input-sm" value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
          </select>
        </label>
      </div>
      {error ? (
        <div className="video-error" role="alert">
          <AlertTriangle size={20} aria-hidden />
          <p>{t('video.error')}</p>
          <p className="text-subtle text-sm">{error}</p>
        </div>
      ) : (
        <video
          ref={video}
          src={src}
          controls
          preload="metadata"
          aria-label={title}
          onLoadedMetadata={(e) => setAudioOnly(e.currentTarget.videoWidth === 0)}
          onError={(e) => {
            const code = e.currentTarget.error?.code
            setError(code === 4 ? t('video.unsupported') : (e.currentTarget.error?.message || t('video.loadFailed')))
          }}
        />
      )}
      {shortcuts && !error && <p className="video-hint text-subtle text-sm">{t('video.shortcuts')}</p>}
    </div>
  )
}
