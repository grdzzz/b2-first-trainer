import { useEffect, useState } from 'react'
import { AudioLines, Download, Loader2 } from 'lucide-react'
import { formatNumber, t } from '../i18n'

interface Props {
  load: () => Promise<Uint8Array>
  onText(text: string): void
  hasText: boolean
  disabled?: boolean
}

type State = { s: 'idle' } | { s: 'need-model' } | { s: 'downloading'; pct: number } | { s: 'transcribing' } | { s: 'error'; message: string }

/** Transcribe una grabación con Whisper en local. La primera vez ofrece descargar el modelo. */
export function TranscribeButton({ load, onText, hasText, disabled }: Props) {
  const [state, setState] = useState<State>({ s: 'idle' })

  useEffect(() => {
    if (state.s !== 'downloading') return
    return window.api.onWhisperProgress(({ received, total }) => setState({ s: 'downloading', pct: total ? Math.round((received / total) * 100) : 0 }))
  }, [state.s])

  const transcribe = async () => {
    setState({ s: 'transcribing' })
    try {
      const { transcribeAudio } = await import('../lib/whisper')
      const text = await transcribeAudio(await load())
      if (!text) throw new Error(t('transcribe.empty'))
      onText(text)
      setState({ s: 'idle' })
    } catch (e) {
      setState({ s: 'error', message: (e as Error).message })
    }
  }

  const start = async () => {
    try {
      const status = await window.api.whisperStatus()
      if (status.installed) await transcribe()
      else setState({ s: 'need-model' })
    } catch (e) {
      setState({ s: 'error', message: (e as Error).message })
    }
  }

  const download = async () => {
    setState({ s: 'downloading', pct: 0 })
    try {
      await window.api.downloadWhisper()
      await transcribe()
    } catch (e) {
      setState({ s: 'error', message: t('transcribe.downloadFailed', { error: (e as Error).message }) })
    }
  }

  return (
    <div className="transcribe">
      {state.s === 'need-model' ? (
        <div className="transcribe-model" role="group" aria-label={t('transcribe.modelTitle')}>
          <p className="text-sm">{t('transcribe.modelText')}</p>
          <div className="row-gap">
            <button type="button" className="btn btn-primary btn-sm" onClick={download}>
              <Download size={15} aria-hidden /> {t('transcribe.download')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState({ s: 'idle' })}>{t('common.cancel')}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-secondary btn-sm" onClick={start} disabled={disabled || state.s === 'downloading' || state.s === 'transcribing'}>
          {state.s === 'downloading' || state.s === 'transcribing' ? <Loader2 size={15} className="spin" aria-hidden /> : <AudioLines size={15} aria-hidden />}
          {state.s === 'downloading'
            ? t('transcribe.downloading', { pct: formatNumber(state.pct) })
            : state.s === 'transcribing'
              ? t('transcribe.working')
              : hasText
                ? t('transcribe.again')
                : t('transcribe.button')}
        </button>
      )}
      {state.s === 'error' && <p className="field-error" role="alert">{state.message}</p>}
    </div>
  )
}
