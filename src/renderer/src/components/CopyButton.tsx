import { useState } from 'react'
import { Check, ClipboardCopy, TriangleAlert } from 'lucide-react'
import { t } from '../i18n'

/** Copia texto al portapapeles. Lanza un error si no se ha podido. */
export async function copyText(text: string): Promise<void> {
  try {
    // El portapapeles del navegador está bloqueado por la política de permisos: se copia desde el proceso principal.
    await window.api.copyText(text)
    return
  } catch {
    // Alternativa: un campo oculto. Dentro de un diálogo abierto, el resto de la página no admite foco,
    // así que el campo se añade al propio diálogo.
    const host = document.querySelector('dialog[open]') ?? document.body
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    host.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    if (!ok) throw new Error('copy failed')
  }
}

export function CopyButton({ getText, label }: { getText(): string; label?: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'error'>('idle')
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        try {
          await copyText(getText())
          setState('done')
        } catch {
          setState('error')
        }
        window.setTimeout(() => setState('idle'), 2500)
      }}
    >
      {state === 'done' ? <Check size={16} aria-hidden /> : state === 'error' ? <TriangleAlert size={16} aria-hidden /> : <ClipboardCopy size={16} aria-hidden />}
      <span aria-live="polite">{state === 'done' ? t('common.copied') : state === 'error' ? t('common.copyFailed') : label ?? t('results.copyForAi')}</span>
    </button>
  )
}
