// Actualizaciones automáticas desde la rama `descargas` del repositorio.
// - Versión instalada en Windows (NSIS): descarga en segundo plano y se instala al reiniciar.
// - Portable, Linux o desarrollo: solo avisa de que hay versión nueva con un enlace de descarga.
// Sin conexión simplemente falla en silencio: la app sigue funcionando offline.
import { app, net, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { compareVersions, DOWNLOAD_PAGE_URL, UPDATE_BASE_URL, versionFromLatestYml, type UpdateStatus } from '../shared/updates'

// Permite apuntar a otro servidor (solo para pruebas automáticas).
const BASE_URL = process.env.B2FT_UPDATE_URL || UPDATE_BASE_URL

let status: UpdateStatus = { state: 'idle' }
let getWindow: () => BrowserWindow | null = () => null
let wired = false
let checking: Promise<UpdateStatus> | null = null

function setStatus(next: UpdateStatus): void {
  status = next
  const win = getWindow()
  if (win && !win.isDestroyed()) win.webContents.send('updates:status', status)
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

/** ¿Puede esta copia instalarse sola? Solo la versión instalada con el instalador de Windows. */
function canAutoInstall(): boolean {
  return app.isPackaged && process.platform === 'win32' && !process.env.PORTABLE_EXECUTABLE_DIR
}

function wireAutoUpdater(): void {
  if (wired) return
  wired = true
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.logger = null
  if (process.env.B2FT_UPDATE_URL) autoUpdater.setFeedURL({ provider: 'generic', url: BASE_URL })
  autoUpdater.on('update-available', (info) => setStatus({ state: 'downloading', version: info.version, percent: 0 }))
  autoUpdater.on('download-progress', (p) => {
    if (status.state === 'downloading') setStatus({ ...status, percent: Math.round(p.percent) })
  })
  autoUpdater.on('update-downloaded', (info) => setStatus({ state: 'ready', version: info.version }))
  autoUpdater.on('update-not-available', () => setStatus({ state: 'up-to-date', checkedAt: new Date().toISOString() }))
  autoUpdater.on('error', (err) => {
    // Durante la descarga, un error de red no debe dejar el aviso colgado.
    setStatus({ state: 'error', message: friendly(err) })
  })
}

function friendly(err: unknown): string {
  const msg = (err as Error)?.message ?? String(err)
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ERR_INTERNET_DISCONNECTED|net::|getaddrinfo|network/i.test(msg)) return 'Sin conexión a internet.'
  return msg.split('\n')[0].slice(0, 200)
}

/** Comprobación manual: lee latest.yml y compara versiones. */
async function checkManually(): Promise<UpdateStatus> {
  const res = await net.fetch(`${BASE_URL}/latest.yml?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`El servidor de actualizaciones respondió ${res.status}.`)
  const version = versionFromLatestYml(await res.text())
  if (!version) throw new Error('No se ha podido leer la versión publicada.')
  if (compareVersions(version, app.getVersion()) > 0) return { state: 'available-manual', version, url: DOWNLOAD_PAGE_URL }
  return { state: 'up-to-date', checkedAt: new Date().toISOString() }
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    setStatus({ state: 'unsupported', reason: 'dev' })
    return status
  }
  // Si ya hay una descargada o descargándose, no se vuelve a empezar.
  if (status.state === 'ready' || status.state === 'downloading') return status
  if (checking) return checking
  checking = (async () => {
    setStatus({ state: 'checking' })
    try {
      if (canAutoInstall()) {
        wireAutoUpdater()
        const result = await autoUpdater.checkForUpdates()
        if (!result || !result.isUpdateAvailable) setStatus({ state: 'up-to-date', checkedAt: new Date().toISOString() })
      } else {
        setStatus(await checkManually())
      }
    } catch (e) {
      setStatus({ state: 'error', message: friendly(e) })
    } finally {
      checking = null
    }
    return status
  })()
  return checking
}

/** Cierra la app e instala la versión descargada. */
export function installUpdate(beforeQuit: () => void): void {
  if (status.state !== 'ready') return
  beforeQuit()
  // isSilent=true: sin asistente; isForceRunAfter=true: vuelve a abrir la app al terminar.
  setImmediate(() => autoUpdater.quitAndInstall(true, true))
}

export function initUpdater(windowGetter: () => BrowserWindow | null, enabled: boolean): void {
  getWindow = windowGetter
  if (!app.isPackaged) {
    status = { state: 'unsupported', reason: 'dev' }
    return
  }
  // Primera comprobación unos segundos después de abrir, para no frenar el arranque.
  if (enabled) setTimeout(() => void checkForUpdates(), 6000)
}
