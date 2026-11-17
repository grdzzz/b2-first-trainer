import { useCallback, useEffect, useRef, useState } from 'react'
import { FileWarning, Minus, Moon, Plus, ScanLine } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { openPdf } from '../lib/pdf'
import { t } from '../i18n'

interface Props {
  /** Carga los bytes del PDF. */
  load: () => Promise<Uint8Array>
  /** Cambia cuando cambia el documento. */
  sourceKey: string
  title: string
  /** Página a la que saltar (p. ej. el inicio de la parte actual). */
  initialPage?: number
}

const ZOOMS = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5]

export function PdfViewer({ load, sourceKey, title, initialPage }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoomIdx, setZoomIdx] = useState(3)
  const [width, setWidth] = useState(0)
  const [dim, setDim] = useState(() => {
    try {
      return localStorage.getItem('pdf-dim') === '1'
    } catch {
      return false
    }
  })
  const scroller = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    let loaded: PDFDocumentProxy | null = null
    setDoc(null)
    setError(null)
    ;(async () => {
      try {
        loaded = await openPdf(await load())
        if (cancelled) void loaded.destroy()
        else setDoc(loaded)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
      if (loaded) void loaded.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const toggleDim = () => {
    setDim((d) => {
      try {
        localStorage.setItem('pdf-dim', d ? '0' : '1')
      } catch {
        /* sin almacenamiento local */
      }
      return !d
    })
  }

  const onScroll = useCallback(() => {
    const el = scroller.current
    if (!el || !doc) return
    const pages = el.querySelectorAll<HTMLElement>('[data-page]')
    const mid = el.scrollTop + el.clientHeight / 3
    let current = 1
    pages.forEach((p) => {
      if (p.offsetTop <= mid) current = Number(p.dataset.page)
    })
    setPage(current)
  }, [doc])

  // Salta a la página indicada cuando el documento está listo o cambia la parte.
  useEffect(() => {
    if (!doc || !initialPage || width === 0) return
    const id = window.setTimeout(() => {
      const el = scroller.current?.querySelector<HTMLElement>(`[data-page="${Math.min(initialPage, doc.numPages)}"]`)
      if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - 16 })
    }, 60)
    return () => window.clearTimeout(id)
  }, [doc, initialPage, width > 0])

  const zoom = ZOOMS[zoomIdx]
  const pageWidth = Math.max(200, (width - 32) * zoom)

  return (
    <section className="pdf" aria-label={title}>
      <div className="pdf-toolbar">
        <span className="pdf-title" title={title}>{title}</span>
        {doc && <span className="pdf-pages" aria-live="polite">{t('pdf.page', { page, total: doc.numPages })}</span>}
        <div className="pdf-actions">
          <button type="button" className="icon-btn icon-btn-sm" onClick={() => setZoomIdx((i) => Math.max(0, i - 1))} disabled={zoomIdx === 0} aria-label={t('pdf.zoomOut')} title={t('pdf.zoomOut')}>
            <Minus size={16} aria-hidden />
          </button>
          <span className="pdf-zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" className="icon-btn icon-btn-sm" onClick={() => setZoomIdx((i) => Math.min(ZOOMS.length - 1, i + 1))} disabled={zoomIdx === ZOOMS.length - 1} aria-label={t('pdf.zoomIn')} title={t('pdf.zoomIn')}>
            <Plus size={16} aria-hidden />
          </button>
          <button type="button" className="icon-btn icon-btn-sm" onClick={() => setZoomIdx(3)} aria-label={t('pdf.fit')} title={t('pdf.fit')}>
            <ScanLine size={16} aria-hidden />
          </button>
          <button type="button" className={`icon-btn icon-btn-sm${dim ? ' is-active' : ''}`} onClick={toggleDim} aria-pressed={dim} aria-label={t('pdf.dim')} title={t('pdf.dim')}>
            <Moon size={16} aria-hidden />
          </button>
        </div>
      </div>
      <div className={`pdf-scroll${dim ? ' pdf-dim' : ''}`} ref={scroller} onScroll={onScroll} tabIndex={0} aria-label={t('pdf.document')}>
        {error && (
          <div className="empty-state">
            <FileWarning size={28} aria-hidden />
            <p>{t('pdf.error')}</p>
            <p className="text-subtle text-sm">{error}</p>
          </div>
        )}
        {!doc && !error && <div className="pdf-loading">{t('common.loading')}</div>}
        {doc && width > 0 &&
          Array.from({ length: doc.numPages }, (_, i) => <PdfPage key={`${sourceKey}-${i}`} doc={doc} number={i + 1} width={pageWidth} />)}
      </div>
    </section>
  )
}

function PdfPage({ doc, number, width }: { doc: PDFDocumentProxy; number: number; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const holder = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(number <= 2)
  const [ratio, setRatio] = useState(1.414)

  useEffect(() => {
    let alive = true
    void doc.getPage(number).then((p) => {
      const vp = p.getViewport({ scale: 1 })
      if (alive) setRatio(vp.height / vp.width)
    })
    return () => {
      alive = false
    }
  }, [doc, number])

  useEffect(() => {
    const el = holder.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setVisible(true)
    }, { rootMargin: '600px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let task: { cancel(): void; promise: Promise<void> } | null = null
    let alive = true
    void (async () => {
      const page = await doc.getPage(number)
      if (!alive || !canvasRef.current) return
      const base = page.getViewport({ scale: 1 })
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const scale = (width / base.width) * dpr
      const vp = page.getViewport({ scale })
      const canvas = canvasRef.current
      canvas.width = Math.floor(vp.width)
      canvas.height = Math.floor(vp.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      task = page.render({ canvasContext: ctx, viewport: vp })
      await task.promise.catch(() => undefined)
    })()
    return () => {
      alive = false
      task?.cancel()
    }
  }, [doc, number, width, visible])

  return (
    <div className="pdf-page" ref={holder} data-page={number} style={{ width, height: width * ratio }}>
      <canvas ref={canvasRef} style={{ width, height: width * ratio }} aria-label={t('pdf.pageLabel', { page: number })} role="img" />
    </div>
  )
}
