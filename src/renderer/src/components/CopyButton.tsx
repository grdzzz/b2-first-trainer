import { useState } from 'react'
import { Check, ClipboardCopy } from 'lucide-react'
import { t } from '../i18n'

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Alternativa si el portapapeles asíncrono no está disponible.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

export function CopyButton({ getText, label }: { getText(): string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        await copyText(getText())
        setDone(true)
        window.setTimeout(() => setDone(false), 2000)
      }}
    >
      {done ? <Check size={16} aria-hidden /> : <ClipboardCopy size={16} aria-hidden />}
      <span aria-live="polite">{done ? t('common.copied') : label ?? t('results.copyForAi')}</span>
    </button>
  )
}
