import { useEffect, useState } from 'react'
import { Download, FolderOpen, HardDriveDownload, Monitor, Moon, RefreshCw, Sun } from 'lucide-react'
import type { AppInfo } from '@shared/api'
import type { ThemePreference } from '@shared/types'
import { errorMessage, useApp } from '../lib/store'
import { formatDate, t } from '../i18n'
import { useUpdateStatus } from '../lib/updates'
import type { UpdateStatus } from '@shared/updates'

const THEMES: Array<{ id: ThemePreference; icon: typeof Sun }> = [
  { id: 'system', icon: Monitor },
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon }
]

export function SettingsScreen() {
  const { settings, updateSettings, notify } = useApp()
  const [info, setInfo] = useState<AppInfo | null>(null)
  useEffect(() => {
    window.api.getAppInfo().then(setInfo).catch(() => undefined)
  }, [])

  const backup = async () => {
    try {
      const path = await window.api.backupData()
      if (path) notify('success', t('settings.backupDone', { path }))
    } catch (e) {
      notify('error', t('settings.backupFailed', { error: errorMessage(e) }))
    }
  }

  return (
    <div className="page page-narrow">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t('settings.eyebrow')}</p>
          <h1 className="h1">{t('settings.title')}</h1>
        </div>
      </header>

      <section className="card settings-section" aria-labelledby="s-appearance">
        <h2 id="s-appearance" className="section-title">{t('settings.appearance')}</h2>
        <div className="setting">
          <div>
            <p className="setting-name" id="theme-label">{t('settings.theme')}</p>
            <p className="setting-desc">{t('settings.themeDesc')}</p>
          </div>
          <div className="segmented" role="radiogroup" aria-labelledby="theme-label">
            {THEMES.map(({ id, icon: Icon }) => (
              <button key={id} type="button" role="radio" aria-checked={settings.theme === id} className={`segmented-item${settings.theme === id ? ' is-selected' : ''}`} onClick={() => void updateSettings({ theme: id })}>
                <Icon size={15} aria-hidden /> {t(`settings.themes.${id}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="setting">
          <div>
            <label className="setting-name" htmlFor="font-scale">{t('settings.textSize')}</label>
            <p className="setting-desc">{t('settings.textSizeDesc')}</p>
          </div>
          <div className="range-field">
            <input id="font-scale" type="range" min={0.9} max={1.4} step={0.05} value={settings.fontScale} onChange={(e) => void updateSettings({ fontScale: Number(e.target.value) })} aria-valuetext={`${Math.round(settings.fontScale * 100)}%`} />
            <span className="tabular">{Math.round(settings.fontScale * 100)}%</span>
          </div>
        </div>
      </section>

      <section className="card settings-section" aria-labelledby="s-grading">
        <h2 id="s-grading" className="section-title">{t('settings.grading')}</h2>
        <p className="setting-desc">{t('settings.gradingDesc')}</p>
        {(['ignoreCase', 'ignoreExtraSpaces', 'ignoreAccents'] as const).map((k) => (
          <label key={k} className="setting setting-toggle">
            <div>
              <span className="setting-name">{t(`settings.${k}`)}</span>
              <span className="setting-desc">{t(`settings.${k}Desc`)}</span>
            </div>
            <input type="checkbox" className="toggle" checked={settings.grading[k]} onChange={(e) => void updateSettings({ grading: { ...settings.grading, [k]: e.target.checked } })} />
          </label>
        ))}
        <p className="text-subtle text-sm">{t('settings.gradingNote')}</p>
      </section>

      <section className="card settings-section" aria-labelledby="s-data">
        <h2 id="s-data" className="section-title">{t('settings.data')}</h2>
        <div className="setting">
          <div>
            <label className="setting-name" htmlFor="autosave">{t('settings.autosave')}</label>
            <p className="setting-desc">{t('settings.autosaveDesc')}</p>
          </div>
          <select id="autosave" className="input input-sm" value={settings.autosaveSeconds} onChange={(e) => void updateSettings({ autosaveSeconds: Number(e.target.value) })}>
            {[2, 3, 5, 10, 30].map((s) => <option key={s} value={s}>{t('settings.seconds', { n: s })}</option>)}
          </select>
        </div>
        <div className="setting">
          <div>
            <p className="setting-name">{t('settings.folder')}</p>
            <p className="setting-desc path">{info?.dataPath ?? '…'}</p>
          </div>
          <div className="row-gap">
            <button type="button" className="btn btn-secondary" onClick={() => window.api.openDataFolder().catch((e) => notify('error', errorMessage(e)))}>
              <FolderOpen size={16} aria-hidden /> {t('settings.openFolder')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={backup}>
              <HardDriveDownload size={16} aria-hidden /> {t('settings.backup')}
            </button>
          </div>
        </div>
        <p className="text-subtle text-sm">{t('settings.restoreHint')}</p>
      </section>

      <UpdatesSection version={info?.version} />

      {info && <p className="text-subtle text-sm about">{t('settings.about', { version: info.version, electron: info.electron })}</p>}
    </div>
  )
}

function statusText(s: UpdateStatus): string {
  switch (s.state) {
    case 'checking':
      return t('updates.checking')
    case 'up-to-date':
      return t('updates.upToDate', { date: formatDate(s.checkedAt, { timeStyle: 'short' }) })
    case 'downloading':
      return t('updates.downloading', { version: s.version, percent: s.percent })
    case 'ready':
      return t('updates.ready', { version: s.version })
    case 'available-manual':
      return t('updates.availableManual', { version: s.version })
    case 'error':
      return t('updates.error', { error: s.message })
    case 'unsupported':
      return t('updates.dev')
    default:
      return t('updates.idle')
  }
}

function UpdatesSection({ version }: { version?: string }) {
  const { settings, updateSettings } = useApp()
  const status = useUpdateStatus()
  return (
    <section className="card settings-section" aria-labelledby="s-updates">
      <h2 id="s-updates" className="section-title">{t('updates.title')}</h2>
      <div className="setting">
        <div>
          <p className="setting-name">{t('updates.version', { version: version ?? '…' })}</p>
          <p className="setting-desc" aria-live="polite">{statusText(status)}</p>
        </div>
        <div className="row-gap">
          {status.state === 'ready' ? (
            <button type="button" className="btn btn-primary" onClick={() => void window.api.installUpdate()}>
              <RefreshCw size={16} aria-hidden /> {t('updates.restart')}
            </button>
          ) : status.state === 'available-manual' ? (
            <button type="button" className="btn btn-primary" onClick={() => void window.api.openDownloadPage()}>
              <Download size={16} aria-hidden /> {t('updates.download')}
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" disabled={status.state === 'checking' || status.state === 'downloading'} onClick={() => void window.api.checkForUpdates()}>
              <RefreshCw size={16} aria-hidden /> {t('updates.checkNow')}
            </button>
          )}
        </div>
      </div>
      <label className="setting setting-toggle">
        <div>
          <span className="setting-name">{t('updates.auto')}</span>
          <span className="setting-desc">{t('updates.autoDesc')}</span>
        </div>
        <input type="checkbox" className="toggle" checked={settings.checkUpdates} onChange={(e) => void updateSettings({ checkUpdates: e.target.checked })} />
      </label>
      <p className="text-subtle text-sm">{t('updates.portableNote')}</p>
    </section>
  )
}
