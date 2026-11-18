import { useState } from 'react'
import { Download, RefreshCw, Sparkles } from 'lucide-react'
import { useUpdateStatus } from '../lib/updates'
import { t } from '../i18n'

/** Aviso discreto en la barra lateral cuando hay una versión nueva. */
export function UpdateBanner() {
  const status = useUpdateStatus()
  const [busy, setBusy] = useState(false)
  if (status.state === 'downloading') {
    return (
      <div className="update-banner" role="status">
        <Download size={16} aria-hidden />
        <span>{t('updates.downloading', { version: status.version, percent: status.percent })}</span>
        <div className="meter" aria-hidden><span style={{ width: `${status.percent}%` }} /></div>
      </div>
    )
  }
  if (status.state === 'ready') {
    return (
      <div className="update-banner is-ready" role="status">
        <Sparkles size={16} aria-hidden />
        <span>{t('updates.ready', { version: status.version })}</span>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void window.api.installUpdate().catch(() => setBusy(false))
          }}
        >
          <RefreshCw size={15} aria-hidden /> {t('updates.restart')}
        </button>
      </div>
    )
  }
  if (status.state === 'available-manual') {
    return (
      <div className="update-banner is-ready" role="status">
        <Sparkles size={16} aria-hidden />
        <span>{t('updates.availableManual', { version: status.version })}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => void window.api.openDownloadPage()}>
          <Download size={15} aria-hidden /> {t('updates.download')}
        </button>
      </div>
    )
  }
  return null
}
