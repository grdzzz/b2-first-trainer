import { useEffect, useRef } from 'react'
import { Award, BellOff, CalendarCheck, Info, Target, TrendingUp, Trash2 } from 'lucide-react'
import { ACHIEVEMENT_BY_ID } from '@shared/learning/achievements'
import { clearNotifications, markAllRead, useNotifications, type NotificationKind } from '../lib/notifications'
import { useApp } from '../lib/store'
import { formatDate, t } from '../i18n'

const ICON: Record<NotificationKind, typeof Award> = { achievement: Award, level: TrendingUp, mission: Target, plan: CalendarCheck, info: Info }

/** Historial de avisos locales (sin notificaciones del sistema ni presión). */
export function NotificationCenter({ onClose }: { onClose(): void }) {
  const items = useNotifications()
  const { navigate } = useApp()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !(e.target as HTMLElement)?.closest('.nav-bell')) onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('mousedown', down)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('mousedown', down)
      window.removeEventListener('keydown', key)
      markAllRead()
    }
  }, [onClose])
  return (
    <div ref={ref} className="notif-panel" role="dialog" aria-label={t('notifications.title')} tabIndex={-1}>
      <header className="notif-head">
        <strong>{t('notifications.title')}</strong>
        {items.length > 0 && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={clearNotifications}>
            <Trash2 size={13} aria-hidden /> {t('notifications.clear')}
          </button>
        )}
      </header>
      {items.length === 0 ? (
        <p className="notif-empty text-muted text-sm">
          <BellOff size={18} aria-hidden /> {t('notifications.empty')}
        </p>
      ) : (
        <ul className="notif-list">
          {items.map((n) => {
            const Icon = ICON[n.kind] ?? Info
            const body = n.kind === 'achievement' ? (ACHIEVEMENT_BY_ID.get(n.ref ?? n.body)?.name ?? n.body) : n.kind === 'mission' ? t('missions.completedBody') : n.body
            return (
              <li key={n.id} className={`notif-item kind-${n.kind}${n.read ? '' : ' is-unread'}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (n.kind === 'achievement') navigate({ name: 'achievements' })
                    else if (n.kind === 'level') navigate({ name: 'profile' })
                    else if (n.kind === 'plan' || n.kind === 'mission') navigate({ name: 'plan' })
                    onClose()
                  }}
                >
                  <Icon size={16} aria-hidden />
                  <span className="notif-text">
                    <span className="notif-title">{n.title}</span>
                    <span className="text-muted text-sm">{body}</span>
                  </span>
                  <time className="text-subtle text-xs" dateTime={n.at}>{formatDate(n.at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
