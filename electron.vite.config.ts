import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

// Content-Security-Policy estricta solo en producción (en desarrollo Vite necesita scripts inline para HMR).
function cspPlugin(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "media-src 'self' blob:",
        "font-src 'self' data:",
        "worker-src 'self' blob:",
        "connect-src 'self' blob: data:",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'"
      ].join('; ')
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`)
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@shared': resolve('src/shared') } }
  },
  renderer: {
    root: 'src/renderer',
    base: './',
    resolve: { alias: { '@shared': resolve('src/shared'), '@': resolve('src/renderer/src') } },
    plugins: [react(), cspPlugin()],
    build: { target: 'chrome120', rollupOptions: { input: resolve('src/renderer/index.html') } }
  }
})
