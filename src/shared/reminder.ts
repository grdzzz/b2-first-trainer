// Recordatorio diario: cuándo avisar y qué dice Bubi. Sin Electron, para poder probarlo.
import { localDay, practiceStreak, type PracticeProgress } from './practice'
import { dueCountFromProgress } from './review'

export type ReminderRoute = 'practice' | 'review'

/** ¿Ya es la hora del aviso de hoy? */
export function reminderDue(time: string, now = new Date()): boolean {
  const [h, m] = time.split(':').map(Number)
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)
}

/** Texto del aviso, con la voz de Bubi. */
export function reminderMessage(progress: PracticeProgress[], now = new Date()): { body: string; route: ReminderRoute } {
  const today = localDay(now)
  const due = dueCountFromProgress(progress, today)
  const streak = practiceStreak(progress, now)
  if (due > 0) return { body: due === 1 ? 'Tienes 1 pregunta para repasar. ¡Son 30 segundos!' : `Tienes ${due} preguntas para repasar. ¿Las hacemos?`, route: 'review' }
  if (streak > 1) return { body: `Llevas ${streak} días seguidos. Una hoja de 10 minutos y mantienes la racha.`, route: 'practice' }
  return { body: '¿Practicamos 10 minutos de inglés hoy? Tengo una hoja preparada.', route: 'practice' }
}

