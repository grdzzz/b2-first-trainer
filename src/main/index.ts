import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, session, shell } from 'electron'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { DataStore } from './storage'
import { checkForUpdates, getUpdateStatus, initUpdater, installUpdate } from './updater'
import { DOWNLOAD_PAGE_URL } from '../shared/updates'
import type { IpcResult, ImportKind } from '../shared/api'
import type { Attempt, Exam, Settings } from '../shared/types'

const isDev = !app.isPackaged && !!process.env.ELECTRON_RENDERER_URL

// Mismo identificador que el instalador: agrupa bien la ventana y el icono anclado en la barra de tareas.
const APP_ID = 'local.b2firsttrainer.app'
if (process.platform === 'win32') app.setAppUserModelId(APP_ID)

// Una sola instancia: evita que dos ventanas escriban a la vez en los mismos archivos.
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

// Permite guardar los datos en otra carpeta (útil para pruebas automáticas o modo totalmente portable).
const dataRoot = process.env.B2FT_DATA_DIR || path.join(app.getPath('userData'), 'data')
const store = new DataStore(dataRoot)
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

  // Antes de cerrar, la interfaz guarda el intento en curso. Si no responde en 3 s, se cierra igualmente.
  mainWindow.on('close', (e) => {
    if (closeConfirmed || !mainWindow) return
    e.preventDefault()
    mainWindow.webContents.send('app:before-close')
    setTimeout(() => {
      closeConfirmed = true
      mainWindow?.close()
    }, 3000)
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

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  await store.init()
  const settings = await store.getSettings()
  nativeTheme.themeSource = settings.theme

  // Solo se concede el micrófono (para Speaking); cualquier otro permiso se deniega.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback, details) => {
    const media = details as Electron.MediaAccessPermissionRequest
    callback(permission === 'media' && (media.mediaTypes ?? []).every((t) => t === 'audio'))
  })
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media')

  registerIpc()
  createWindow()
  initUpdater(() => mainWindow, settings.checkUpdates)
  if (isDev) mainWindow?.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') mainWindow?.webContents.toggleDevTools()
  })
})

app.on('window-all-closed', () => app.quit())
