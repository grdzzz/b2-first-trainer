// Contrato entre el proceso principal y la interfaz (expuesto como window.api por el preload).
import type { Attempt, Exam, FileRef, Settings } from './types'
import type { UpdateStatus } from './updates'
import type { WhisperStatus } from './whisper'

export interface ListResult<T> {
  items: T[]
  corrupt: string[]
}

export interface AppInfo {
  version: string
  dataPath: string
  platform: string
  electron: string
}

export interface DataLocation {
  path: string
  isDefault: boolean
  defaultPath: string
  /** false si la carpeta elegida no existe (por ejemplo, la nube no está montada). */
  available: boolean
}

export type ImportKind = 'pdf' | 'audio'

export interface BridgeApi {
  getSettings(): Promise<Settings>
  saveSettings(settings: Settings): Promise<Settings>

  listExams(): Promise<ListResult<Exam>>
  getExam(id: string): Promise<Exam | null>
  saveExam(exam: Exam): Promise<Exam>
  deleteExam(id: string): Promise<void>
  /** Abre un diálogo para elegir el archivo y lo copia a la carpeta del examen. null si se cancela. */
  importExamFile(examId: string, kind: ImportKind): Promise<FileRef | null>
  readExamFile(examId: string, storedName: string): Promise<Uint8Array>
  removeExamFile(examId: string, storedName: string): Promise<void>

  /** Abre un diálogo para elegir una clave (.json o .txt) y devuelve su texto. */
  openKeyFile(): Promise<{ name: string; text: string } | null>
  /** Guarda un texto en un archivo elegido por el usuario. */
  saveTextFile(defaultName: string, text: string): Promise<string | null>

  listAttempts(): Promise<ListResult<Attempt>>
  getAttempt(id: string): Promise<Attempt | null>
  saveAttempt(attempt: Attempt): Promise<Attempt>
  deleteAttempt(id: string): Promise<void>

  saveRecording(attemptId: string, questionId: string, bytes: Uint8Array, mime: string): Promise<FileRef>
  readRecording(attemptId: string, storedName: string): Promise<Uint8Array>
  removeRecording(attemptId: string, storedName: string): Promise<void>

  /** Crea el examen de ejemplo (con sus PDF y audio) y lo devuelve. */
  createExampleExam(): Promise<Exam>

  getDataLocation(): Promise<DataLocation>
  /** Elige carpeta: devuelve la carpeta final y si ya contiene datos. null si se cancela. */
  chooseDataFolder(): Promise<{ target: string; hasData: boolean } | null>
  /** Cambia la carpeta de datos ('use': usar los datos que hay allí; 'move': copiar allí los actuales) y reinicia la app. */
  applyDataFolder(target: string, mode: 'use' | 'move'): Promise<void>
  resetDataFolder(): Promise<void>
  relaunch(): Promise<void>
  /** Otro ordenador tiene abierta la misma carpeta de datos. */
  getLockConflict(): Promise<{ host: string; heartbeat: string } | null>
  ignoreLockConflict(): Promise<void>

  getAppInfo(): Promise<AppInfo>
  openDataFolder(): Promise<void>
  /** Copia la carpeta de datos a una carpeta elegida por el usuario. */
  backupData(): Promise<string | null>
  setThemeSource(theme: 'system' | 'light' | 'dark'): Promise<void>

  getUpdateStatus(): Promise<UpdateStatus>
  checkForUpdates(): Promise<UpdateStatus>
  /** Cierra la app, instala la versión descargada y la vuelve a abrir. */
  installUpdate(): Promise<void>
  openDownloadPage(): Promise<void>
  onUpdateStatus(handler: (status: UpdateStatus) => void): () => void

  whisperStatus(): Promise<WhisperStatus>
  /** Descarga el modelo de transcripción (una sola vez). */
  downloadWhisper(): Promise<WhisperStatus>
  removeWhisper(): Promise<void>
  onWhisperProgress(handler: (p: { received: number; total: number }) => void): () => void

  /** El proceso principal avisa de que la ventana se va a cerrar; la interfaz guarda y confirma. */
  onBeforeClose(handler: () => Promise<void> | void): () => void
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }
