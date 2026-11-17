import { contextBridge, ipcRenderer } from 'electron'
import type { BridgeApi, IpcResult } from '../shared/api'

async function call<T>(channel: string, ...args: unknown[]): Promise<T> {
  const res = (await ipcRenderer.invoke(channel, ...args)) as IpcResult<T>
  if (!res || typeof res !== 'object') throw new Error('Respuesta inesperada del proceso principal.')
  if (!res.ok) throw new Error(res.error)
  return res.data
}

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
  getAppInfo: () => call('app:info'),
  openDataFolder: () => call('app:openDataFolder'),
  backupData: () => call('app:backup'),
  setThemeSource: (t) => call('app:setTheme', t),
  onBeforeClose: (handler) => {
    const listener = async () => {
      try {
        await handler()
      } finally {
        ipcRenderer.send('app:close-ready')
      }
    }
    ipcRenderer.on('app:before-close', listener)
    return () => ipcRenderer.removeListener('app:before-close', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
