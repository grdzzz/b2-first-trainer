// Utilidades de pdf.js compartidas por el visor y la detección automática.
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import workerSource from 'pdfjs-dist/build/pdf.worker.min.mjs?raw'
import { itemsToLines } from '@shared/detect'

// El worker se crea desde un Blob para que funcione igual en desarrollo y empaquetado (file://).
let workerReady = false
export function ensurePdfWorker(): void {
  if (workerReady) return
  const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }))
  GlobalWorkerOptions.workerPort = new Worker(url, { type: 'module' })
  workerReady = true
}

export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  ensurePdfWorker()
  // pdf.js transfiere el buffer al worker: se pasa una copia.
  return getDocument({ data: bytes.slice(), isEvalSupported: false, enableXfa: false }).promise
}

/** Texto de cada página, agrupado en líneas. */
export async function extractPdfLines(bytes: Uint8Array, maxPages = 60): Promise<string[][]> {
  const doc = await openPdf(bytes)
  try {
    const pages: string[][] = []
    for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const items = content.items.flatMap((it) =>
        'str' in it ? [{ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height }] : []
      )
      pages.push(itemsToLines(items))
      page.cleanup()
    }
    return pages
  } finally {
    void doc.destroy()
  }
}
