import { useCallback, useEffect, useState } from 'react'
import { Archive, BellRing, BookOpenCheck, Circle, LayoutDashboard, Stars, Trophy, Gauge, Sparkles, Cloud, Compass, Database, Download, FolderOpen, FolderSync, HardDriveDownload, Mic, Monitor, Moon, NotebookPen, Palette, RefreshCw, RotateCcw, SpellCheck, Sun, UserRound } from 'lucide-react'
import { ConfirmDialog } from '../components/Modal'
import { Mascot, MascotSvg } from '../components/Mascot'
import { SkText } from '../components/Skeleton'
import { openWhatsNew } from '../components/WhatsNew'
import { PlacementLevel } from '../components/PlacementResult'
import type { DataLocation } from '@shared/api'
import { Modal } from '../components/Modal'
import type { AppInfo } from '@shared/api'
import { ACCENTS, DASHBOARD_MODULES, type ThemePreference } from '@shared/types'
import { useLearningOptional } from '../lib/learning'
import { errorMessage, useApp } from '../lib/store'
import { formatDate, t } from '../i18n'
import { useUpdateStatus } from '../lib/updates'
import type { UpdateStatus } from '@shared/updates'

const THEMES: Array<{ id: ThemePreference; icon: typeof Sun }> = [
  { id: 'system', icon: Monitor },
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
  { id: 'oled', icon: Circle },
  { id: 'midnight', icon: Stars }
]

const SECTIONS: Array<{ id: string; label: () => string; icon: typeof Sun }> = [
  { id: 'set-profile', label: () => t('settings.profile'), icon: UserRound },
  { id: 'set-appearance', label: () => t('settings.appearance'), icon: Palette },
  { id: 'set-gamification', label: () => t('appearance.gamificationShort'), icon: Trophy },
  { id: 'set-grading', label: () => t('settings.gradingShort'), icon: SpellCheck },
  { id: 'set-data', label: () => t('settings.data'), icon: Database },
  { id: 'set-reminder', label: () => t('settings.reminderShort'), icon: BellRing },
  { id: 'set-practice', label: () => t('settings.practice'), icon: NotebookPen },
  { id: 's-sync', label: () => t('settings.syncShort'), icon: Cloud },
  { id: 'set-transcription', label: () => t('settings.transcriptionShort'), icon: Mic },
  { id: 'set-updates', label: () => t('updates.title'), icon: RefreshCw }
]

/** Título de sección con icono. */
function SectionTitle({ id, icon: Icon, children }: { id: string; icon: typeof Sun; children: React.ReactNode }) {
  return (
    <h2 id={id} className="section-title section-title-icon">
      <span className="section-icon" aria-hidden><Icon size={17} /></span>
      {children}
    </h2>
  )
}

/** Recordatorio diario (aviso del sistema) y segundo plano. */
function ReminderSection() {
  const { settings, updateSettings } = useApp()
  const r = settings.reminder
  const [platform, setPlatform] = useState('')
  useEffect(() => {
    window.api.getAppInfo().then((i) => setPlatform(i.platform)).catch(() => undefined)
  }, [])
  return (
    <section className="card settings-section" aria-labelledby="s-reminder" id="set-reminder">
      <SectionTitle id="s-reminder" icon={BellRing}>{t('settings.reminder')}</SectionTitle>
      <Mascot mood={r.enabled ? 'cheer' : 'sleep'} size={64} message={r.enabled ? t('settings.reminderBubiOn', { time: r.time }) : t('settings.reminderBubiOff')} />
      <label className="setting setting-toggle">
        <div>
          <span className="setting-name">{t('settings.reminderEnable')}</span>
          <span className="setting-desc">{t('settings.reminderEnableDesc')}</span>
        </div>
        <input type="checkbox" className="toggle" checked={r.enabled} onChange={(e) => void updateSettings({ reminder: { enabled: e.target.checked } })} />
      </label>
      {r.enabled && (
        <>
          <div className="setting">
            <div>
              <label className="setting-name" htmlFor="reminder-time">{t('settings.reminderTime')}</label>
              <p className="setting-desc">{t('settings.reminderTimeDesc')}</p>
            </div>
            <input id="reminder-time" type="time" className="input input-sm time-input" value={r.time} onChange={(e) => /^\d{2}:\d{2}$/.test(e.target.value) && void updateSettings({ reminder: { time: e.target.value } })} />
          </div>
          <label className="setting setting-toggle">
            <div>
              <span className="setting-name">{t('settings.reminderBackground')}</span>
              <span className="setting-desc">{t('settings.reminderBackgroundDesc')}</span>
            </div>
            <input type="checkbox" className="toggle" checked={r.background} onChange={(e) => void updateSettings({ reminder: { background: e.target.checked } })} />
          </label>
          {platform && platform !== 'linux' && (
            <label className="setting setting-toggle">
              <div>
                <span className="setting-name">{t('settings.reminderLogin')}</span>
                <span className="setting-desc">{platform === 'darwin' ? t('settings.reminderLoginDescMac') : t('settings.reminderLoginDesc')}</span>
              </div>
              <input type="checkbox" className="toggle" checked={r.openAtLogin} onChange={(e) => void updateSettings({ reminder: { openAtLogin: e.target.checked } })} />
            </label>
          )}
          {!r.background && <p className="notice notice-warning"><BellRing size={16} aria-hidden /> {t('settings.reminderNeedsBackground')}</p>}
        </>
      )}
    </section>
  )
}

/** Progreso de las hojas de práctica: se puede reiniciar. */
function PracticeSection() {
  const { practiceProgress, resetPracticeProgress, notify } = useApp()
  const [confirm, setConfirm] = useState(false)
  const done = practiceProgress.filter((p) => p.times > 0).length
  return (
    <section className="card settings-section" aria-labelledby="s-practice" id="set-practice">
      <SectionTitle id="s-practice" icon={NotebookPen}>{t('settings.practice')}</SectionTitle>
      <div className="setting">
        <div>
          <p className="setting-name">{t('settings.practiceProgress')}</p>
          <p className="setting-desc">{t('settings.practiceProgressDesc', { n: done })}</p>
        </div>
        <button type="button" className="btn btn-secondary" disabled={practiceProgress.length === 0} onClick={() => setConfirm(true)}>
          <RotateCcw size={16} aria-hidden /> {t('settings.practiceReset')}
        </button>
      </div>
      <ConfirmDialog
        open={confirm}
        title={t('settings.practiceResetTitle')}
        message={t('settings.practiceResetMessage')}
        confirmLabel={t('settings.practiceReset')}
        danger
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false)
          try {
            for (const p of practiceProgress) await resetPracticeProgress(p.id)
            notify('success', t('settings.practiceResetDone'))
          } catch (e) {
            notify('error', errorMessage(e))
          }
        }}
      />
    </section>
  )
}

export function SettingsScreen({ section }: { section?: string }) {
  const { settings, updateSettings, notify } = useApp()
  const learning = useLearningOptional()
  const [info, setInfo] = useState<AppInfo | null>(null)
  useEffect(() => {
    window.api.getAppInfo().then(setInfo).catch(() => undefined)
  }, [])
  // Abrir directamente una sección (desde la paleta de comandos o el perfil).
  useEffect(() => {
    if (section) window.requestAnimationFrame(() => document.getElementById(`set-${section}`)?.scrollIntoView({ block: 'start' }))
  }, [section])
  const appearance = (patch: Partial<typeof settings.appearance>) => {
    void updateSettings({ appearance: patch })
    learning?.featureUsed('appearance')
  }

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

      <nav className="settings-nav" aria-label={t('settings.sections')}>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className="settings-nav-item" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <Icon size={14} aria-hidden /> {label()}
          </button>
        ))}
      </nav>

      <ProfileSection />

      <section className="card settings-section" aria-labelledby="s-appearance" id="set-appearance">
        <SectionTitle id="s-appearance" icon={Palette}>{t('settings.appearance')}</SectionTitle>
        <div className="setting">
          <div>
            <p className="setting-name" id="theme-label">{t('settings.theme')}</p>
            <p className="setting-desc">{t('settings.themeDesc')}</p>
          </div>
          <div className="segmented" role="radiogroup" aria-labelledby="theme-label">
            {THEMES.map(({ id, icon: Icon }) => (
              <button key={id} type="button" role="radio" aria-checked={settings.theme === id} className={`segmented-item${settings.theme === id ? ' is-selected' : ''}`} onClick={() => { void updateSettings({ theme: id }); learning?.featureUsed('appearance') }}>
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
        <div className="setting">
          <div>
            <p className="setting-name" id="accent-label">{t('appearance.accent')}</p>
            <p className="setting-desc">{t('appearance.accentDesc')}</p>
          </div>
          <div className="swatches" role="radiogroup" aria-labelledby="accent-label">
            {ACCENTS.map((a) => (
              <button key={a} type="button" role="radio" aria-checked={settings.appearance.accent === a} className={`swatch accent-${a}${settings.appearance.accent === a ? ' is-active' : ''}`} title={t(`appearance.accents.${a}`)} aria-label={t(`appearance.accents.${a}`)} onClick={() => appearance({ accent: a })} />
            ))}
          </div>
        </div>
        <div className="setting">
          <div>
            <p className="setting-name" id="density-label">{t('appearance.density')}</p>
            <p className="setting-desc">{t('appearance.densityDesc')}</p>
          </div>
          <div className="segmented" role="radiogroup" aria-labelledby="density-label">
            {(['comfortable', 'compact'] as const).map((d) => (
              <button key={d} type="button" role="radio" aria-checked={settings.appearance.density === d} className={`segmented-item${settings.appearance.density === d ? ' is-selected' : ''}`} onClick={() => appearance({ density: d })}>{t(`appearance.densities.${d}`)}</button>
            ))}
          </div>
        </div>
        <div className="setting">
          <div>
            <p className="setting-name" id="motion-label">{t('appearance.motion')}</p>
            <p className="setting-desc">{t('appearance.motionDesc')}</p>
          </div>
          <div className="segmented" role="radiogroup" aria-labelledby="motion-label">
            {(['full', 'reduced', 'none'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={settings.appearance.motion === m} className={`segmented-item${settings.appearance.motion === m ? ' is-selected' : ''}`} onClick={() => appearance({ motion: m })}>{t(`appearance.motions.${m}`)}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="card settings-section" aria-labelledby="s-gamification" id="set-gamification">
        <SectionTitle id="s-gamification" icon={Trophy}>{t('appearance.gamification')}</SectionTitle>
        <label className="setting setting-toggle">
          <div>
            <span className="setting-name">{t('appearance.gamificationToggle')}</span>
            <span className="setting-desc">{t('appearance.gamificationDesc')}</span>
          </div>
          <input type="checkbox" className="toggle" checked={settings.gamification} onChange={(e) => void updateSettings({ gamification: e.target.checked })} />
        </label>
        <div className="setting">
          <div>
            <p className="setting-name"><LayoutDashboard size={15} aria-hidden /> {t('appearance.dashboard')}</p>
            <p className="setting-desc">{t('appearance.dashboardDesc', { n: settings.dashboard.hidden.length })}</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void updateSettings({ dashboard: { order: DASHBOARD_MODULES, hidden: [] } })}>{t('appearance.dashboardReset')}</button>
        </div>
      </section>

      <section className="card settings-section" aria-labelledby="s-grading" id="set-grading">
        <SectionTitle id="s-grading" icon={SpellCheck}>{t('settings.grading')}</SectionTitle>
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

      <section className="card settings-section" aria-labelledby="s-data" id="set-data">
        <SectionTitle id="s-data" icon={Database}>{t('settings.data')}</SectionTitle>
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
            <p className="setting-desc path">{info?.dataPath ?? <SkText w="24em" />}</p>
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
        {learning?.meta && (
          <div className="setting">
            <div>
              <p className="setting-name"><Archive size={15} aria-hidden /> {t('migration.settingTitle')}</p>
              <p className="setting-desc">
                {learning.meta.backup ? t('migration.settingBackup', { date: formatDate(learning.meta.migratedAt), n: learning.meta.backupFiles }) : learning.meta.backupError ? t('migration.settingError', { error: learning.meta.backupError }) : t('migration.settingNone')}
              </p>
            </div>
            {learning.meta.backup && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.api.openLearningBackup().catch((e) => notify('error', errorMessage(e)))}>
                <FolderOpen size={15} aria-hidden /> {t('migration.open')}
              </button>
            )}
          </div>
        )}
      </section>

      <ReminderSection />

      <PracticeSection />

      <SyncSection />

      <TranscriptionSection />

      <UpdatesSection version={info?.version} />

      <p className="text-subtle text-sm about">{info ? t('settings.about', { version: info.version, electron: info.electron }) : <SkText w="18em" />}</p>
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
    <section className="card settings-section" aria-labelledby="s-updates" id="set-updates">
      <SectionTitle id="s-updates" icon={RefreshCw}>{t('updates.title')}</SectionTitle>
      <div className="setting">
        <div>
          <p className="setting-name">{version ? t('updates.version', { version }) : <SkText w="9em" />}</p>
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
    <section className="card settings-section" aria-labelledby="s-transcription" id="set-transcription">
      <SectionTitle id="s-transcription" icon={Mic}>{t('settings.transcription')}</SectionTitle>
      <div className="setting">
        <div>
          <p className="setting-name">{t('settings.whisperModel')}</p>
          <p className="setting-desc">
            {status === null ? <SkText w="22em" /> : status.installed ? t('settings.whisperInstalled', { mb: Math.round(status.sizeBytes / 1e6) }) : t('settings.whisperMissing')}
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
    <section className="card settings-section" aria-labelledby="s-profile" id="set-profile">
      <SectionTitle id="s-profile" icon={UserRound}>{t('settings.profile')}</SectionTitle>
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
      <label className="setting setting-toggle">
        <div className="setting-with-mascot">
          <MascotSvg mood="wave" size={44} />
          <div>
            <span className="setting-name">{t('settings.mascot')}</span>
            <span className="setting-desc">{t('settings.mascotDesc')}</span>
          </div>
        </div>
        <input type="checkbox" className="toggle" checked={settings.mascot} onChange={(e) => void updateSettings({ mascot: e.target.checked })} />
      </label>
      {settings.placement && (
        <div className="setting">
          <div className="setting-with-icon">
            <Gauge size={18} aria-hidden />
            <div>
              <p className="setting-name">{t('placement.settingsLabel')}</p>
              <p className="setting-desc">
                <PlacementLevel level={settings.placement.level} /> · {t('placement.scale', { score: settings.placement.score })} · {formatDate(settings.placement.date, { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          {settings.placement.dismissed && (
            <button type="button" className="btn btn-secondary" onClick={() => void updateSettings({ placement: { ...settings.placement!, dismissed: false } })}>
              {t('placement.showHome')}
            </button>
          )}
        </div>
      )}
      <div className="setting">
        <div>
          <p className="setting-name">{t('settings.help')}</p>
          <p className="setting-desc">{t('settings.helpDesc')}</p>
        </div>
        <div className="row-gap">
          <button type="button" className="btn btn-secondary" onClick={() => setTourStep(0)}>
            <Compass size={16} aria-hidden /> {t('settings.tour')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={openWhatsNew}>
            <Sparkles size={16} aria-hidden /> {t('whatsNew.open')}
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
      <SectionTitle id="s-sync-title" icon={Cloud}>{t('sync.title')}</SectionTitle>
      <p className="setting-desc">{t('sync.intro')}</p>
      <div className="setting">
        <div>
          <p className="setting-name">{loc ? (loc.isDefault ? t('sync.local') : t('sync.custom')) : <SkText w="10em" />}</p>
          <p className="setting-desc path">{loc?.path ?? <SkText w="24em" />}</p>
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
