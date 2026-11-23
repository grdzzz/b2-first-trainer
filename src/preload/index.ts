import { contextBridge, ipcRenderer } from 'electron'
import type { BridgeApi, IpcResult } from '../shared/api'
import type { UpdateStatus } from '../shared/updates'

async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const res = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>
  if (!res || typeof res !== 'object') throw new Error('Respuesta inesperada del proceso principal.')
  if (!res.ok) throw new Error(res.error)
  return res.data
}

// Antes de cerrar: se ejecutan todos los guardados pendientes (si los hay) y se confirma enseguida.
// Sin pantallas con datos abiertos, la ventana se cierra al instante.
const closeHandlers = new Set<() => Promise<void> | void>()
ipcRenderer.on('app:before-close', async () => {
  try {
    await Promise.allSettled(Array.from(closeHandlers, (h) => Promise.resolve().then(h)))
  } finally {
    ipcRenderer.send('app:close-ready')
  }
})

const api: BridgeApi = {
  getSettings: () => call('settings:get'),
  saveSettings: (s) => call('settings:save', s),
  listExams: () => call('exams:list'),
  getExam: (id) => call('exams:get', id),
  saveExam: (e) => call('exams:save', e),
  deleteExam: (id) => call('exams:delete', id),
  importExamFile: (examId, kind) => call('exams:importFile', examId, kind),
  readExamFile: (examId, name) => call('exams:readFile', examId, name),
  removeExamFile: (examId, name) => call('exams:removeFile', examId, name),
  openKeyFile: () => call('keys:open'),
  saveTextFile: (name, text) => call('files:saveText', name, text),
  listAttempts: () => call('attempts:list'),
  getAttempt: (id) => call('attempts:get', id),
  saveAttempt: (a) => call('attempts:save', a),
  deleteAttempt: (id) => call('attempts:delete', id),
  saveRecording: (attemptId, questionId, bytes, mime) => call('recordings:save', attemptId, questionId, bytes, mime),
  readRecording: (attemptId, name) => call('recordings:read', attemptId, name),
  removeRecording: (attemptId, name) => call('recordings:remove', attemptId, name),
  createExampleExam: () => call('examples:create'),
  getDataLocation: () => call('data:location'),
  chooseDataFolder: () => call('data:chooseFolder'),
  applyDataFolder: (target, mode) => call('data:applyFolder', target, mode),
  resetDataFolder: () => call('data:resetFolder'),
  relaunch: () => call('data:relaunch'),
  getLockConflict: () => call('data:lockConflict'),
  ignoreLockConflict: () => call('data:ignoreLock'),
  onLockConflict: (handler) => {
    const listener = (_e: Electron.IpcRendererEvent, lock: { host: string; heartbeat: string }) => handler(lock)
    ipcRenderer.on('data:lock-conflict', listener)
    return () => ipcRenderer.removeListener('data:lock-conflict', listener)
  },
  listPracticeSheets: () => call('practice:listSheets'),
  savePracticeSheet: (sheet) => call('practice:saveSheet', sheet),
  deletePracticeSheet: (id) => call('practice:deleteSheet', id),
  listPracticeProgress: () => call('practice:listProgress'),
  savePracticeProgress: (p) => call('practice:saveProgress', p),
  deletePracticeProgress: (id) => call('practice:deleteProgress', id),
  openPracticeFile: () => call('practice:openFile'),
  copyText: (text) => call('clipboard:write', text),
  getAppInfo: () => call('app:info'),
  openDataFolder: () => call('app:openDataFolder'),
  backupData: () => call('app:backup'),
  setThemeSource: (t) => call('app:setTheme', t),
  getUpdateStatus: () => call('updates:status'),
  checkForUpdates: () => call('updates:check'),
  installUpdate: () => call('updates:install'),
  openDownloadPage: () => call('updates:openDownloadPage'),
  onUpdateStatus: (handler) => {
    const listener = (_e: Electron.IpcRendererEvent, status: UpdateStatus) => handler(status)
    ipcRenderer.on('updates:status', listener)
    return () => ipcRenderer.removeListener('updates:status', listener)
  },
  whisperStatus: () => call('whisper:status'),
  downloadWhisper: () => call('whisper:download'),
  removeWhisper: () => call('whisper:remove'),
  onWhisperProgress: (handler) => {
    const listener = (_e: Electron.IpcRendererEvent, p: { received: number; total: number }) => handler(p)
    ipcRenderer.on('whisper:progress', listener)
    return () => ipcRenderer.removeListener('whisper:progress', listener)
  },
  onNavigate: (handler) => {
    const listener = (_e: Electron.IpcRendererEvent, route: unknown) => {
      if (route === 'practice' || route === 'review') handler(route)
    }
    ipcRenderer.on('app:navigate', listener)
    return () => ipcRenderer.removeListener('app:navigate', listener)
  },
  onBeforeClose: (handler) => {
    closeHandlers.add(handler)
    return () => {
      closeHandlers.delete(handler)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
