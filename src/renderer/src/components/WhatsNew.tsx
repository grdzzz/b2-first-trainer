import { useEffect, useState } from 'react'
import { AudioLines, Bell, BookX, CalendarRange, CheckCheck, Command, Compass, Gauge, LayoutTemplate, NotebookPen, PenLine, RefreshCw, RotateCcw, Smile, Sparkles, Trophy, Video } from 'lucide-react'
import { changesSince, CHANGELOG, type ChangeIcon, type ChangelogEntry } from '@shared/changelog'
import { Modal } from './Modal'
import { MascotSvg } from './Mascot'
import { useApp } from '../lib/store'
import { t } from '../i18n'

const SEEN_KEY = 'b2ft.whatsNew.seen'
const OPEN_EVENT = 'b2ft:whats-new'

const ICONS: Record<ChangeIcon, typeof Sparkles> = {
  level: Gauge,
  sparkles: Sparkles,
  mascot: Smile,
  loading: LayoutTemplate,
  video: Video,
  check: CheckCheck,
  review: RotateCcw,
  bell: Bell,
  writing: PenLine,
  sheets: NotebookPen,
  sync: RefreshCw,
  plan: CalendarRange,
  notebook: BookX,
  trophy: Trophy,
  command: Command
}

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

function writeSeen(v: string): void {
  try {
    localStorage.setItem(SEEN_KEY, v)
  } catch {
    /* sin almacenamiento local: el panel no se volverá a abrir solo en esta sesión */
  }
}

/** Abre el panel de novedades de la versión actual (desde Ajustes). */
export function openWhatsNew(): void {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

/**
 * Panel «Novedades»: aparece una vez tras cada actualización (la última versión vista se guarda en este
 * equipo). En una instalación nueva no aparece: todo es nuevo. `existingUser`: ya usaba la app antes.
 */
export function WhatsNew({ existingUser }: { existingUser: boolean }) {
  const { settings, tourStep, setTourStep } = useApp()
  const [version, setVersion] = useState<string | null>(null)
  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null)

  useEffect(() => {
    let alive = true
    void window.api.getAppInfo().then((info) => {
      if (!alive) return
      setVersion(info.version)
      const seen = readSeen()
      if (seen === null && !existingUser) {
        // Primera instalación: no hay «novedades» que contar.
        writeSeen(info.version)
        return
      }
      // Quien ya usaba la app pero nunca ha visto este panel: solo las novedades de esta versión.
      const list = seen === null ? changesSince(null, info.version, 1) : changesSince(seen, info.version, 3)
      if (list.length) setEntries(list)
      else writeSeen(info.version)
    }).catch(() => undefined)
    return () => {
      alive = false
    }
    // Solo al arrancar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const open = () => {
      void window.api.getAppInfo().then((info) => {
        const current = CHANGELOG.find((e) => e.version === info.version) ?? CHANGELOG[0]
        setVersion(info.version)
        setEntries([current])
      })
    }
    window.addEventListener(OPEN_EVENT, open)
    return () => window.removeEventListener(OPEN_EVENT, open)
  }, [])

  const close = () => {
    if (version) writeSeen(version)
    setEntries(null)
  }

  // No se abre encima del recorrido guiado.
  const open = entries !== null && tourStep === null
  const single = entries?.length === 1
  // Si alguna versión cambió menús o secciones, se ofrece (opcional) un recorrido por los cambios.
  const tourOf = entries?.find((e) => e.tour)?.tour
  return (
    <Modal
      open={open}
      size="md"
      title={single ? t('whatsNew.title', { version: entries![0].version }) : t('whatsNew.titleMany')}
      onClose={close}
      footer={
        tourOf ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={close}>{t('whatsNew.notNow')}</button>
            <button
              type="button"
              className="btn btn-primary"
              autoFocus
              onClick={() => {
                close()
                setTourStep(0, tourOf)
              }}
            >
              <Compass size={16} aria-hidden /> {t('whatsNew.tour')}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={close} autoFocus>{t('whatsNew.ok')}</button>
        )
      }
    >
      <div className="whats-new">
        <div className="whats-new-hero">
          {settings.mascot && <MascotSvg mood="cheer" size={64} react="happy" />}
          <p className="text-muted">{t('whatsNew.sub')}</p>
        </div>
        {tourOf && <p className="whats-new-tour text-sm"><Compass size={15} aria-hidden /> {t('whatsNew.tourHint')}</p>}
        {entries?.map((entry) => (
          <section key={entry.version} className="whats-new-version" aria-label={t('whatsNew.version', { version: entry.version })}>
            {!single && <h3 className="eyebrow">{t('whatsNew.version', { version: entry.version })}</h3>}
            <ul className="whats-new-list">
              {entry.items.map((item, i) => {
                const Icon = ICONS[item.icon] ?? AudioLines
                return (
                  <li key={item.title} style={{ animationDelay: `${80 + i * 70}ms` }}>
                    <span className="whats-new-icon" aria-hidden><Icon size={18} /></span>
                    <span>
                      <strong>{item.title}</strong>
                      <span className="text-muted text-sm">{item.text}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}
