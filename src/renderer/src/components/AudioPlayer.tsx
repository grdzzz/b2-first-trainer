import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react'
import { formatDuration } from '@shared/stats'
import { t } from '../i18n'

interface Props {
  load: () => Promise<Uint8Array>
  sourceKey: string
  mime: string
  title?: string
  /** Activa atajos globales (espacio, flechas). */
  shortcuts?: boolean
  /** Duración conocida (las grabaciones webm no la incluyen). */
  knownDuration?: number
  compact?: boolean
}

const SPEEDS = [0.75, 0.9, 1, 1.1, 1.25, 1.5]

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function AudioPlayer({ load, sourceKey, mime, title, shortcuts = false, knownDuration, compact }: Props) {
  const audio = useRef<HTMLAudioElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(knownDuration ?? 0)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    let created: string | null = null
    let cancelled = false
    setUrl(null)
    setError(null)
    setPlaying(false)
    setTime(0)
    load()
      .then((bytes) => {
        if (cancelled) return
        created = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }))
        setUrl(created)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey])

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed
  }, [speed, url])

  const toggle = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) void a.play().catch((e: Error) => setError(e.message))
    else a.pause()
  }
  const seekBy = (delta: number) => {
    const a = audio.current
    if (!a) return
    const max = Number.isFinite(a.duration) ? a.duration : duration || Infinity
    a.currentTime = Math.max(0, Math.min(max, a.currentTime + delta))
  }

  useEffect(() => {
    if (!shortcuts) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      if (e.code === 'Space') {
        e.preventDefault()
        toggle()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        seekBy(-5)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        seekBy(5)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onMeta = () => {
    const a = audio.current
    if (!a) return
    if (Number.isFinite(a.duration)) setDuration(a.duration)
    else {
      // Truco para que Chromium calcule la duración de archivos webm sin cabecera de duración.
      const fix = () => {
        a.removeEventListener('timeupdate', fix)
        if (Number.isFinite(a.duration)) setDuration(a.duration)
        a.currentTime = 0
      }
      a.addEventListener('timeupdate', fix)
      a.currentTime = 1e7
    }
  }

  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0

  return (
    <div className={`player${compact ? ' player-compact' : ''}${!url && !error ? ' is-loading' : ''}`} role="group" aria-label={title ?? t('player.label')} aria-busy={!url && !error}>
      {url && (
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onLoadedMetadata={onMeta}
          onDurationChange={() => audio.current && Number.isFinite(audio.current.duration) && setDuration(audio.current.duration)}
          onTimeUpdate={() => setTime(audio.current?.currentTime ?? 0)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setError(t('player.error'))}
        />
      )}
      {!compact && title && <div className="player-title">{title}</div>}
      <div className="player-row">
        <button type="button" className="icon-btn" onClick={() => seekBy(-5)} disabled={!url} aria-label={t('player.back')} title={t('player.back')}>
          <RotateCcw size={18} aria-hidden />
        </button>
        <button type="button" className="player-play" onClick={toggle} disabled={!url} aria-label={playing ? t('player.pause') : t('player.play')}>
          {playing ? <Pause size={20} aria-hidden /> : <Play size={20} aria-hidden />}
        </button>
        <button type="button" className="icon-btn" onClick={() => seekBy(5)} disabled={!url} aria-label={t('player.forward')} title={t('player.forward')}>
          <RotateCw size={18} aria-hidden />
        </button>
        <div className="player-track">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            onChange={(e) => {
              if (audio.current) audio.current.currentTime = Number(e.target.value)
            }}
            disabled={!url || !duration}
            aria-label={t('player.position')}
            aria-valuetext={`${formatDuration(time)} / ${formatDuration(duration)}`}
            style={{ ['--pct' as string]: `${pct}%` }}
          />
          <span className="player-time tabular">
            {formatDuration(time)} / {duration ? formatDuration(duration) : '–:––'}
          </span>
        </div>
        {!compact && (
          <label className="player-speed">
            <span className="sr-only">{t('player.speed')}</span>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} disabled={!url}>
              {SPEEDS.map((s) => (
                <option key={s} value={s}>{s}×</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      {shortcuts && !compact && <p className="player-hint">{t('player.shortcuts')}</p>}
    </div>
  )
}
