import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useApp, type Route } from '../lib/store'
import { t, type TKey } from '../i18n'

interface Step {
  /** Pantalla en la que se muestra el paso. */
  route: (examId: string | null) => Route | null
  /** Elemento a iluminar; si no hay o no se encuentra, la tarjeta aparece centrada. */
  target?: string
  title: TKey
  text: TKey
}

const STEPS: Step[] = [
  { route: () => ({ name: 'home' }), target: '.home-header', title: 'tour.homeTitle', text: 'tour.homeText' },
  { route: () => ({ name: 'library' }), target: '.exam-card', title: 'tour.libraryTitle', text: 'tour.libraryText' },
  { route: (id) => (id ? { name: 'exam', examId: id } : null), target: '.paper-section .paper-meta', title: 'tour.filesTitle', text: 'tour.filesText' },
  { route: (id) => (id ? { name: 'exam', examId: id } : null), target: '.paper-section .paper-section-actions .btn-primary', title: 'tour.practiceTitle', text: 'tour.practiceText' },
  { route: () => ({ name: 'history' }), target: '.nav-item[data-nav="history"]', title: 'tour.historyTitle', text: 'tour.historyText' },
  { route: () => ({ name: 'settings' }), target: '#s-sync', title: 'tour.syncTitle', text: 'tour.syncText' },
  { route: () => ({ name: 'home' }), title: 'tour.doneTitle', text: 'tour.doneText' }
]

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 8

/** Recorrido guiado: ilumina partes de la interfaz con una tarjeta explicativa. */
export function Tour() {
  const { tourStep, setTourStep, exams, navigate, settings } = useApp()
  const [rect, setRect] = useState<Rect | null>(null)
  const [ready, setReady] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const example = exams.find((e) => e.isExample) ?? exams[0]
  const examId = example?.id ?? null
  const step = tourStep !== null ? STEPS[tourStep] : null
  const last = tourStep === STEPS.length - 1

  const close = useCallback(() => setTourStep(null), [setTourStep])
  const go = useCallback(
    (delta: number) => {
      if (tourStep === null) return
      let i = tourStep + delta
      // Salta los pasos que necesitan un examen si no hay ninguno.
      while (i >= 0 && i < STEPS.length && STEPS[i].route(examId) === null) i += delta
      if (i < 0) return
      if (i >= STEPS.length) close()
      else setTourStep(i)
    },
    [tourStep, examId, setTourStep, close]
  )

  // Navega a la pantalla del paso y busca el elemento a iluminar.
  useLayoutEffect(() => {
    if (!step) return
    const route = step.route(examId)
    if (route) navigate(route)
    setReady(false)
    let tries = 0
    let raf = 0
    const find = () => {
      const el = step.target ? document.querySelector<HTMLElement>(step.target) : null
      if (el || !step.target || tries > 40) {
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'auto' })
          const r = el.getBoundingClientRect()
          setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
        } else setRect(null)
        setReady(true)
        return
      }
      tries++
      raf = requestAnimationFrame(find)
    }
    raf = requestAnimationFrame(find)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep, examId])

  // Recoloca el foco si cambia el tamaño de la ventana.
  useEffect(() => {
    if (!step?.target) return
    const update = () => {
      const el = document.querySelector<HTMLElement>(step.target!)
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
    }
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [step])

  useEffect(() => {
    if (tourStep === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [tourStep, go, close])

  useEffect(() => {
    if (ready) card.current?.focus()
  }, [ready, tourStep])

  if (!step) return null

  // Coloca la tarjeta debajo del elemento si cabe; si no, encima; sin elemento, centrada.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cardW = Math.min(380, vw - 32)
  let style: React.CSSProperties = { width: cardW, left: (vw - cardW) / 2, top: vh / 2 - 120 }
  if (rect) {
    const below = rect.top + rect.height + 16
    const top = below + 220 < vh ? below : Math.max(16, rect.top - 236)
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16)
    style = { width: cardW, left, top }
  }
  const name = settings.userName.split(' ')[0]

  return (
    <div className={`tour${ready ? ' is-ready' : ''}`} aria-live="polite">
      <div className={`tour-spot${rect ? '' : ' is-center'}`} style={rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : undefined} aria-hidden />
      <div ref={card} className="tour-card" style={style} role="dialog" aria-modal="true" aria-labelledby="tour-title" tabIndex={-1} key={tourStep}>
        <div className="tour-head">
          <span className="tour-count">{t('tour.count', { n: (tourStep ?? 0) + 1, total: STEPS.length })}</span>
          <button type="button" className="icon-btn icon-btn-sm" onClick={close} aria-label={t('tour.close')}>
            <X size={16} aria-hidden />
          </button>
        </div>
        <h2 id="tour-title" className="tour-title">{last && name ? t('tour.doneTitleName', { name }) : t(step.title)}</h2>
        <p className="tour-text">{t(step.text)}</p>
        <div className="tour-progress" aria-hidden><span style={{ width: `${(((tourStep ?? 0) + 1) / STEPS.length) * 100}%` }} /></div>
        <div className="tour-actions">
          {tourStep! > 0 && !last && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => go(-1)}>
              <ArrowLeft size={15} aria-hidden /> {t('tour.back')}
            </button>
          )}
          <span className="spacer" />
          {last ? (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={close}>{t('tour.finish')}</button>
              {examId && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    close()
                    navigate({ name: 'exam', examId })
                  }}
                >
                  {t('tour.tryIt')} <ArrowRight size={15} aria-hidden />
                </button>
              )}
            </>
          ) : (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => go(1)}>
              {t('tour.next')} <ArrowRight size={15} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
