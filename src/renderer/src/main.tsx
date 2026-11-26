import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/newsreader/opsz.css'
import './styles/tokens.css'
import './styles/app.css'
import './styles/v2.css'
import { App } from './App'

// Tema de la última vez, antes de cargar los ajustes: el skeleton de arranque ya sale con los colores correctos.
// También la variante, el acento, la densidad y el movimiento: sin parpadeo de colores al arrancar.
try {
  const theme = localStorage.getItem('b2ft.theme')
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme
  const a = JSON.parse(localStorage.getItem('b2ft.appearance') ?? 'null') as { variant?: string | null; accent?: string; density?: string; motion?: string } | null
  if (a) {
    const root = document.documentElement
    if (a.variant === 'oled' || a.variant === 'midnight') root.dataset.variant = a.variant
    if (a.accent && /^(teal|violet|rose|amber|green)$/.test(a.accent)) root.dataset.accent = a.accent
    if (a.density === 'compact') root.dataset.density = 'compact'
    if (a.motion === 'reduced' || a.motion === 'none') root.dataset.motion = a.motion
  }
} catch {
  /* sin almacenamiento local */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
