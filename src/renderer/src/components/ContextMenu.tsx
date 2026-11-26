// Menú contextual accesible (clic derecho, Mayús+F10 o la tecla Menú). Navegable con flechas, Intro y Escape.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  run(): void
}

export interface MenuState {
  x: number
  y: number
  items: MenuItem[]
}

export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const open = (e: React.MouseEvent | React.KeyboardEvent, items: MenuItem[]) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = 'clientX' in e && e.clientX ? e.clientX : rect.left + 16
    const y = 'clientY' in e && e.clientY ? e.clientY : rect.top + 16
    setMenu({ x, y, items })
  }
  const onKeyDown = (e: React.KeyboardEvent, items: MenuItem[]) => {
    if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) open(e, items)
  }
  return { menu, open, onKeyDown, close: () => setMenu(null) }
}

export function ContextMenu({ menu, onClose }: { menu: MenuState | null; onClose(): void }) {
  const ref = useRef<HTMLUListElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    if (!menu || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ x: Math.min(menu.x, window.innerWidth - r.width - 8), y: Math.min(menu.y, window.innerHeight - r.height - 8) })
    ref.current.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [menu])
  useEffect(() => {
    if (!menu) return
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('mousedown', down)
    window.addEventListener('keydown', key, true)
    window.addEventListener('blur', onClose)
    window.addEventListener('resize', onClose)
    return () => {
      window.removeEventListener('mousedown', down)
      window.removeEventListener('keydown', key, true)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('resize', onClose)
    }
  }, [menu, onClose])
  if (!menu) return null
  const move = (e: React.KeyboardEvent) => {
    const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') buttons[(i + 1) % buttons.length]?.focus()
    else if (e.key === 'ArrowUp') buttons[(i - 1 + buttons.length) % buttons.length]?.focus()
    else if (e.key === 'Home') buttons[0]?.focus()
    else if (e.key === 'End') buttons[buttons.length - 1]?.focus()
    else return
    e.preventDefault()
  }
  return (
    <ul ref={ref} className="context-menu" role="menu" style={{ left: pos?.x ?? menu.x, top: pos?.y ?? menu.y, visibility: pos ? 'visible' : 'hidden' }} onKeyDown={move}>
      {menu.items.map((it, i) => (
        <li key={i} role="none">
          <button
            type="button"
            role="menuitem"
            className={`context-item${it.danger ? ' is-danger' : ''}`}
            disabled={it.disabled}
            onClick={() => {
              onClose()
              it.run()
            }}
          >
            {it.icon}
            {it.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
