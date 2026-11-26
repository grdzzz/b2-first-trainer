// Abrir una actividad del plan con las funciones de siempre (hoja, repaso, parte de examen…).
import { useCallback } from 'react'
import { createAttempt } from '@shared/attempts'
import type { PlanActivity } from '@shared/learning/plan'
import { errorMessage, useApp } from './store'
import { useLearning } from './learning'

export function useLaunchActivity(): (a: PlanActivity) => Promise<void> {
  const app = useApp()
  const learning = useLearning()
  return useCallback(
    async (a: PlanActivity) => {
      learning.markStarted(a.id)
      const t = a.target
      if (t.kind === 'sheet') return app.navigate({ name: 'sheet', sheetId: t.sheetId })
      if (t.kind === 'review') return app.navigate({ name: 'review', session: t.session })
      const exam = app.exams.find((e) => e.id === t.examId)
      if (!exam) {
        app.notify('error', 'El examen ya no está en la biblioteca.')
        return
      }
      // Si ya hay un intento sin terminar de lo mismo, se reanuda.
      const open = app.attempts.find((x) => x.status === 'in-progress' && x.paperId === t.paperId && x.mode === t.mode && t.partIds.every((p) => x.partIds.includes(p)))
      if (open) return app.navigate({ name: 'attempt', attemptId: open.id })
      try {
        const attempt = await app.saveAttempt(createAttempt(exam, { mode: t.mode, paperId: t.paperId, partIds: t.partIds }))
        app.navigate({ name: 'attempt', attemptId: attempt.id })
      } catch (e) {
        app.notify('error', errorMessage(e))
      }
    },
    [app, learning]
  )
}
