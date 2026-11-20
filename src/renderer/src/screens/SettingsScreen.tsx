import { useCallback, useEffect, useState } from 'react'
import { BookOpenCheck, Cloud, Compass, Download, FolderOpen, FolderSync, HardDriveDownload, Monitor, Moon, RefreshCw, Sun } from 'lucide-react'
import type { DataLocation } from '@shared/api'
import { Modal } from '../components/Modal'
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

      <ProfileSection />

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

      <SyncSection />

      <TranscriptionSection />

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

function TranscriptionSection() {
  const { notify } = useApp()
  const [status, setStatus] = useState<{ installed: boolean; sizeBytes: number } | null>(null)
  const refresh = useCallback(() => {
    window.api.whisperStatus().then(setStatus).catch(() => setStatus(null))
  }, [])
  useEffect(refresh, [refresh])
  return (
    <section className="card settings-section" aria-labelledby="s-transcription">
      <h2 id="s-transcription" className="section-title">{t('settings.transcription')}</h2>
      <div className="setting">
        <div>
          <p className="setting-name">{t('settings.whisperModel')}</p>
          <p className="setting-desc">
            {status === null ? '…' : status.installed ? t('settings.whisperInstalled', { mb: Math.round(status.sizeBytes / 1e6) }) : t('settings.whisperMissing')}
          </p>
        </div>
        {status?.installed && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              try {
                await window.api.removeWhisper()
                refresh()
              } catch (e) {
                notify('error', errorMessage(e))
              }
            }}
          >
            {t('settings.whisperRemove')}
          </button>
        )}
      </div>
    </section>
  )
}

function ProfileSection() {
  const { settings, updateSettings, exams, createExample, navigate, setTourStep, notify } = useApp()
  const [name, setName] = useState(settings.userName)
  useEffect(() => setName(settings.userName), [settings.userName])
  const hasExample = exams.some((e) => e.isExample)
  return (
    <section className="card settings-section" aria-labelledby="s-profile">
      <h2 id="s-profile" className="section-title">{t('settings.profile')}</h2>
      <div className="setting">
        <div>
          <label className="setting-name" htmlFor="user-name">{t('settings.name')}</label>
          <p className="setting-desc">{t('settings.nameDesc')}</p>
        </div>
        <input
          id="user-name"
          className="input name-input"
          value={name}
          maxLength={40}
          placeholder={t('onboarding.namePlaceholder')}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== settings.userName && void updateSettings({ userName: name.replace(/\s+/g, ' ').trim() })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <div className="setting">
        <div>
          <p className="setting-name">{t('settings.help')}</p>
          <p className="setting-desc">{t('settings.helpDesc')}</p>
        </div>
        <div className="row-gap">
          <button type="button" className="btn btn-secondary" onClick={() => setTourStep(0)}>
            <Compass size={16} aria-hidden /> {t('settings.tour')}
          </button>
          {!hasExample && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const exam = await createExample()
                  notify('success', t('settings.exampleAdded'))
                  navigate({ name: 'exam', examId: exam.id })
                } catch (e) {
                  notify('error', errorMessage(e))
                }
              }}
            >
              <BookOpenCheck size={16} aria-hidden /> {t('settings.addExample')}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

type SyncDialog = { kind: 'use' | 'move'; target: string } | { kind: 'reset' } | null

function SyncSection() {
  const { notify } = useApp()
  const [loc, setLoc] = useState<DataLocation | null>(null)
  const [dialog, setDialog] = useState<SyncDialog>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    window.api.getDataLocation().then(setLoc).catch(() => undefined)
  }, [])

  const choose = async () => {
    try {
      const res = await window.api.chooseDataFolder()
      if (!res) return
      if (loc && res.target === loc.path) {
        notify('info', t('sync.sameFolder'))
        return
      }
      setDialog({ kind: res.hasData ? 'use' : 'move', target: res.target })
    } catch (e) {
      notify('error', errorMessage(e))
    }
  }
  const apply = async () => {
    if (!dialog) return
    setBusy(true)
    try {
      if (dialog.kind === 'reset') await window.api.resetDataFolder()
      else await window.api.applyDataFolder(dialog.target, dialog.kind)
      // La app se reinicia sola.
    } catch (e) {
      setBusy(false)
      setDialog(null)
      notify('error', t('sync.failed', { error: errorMessage(e) }))
    }
  }

  return (
    <section className="card settings-section" aria-labelledby="s-sync-title" id="s-sync">
      <h2 id="s-sync-title" className="section-title">{t('sync.title')}</h2>
      <p className="setting-desc">{t('sync.intro')}</p>
      <div className="setting">
        <div>
          <p className="setting-name">{loc?.isDefault ? t('sync.local') : t('sync.custom')}</p>
          <p className="setting-desc path">{loc?.path ?? '…'}</p>
        </div>
        <div className="row-gap">
          <button type="button" className="btn btn-primary" onClick={choose}>
            <FolderSync size={16} aria-hidden /> {t('sync.choose')}
          </button>
          {loc && !loc.isDefault && (
            <button type="button" className="btn btn-ghost" onClick={() => setDialog({ kind: 'reset' })}>{t('sync.backLocal')}</button>
          )}
        </div>
      </div>
      <ol className="sync-steps">
        <li><Cloud size={15} aria-hidden /> {t('sync.step1')}</li>
        <li><Cloud size={15} aria-hidden /> {t('sync.step2')}</li>
        <li><Cloud size={15} aria-hidden /> {t('sync.step3')}</li>
      </ol>
      <p className="text-subtle text-sm">{t('sync.note')}</p>

      <Modal
        open={dialog !== null}
        size="sm"
        title={dialog?.kind === 'use' ? t('sync.useTitle') : dialog?.kind === 'move' ? t('sync.moveTitle') : t('sync.resetTitle')}
        onClose={() => !busy && setDialog(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDialog(null)} disabled={busy}>{t('common.cancel')}</button>
            <button type="button" className="btn btn-primary" onClick={apply} disabled={busy} autoFocus>
              {busy ? t('sync.working') : dialog?.kind === 'use' ? t('sync.useConfirm') : dialog?.kind === 'move' ? t('sync.moveConfirm') : t('sync.resetConfirm')}
            </button>
          </>
        }
      >
        {dialog && dialog.kind !== 'reset' && <p className="path-box">{dialog.target}</p>}
        <p className="text-muted">
          {dialog?.kind === 'use' ? t('sync.useText') : dialog?.kind === 'move' ? t('sync.moveText') : t('sync.resetText', { path: loc?.defaultPath ?? '' })}
        </p>
      </Modal>
    </section>
  )
}
