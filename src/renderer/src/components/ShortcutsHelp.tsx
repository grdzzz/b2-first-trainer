import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { t, type TKey } from '../i18n'

const EVENT = 'b2ft:shortcuts'

export function openShortcuts(): void {
  window.dispatchEvent(new Event(EVENT))
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl'

const GROUPS: Array<{ title: TKey; items: Array<[string[], TKey]> }> = [
  {
    title: 'shortcuts.general',
    items: [
      [[mod, 'K'], 'shortcuts.palette'],
      [[mod, 'B'], 'shortcuts.sidebar'],
      [['?'], 'shortcuts.help'],
      [['Tab'], 'shortcuts.tab'],
      [['Esc'], 'shortcuts.escape']
    ]
  },
  {
    title: 'shortcuts.sheets',
    items: [
      [[mod, '↵'], 'shortcuts.check'],
      [['Alt', '↓'], 'shortcuts.nextGap'],
      [['Alt', '↑'], 'shortcuts.prevGap'],
      [['A', 'B', 'C', 'D'], 'shortcuts.options']
    ]
  },
  {
    title: 'shortcuts.review',
    items: [
      [['↵'], 'shortcuts.reviewEnter'],
      [['1'], 'shortcuts.selfNo'],
      [['2'], 'shortcuts.selfYes']
    ]
  },
  {
    title: 'shortcuts.notebook',
    items: [
      [['/'], 'shortcuts.search'],
      [['Mayús', 'F10'], 'shortcuts.contextMenu']
    ]
  }
]

/** Ayuda de atajos de teclado («?» en cualquier pantalla, fuera de los campos de texto). */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return
      if (el?.closest('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]')) return
      e.preventDefault()
      setOpen(true)
    }
    window.addEventListener(EVENT, onOpen)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener(EVENT, onOpen)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
  return (
    <Modal open={open} title={t('shortcuts.title')} onClose={() => setOpen(false)} size="md">
      <div className="shortcuts-grid">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="h-small">{t(g.title)}</h3>
            <dl className="shortcuts-list">
              {g.items.map(([keys, label]) => (
                <div key={label}>
                  <dt>{keys.map((k) => <kbd key={k}>{k}</kbd>)}</dt>
                  <dd>{t(label)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  )
}
