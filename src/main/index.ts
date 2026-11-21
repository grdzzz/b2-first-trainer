import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeTheme, session, shell } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { existsSync, promises as fs, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { DataStore, copyAppData, otherDeviceLock, releaseLock, releaseLockSync, resolveChosenFolder, writeJsonAtomic, writeLock, type LockInfo } from './storage'
import { checkForUpdates, getUpdateStatus, initUpdater, installUpdate } from './updater'
import { downloadWhisper, handleAssetProtocol, registerAssetScheme, removeWhisper, whisperStatus } from './whisper'
import { DOWNLOAD_PAGE_URL } from '../shared/updates'
import type { IpcResult, ImportKind } from '../shared/api'
import type { Attempt, Exam, FileRef, Settings } from '../shared/types'
import { DEFAULT_SETTINGS } from '../shared/types'
import type { PracticeProgress, PracticeSheet } from '../shared/practice'
import { buildExampleExam, EXAMPLE_FILES } from '../shared/example'
import { newId } from '../shared/ids'

const isDev = !app.isPackaged && !!process.env.ELECTRON_RENDERER_URL

// Mismo identificador que el instalador: agrupa bien la ventana y el icono anclado en la barra de tareas.
const APP_ID = 'local.b2firsttrainer.app'
if (process.platform === 'win32') app.setAppUserModelId(APP_ID)

// Protocolo interno para el modelo de transcripción y su motor .wasm (debe registrarse antes de 'ready').
registerAssetScheme()

// Una sola instancia: evita que dos ventanas escriban a la vez en los mismos archivos.
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

// Carpeta de datos: por defecto dentro de la carpeta de la app; el usuario puede elegir otra
// (por ejemplo una de OneDrive, Google Drive, iCloud o Dropbox) para usar sus datos en varios ordenadores.
// B2FT_DATA_DIR la fija para pruebas automáticas.
const DEFAULT_DATA_DIR = path.join(app.getPath('userData'), 'data')
const LOCATION_FILE = path.join(app.getPath('userData'), 'ubicacion-datos.json')
function configuredDataDir(): string | null {
  try {
    const v = JSON.parse(readFileSync(LOCATION_FILE, 'utf8')) as { dataDir?: unknown }
    return typeof v.dataDir === 'string' && path.isAbsolute(v.dataDir) ? v.dataDir : null
  } catch {
    return null
  }
}
const customDataDir = process.env.B2FT_DATA_DIR ? null : configuredDataDir()
const dataRoot = process.env.B2FT_DATA_DIR || customDataDir || DEFAULT_DATA_DIR
// Una carpeta elegida que ya no existe (unidad de red o nube no montada) no se recrea vacía: se avisa.
const dataAvailable = !customDataDir || existsSync(customDataDir)
const store = new DataStore(dataRoot)
const HOST = os.hostname()
/** Identificador aleatorio de esta instalación (dos ordenadores pueden llamarse igual, p. ej. «MacBook-Pro»). */
const DEVICE = installationId()
function installationId(): string {
  const file = path.join(app.getPath('userData'), 'equipo.json')
  try {
    const v = JSON.parse(readFileSync(file, 'utf8')) as { id?: unknown }
    if (typeof v.id === 'string' && /^[a-f0-9-]{16,64}$/.test(v.id)) return v.id
  } catch {
    /* se crea */
  }
  const id = randomUUID()
  try {
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify({ id }))
  } catch {
    /* sin disco: el identificador dura esta sesión */
  }
  return id
}
/** Error al preparar la carpeta de datos (sin permisos, disco lleno…): la interfaz lo muestra en vez de quedarse en blanco. */
let dataError: string | null = null
let lockConflict: LockInfo | null = null
let lockTimer: NodeJS.Timeout | undefined
/** Equipos de los que el usuario ya ha dicho «seguir aquí»: no se vuelve a avisar en esta sesión. */
const ignoredHosts = new Set<string>()

/** Latido: renueva el bloqueo de este equipo y comprueba si otro ordenador tiene la carpeta abierta. */
async function lockBeat(): Promise<void> {
  const other = await otherDeviceLock(store.root, HOST, new Date(), DEVICE).catch(() => null)
  if (other && !ignoredHosts.has(other.host) && lockConflict?.host !== other.host) {
    lockConflict = other
    mainWindow?.webContents.send('data:lock-conflict', other)
  }
  await writeLock(store.root, { host: HOST, pid: process.pid, heartbeat: new Date().toISOString(), device: DEVICE }).catch(() => undefined)
}

function relaunch(): void {
  closeConfirmed = true
  app.relaunch()
  app.exit(0)
}
let mainWindow: BrowserWindow | null = null
let closeConfirmed = false

function handle<T>(channel: string, fn: (...args: any[]) => Promise<T> | T): void {
  ipcMain.handle(channel, async (_e, ...args): Promise<IpcResult<T>> => {
    try {
      return { ok: true, data: await fn(...args) }
    } catch (err) {
      console.error(`[ipc] ${channel}`, err)
      return { ok: false, error: (err as Error)?.message ?? String(err) }
    }
  })
}

const FILTERS: Record<ImportKind, Electron.FileFilter[]> = {
  pdf: [{ name: 'PDF', extensions: ['pdf'] }],
  audio: [{ name: 'Audio', extensions: ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'webm', 'flac'] }]
}

const MAX_IMPORT_BYTES = 1024 * 1024 * 1024 // 1 GB

function registerIpc(): void {
  handle('settings:get', () => store.getSettings())
  handle('settings:save', async (s: Settings) => {
    const saved = await store.saveSettings(s)
    nativeTheme.themeSource = saved.theme
    return saved
  })

  handle('exams:list', () => store.listExams())
  handle('exams:get', (id: string) => store.getExam(id))
  handle('exams:save', (exam: Exam) => store.saveExam(exam))
  handle('exams:delete', (id: string) => store.deleteExam(id))
  handle('exams:importFile', async (examId: string, kind: ImportKind) => {
    if (kind !== 'pdf' && kind !== 'audio') throw new Error('Tipo de archivo no admitido.')
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: kind === 'pdf' ? 'Importar PDF' : 'Importar audio',
      properties: ['openFile'],
      filters: FILTERS[kind]
    })
    if (res.canceled || !res.filePaths[0]) return null
    const file = res.filePaths[0]
    const ext = path.extname(file).slice(1).toLowerCase()
    if (!FILTERS[kind][0].extensions.includes(ext)) throw new Error(`El archivo debe ser ${FILTERS[kind][0].extensions.join(', ')}.`)
    const stat = await fs.stat(file)
    if (stat.size > MAX_IMPORT_BYTES) throw new Error('El archivo es demasiado grande (máximo 1 GB).')
    return store.importExamFile(examId, file, kind)
  })
  handle('exams:readFile', (examId: string, name: string) => store.readExamFile(examId, name))
  handle('exams:removeFile', (examId: string, name: string) => store.removeExamFile(examId, name))

  handle('keys:open', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: 'Importar clave de respuestas',
      properties: ['openFile'],
      filters: [{ name: 'Clave (JSON o texto)', extensions: ['json', 'txt'] }]
    })
    if (res.canceled || !res.filePaths[0]) return null
    const stat = await fs.stat(res.filePaths[0])
    if (stat.size > 2 * 1024 * 1024) throw new Error('La clave es demasiado grande (máximo 2 MB).')
    return { name: path.basename(res.filePaths[0]), text: await fs.readFile(res.filePaths[0], 'utf8') }
  })
  handle('files:saveText', async (defaultName: string, text: string) => {
    const res = await dialog.showSaveDialog(mainWindow!, { defaultPath: defaultName.replace(/[\\/:*?"<>|]/g, '_') })
    if (res.canceled || !res.filePath) return null
    await fs.writeFile(res.filePath, text, 'utf8')
    return res.filePath
  })

  handle('attempts:list', () => store.listAttempts())
  handle('attempts:get', (id: string) => store.getAttempt(id))
  handle('attempts:save', (a: Attempt) => store.saveAttempt(a))
  handle('attempts:delete', (id: string) => store.deleteAttempt(id))

  handle('recordings:save', (attemptId: string, questionId: string, bytes: Uint8Array, mime: string) => {
    if (!(bytes instanceof Uint8Array)) throw new Error('Grabación no válida.')
    return store.saveRecording(attemptId, questionId, bytes, String(mime ?? ''))
  })
  handle('recordings:read', (attemptId: string, name: string) => store.readRecording(attemptId, name))
  handle('recordings:remove', (attemptId: string, name: string) => store.removeRecording(attemptId, name))

  handle('examples:create', async () => {
    const dir = app.isPackaged ? path.join(process.resourcesPath, 'example') : path.join(app.getAppPath(), 'resources', 'example')
    const tmpId = newId('exam')
    const files: Record<string, FileRef> = {}
    for (const f of EXAMPLE_FILES) files[f.file] = await store.importExamFile(tmpId, path.join(dir, f.file), f.kind)
    return store.saveExam({ ...buildExampleExam(files), id: tmpId })
  })

  handle('practice:listSheets', () => store.listPracticeSheets())
  handle('practice:saveSheet', (sheet: PracticeSheet) => store.savePracticeSheet(sheet))
  handle('practice:deleteSheet', (id: string) => store.deletePracticeSheet(id))
  handle('practice:listProgress', () => store.listPracticeProgress())
  handle('practice:saveProgress', (p: PracticeProgress) => store.savePracticeProgress(p))
  handle('practice:deleteProgress', (id: string) => store.deletePracticeProgress(id))
  handle('practice:openFile', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, { title: 'Importar hoja de práctica', properties: ['openFile'], filters: [{ name: 'Hoja de práctica', extensions: ['json', 'txt'] }] })
    const file = res.filePaths[0]
    if (res.canceled || !file) return null
    if ((await fs.stat(file)).size > 2 * 1024 * 1024) throw new Error('El archivo es demasiado grande para ser una hoja de práctica.')
    return { name: path.basename(file), text: await fs.readFile(file, 'utf8') }
  })

  handle('data:location', () => ({ path: store.root, isDefault: !customDataDir && !process.env.B2FT_DATA_DIR, defaultPath: DEFAULT_DATA_DIR, available: dataAvailable && !dataError, error: dataError ?? undefined }))
  handle('data:chooseFolder', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, { title: 'Elegir carpeta para tus datos', properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled || !res.filePaths[0]) return null
    return resolveChosenFolder(res.filePaths[0])
  })
  handle('data:applyFolder', async (target: string, mode: 'use' | 'move') => {
    if (typeof target !== 'string' || !path.isAbsolute(target)) throw new Error('Carpeta no válida.')
    if (mode === 'move') await copyAppData(store.root, target)
    else if (mode !== 'use') throw new Error('Opción no válida.')
    await writeJsonAtomic(LOCATION_FILE, { dataDir: target })
    await releaseLock(store.root, HOST, process.pid, DEVICE).catch(() => undefined)
    setTimeout(relaunch, 300)
  })
  handle('data:resetFolder', async () => {
    rmSync(LOCATION_FILE, { force: true })
    await releaseLock(store.root, HOST, process.pid, DEVICE).catch(() => undefined)
    setTimeout(relaunch, 300)
  })
  handle('data:relaunch', () => {
    setTimeout(relaunch, 100)
  })
  handle('data:lockConflict', () => lockConflict)
  handle('data:ignoreLock', () => {
    if (lockConflict) ignoredHosts.add(lockConflict.host)
    lockConflict = null
  })

  handle('clipboard:write', (text: string) => {
    if (typeof text !== 'string') throw new Error('Texto no válido.')
    if (text.length > 5_000_000) throw new Error('El texto es demasiado largo para copiarlo.')
    clipboard.writeText(text)
  })
  handle('app:info', () => ({ version: app.getVersion(), dataPath: store.root, platform: process.platform, electron: process.versions.electron }))
  handle('app:openDataFolder', async () => {
    const err = await shell.openPath(store.root)
    if (err) throw new Error(err)
  })
  handle('app:backup', async () => {
    const res = await dialog.showOpenDialog(mainWindow!, { title: 'Elegir carpeta para la copia de seguridad', properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled || !res.filePaths[0]) return null
    return store.backupTo(res.filePaths[0])
  })
  handle('app:setTheme', (t: 'system' | 'light' | 'dark') => {
    if (t === 'system' || t === 'light' || t === 'dark') nativeTheme.themeSource = t
  })

  handle('updates:status', () => getUpdateStatus())
  handle('updates:check', () => checkForUpdates())
  handle('updates:install', () =>
    installUpdate(() => {
      // El intento en curso ya está guardado (autoguardado); se cierra sin esperar.
      closeConfirmed = true
    })
  )
  handle('updates:openDownloadPage', () => shell.openExternal(DOWNLOAD_PAGE_URL))

  handle('whisper:status', () => whisperStatus())
  handle('whisper:download', () =>
    downloadWhisper((received, total) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('whisper:progress', { received, total })
    })
  )
  handle('whisper:remove', () => removeWhisper())

  ipcMain.on('app:close-ready', () => {
    closeConfirmed = true
    mainWindow?.close()
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    show: false,
    title: 'B2 First Trainer',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#16171a' : '#f7f6f2',
    autoHideMenuBar: true,
    // En el ejecutable de Windows el icono viene incrustado en el .exe.
    ...(app.isPackaged ? {} : { icon: path.join(__dirname, '../../build/icon.png') }),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Antes de cerrar, la interfaz guarda el intento en curso. Si no responde en 10 s (p. ej. una nube muy lenta), se cierra igualmente.
  mainWindow.on('close', (e) => {
    if (closeConfirmed || !mainWindow) return
    e.preventDefault()
    mainWindow.webContents.send('app:before-close')
    setTimeout(() => {
      closeConfirmed = true
      mainWindow?.close()
    }, 10_000)
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Si el proceso de la interfaz se cae, se recarga (los datos ya están guardados en disco).
  let reloads = 0
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[renderer] proceso terminado', details)
    if (details.reason !== 'clean-exit' && reloads < 3 && mainWindow && !mainWindow.isDestroyed()) {
      reloads++
      setTimeout(() => mainWindow?.webContents.reload(), 500)
    }
  })

  // Sin navegación ni ventanas nuevas: la app es 100 % local.
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!isDev || !url.startsWith(process.env.ELECTRON_RENDERER_URL!)) e.preventDefault()
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL!)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.whenReady().then(start).catch((err: unknown) => {
  // Un fallo inesperado al arrancar no debe dejar la app abierta e invisible.
  console.error('[arranque]', err)
  dialog.showErrorBox('B2 First Trainer no ha podido arrancar', `${(err as Error)?.message ?? String(err)}\n\nCierra la app y vuelve a abrirla. Si sigue pasando, comprueba que hay espacio en el disco.`)
  app.exit(1)
})

async function start(): Promise<void> {
  // En macOS el menú de la app es obligatorio: sin el menú Edición no funcionan Cmd+C/V/Z en los campos de texto.
  Menu.setApplicationMenu(
    process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]) : null
  )
  if (dataAvailable) {
    try {
      await store.init()
      // Aviso si la carpeta (sincronizada) está abierta ahora mismo en otro ordenador.
      // Al abrir y después cada 30 s (también mientras se usa la app, por si el otro equipo la abre más tarde).
      await lockBeat()
      lockTimer = setInterval(() => void lockBeat(), 30_000)
    } catch (err) {
      // Sin permisos, disco lleno, nube con problemas…: la interfaz muestra el motivo y permite reintentar.
      dataError = (err as Error)?.message ?? String(err)
      console.error('[datos]', err)
    }
  }
  const usable = dataAvailable && !dataError
  const settings = await (usable ? store : new DataStore(DEFAULT_DATA_DIR)).getSettings().catch(() => ({ ...DEFAULT_SETTINGS }))
  nativeTheme.themeSource = settings.theme

  // Solo se concede el micrófono (para Speaking); cualquier otro permiso se deniega.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback, details) => {
    const media = details as Electron.MediaAccessPermissionRequest
    const types = media.mediaTypes ?? []
    callback(permission === 'media' && types.length > 0 && types.every((t) => t === 'audio'))
  })
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media')

  handleAssetProtocol()
  registerIpc()
  createWindow()
  initUpdater(() => mainWindow, settings.checkUpdates)
  if (isDev) mainWindow?.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') mainWindow?.webContents.toggleDevTools()
  })
}

app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => {
  if (lockTimer) clearInterval(lockTimer)
  if (dataAvailable && !dataError) releaseLockSync(store.root, HOST, process.pid, DEVICE)
})
