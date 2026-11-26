import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { useApp } from '../lib/store'
import { t } from '../i18n'

export function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toasts" role="region" aria-label={t('common.notifications')}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
          {toast.kind === 'success' ? <CheckCircle2 size={18} aria-hidden /> : toast.kind === 'error' ? <TriangleAlert size={18} aria-hidden /> : <Info size={18} aria-hidden />}
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="btn btn-ghost btn-xs toast-action"
              onClick={() => {
                toast.action!.run()
                dismissToast(toast.id)
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" className="icon-btn icon-btn-sm" onClick={() => dismissToast(toast.id)} aria-label={t('common.close')}>
            <X size={14} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  )
}
