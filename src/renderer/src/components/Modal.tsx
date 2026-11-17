import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { t } from '../i18n'

interface ModalProps {
  open: boolean
  title: string
  onClose(): void
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  description?: string
}

/** Diálogo modal nativo (<dialog>): gestiona foco, Escape y accesibilidad. */
export function Modal({ open, title, onClose, children, footer, size = 'md', description }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className="modal-inner">
          <header className="modal-header">
            <div>
              <h2 id={titleId} className="modal-title">{title}</h2>
              {description && <p id={descId} className="modal-desc">{description}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
              <X size={18} aria-hidden />
            </button>
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer className="modal-footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm(): void
  onCancel(): void
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-muted">{message}</p>
    </Modal>
  )
}
